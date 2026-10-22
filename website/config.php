<?php
ob_start(); // absorb any stray output so headers/sessions/redirects always work

// ---- settings loader: BOM-proof, whitespace-proof, editor-proof ----
function jf_setting($key, $default = '') {
    static $s = null;
    if ($s === null) {
        $s = [];
        $raw = @file(__DIR__ . '/settings.txt') ?: [];
        foreach ($raw as $line) {
            $line = preg_replace('/^\xEF\xBB\xBF/', '', trim($line)); // strip BOM
            if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
            list($k, $v) = explode('=', $line, 2);
            $s[trim($k)] = trim($v);
        }
    }
    return $s[$key] ?? $default;
}

define('DB_HOST', jf_setting('DB_HOST', 'localhost'));
define('DB_NAME', jf_setting('DB_NAME'));
define('DB_USER', jf_setting('DB_USER'));
define('DB_PASS', jf_setting('DB_PASS'));

// Shared secret your Discord bot / alliance script uses to push data into the site
define('BOT_TOKEN', jf_setting('BOT_TOKEN'));

// Optional: Discord webhook URL — the site pushes events (new approvals, new war targets) here
define('DISCORD_WEBHOOK', jf_setting('DISCORD_WEBHOOK'));

// The KoC alliance admin account that receives verification PMs
define('KOC_ADMIN_NAME', jf_setting('KOC_ADMIN_NAME', 'AllianceAdmin'));

function db() {
    static $pdo = null;
    if ($pdo === null) {
        $opts = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                 PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
        if (DB_NAME && DB_USER) {
            try {
                $pdo = new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
                               DB_USER, DB_PASS, $opts);
                $GLOBALS['DB_DRIVER'] = 'mysql';
            } catch (Exception $e) {
                $pdo = null; // fall through to SQLite
            }
        }
        if ($pdo === null) {
            $pdo = new PDO('sqlite:'.__DIR__.'/jf.sqlite', null, null, $opts);
            $GLOBALS['DB_DRIVER'] = 'sqlite';
            $pdo->exec("CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                pass_hash TEXT NOT NULL,
                koc_id INTEGER NOT NULL,
                role TEXT DEFAULT 'member',
                status TEXT DEFAULT 'pending',
                verify_code TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS shouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS war_targets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                koc_id INTEGER NOT NULL,
                target_name TEXT DEFAULT '',
                reason TEXT DEFAULT '',
                status TEXT DEFAULT 'active',
                added_by TEXT DEFAULT '',
                created_at TEXT DEFAULT (datetime('now')))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS tracker_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                koc_id INTEGER NOT NULL,
                metric TEXT NOT NULL,
                value TEXT NOT NULL,
                captured_at TEXT DEFAULT (datetime('now')))");
            $pdo->exec("CREATE TABLE IF NOT EXISTS intel_names (
                koc_id INTEGER PRIMARY KEY,
                name TEXT DEFAULT '')");
            $pdo->exec("CREATE TABLE IF NOT EXISTS steal_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                gold INTEGER NOT NULL,
                when_txt TEXT DEFAULT '',
                at TEXT DEFAULT (datetime('now')),
                UNIQUE(gold, when_txt))");
        }
    }
    return $pdo;
}

// timestamp expression for millisecond epochs, per driver
function ts_expr($millis_sql) {
    return ($GLOBALS['DB_DRIVER'] ?? 'mysql') === 'sqlite'
        ? "datetime($millis_sql/1000,'unixepoch')"
        : "FROM_UNIXTIME($millis_sql/1000)";
}
