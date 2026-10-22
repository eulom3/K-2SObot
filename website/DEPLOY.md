# The Jedi Faction — Deployment Guide (CYBRANCEE + MEMBER GATE)
*Your site now has a members-only gate: registration requires a KoC player ID, and approval
requires an in-game verification PM — only real Jedi Faction members get in.*

---

## FILE MAP
- **Public**: `login.php` (the gate — this is your landing page)
- **Members only** (auto-redirect to login): `index.php`, `board.php`, `thread.php`, `guides.php`, `chat.php` (live chat room, 5s auto-refresh) + `chat_api.php` (its JSON feed)
- **Alliance admins only**: `admin.php` (approval queue + roster)
- **Config**: `config.php` (DB credentials), `schema.sql` (database table), `style.css`

---

## Step 1 — Domain (Cybrancee client area → Domains → Register)
e.g. `jedifaction.com` — assign as addon domain to your existing server.

## Step 2 — Database (cPanel)
1. **MySQL Databases** → create database `jedifaction`, create user, add user to DB with ALL PRIVILEGES
2. **phpMyAdmin** → select the DB → Import → upload `schema.sql` (or paste its contents into SQL tab). If you already imported before the chat existed, just run only the `CREATE TABLE shouts` statement from schema.sql to add the chat table.

## Step 3 — Configure
Edit `config.php`:
- `DB_NAME` / `DB_USER` / `DB_PASS` → from step 2
- `KOC_OFFICER_NAME` → the KoC alliance admin account that will receive verification PMs

Edit `thread.php` → replace `YOUR-GITHUB-USERNAME` in the `REPO` line (board comments backend; see step 5).

## Step 4 — Upload
cPanel File Manager → your domain's `public_html` → upload everything → extract.
Visit the domain — you should hit the gate immediately.

## Step 5 — Board comments (Utterances, free)
1. github.com → new **public** repo `jedifaction-board` → Settings → enable **Issues**
2. github.com/apps/utterances → Install → pick that repo
3. Put your GitHub username in `thread.php`'s `REPO` line

## Step 6 — SSL
cPanel → SSL/TLS (AutoSSL / Let's Encrypt) → run for the domain. Add to `.htaccess`:

    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

---

## HOW MEMBERSHIP WORKS
1. Applicant registers on `login.php` with username, password, and their **KoC player ID**
2. Site shows them a **6-character code** and instructs them to PM it in-game to the officer
3. An alliance admin opens `admin.php`, clicks the applicant's stats page link, confirms
   *The Jedi Faction* appears as their alliance **and** the code arrived in their in-game PM
4. Admin clicks **APPROVE** → member can log in everywhere

Promote someone to admin: in phpMyAdmin, set that member's `role` column to 'officer' (internal name — displays as admin throughout the site).

## SECURITY NOTES (rough draft — tighten before publicizing)
- Change `DB_PASS`, use a strong one; never commit `config.php` anywhere public
- Consider adding CSRF tokens to the admin approve/reject form
- The gate verifies membership at approval time — if a member leaves the alliance in-game,
  admins should remove them from the roster (phpMyAdmin → set status `rejected`)

---

## ROADMAP IDEAS (same panel styles, ask and I'll build)
- `roster.php` — live member list pulled from the members table
- `apply.php` — public recruiting page that feeds the same gate
- War-intel page (manual entries, officer-posted)
- Discord webhook: your bot announces new approvals/board posts to your server


---

## DISCORD BOT / ALLIANCE SCRIPT INTEGRATION
The site exposes `bot_api.php` for your bot (works from the same server or anywhere):

    Header:  X-Bot-Token: <BOT_TOKEN from config.php>

    POST {"action":"add_target","koc_id":12345,"target_name":"EnemyName","reason":"chained"}
    POST {"action":"clear_target","koc_id":12345}
    GET-ish POST {"action":"member_count"}

- War targets pushed this way appear instantly on the Target Board (`warroom.php`)
- Set `DISCORD_WEBHOOK` in `config.php` and the site will ping your Discord server when:
  an admin approves/rejects a member, or a new war target is added
- If you already have an alliance script that scans battlefield stats, point its output at
  `bot_api.php` and every tracked enemy lands on the Target Board automatically

### Node.js snippet for your bot
    fetch('https://yourdomain.com/bot_api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bot-Token': BOT_TOKEN },
      body: JSON.stringify({ action: 'add_target', koc_id: 12345, target_name: 'Enemy', reason: 'farm policy' })
    });

### If you already imported the schema
Run only the new `CREATE TABLE war_targets` statement (and the `shouts` table if you skipped it earlier).

## NEW PAGES IN THIS BUILD
- `apply.php` — PUBLIC recruiting front door (link it from your Discord, KoC alliance page, recruit link)
- `warroom.php` — live Target Board (10s auto-refresh, admin/bot-fed)
- `roster.php` — faction roster with lightsaber rank blades (green recruit / blue member / purple admin)
- `login.php` — now themed as The Gate (battle-station watermark)
- Starfield background + hyperspace dividers site-wide


## TIV TRACKER INTEGRATION
Your alliance script's Tiv tracker feeds the Intel Feed page (`tracker.php`) via bot_api.php:

    POST {"action":"tracker_push","koc_id":12345,"metric":"tff","value":"1,240,000"}
    // or batch:
    POST {"action":"tracker_push","entries":[{"koc_id":123,"metric":"tff","value":"..."},{"koc_id":123,"metric":"sa","value":"..."}]}

Any metric name works — tff, sa, da, spy, sentry, gold, etc. The page always shows the
LATEST reading per player per metric. If your Tiv output needs a custom field mapping,
adjust the forwarder in your bot/script; the site side never changes.


## JFWARSCOUT (your userscript) — NATIVE INTEGRATION
The site now understands JFWarScout's boardPack() natively via `warscout_push`:
- TIV leaderboard rows land in the Intel Feed as metric `tiv` (with names)
- All 8 target stats (sa/da/spy/sentry/poison/antidote/theft/vigilance) land per player
- See JFWARSCOUT_PATCH.md for the 3-edit script patch (metadata @connect, config, pushToSite)
- This makes the domain the PERMANENT archive — jsonblob stays the fast in-game sync,
  but nothing is lost when blobs expire


## THE TRIANGLE: BOT <-> SCRIPT <-> DOMAIN
- SCRIPT -> DOMAIN: JFWarScout pushToSite() (warscout_push) — full intel, TIV, ledger
- BOT -> DOMAIN:  bot_api.php now has READ actions too:
  get_targets, get_pending, get_tiv_top, get_player, member_count (same X-Bot-Token)
- DOMAIN -> BOT:  DISCORD_WEBHOOK pings your server on approvals & new war targets
- BOT COMMANDS:   see BOT_INTEGRATION.js (discord.js v14): /targets /tiv /pending /whois
  + hourly applicant nag. Set env vars JF_SITE, JF_TOKEN, JF_OFFICER_CHANNEL_ID.


## NO MYSQL? NO PROBLEM — SQLITE AUTO-FALLBACK
If your Cybrancee container has no MySQL, the site detects the failed connection and
automatically creates `jf.sqlite` next to config.php. Nothing to import, nothing to configure
(just fill BOT_TOKEN / KOC_ADMIN_NAME). Tables self-create on first load.
Check which driver you're on: create a file `info.php` containing
`<?php require 'config.php'; echo $GLOBALS['DB_DRIVER'];`
visit it once, then delete it.


## SETTINGS LIVE IN settings.txt (NOT config.php)
Never edit config.php on the server — all configuration is in plain-text settings.txt:
BOT_TOKEN, KOC_ADMIN_NAME, DISCORD_WEBHOOK, and optional MySQL credentials.
config.php is byte-critical (headers/sessions); it now also runs ob_start() as a safety net.
Any editor, any BOM, any stray whitespace in settings.txt is harmless.


## YOUR DOMAIN
Primary: jfactiongaming.com — point it at your container (A record to 15.204.44.25, and have
Cybrancee reverse-proxy port 443 -> 10016 so https://jfactiongaming.com works without the :10016).
Until DNS lands, the IP:port address works for everything (script pushes, testing).
