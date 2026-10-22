<?php
require 'config.php';
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = trim($_POST['username'] ?? ''); $p = $_POST['password'] ?? '';
    $makeAdmin = !empty($_POST['admin']);
    if ($u && strlen($p) >= 8) {
        db()->prepare('UPDATE members SET pass_hash = ?, status = "approved", role = ? WHERE username = ?')
            ->execute([password_hash($p, PASSWORD_DEFAULT), $makeAdmin ? 'officer' : 'member', $u]);
        $msg = "Done: '$u' password set, account approved" . ($makeAdmin ? ", role = ADMIN" : "") . ". Sign in now — then DELETE this file.";
    } else $msg = 'Username + password (8+ chars) required.';
}
?>
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>fixpw — bootstrap</title>
<link rel="stylesheet" href="style.css"></head><body>
<div class="wrap" style="max-width:460px;margin-top:40px">
<div class="panel"><h3>⟡ fixpw — one-time bootstrap (no login needed)</h3><div class="inner">
<?php if ($msg): ?><p class="callout"><?=$msg?></p><?php endif; ?>
<p class="tmeta" style="margin-bottom:12px">Repairs a hand-made or stuck account so the normal sign-in flow works. Use it to bootstrap your first admin.</p>
<form method="post">
<p><input name="username" placeholder="Username" style="width:100%;padding:9px;background:#120e0e;border:1px solid #3d2c2c;color:#d8cfc4;border-radius:3px"></p>
<p><input name="password" type="password" placeholder="New password (8+ chars)" style="width:100%;padding:9px;background:#120e0e;border:1px solid #3d2c2c;color:#d8cfc4;border-radius:3px"></p>
<p><label style="font-size:13px;color:#d8cfc4"><input type="checkbox" name="admin" value="1" checked> Make this user an ADMIN (access to approval panel)</label></p>
<button class="btn green">SET &amp; APPROVE</button>
</form>
<p class="tmeta" style="margin-top:10px">DELETE THIS FILE after your admins can sign in normally.</p>
</div></div></div></body></html>