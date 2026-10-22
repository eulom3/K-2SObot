<?php
require 'config.php';
require 'auth.php';
if ($ME['role'] !== 'officer') { http_response_code(403); exit('Officers only.'); }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    db()->prepare('UPDATE members SET status = ? WHERE id = ?')
        ->execute([$_POST['verdict'], (int)$_POST['id']]);
    if (defined('DISCORD_WEBHOOK') && DISCORD_WEBHOOK) {
        $vm = db()->prepare('SELECT username, koc_id FROM members WHERE id = ?');
        $vm->execute([(int)$_POST['id']]); $vm = $vm->fetch();
        $emoji = $_POST['verdict'] === 'approved' ? '✅' : '❌';
        @file_get_contents(DISCORD_WEBHOOK, false, stream_context_create(['http' => [
            'method' => 'POST', 'header' => 'Content-Type: application/json',
            'content' => json_encode(['content' => $emoji.' **'.$_POST['verdict'].'** — '.$vm['username'].' (KoC ID '.$vm['koc_id'].')']])]));
    }
    header('Location: admin.php'); exit;
}
$pending  = db()->query('SELECT * FROM members WHERE status = "pending" ORDER BY created_at')->fetchAll();
$approved = db()->query('SELECT * FROM members WHERE status = "approved" ORDER BY username')->fetchAll();
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Officer Panel — The Jedi Faction</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap" rel="stylesheet">
<link rel="icon" href="emblem.svg">
<link rel="stylesheet" href="style.css"></head><body>
<header class="topbar"><div class="crest"><img src="emblem.svg" width="46" height="46" alt="Jedi Faction emblem"></div><div class="brand">THE JEDI FACTION<small>⟡ ALLIANCE ADMIN PANEL ⟡</small></div></header>
<div class="wrap" style="max-width:820px">
<div class="callout">Verify each applicant: (1) open their stats page, (2) confirm The Jedi Faction is listed as their alliance, (3) confirm their verification PM with the code arrived in-game from that account, then approve.</div>
<?php foreach ($pending as $m): ?>
<div class="panel"><h3>⏳ <?=$m['username']?> <span style="float:right;color:var(--gold);letter-spacing:3px"><?=$m['verify_code']?></span></h3><div class="inner">
  <div class="stat-row"><span>KoC player</span><b><a href="https://www.kingsofchaos.com/stats.php?id=<?=$m['koc_id']?>" target="_blank">ID <?=$m['koc_id']?> ↗</a></b></div>
  <div class="stat-row"><span>Requested</span><b><?=$m['created_at']?></b></div>
  <form method="post" style="margin-top:12px">
    <input type="hidden" name="id" value="<?=$m['id']?>">
    <button class="btn green" name="verdict" value="approved">✔ APPROVE</button>
    <button class="btn" name="verdict" value="rejected" style="background:#333;border-color:#555;margin-left:8px">✘ REJECT</button>
  </form>
</div></div>
<?php endforeach; if (!$pending) echo '<div class="panel"><div class="inner">No pending applicants. The Force is calm.</div></div>'; ?>
<div class="panel"><h3>⚔ APPROVED MEMBERS (<?=count($approved)?>)</h3><div class="inner">
<?php foreach ($approved as $m): ?><div class="stat-row"><span><?=$m['username']?></span><b>KoC ID <?=$m['koc_id']?> <?= $m['role']==='officer'?'· <span style="color:var(--gold)">OFFICER</span>':'' ?></b></div><?php endforeach; ?>
</div></div>
<p><a href="index.php">← Back to portal</a></p>
</div></body></html>
