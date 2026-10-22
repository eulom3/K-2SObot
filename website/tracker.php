<?php require 'auth.php'; ?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Intel Feed — The Jedi Faction</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap" rel="stylesheet">
<link rel="icon" href="emblem.svg">
<link rel="stylesheet" href="style.css"></head><body>
<header class="topbar"><div class="crest"><img src="emblem.svg" width="46" height="46" alt="Jedi Faction emblem"></div><div class="brand">THE JEDI FACTION<small><span style="color:var(--jedi)">⟡</span> KINGS OF CHAOS ALLIANCE — ERA 23 <span style="color:var(--jedi)">⟡</span></small></div></header>
<nav>
  <a href="index.php" >COMMAND DECK</a>
  <a href="board.php" >MESSAGE BOARD</a>
  <a href="chat.php" >WAR ROOM CHAT</a>
  <a href="warroom.php" >TARGET BOARD</a>
  <a href="tracker.php" class="active">INTEL FEED</a>
  <a href="roster.php" >ROSTER</a>
  <a href="guides.php" >ERA 23 GUIDE</a>
  <a href="https://www.kingsofchaos.com" target="_blank">PLAY KOC ↗</a>
  <?php if ($ME['role'] === 'officer'): ?><a href="admin.php" style="color:var(--gold)">ADMIN PANEL</a><?php endif; ?>
  <a href="logout.php">LOGOUT (<?=$ME['username']?>)</a>
</nav>
<div class="wrap">
<div class="callout">🛰 Live intel feed — your Tiv tracker pushes readings here via <code>bot_api.php</code> (action: <code>tracker_push</code>). Auto-refreshes every 30s. Latest reading per player/metric shown.</div>
<div class="panel"><h3>🛰 TRACKED PLAYERS</h3><div class="inner">
<table style="margin:0"><tr><th>Target</th><th>ID</th><th>Metric</th><th>Value</th><th>Captured</th></tr>
<tbody id="feed"><tr><td colspan="5">Waiting for tracker data...</td></tr></tbody></table>
</div></div>
<script>
async function refreshFeed(){
  try{
    const r = await fetch('tracker_api.php'); const rows = await r.json();
    const byPlayer = {};
    rows.forEach(x => { (byPlayer[x.koc_id] = byPlayer[x.koc_id] || []).push(x); });
    const ids = Object.keys(byPlayer);
    document.getElementById('feed').innerHTML = ids.length ? ids.map(id => {
      const cells = byPlayer[id].map(x =>
        '<tr><td>'+(x.name||'—')+'</td><td><a href="https://www.kingsofchaos.com/stats.php?id='+id+'" target="_blank">'+id+' ↗</a></td>'+
        '<td style="color:var(--gold)">'+x.metric+'</td><td>'+Number(x.value).toLocaleString()+'</td><td class="tmeta">'+x.captured_at+'</td></tr>').join('');
      return cells;
    }).join('') : '<tr><td colspan="5">No intel yet. Point JFWarScout at bot_api.php (warscout_push) to begin.</td></tr>';
  }catch(e){}
}
refreshFeed(); setInterval(refreshFeed, 30000);
</script>
</div>
<footer><div class="skull">☠ ⚔ ☠</div><p>THE JEDI FACTION — fan-run portal, not affiliated with Kings of Chaos, LLC.</p></footer>
</body></html>