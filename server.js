const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const escapeHtml = require('escape-html');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Set up the database with Node's built-in SQLite.
// This version of the code is a fixed build, so we always start clean.
const db = new DatabaseSync('./database.sqlite');

db.exec(`DROP TABLE IF EXISTS users`);
db.exec(`DROP TABLE IF EXISTS sessions`);
db.exec(`DROP TABLE IF EXISTS posts`);
db.exec(`DROP TABLE IF EXISTS comments`);
db.exec(`DROP TABLE IF EXISTS stories`);
db.exec(`DROP TABLE IF EXISTS messages`);

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
db.exec(`CREATE TABLE stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    image TEXT,
    created_at INTEGER
)`);
db.exec(`CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT,
    to_user TEXT,
    body TEXT,
    created_at INTEGER,
    is_read INTEGER DEFAULT 0
)`);

// The victim account
db.prepare(`INSERT INTO users (username, password, display_name, email, bio, avatar, followers, following, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
    'Shehzad J', 'Shehzad@2026', 'Shehzad J',
    'shehzad.j@securecorp.com',
    'Car enthusiast 🏎 | Traveler ✈ | Northern skies 🌌',
    'https://i.pravatar.cc/150?img=12',
    1284, 312, 15420.50
);

// The attacker account
db.prepare(`INSERT INTO users (username, password, display_name, email, bio, avatar, followers, following, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
).run(
    'Kevin', 'hacker123', 'Kevin',
    'kevin@example.com', 'Just here for the memes 👨',
    'https://i.pravatar.cc/150?img=53',
    12, 45, 200
);

// A handful of friends so the feed looks like a real social network
const friends = [
    { username: 'Priya',   avatar: 'https://i.pravatar.cc/150?img=45', bio: 'Sun, sand & samosas 🏖' },
    { username: 'Yannick', avatar: 'https://i.pravatar.cc/150?img=15', bio: 'Sega dancer 💃 | Beach bum 🏝' },
    { username: 'Adele',   avatar: 'https://i.pravatar.cc/150?img=48', bio: 'Foodie 🍜 | Boulangerie addict 🥐' },
    { username: 'Vikash',  avatar: 'https://i.pravatar.cc/150?img=33', bio: 'Football ⚽ | Dholl puri enthusiast' },
    { username: 'Marie',   avatar: 'https://i.pravatar.cc/150?img=20', bio: 'Artist 🎨 | Cats 🐈' },
    { username: 'Karim',   avatar: 'https://i.pravatar.cc/150?img=68', bio: 'Bike rider 🏍 | Biryani lover 🍛' },
];

const insertUser = db.prepare(`INSERT INTO users (username, password, display_name, email, bio, avatar, followers, following, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
for (const f of friends) {
    insertUser.run(f.username, 'friend123', f.username, f.username.toLowerCase() + '@example.com',
        f.bio, f.avatar,
        200 + Math.floor(Math.random() * 800),
        100 + Math.floor(Math.random() * 400), 0);
}

// Seed some posts
const now = Date.now();
const insertPost = db.prepare(`INSERT INTO posts (username, image, caption, likes, created_at) VALUES (?, ?, ?, ?, ?)`);

insertPost.run('Shehzad J', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80',
    'New toy 🏁 Ford Mustang GT — 5.0L V8, pure American muscle', 542, now - 3600000);
insertPost.run('Shehzad J', 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
    'Norway skies never disappoint 🌌', 891, now - 7200000);
insertPost.run('Shehzad J', 'https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&q=80',
    'Denmark & Faroe Islands — postcard vibes 🇩🇰', 456, now - 10800000);

insertPost.run('Priya', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'Brunch goals 🥞', 156, now - 1800000);
insertPost.run('Yannick', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    'Beach day 🌊', 203, now - 4000000);
insertPost.run('Marie', 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
    'Late night painting 🎨', 88, now - 6000000);
insertPost.run('Adele', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80',
    'New recipe testing 🍜', 74, now - 9000000);
insertPost.run('Vikash', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
    'Mountain hike 🏔', 112, now - 11000000);
insertPost.run('Karim', 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80',
    'Sunday brunch with the family 🍛', 98, now - 13000000);

// Seed stories
const insertStory = db.prepare(`INSERT INTO stories (username, image, created_at) VALUES (?, ?, ?)`);

insertStory.run('Shehzad J', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=600&q=80', now - 900000);
insertStory.run('Priya',   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', now - 1200000);
insertStory.run('Yannick', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80', now - 2400000);
insertStory.run('Adele',   'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80', now - 3600000);
insertStory.run('Vikash',  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80', now - 4800000);
insertStory.run('Marie',   'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80', now - 6000000);
insertStory.run('Karim',   'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=80', now - 7200000);

// Seed some private messages so the inbox looks real
const insertMsg = db.prepare(`INSERT INTO messages (from_user, to_user, body, created_at) VALUES (?, ?, ?, ?)`);

insertMsg.run('Priya', 'Shehzad J', 'Hey Shehzad! Are you coming to the beach party this weekend? 🏖', now - 7200000);
insertMsg.run('Yannick', 'Shehzad J', 'Bro I need to send you the invoice. What is your bank account number?', now - 3600000);
insertMsg.run('Yannick', 'Shehzad J', 'Also did you get my email? It is urgent!', now - 3500000);
insertMsg.run('Adele', 'Shehzad J', 'Thanks for the birthday gift! ❤️', now - 1800000);
insertMsg.run('Karim', 'Shehzad J', 'Meeting tomorrow at 10am still on?', now - 900000);

insertMsg.run('Priya', 'Kevin', 'Hey Kevin! Welcome to Socially 👋', now - 5000000);

// ---------------------------------------------------------------------
// This is a permanently hardened build.
// The XSS vulnerability has been removed and there is no toggle to bring
// it back. Every request is treated as if mitigation is on.
// ---------------------------------------------------------------------

// Apply security headers to every response, all the time.
app.use((req, res, next) => {
    // Content Security Policy: only allow scripts and styles from our own
    // origin. This blocks any inline <script> tags even if they somehow
    // end up in the page.
    res.setHeader("Content-Security-Policy",
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src https://fonts.gstatic.com; " +
        "img-src 'self' data: https://images.unsplash.com https://i.pravatar.cc https://picsum.photos; " +
        "object-src 'none'; " +
        "base-uri 'self'; " +
        "frame-ancestors 'none'; " +
        "form-action 'self'");

    // Stop the browser from guessing content types
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Prevent the app from being embedded in another site (clickjacking)
    res.setHeader("X-Frame-Options", "DENY");

    // Tell the browser to only use HTTPS for the next year
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

    // Don't leak the full URL to external sites
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    // Turn off browser features we don't use
    res.setHeader("Permissions-Policy",
        "geolocation=(), microphone=(), camera=(), payment=(), usb=()");

    next();
});

// Pull the logged-in user out of the session cookie, if there is one
function getAuthenticatedUser(req) {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return null;
    const session = db.prepare("SELECT * FROM sessions WHERE session_id = ? AND expires > ?")
        .get(sessionId, Date.now());
    if (!session) return null;
    return db.prepare("SELECT * FROM users WHERE username = ?").get(session.username);
}

// Small helper to show friendly timestamps
function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
}

// Theme toggle script, served from its own route so it works under CSP
const THEME_JS = `
(function() {
  var KEY = 'socially-theme';
  var saved = localStorage.getItem(KEY);
  if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    function paint() {
      var dark = document.documentElement.getAttribute('data-theme') === 'dark';
      btn.textContent = dark ? '☀' : '🌙';
    }
    paint();
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem(KEY, 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem(KEY, 'dark');
      }
      paint();
    });
  });
})();
`;

// Story viewer script, also served from its own route
const STORIES_JS = `
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    var circles = document.querySelectorAll('.story-circle');
    var modal = document.getElementById('story-modal');
    var modalImg = document.getElementById('story-modal-img');
    var modalName = document.getElementById('story-modal-name');
    var closeBtn = document.getElementById('story-close');
    if (!modal) return;
    circles.forEach(function(c) {
      c.addEventListener('click', function() {
        modalImg.src = c.getAttribute('data-image');
        modalName.textContent = c.getAttribute('data-name') || '';
        modal.classList.add('open');
      });
    });
    function close() { modal.classList.remove('open'); }
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function(e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') close(); });
  });
})();
`;

app.get('/theme.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(THEME_JS);
});
app.get('/stories.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(STORIES_JS);
});

// Simple health endpoint for uptime checks
app.get('/health', (req, res) => res.send('ok'));

// All the CSS for the app. Kept in one place so it's easy to reuse.
const CSS = `
  :root {
    --bg: #fafafa; --card: #ffffff; --text: #262626; --muted: #8e8e8e;
    --border: #dbdbdb; --nav: #ffffff; --input: #fafafa; --input-focus: #ffffff;
    --hover: #f0f0f0; --shadow: rgba(0,0,0,0.1);
  }
  [data-theme="dark"] {
    --bg: #0a0a0a; --card: #1a1a1a; --text: #f5f5f5; --muted: #a8a8a8;
    --border: #2a2a2a; --nav: #121212; --input: #262626; --input-focus: #333333;
    --hover: #222222; --shadow: rgba(0,0,0,0.6);
  }
  * { box-sizing: border-box; }
  html, body { width: 100%; overflow-x: hidden; }
  body {
    margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: var(--bg); color: var(--text); transition: background .2s, color .2s;
  }
  a { color: #0095f6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .navbar {
    background: var(--nav); border-bottom: 1px solid var(--border);
    padding: 12px 24px; display: flex; justify-content: space-between; align-items: center;
    position: sticky; top: 0; z-index: 100; flex-wrap: wrap; gap: 8px;
  }
  .navbar .logo {
    font-family: 'Grand Hotel', cursive, sans-serif; font-size: 26px; font-weight: 700;
    background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    flex-shrink: 0;
  }
  .navbar .links { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
  .navbar .links a { margin-left: 12px; font-weight: 500; position: relative; }
  .icon-btn { background: none; border: none; cursor: pointer; font-size: 18px; padding: 6px 10px;
    border-radius: 8px; color: var(--text); transition: background .15s; }
  .icon-btn:hover { background: var(--hover); }
  .badge { background: #dc2743; color: #fff; font-size: 10px; border-radius: 8px;
    padding: 1px 6px; margin-left: 4px; font-weight: 700; }
  .container { width: 75%; max-width: 1400px; min-width: 280px; margin: 24px auto; padding: 0 16px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px;
    margin-bottom: 20px; overflow: hidden; transition: background .2s, border-color .2s; }
  .card-header { display: flex; align-items: center; padding: 14px 20px; gap: 12px; }
  .avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover;
    border: 2px solid var(--card); box-shadow: 0 0 0 2px #dc2743; flex-shrink: 0; }
  .avatar.sm { width: 32px; height: 32px; }
  .username { font-weight: 600; font-size: 15px; }
  .time { color: var(--muted); font-size: 12px; }
  .post-image { width: 100%; height: auto; max-height: 720px; object-fit: cover;
    display: block; background: var(--hover); }
  .post-actions { padding: 12px 20px 6px; font-size: 24px; display: flex; gap: 16px; }
  .post-body { padding: 4px 20px 14px; font-size: 15px; }
  .caption { margin: 0 0 6px; }
  .likes { font-weight: 600; margin: 4px 0; }
  .comments { padding: 0 20px 16px; }
  .comment { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--hover); }
  .comment .body { flex: 1; font-size: 14px; min-width: 0; word-wrap: break-word; }
  .comment-form { display: flex; gap: 8px; padding: 12px 20px; border-top: 1px solid var(--hover); background: var(--input); }
  .comment-form input[type=text] {
    flex: 1; min-width: 0; border: 1px solid var(--border); border-radius: 20px;
    padding: 10px 16px; font-size: 14px; outline: none; background: var(--card); color: var(--text);
  }
  .comment-form input[type=text]:focus { border-color: var(--muted); }
  .comment-form button { background: #0095f6; color: #fff; border: none; padding: 10px 20px;
    border-radius: 20px; font-weight: 600; cursor: pointer; font-size: 14px; flex-shrink: 0; }
  .comment-form button:hover { background: #0077cc; }
  .stories { background: var(--card); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px 12px; margin-bottom: 20px; display: flex; gap: 16px; overflow-x: auto;
    scrollbar-width: thin; }
  .stories::-webkit-scrollbar { height: 6px; }
  .stories::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  .story-circle { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center;
    gap: 8px; cursor: pointer; width: 84px; text-align: center; transition: transform .15s; }
  .story-circle:hover { transform: scale(1.04); }
  .story-ring { width: 76px; height: 76px; border-radius: 50%; padding: 3px;
    background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
    display: flex; align-items: center; justify-content: center; }
  .story-ring img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover;
    border: 2px solid var(--card); }
  .story-name { font-size: 12px; color: var(--text); max-width: 80px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .story-circle.your-story .story-ring { position: relative; background: var(--border); }
  .story-circle.your-story .story-ring img { opacity: 0.55; }
  .story-circle.your-story .story-plus {
    position: absolute; right: -2px; bottom: -2px; width: 24px; height: 24px;
    border-radius: 50%; background: #0095f6; color: #fff; font-size: 18px; line-height: 1;
    font-weight: 700; display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--card);
  }
  .composer { background: var(--card); border: 1px solid var(--border); border-radius: 8px;
    padding: 16px 20px; margin-bottom: 20px; }
  .composer-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .composer input[type=text] {
    width: 100%; border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px;
    font-size: 15px; background: var(--input); color: var(--text); outline: none;
    margin-bottom: 10px; font-family: inherit;
  }
  .composer input[type=text]:focus { border-color: var(--muted); background: var(--input-focus); }
  .composer-footer { display: flex; justify-content: flex-end; }
  .composer button[type=submit] { background: #0095f6; color: #fff; border: none;
    padding: 10px 24px; border-radius: 20px; font-weight: 600; cursor: pointer; font-size: 14px; }
  .composer button[type=submit]:hover { background: #0077cc; }
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
    padding: 20px;
  }
  .login-card { background: #fff; border-radius: 16px; padding: 40px 32px; width: 100%;
    max-width: 380px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; }
  .login-logo { font-family: 'Grand Hotel', cursive, sans-serif; font-size: 42px;
    background: linear-gradient(45deg, #f09433, #dc2743, #bc1888);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    margin: 0 0 8px; }
  .login-tagline { color: #8e8e8e; font-size: 14px; margin-bottom: 24px; }
  .login-card input {
    width: 100%; padding: 12px 14px; margin-bottom: 10px; border: 1px solid #dbdbdb;
    border-radius: 8px; font-size: 14px; background: #fafafa; outline: none;
  }
  .login-card input:focus { border-color: #a8a8a8; background: #fff; }
  .login-card button {
    width: 100%; padding: 12px; background: linear-gradient(45deg, #f09433, #dc2743);
    color: #fff; border: none; border-radius: 8px; font-weight: 700; font-size: 15px;
    cursor: pointer; margin-top: 8px;
  }
  .login-card button:hover { opacity: .92; }
  .divider { display: flex; align-items: center; gap: 12px; color: #8e8e8e;
    font-size: 12px; margin: 20px 0; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #dbdbdb; }
  .profile-head { display: flex; gap: 28px; padding: 28px; align-items: center; }
  .profile-head img { width: 110px; height: 110px; border-radius: 50%; flex-shrink: 0; }
  .profile-stats { display: flex; gap: 28px; margin: 12px 0; font-size: 15px; flex-wrap: wrap; }
  .profile-stats b { font-weight: 700; }
  .welcome-banner {
    background: linear-gradient(45deg, rgba(240,148,51,0.12), rgba(220,39,67,0.12));
    border: 1px solid rgba(220,39,67,0.25); border-radius: 8px; padding: 14px 18px;
    margin: 0 28px 28px; font-size: 15px; color: var(--text);
  }
  .actions-row { display: flex; gap: 12px; padding: 0 28px 28px; flex-wrap: wrap; }
  .actions-row a {
    display: inline-block; padding: 12px 24px; border-radius: 8px; font-weight: 600; color: #fff;
    background: linear-gradient(45deg, #f09433, #dc2743);
  }
  .actions-row a.secondary { background: var(--hover); color: var(--text); }
  .dm-list { padding: 0 20px 20px; }
  .dm {
    display: flex; gap: 12px; padding: 14px 16px; border: 1px solid var(--border);
    border-radius: 8px; margin-bottom: 10px; background: var(--input);
  }
  .dm.unread { border-color: #dc2743; background: rgba(220,39,67,0.06); }
  .dm .body { flex: 1; min-width: 0; }
  .dm .from { font-weight: 600; font-size: 14px; }
  .dm .text { font-size: 14px; margin-top: 4px; word-wrap: break-word; }
  .dm .time { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .dm-form { padding: 0 20px 20px; display: flex; gap: 8px; flex-wrap: wrap; }
  .dm-form select, .dm-form input[type=text] {
    padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--input); color: var(--text); font-size: 14px; outline: none;
  }
  .dm-form select { min-width: 140px; }
  .dm-form input[type=text] { flex: 1; min-width: 200px; }
  .dm-form button {
    background: #0095f6; color: #fff; border: none; padding: 10px 20px;
    border-radius: 8px; font-weight: 600; cursor: pointer;
  }
  .section-title {
    padding: 20px 28px 10px; font-weight: 700; font-size: 17px;
    display: flex; align-items: center; gap: 8px;
  }
  .story-modal {
    display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.9);
    z-index: 1000; align-items: center; justify-content: center; padding: 20px;
  }
  .story-modal.open { display: flex; }
  .story-modal-inner { max-width: 480px; width: 100%; position: relative; }
  .story-modal-inner img { width: 100%; border-radius: 12px; display: block; }
  .story-modal-name { color: #fff; text-align: center; margin-top: 12px; font-weight: 600; }
  .story-close { position: absolute; top: -40px; right: 0; background: none; border: none;
    color: #fff; font-size: 28px; cursor: pointer; line-height: 1; }
  .empty-note { color: var(--muted); font-size: 14px; padding: 8px 0; }
  @media (min-width: 1200px) { .container { width: 75%; } }
  @media (min-width: 900px) and (max-width: 1199px) {
    .container { width: 78%; max-width: 1000px; } .post-image { max-height: 600px; }
  }
  @media (min-width: 640px) and (max-width: 899px) {
    .container { width: 90%; max-width: 720px; }
    .navbar { padding: 10px 16px; }
    .post-image { max-height: 520px; }
    .card-header { padding: 12px 16px; }
    .post-actions { padding: 10px 16px 4px; font-size: 22px; }
    .post-body { padding: 4px 16px 12px; }
    .comments { padding: 0 16px 16px; }
    .comment-form { padding: 10px 16px; }
    .profile-head { gap: 20px; padding: 22px; }
    .profile-head img { width: 90px; height: 90px; }
    .welcome-banner { margin: 0 22px 22px; }
    .actions-row { padding: 0 22px 22px; }
    .section-title { padding: 18px 22px 8px; }
    .dm-list { padding: 0 16px 16px; }
    .dm-form { padding: 0 16px 16px; }
  }
  @media (max-width: 639px) {
    .container { width: 100%; padding: 0 8px; margin: 12px auto; }
    .navbar { padding: 8px 12px; }
    .navbar .logo { font-size: 22px; }
    .navbar .links a { margin-left: 8px; font-size: 14px; }
    .icon-btn { padding: 4px 8px; font-size: 16px; }
    .card { border-radius: 6px; margin-bottom: 12px; }
    .card-header { padding: 10px 12px; gap: 10px; }
    .avatar { width: 38px; height: 38px; }
    .avatar.sm { width: 28px; height: 28px; }
    .username { font-size: 14px; }
    .post-image { max-height: 480px; }
    .post-actions { padding: 10px 12px 4px; font-size: 20px; gap: 12px; }
    .post-body { padding: 4px 12px 12px; font-size: 14px; }
    .comments { padding: 0 12px 12px; }
    .comment-form { padding: 8px 12px; gap: 6px; }
    .comment-form input[type=text] { padding: 8px 12px; font-size: 13px; }
    .comment-form button { padding: 8px 14px; font-size: 13px; }
    .stories { padding: 12px 8px; gap: 10px; margin-bottom: 12px; }
    .story-circle { width: 72px; }
    .story-ring { width: 64px; height: 64px; padding: 2px; }
    .story-name { font-size: 11px; max-width: 68px; }
    .story-circle.your-story .story-plus { width: 20px; height: 20px; font-size: 14px; }
    .composer { padding: 12px; border-radius: 6px; margin-bottom: 12px; }
    .composer input[type=text] { padding: 10px 12px; font-size: 14px; }
    .composer button[type=submit] { padding: 8px 18px; font-size: 13px; }
    .login-card { padding: 32px 24px; border-radius: 12px; }
    .login-logo { font-size: 36px; }
    .profile-head { flex-direction: column; gap: 12px; padding: 20px 16px; text-align: center; }
    .profile-head img { width: 84px; height: 84px; }
    .profile-stats { justify-content: center; gap: 20px; font-size: 14px; }
    .welcome-banner { margin: 0 16px 16px; padding: 12px 14px; font-size: 13px; }
    .actions-row { padding: 0 16px 16px; }
    .section-title { padding: 16px 16px 8px; font-size: 15px; }
    .dm-list { padding: 0 12px 12px; }
    .dm-form { padding: 0 12px 12px; }
    .dm-form select, .dm-form input[type=text], .dm-form button { width: 100%; min-width: 0; }
    .story-modal-inner { max-width: 100%; }
    .story-close { top: -36px; font-size: 24px; }
  }
`;

app.get('/', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (user) return res.redirect('/account');
    return res.redirect('/login');
});

app.get('/feed', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.redirect('/login');

    // Show every post except the user's own. Their own posts live on their profile.
    const posts = db.prepare(
        "SELECT * FROM posts WHERE username != ? ORDER BY created_at DESC"
    ).all(user.username);

    const ownStory = db.prepare(
        "SELECT * FROM stories WHERE username = ? ORDER BY created_at DESC LIMIT 1"
    ).get(user.username);

    const friendStories = db.prepare(
        "SELECT * FROM stories WHERE username != ? ORDER BY created_at DESC"
    ).all(user.username);

    // De-duplicate so each friend appears once in the stories row
    const seen = new Set();
    const uniqueFriendStories = [];
    for (const s of friendStories) {
        if (seen.has(s.username)) continue;
        seen.add(s.username);
        uniqueFriendStories.push(s);
    }

    // Group comments by post
    const commentsByPost = {};
    for (const p of posts) {
        commentsByPost[p.id] = db.prepare(
            "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC"
        ).all(p.id);
    }

    // Unread messages badge
    const unread = db.prepare(
        "SELECT COUNT(*) AS c FROM messages WHERE to_user = ? AND is_read = 0"
    ).get(user.username).c;

    renderFeed(req, res, user, posts, commentsByPost, ownStory, uniqueFriendStories, unread);
});

function renderFeed(req, res, user, posts, commentsByPost, ownStory, friendStories, unread) {
    const displayName = escapeHtml(user.display_name || user.username);
    const avatarUrl = user.avatar;

    const yourStoryImage = ownStory ? ownStory.image : user.avatar;
    const yourStoryHtml = `
        <div class="story-circle your-story"
             data-image="${yourStoryImage}"
             data-name="Your story">
            <div class="story-ring">
                <img src="${yourStoryImage}" alt="">
                <span class="story-plus">+</span>
            </div>
            <div class="story-name">Your story</div>
        </div>
    `;

    const friendStoriesHtml = friendStories.map(s => {
        const friend = db.prepare("SELECT * FROM users WHERE username = ?").get(s.username);
        const friendAvatar = friend ? friend.avatar : 'https://i.pravatar.cc/150?u=' + encodeURIComponent(s.username);
        return `
            <div class="story-circle"
                 data-image="${s.image}"
                 data-name="${escapeHtml(s.username)}">
                <div class="story-ring">
                    <img src="${friendAvatar}" alt="">
                </div>
                <div class="story-name">${escapeHtml(s.username)}</div>
            </div>
        `;
    }).join('');

    const postsHtml = posts.map(p => {
        const comments = commentsByPost[p.id] || [];
        const commentsHtml = comments.map(c => {
            // Every piece of user-submitted content is escaped before it goes
            // into the page. This is what stops stored XSS dead in its tracks.
            return `
            <div class="comment">
                <img class="avatar sm" src="https://i.pravatar.cc/60?u=${encodeURIComponent(c.username)}" alt="">
                <div class="body">
                    <b>${escapeHtml(c.username)}</b>
                    <span class="time"> · ${timeAgo(c.created_at)}</span>
                    <div>${escapeHtml(c.comment)}</div>
                </div>
            </div>`;
        }).join('');

        const postAvatar = 'https://i.pravatar.cc/150?u=' + encodeURIComponent(p.username);

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
                <input type="text" name="comment" placeholder="Add a comment..." autocomplete="off" required maxlength="500">
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
        <script src="/theme.js" defer></script>
        <script src="/stories.js" defer></script>
        <style>${CSS}</style>
    </head>
    <body>
        <div class="navbar">
            <div class="logo">Socially</div>
            <div class="links">
                <a href="/account">Profile</a>
                <a href="/messages">Messages${unread ? `<span class="badge">${unread}</span>` : ''}</a>
                <a href="/logout">Logout</a>
                <button id="theme-toggle" class="icon-btn" type="button">🌙</button>
            </div>
        </div>
        <div class="container">
            <div class="stories">
                ${yourStoryHtml}
                ${friendStoriesHtml || ''}
            </div>

            <form class="composer" action="/post" method="POST">
                <div class="composer-header">
                    <img src="${avatarUrl}" class="avatar sm" alt="">
                    <b>${displayName}</b>
                </div>
                <input type="text" name="caption" placeholder="What's on your mind, ${displayName}?" required autocomplete="off" maxlength="500">
                <div class="composer-footer">
                    <button type="submit">Post</button>
                </div>
            </form>

            ${postsHtml || '<div class="card" style="padding:24px; text-align:center; color:var(--muted);">No posts from others yet.</div>'}
        </div>

        <div id="story-modal" class="story-modal">
            <div class="story-modal-inner">
                <button id="story-close" class="story-close" type="button">×</button>
                <img id="story-modal-img" src="" alt="">
                <div id="story-modal-name" class="story-modal-name"></div>
            </div>
        </div>
    </body>
    </html>`);
}

app.get('/login', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (user) return res.redirect('/account');
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Socially · Log in</title>
        <link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet">
        <script src="/theme.js" defer></script>
        <style>${CSS}</style>
    </head>
    <body>
        <div class="login-wrap">
            <div class="login-card">
                <h1 class="login-logo">Socially</h1>
                <p class="login-tagline">Sign in to see photos &amp; comments from your friends.</p>
                <form action="/login" method="POST">
                    <input type="text" name="username" placeholder="Username" required autocomplete="off">
                    <input type="password" name="password" placeholder="Password" required autocomplete="off">
                    <button type="submit">Log in</button>
                </form>
                <div class="divider">OR</div>
                <div style="font-size:13px;color:#8e8e8e;">Forgot password? · Sign up</div>
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
        console.log(`[LOGIN FAIL] ${username}`);
        return res.status(401).send(
            `<body style="font-family:sans-serif;text-align:center;padding:60px;">
             <h2>❌ Invalid credentials</h2><a href="/login">Try again</a></body>`);
    }

    // Generate a random session ID and save it
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 60;
    db.prepare("INSERT INTO sessions (session_id, username, expires) VALUES (?, ?, ?)")
      .run(sessionId, username, expires);

    // Cookie is locked down: JavaScript can't read it, it only goes over HTTPS,
    // and it's never sent on cross-site requests.
    res.cookie('session_id', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 3600000
    });

    console.log(`[LOGIN OK] user=${username} session=${sessionId.substring(0,12)}... (HARDENED)`);

    res.redirect('/account');
});

app.get('/account', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.redirect('/login');

    const unread = db.prepare(
        "SELECT COUNT(*) AS c FROM messages WHERE to_user = ? AND is_read = 0"
    ).get(user.username).c;

    const myPosts = db.prepare(
        "SELECT * FROM posts WHERE username = ? ORDER BY created_at DESC"
    ).all(user.username);

    const commentsByPost = {};
    for (const p of myPosts) {
        commentsByPost[p.id] = db.prepare(
            "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC"
        ).all(p.id);
    }

    const myPostsHtml = myPosts.map(p => {
        const comments = commentsByPost[p.id] || [];
        const commentsHtml = comments.map(c => {
            // Same escape treatment here — no way for user input to become code.
            return `
            <div class="comment">
                <img class="avatar sm" src="https://i.pravatar.cc/60?u=${encodeURIComponent(c.username)}" alt="">
                <div class="body">
                    <b>${escapeHtml(c.username)}</b>
                    <span class="time"> · ${timeAgo(c.created_at)}</span>
                    <div>${escapeHtml(c.comment)}</div>
                </div>
            </div>`;
        }).join('');

        return `
        <div class="card">
            <div class="card-header">
                <img class="avatar" src="${user.avatar}" alt="">
                <div>
                    <div class="username">${escapeHtml(p.username)}</div>
                    <div class="time">${timeAgo(p.created_at)}</div>
                </div>
            </div>
            <img class="post-image" src="${p.image}" alt="">
            <div class="post-body">
                <div class="likes">${p.likes.toLocaleString()} likes</div>
                <p class="caption"><b>${escapeHtml(p.username)}</b> ${escapeHtml(p.caption)}</p>
            </div>
            <div class="comments">
                ${commentsHtml || '<div class="time" style="padding:8px 0;">No comments yet.</div>'}
            </div>
        </div>`;
    }).join('');

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Socially · ${escapeHtml(user.username)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet">
        <script src="/theme.js" defer></script>
        <style>${CSS}</style>
    </head>
    <body>
        <div class="navbar">
            <div class="logo">Socially</div>
            <div class="links">
                <a href="/feed">Feed</a>
                <a href="/messages">Messages${unread ? `<span class="badge">${unread}</span>` : ''}</a>
                <a href="/logout">Logout</a>
                <button id="theme-toggle" class="icon-btn" type="button">🌙</button>
            </div>
        </div>
        <div class="container">
            <div class="card">
                <div class="profile-head">
                    <img src="${user.avatar}" alt="">
                    <div>
                        <div style="font-size:24px;font-weight:600;">${escapeHtml(user.display_name)}</div>
                        <div style="color:var(--muted);font-size:15px;">@${escapeHtml(user.username)}</div>
                        <div class="profile-stats">
                            <div><b>${user.followers.toLocaleString()}</b> followers</div>
                            <div><b>${user.following}</b> following</div>
                        </div>
                    </div>
                </div>
                <div style="padding:0 28px 18px;color:var(--muted);font-size:15px;">${escapeHtml(user.bio)}</div>
                <div class="welcome-banner">
                    👋 Welcome back, <b>${escapeHtml(user.display_name)}</b>. This profile is only visible to you.
                </div>
                <div class="actions-row">
                    <a href="/feed">Open the Feed →</a>
                    <a href="/messages" class="secondary">Messages ${unread ? `(${unread} new)` : ''}</a>
                </div>
            </div>

            <div class="section-title">📸 My Posts</div>
            ${myPostsHtml || '<div class="card" style="padding:20px; text-align:center; color:var(--muted);">You have no posts yet.</div>'}
        </div>
    </body>
    </html>`);
});

app.get('/messages', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.redirect('/login');

    const inbox = db.prepare(
        "SELECT * FROM messages WHERE to_user = ? ORDER BY created_at DESC"
    ).all(user.username);

    // Mark everything as read once the inbox is opened
    db.prepare("UPDATE messages SET is_read = 1 WHERE to_user = ?").run(user.username);

    const inboxHtml = inbox.map(m => `
        <div class="dm ${m.is_read ? '' : 'unread'}">
            <img class="avatar sm" src="https://i.pravatar.cc/60?u=${encodeURIComponent(m.from_user)}" alt="">
            <div class="body">
                <div class="from">${escapeHtml(m.from_user)}</div>
                <div class="text">${escapeHtml(m.body)}</div>
                <div class="time">${timeAgo(m.created_at)}</div>
            </div>
        </div>
    `).join('');

    // Build the recipient dropdown
    const allUsers = db.prepare("SELECT username FROM users WHERE username != ?").all(user.username);
    const optionsHtml = allUsers.map(u =>
        `<option value="${escapeHtml(u.username)}">${escapeHtml(u.username)}</option>`
    ).join('');

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Socially · Messages</title>
        <link href="https://fonts.googleapis.com/css2?family=Grand+Hotel&display=swap" rel="stylesheet">
        <script src="/theme.js" defer></script>
        <style>${CSS}</style>
    </head>
    <body>
        <div class="navbar">
            <div class="logo">Socially</div>
            <div class="links">
                <a href="/feed">Feed</a>
                <a href="/account">Profile</a>
                <a href="/logout">Logout</a>
                <button id="theme-toggle" class="icon-btn" type="button">🌙</button>
            </div>
        </div>
        <div class="container">
            <div class="card">
                <div class="section-title">📥 Inbox — ${escapeHtml(user.username)}</div>
                <div class="dm-list">
                    ${inboxHtml || '<div class="empty-note" style="padding:0 4px;">No messages yet.</div>'}
                </div>
            </div>

            <div class="card">
                <div class="section-title">✍️ Send a Message</div>
                <form class="dm-form" action="/messages/send" method="POST">
                    <select name="to_user" required>
                        <option value="">Choose recipient…</option>
                        ${optionsHtml}
                    </select>
                    <input type="text" name="body" placeholder="Write a message..." required autocomplete="off" maxlength="500">
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    </body>
    </html>`);
});

app.post('/messages/send', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.redirect('/login');

    const { to_user, body } = req.body;
    if (!to_user || !body) return res.redirect('/messages');

    // Cap length so nobody can dump a novel into the database
    const safeBody = body.slice(0, 500);

    db.prepare("INSERT INTO messages (from_user, to_user, body, created_at, is_read) VALUES (?, ?, ?, ?, 0)")
      .run(user.username, to_user, safeBody, Date.now());

    res.redirect('/messages');
});

app.get('/logout', (req, res) => {
    const sid = req.cookies.session_id;
    if (sid) db.prepare("DELETE FROM sessions WHERE session_id = ?").run(sid);
    res.clearCookie('session_id');
    res.redirect('/login');
});

app.post('/post', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) return res.redirect('/login');
    const caption = (req.body.caption || '').trim().slice(0, 500);
    if (!caption) return res.redirect('/feed');
    const image = 'https://picsum.photos/800/500?random=' + Date.now();
    db.prepare("INSERT INTO posts (username, image, caption, likes, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(user.username, image, caption, 0, Date.now());
    res.redirect('/feed');
});

app.post('/comment', (req, res) => {
    const { post_id, comment } = req.body;
    const user = getAuthenticatedUser(req);
    const finalUser = user ? user.username : 'Guest';

    // Trim to 500 characters before storing. Even with output encoding in
    // place, this is one more layer that limits the damage a payload can do.
    const safeComment = (comment || '').slice(0, 500);

    console.log(`[COMMENT] by=${finalUser} post=${post_id} len=${safeComment.length} preview=${safeComment.substring(0,80)}`);

    db.prepare("INSERT INTO comments (post_id, username, comment, created_at) VALUES (?, ?, ?, ?)")
      .run(post_id, finalUser, safeComment, Date.now());
    res.redirect('/feed');
});

// This route used to toggle the mitigation on and off.
// In the hardened build there's nothing to toggle, so we just redirect
// and log a warning if anyone tries to hit it.
app.get('/toggle-mitigation', (req, res) => {
    console.log('[BLOCKED] Attempt to toggle mitigation — this build is permanently hardened.');
    res.redirect('/feed');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} — HARDENED BUILD (no vulnerable mode)`));