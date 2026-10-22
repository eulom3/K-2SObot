<?php require 'auth.php'; ?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Roster — The Jedi Faction</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap" rel="stylesheet">
<link rel="icon" href="emblem.svg">
<link rel="stylesheet" href="style.css"></head>
<body class="">
<header class="topbar"><div class="crest"><img src="emblem.svg" width="46" height="46" alt="Jedi Faction emblem"></div><div class="brand">THE JEDI FACTION<small><span style="color:var(--jedi)">⟡</span> KINGS OF CHAOS ALLIANCE — ERA 23 <span style="color:var(--jedi)">⟡</span></small></div></header>
<nav>
  <a href="index.php" >COMMAND DECK</a>
  <a href="board.php" >MESSAGE BOARD</a>
  <a href="chat.php" >WAR ROOM CHAT</a>
  <a href="warroom.php" >TARGET BOARD</a>
  <a href="tracker.php" >INTEL FEED</a>
  <a href="roster.php" class="active">ROSTER</a>
  <a href="guides.php" >ERA 23 GUIDE</a>
  <a href="https://www.kingsofchaos.com" target="_blank">PLAY KOC ↗</a>
  <?php if ($ME['role'] === 'officer'): ?><a href="admin.php" style="color:var(--gold)">ADMIN PANEL</a><?php endif; ?>
  <a href="logout.php">LOGOUT (<?=$ME['username']?>)</a>
</nav>
<div class="wrap">
<div class="panel"><h3>⟡ FACTION ROSTER</h3><div class="inner">
<p class="tmeta" style="margin-bottom:10px">Blade colors: <span style="color:#3fbf7f">■ Recruit</span> · <span style="color:#4f8fd0">■ Member</span> · <span style="color:#9b59d0">■ Admin</span></p>
<?php
$all = db()->query('SELECT username, koc_id, role, created_at FROM members WHERE status = "approved" ORDER BY role DESC, username')->fetchAll();
foreach ($all as $m):
  $blade = $m['role'] === 'officer' ? 'sb-purple' : (date('U', strtotime($m['created_at'])) > date('U') - 14*86400 ? 'sb-green' : 'sb-blue');
?>
<div class="stat-row" style="align-items:center">
  <span><span class="saber-ava <?=$blade?>"><?=strtoupper(substr($m['username'],0,2))?></span>
  &nbsp; <?=$m['username']?> <?= $m['role']==='officer' ? '<b style="color:var(--gold)">· ADMIN</b>' : '' ?></span>
  <b><a href="https://www.kingsofchaos.com/stats.php?id=<?=$m['koc_id']?>" target="_blank">KoC ID <?=$m['koc_id']?> ↗</a></b>
</div>
<?php endforeach; ?>
</div></div>
</div>
<footer><div class="skull">☠ ⚔ ☠</div><p>THE JEDI FACTION — fan-run portal, not affiliated with Kings of Chaos, LLC.</p></footer>
</body></html>