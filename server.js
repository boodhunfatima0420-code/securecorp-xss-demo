const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const escapeHtml = require('escape-html');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Built-in SQLite (no native modules, no GLIBC issues) ───
const db = new DatabaseSync('./database.sqlite');

// Drop + recreate on every start so schema changes always apply
db.exec(`DROP TABLE IF EXISTS users`);
db.exec(`DROP TABLE IF EXISTS sessions`);
db.exec(`DROP TABLE IF EXISTS posts`);
db.exec(`DROP TABLE IF EXISTS comments`);

db.exec(`CREATE TABLE users (
    username TEXT PRIMARY KEY,
    password TEXT,
    display_name TEXT,
    email TEXT,
    bio TEXT,
    avatar TEXT,
    followers INTEGER,
    following INTEGER,
    balance REAL
)`);
db.exec(`CREATE TABLE sessions (
    session_id TEXT PRIMARY KEY,
    username TEXT,
    expires INTEGER
)`);
db.exec(`CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    image TEXT,
    caption TEXT,
    likes INTEGER DEFAULT 0,
    created_at INTEGER
)`);
db.exec(`CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    username TEXT,
    comment TEXT,
    created_at INTEGER
)`);

// Seed victim user
db.prepare(`INSERT INTO users
    (username, password, display_name, email, bio, avatar, followers, following, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
    'VictimUser',
    'password123',
    'Aisha R.',
    'victim@securecorp.com',
    'Coffee enthusiast ☕ | Traveler ✈️ | Cat mom 🐱',
    'https://i.pravatar.cc/150?img=47',
    1284,
    312,
    15420.50
);

// Seed posts
const now = Date.now();
const insertPost = db.prepare(
    `INSERT INTO posts (username, image, caption, likes, created_at) VALUES (?, ?, ?, ?, ?)`
);
insertPost.run('VictimUser', 'https://picsum.photos/id/1015/800/500', 'Weekend getaway 🌄 #mountains #nature', 342, now - 3600000);
insertPost.run('VictimUser', 'https://picsum.photos/id/1025/800/500', 'My little buddy 🐶', 891, now - 7200000);
insertPost.run('VictimUser', 'https://picsum.photos/id/1080/800/500', 'Breakfast of champions 🥐☕', 156, now - 10800000);

let isMitigated = false;

// ─── Helpers ───
function getAuthenticatedUser(req) {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return null;
    const session = db.prepare(
        "SELECT * FROM sessions WHERE session_id = ? AND expires > ?"
    ).get(sessionId, Date.now());
    if (!session) return null;
    return db.prepare("SELECT * FROM users WHERE username = ?").get(session.username);
}

function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}

// ─── Shared CSS ───
const CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #fafafa;
    color: #262626;
  }
  a { color: #0095f6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .navbar {
    background: #fff;
    border-bottom: 1px solid #dbdbdb;
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .navbar .logo {
    font-family: 'Grand Hotel', cursive, sans-serif;
    font-size: 26px;
    font-weight: 700;
    background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .navbar .links a { margin-left: 16px; font-weight: 500; }
  .toggle {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 12px;
    background: #efefef;
    color: #555 !important;
    text-decoration: none !important;
  }
  .toggle.danger { background: #ffe5e5; color: #c33 !important; }
  .toggle.safe { background: #e5ffe9; color: #1a8a3a !important; }
  .container { max-width: 620px; margin: 24px auto; padding: 0 12px; }
  .card {
    background: #fff;
    border: 1px solid #dbdbdb;
    border-radius: 8px;
    margin-bottom: 20px;
    overflow: hidden;
  }
  .card-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
  }
  .avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
    box-shadow: 0 0 0 2px #dc2743;
  }
  .avatar.sm { width: 32px; height: 32px; }
  .username { font-weight: 600; }
  .time { color: #8e8e8e; font-size: 12px; }
  .post-image {
    width: 100%;
    display: block;
    background: #efefef;
  }
  .post-actions {
    padding: 10px 16px 4px;
    font-size: 22px;
    display: flex;
    gap: 14px;
  }
  .post-body { padding: 4px 16px 12px; }
  .caption { margin: 0 0 6px; }
  .likes { font-weight: 600; margin: 4px 0; }
  .comments { padding: 0 16px 16px; }
  .comment {
    display: flex;
    gap: 10px;
    padding: 8px 0;
    border-top: 1px solid #f0f0f0;
  }
  .comment .body { flex: 1; font-size: 14px; }
  .comment-form {
    display: flex;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid #efefef;
    background: #fafafa;
  }
  .comment-form input[type=text] {
    flex: 1;
    border: 1px solid #dbdbdb;
    border-radius: 20px;
    padding: 8px 14px;
    font-size: 14px;
    outline: none;
  }
  .comment-form input[type=text]:focus { border-color: #a8a8a8; }
  .comment-form button {
    background: #0095f6;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
  }
  .comment-form button:hover { background: #0077cc; }

  /* ─── Login ─── */
  .login-wrap {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
    padding: 20px;
  }
  .login-card {
    background: #fff;
    border-radius: 16px;
    padding: 40px 32px;
    width: 100%;
    max-width: 380px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    text-align: center;
  }
  .login-logo {
    font-family: 'Grand Hotel', cursive, sans-serif;
    font-size: 42px;
    background: linear-gradient(45deg, #f09433, #dc2743, #bc1888);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 8px;
  }
  .login-tagline { color: #8e8e8e; font-size: 14px; margin-bottom: 24px; }
  .login-card input {
    width: 100%;
    padding: 12px 14px;
    margin-bottom: 10px;
    border: 1px solid #dbdbdb;
    border-radius: 8px;
    font-size: 14px;
    background: #fafafa;
    outline: none;
    transition: all .15s;
  }
  .login-card input:focus { border-color: #a8a8a8; background: #fff; }
  .login-card button {
    width: 100%;
    padding: 12px;
    background: linear-gradient(45deg, #f09433, #dc2743);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 15px;
    cursor: pointer;
    margin-top: 8px;
  }
  .login-card button:hover { opacity: .92; }
  .divider {
    display: flex; align-items: center; gap: 12px;
    color: #8e8e8e; font-size: 12px; margin: 20px 0;
  }
  .divider::before, .divider::after {
    content: ''; flex: 1; height: 1px; background: #dbdbdb;
  }
  .demo-note {
    background: #fff8e6;
    border: 1px dashed #f0c060;
    color: #8a6d1f;
    font-size: 12px;
    padding: 8px 10px;
    border-radius: 8px;
    margin-top: 16px;
  }

  /* ─── Profile ─── */
  .profile-head {
    display: flex;
    gap: 24px;
    padding: 24px;
    align-items: center;
  }
  .profile-head img { width: 90px; height: 90px; border-radius: 50%; }
  .profile-stats { display: flex; gap: 24px; margin: 10px 0; font-size: 14px; }
  .profile-stats b { font-weight: 700; }
  .private-box {
    background: #fff8e6;
    border: 1px solid #f0c060;
    border-radius: 8px;
    padding: 14px;
    margin: 12px 24px 24px;
    font-size: 14px;
  }
`;

// ─── Home / Feed ───
app.get('/', (req, res) => {
    const posts = db.prepare("SELECT * FROM posts ORDER BY created_at DESC").all();
    const commentsByPost = {};
    for (const p of posts) {
        commentsByPost[p.id] = db.prepare(
            "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC"
        ).all(p.id);
    }
    renderFeed(req, res, posts, commentsByPost);
});

function renderFeed(req, res, posts, commentsByPost) {
    const user = getAuthenticatedUser(req);
    const displayName = user ? escapeHtml(user.display_name || user.username) : 'Guest';
    const avatarUrl = user ? user.avatar : 'https://i.pravatar.cc/150?img=13';
    const loginLink = user
        ? `<a href="/account">Profile</a> <a href="/logout">Logout</a>`
        : `<a href="/login">Log in</a>`;

    const toggleClass = isMitigated ? 'safe' : 'danger';
    const toggleLabel = isMitigated ? '🛡 SECURE' : '⚠ VULNERABLE';

    const postsHtml = posts.map(p => {
        const comments = commentsByPost[p.id] || [];
        const commentsHtml = comments.map(c => {
            // VULNERABLE: raw. SECURE: escaped.
            const body = isMitigated ? escapeHtml(c.comment) : c.comment;
            return `
            <div class="comment">
                <img class="avatar sm" src="https://i.pravatar.cc/60?u=${encodeURIComponent(c.username)}" alt="">
                <div class="body">
                    <b>${escapeHtml(c.username)}</b>
                    <span class="time"> · ${timeAgo(c.created_at)}</span>
                    <div>${body}</div>
                </div>
            </div>`;
        }).join('');

        const postAvatar = (user && p.username === user.username)
            ? user.avatar
            : 'https://i.pravatar.cc/150?u=' + encodeURIComponent(p.username);

        return `
        <div class="card">
            <div class="card-header">
                <img class="avatar" src="${postAvatar}" alt="">
                <div>
                    <div class="username">${escapeHtml(p.username)}</div>
                    <div class="time">${timeAgo(p.created_at)}</div>
                </div>
            </div>
            <img class="post-image" src="${p.image}" alt="">
            <div class="post-actions">
                <span>❤️</span><span>💬</span><span>📤</span>
            </div>
            <div class="post-body">
                <div class="likes">${p.likes.toLocaleString()} likes</div>
                <p class="caption"><b>${escapeHtml(p.username)}</b> ${escapeHtml(p.caption)}</p>
            </div>
            <div class="comments">
                ${commentsHtml || '<div class="time" style="padding:8px 0;">No comments yet. Be the first!</div>'}
            </div>
            <form class="comment-form" action="/comment" method="POST">
                <input type="hidden" name="post_id" value="${p.id}">
                <input type="text" name="comment" placeholder="Add a comment..." autocomplete="off" required>
                <button type="submit">Post</button>
            </form>
        </div>`;
    }).join('');

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Socially · Feed</title>
        <link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet">
        <style>${CSS}</style>
    </head>
    <body>
        <div class="navbar">
            <div class="logo">Socially</div>
            <div class="links">
                ${loginLink}
                <a href="/toggle-mitigation" class="toggle ${toggleClass}">${toggleLabel}</a>
            </div>
        </div>
        <div class="container">
            <div style="padding: 6px 4px 16px; color:#555; font-size:14px;">
                Logged in as <b>${displayName}</b>
                <img src="${avatarUrl}" class="avatar sm" style="vertical-align:middle; margin-left:8px;">
            </div>
            ${postsHtml || '<div class="card" style="padding:24px; text-align:center; color:#8e8e8e;">No posts yet.</div>'}
        </div>
    </body>
    </html>`);
}

// ─── Login page ───
app.get('/login', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Socially · Log in</title>
        <link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet">
        <style>${CSS}</style>
    </head>
    <body>
        <div class="login-wrap">
            <div class="login-card">
                <h1 class="login-logo">Socially</h1>
                <p class="login-tagline">Sign in to see photos &amp; comments from your friends.</p>
                <form action="/login" method="POST">
                    <input type="text" name="username" value="VictimUser" placeholder="Username" required>
                    <input type="password" name="password" value="password123" placeholder="Password" required>
                    <button type="submit">Log in</button>
                </form>
                <div class="divider">OR</div>
                <div style="font-size:13px;color:#8e8e8e;">Forgot password? · Sign up</div>
                <div class="demo-note">
                    <b>Demo account:</b><br>
                    Username: <code>VictimUser</code><br>
                    Password: <code>password123</code>
                </div>
            </div>
        </div>
    </body>
    </html>`);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(
        "SELECT * FROM users WHERE username = ? AND password = ?"
    ).get(username, password);

    if (!user) {
        return res.status(401).send(
            `<body style="font-family:sans-serif;text-align:center;padding:60px;">
             <h2>❌ Invalid credentials</h2><a href="/login">Try again</a></body>`);
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 60;
    db.prepare("INSERT INTO sessions (session_id, username, expires) VALUES (?, ?, ?)")
      .run(sessionId, username, expires);

    const opts = isMitigated
        ? { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3600000 }
        : { httpOnly: false, secure: false, sameSite: 'lax', maxAge: 3600000 };

    res.cookie('session_id', sessionId, opts);
    res.redirect('/');
});

// ─── Profile / Account ───
app.get('/account', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
        return res.status(401).send(
            `<body style="font-family:sans-serif;text-align:center;padding:60px;">
             <h2>🔒 Access Denied</h2><p>You must be logged in.</p>
             <a href="/login">Log in</a></body>`);
    }
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Socially · ${escapeHtml(user.username)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet">
        <style>${CSS}</style>
    </head>
    <body>
        <div class="navbar">
            <div class="logo">Socially</div>
            <div class="links">
                <a href="/">Feed</a>
                <a href="/logout">Logout</a>
            </div>
        </div>
        <div class="container" style="max-width:520px;">
            <div class="card">
                <div class="profile-head">
                    <img src="${user.avatar}" alt="">
                    <div>
                        <div style="font-size:20px;font-weight:600;">${escapeHtml(user.display_name)}</div>
                        <div style="color:#8e8e8e;font-size:14px;">@${escapeHtml(user.username)}</div>
                        <div class="profile-stats">
                            <div><b>${user.followers.toLocaleString()}</b> followers</div>
                            <div><b>${user.following}</b> following</div>
                        </div>
                    </div>
                </div>
                <div style="padding:0 24px 16px;color:#555;">${escapeHtml(user.bio)}</div>
                <div class="private-box">
                    <b>🔐 Private account data</b><br>
                    Email: ${escapeHtml(user.email)}<br>
                    Balance: $${user.balance.toFixed(2)}
                </div>
            </div>
            <a href="/" style="display:block;text-align:center;color:#8e8e8e;font-size:14px;">← Back to feed</a>
        </div>
    </body>
    </html>`);
});

app.get('/logout', (req, res) => {
    const sid = req.cookies.session_id;
    if (sid) db.prepare("DELETE FROM sessions WHERE session_id = ?").run(sid);
    res.clearCookie('session_id');
    res.redirect('/');
});

app.get('/toggle-mitigation', (req, res) => {
    isMitigated = !isMitigated;
    res.redirect('/');
});

// ─── Post comment (stored XSS sink) ───
app.post('/comment', (req, res) => {
    const { post_id, comment } = req.body;
    const user = getAuthenticatedUser(req);
    const finalUser = user ? user.username : 'Guest';
    db.prepare("INSERT INTO comments (post_id, username, comment, created_at) VALUES (?, ?, ?, ?)")
      .run(post_id, finalUser, comment, Date.now());
    res.redirect('/');
});

// ─── Security headers when mitigated ───
app.use((req, res, next) => {
    if (isMitigated) {
        res.setHeader("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://picsum.photos https://i.pravatar.cc; object-src 'none'");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
    }
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));