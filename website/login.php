<?php
require 'config.php';
session_start();
$err = ''; $info = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $mode = $_POST['mode'] ?? 'login';
    if ($mode === 'register') {
        $u = trim($_POST['username'] ?? ''); $p = $_POST['password'] ?? '';
        $koc = (int)($_POST['koc_id'] ?? 0);
        if (!preg_match('/^[A-Za-z0-9_]{3,32}$/', $u)) $err = 'Username: 3-32 chars, letters/numbers/underscore.';
        elseif (strlen($p) < 8) $err = 'Password must be at least 8 characters.';
        elseif ($koc <= 0) $err = 'Enter your numeric KoC player ID (your stats.php?id= number).';
        else {
            $code = strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
            try {
                db()->prepare('INSERT INTO members (username, pass_hash, koc_id, verify_code) VALUES (?,?,?,?)')
                    ->execute([$u, password_hash($p, PASSWORD_DEFAULT), $koc, $code]);
                $info = "Account created and <b>pending approval</b>. Final step: send an in-game PM from your KoC account to the alliance admin <b>".KOC_ADMIN_NAME."</b> containing this code: <div style='font-size:26px;color:var(--gold);letter-spacing:4px;margin:10px 0'>$code</div> Then wait for an alliance admin to approve you here. Your player page: <a href='https://www.kingsofchaos.com/stats.php?id=$koc' target='_blank'>stats.php?id=$koc</a>";
            } catch (PDOException $e) {
                $err = (stripos($e->getMessage(), "doesn't exist") !== false)
                    ? 'Database error: the members table is missing — import schema.sql (see DEPLOY.md step 2).'
                    : 'Database error: '.$e->getMessage();
            }
        }
    } else {
        $stmt = db()->prepare('SELECT * FROM members WHERE username = ?');
        $stmt->execute([trim($_POST['username'] ?? '')]);
        $m = $stmt->fetch();
        if ($m && password_verify($_POST['password'] ?? '', $m['pass_hash'])) {
            if ($m['status'] !== 'approved') { $err = 'Account not yet approved — an alliance admin must verify your in-game PM first.'; }
            else { $_SESSION['uid'] = $m['id']; header('Location: ' . ($_GET['next'] ?? 'index.php')); exit; }
        } else $err = 'Wrong username or password.';
    }
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Enter the Faction — The Jedi Faction</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap" rel="stylesheet">
<link rel="icon" href="emblem.svg">
<link rel="stylesheet" href="style.css"></head><body class="gate">
<header class="topbar"><div class="crest"><img src="emblem.svg" width="46" height="46" alt="Jedi Faction emblem"></div><div class="brand">THE JEDI FACTION
<small><span style="color:var(--jedi)">⟡</span> THE GATE — MEMBERS ONLY <span style="color:var(--jedi)">⟡</span></small></div></header>
<div class="wrap" style="max-width:520px">
<div class="panel"><h3>⟡ PROVE YOURSELF</h3><div class="inner">
<?php if ($err): ?><div class="callout" style="border-color:#7a1212;background:#2a0f0f;color:#e6a8a8">⚠ <?=$err?></div><?php endif; ?>
<?php if ($info): ?><div class="callout">✅ <?=$info?></div><?php endif; ?>
<form method="post">
  <input type="hidden" name="mode" value="login">
  <p><input name="username" placeholder="Username" style="width:100%;padding:9px;background:#120e0e;border:1px solid var(--border);color:var(--text);border-radius:3px"></p>
  <p><input name="password" type="password" placeholder="Password" style="width:100%;padding:9px;background:#120e0e;border:1px solid var(--border);color:var(--text);border-radius:3px"></p>
  <button class="btn green">ENTER</button>
</form>
<hr style="border:none;border-top:1px solid var(--border);margin:18px 0">
<h4 style="color:var(--gold);margin-bottom:10px">NEW RECRUIT? JOIN THE FACTION</h4>
<form method="post">
  <input type="hidden" name="mode" value="register">
  <p><input name="username" placeholder="Choose username" style="width:100%;padding:9px;background:#120e0e;border:1px solid var(--border);color:var(--text);border-radius:3px"></p>
  <p><input name="password" type="password" placeholder="Password (8+ chars)" style="width:100%;padding:9px;background:#120e0e;border:1px solid var(--border);color:var(--text);border-radius:3px"></p>
  <p><input name="koc_id" placeholder="Your KoC player ID (stats.php?id=NUMBER)" style="width:100%;padding:9px;background:#120e0e;border:1px solid var(--border);color:var(--text);border-radius:3px"></p>
  <button class="btn">REQUEST MEMBERSHIP</button>
</form>
<p class="tmeta" style="margin-top:12px">Membership is verified by an in-game PM from your KoC account to the Faction's alliance admin — only current members of The Jedi Faction are admitted.</p>
</div></div></div>
<footer><div class="skull">☠ ⚔ ☠</div><p>THE JEDI FACTION — fan-run portal, not affiliated with Kings of Chaos, LLC.</p></footer>
</body></html>
