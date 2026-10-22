<?php
require 'config.php';
require 'auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $ME['role'] === 'officer') {
    db()->prepare('INSERT INTO war_targets (koc_id, target_name, reason, added_by) VALUES (?,?,?,?)')
        ->execute([(int)$_POST['koc_id'], trim($_POST['target_name'] ?? ''), trim($_POST['reason'] ?? ''), $ME['username']]);
    if (defined('DISCORD_WEBHOOK') && DISCORD_WEBHOOK) {
        @file_get_contents(DISCORD_WEBHOOK, false, stream_context_create(['http' => [
            'method' => 'POST', 'header' => 'Content-Type: application/json',
            'content' => json_encode(['content' => '🎯 **New war target** — '.($_POST['target_name'] ?: 'ID '.$_POST['koc_id']).' (KoC ID '.(int)$_POST['koc_id'].') added by '.$ME['username']])]]));
    }
    header('Location: warroom.php'); exit;
}
?>
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Target Board — The Jedi Faction</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap" rel="stylesheet">
<link rel="icon" href="emblem.svg">
<link rel="stylesheet" href="style.css"></head>
<body class="">
<header class="topbar"><div class="crest"><img src="emblem.svg" width="46" height="46" alt="Jedi Faction emblem"></div><div class="brand">THE JEDI FACTION<small><span style="color:var(--jedi)">⟡</span> KINGS OF CHAOS ALLIANCE — ERA 23 <span style="color:var(--jedi)">⟡</span></small></div></header>
<nav>
  <a href="index.php" >COMMAND DECK</a>
  <a href="board.php" >MESSAGE BOARD</a>
  <a href="chat.php" >WAR ROOM CHAT</a>
  <a href="warroom.php" class="active">TARGET BOARD</a>
  <a href="tracker.php" >INTEL FEED</a>
  <a href="roster.php" >ROSTER</a>
  <a href="guides.php" >ERA 23 GUIDE</a>
  <a href="https://www.kingsofchaos.com" target="_blank">PLAY KOC ↗</a>
  <?php if ($ME['role'] === 'officer'): ?><a href="admin.php" style="color:var(--gold)">ADMIN PANEL</a><?php endif; ?>
  <a href="logout.php">LOGOUT (<?=$ME['username']?>)</a>
</nav>
<div class="wrap">
<div class="callout">🎯 Live target board — fed by alliance admins and your Discord bot (bot_api.php). Auto-refreshes every 10s. Recon before you hit. Always check ratios before sabs.</div>
<div class="panel"><h3>⚔ ACTIVE TARGETS</h3><div class="inner">
<table style="margin:0"><tr><th>Target</th><th>KoC ID</th><th>Reason</th><th>Status</th><th>Added by</th></tr>
<tbody id="targets"><tr><td colspan="5">Loading...</td></tr></tbody></table>
<?php if ($ME['role'] === 'officer'): ?>
<div class="hyperspace"><div class="line"></div><div class="core"></div><div class="line"></div></div>
<form method="post" action="warroom.php" style="display:flex;gap:8px;flex-wrap:wrap">
  <input name="koc_id" placeholder="KoC ID" style="width:110px;padding:8px;background:#120e0e;border:1px solid var(--border);color:var(--text);border-radius:3px">
  <input name="target_name" placeholder="Target name" style="flex:1;min-width:140px;padding:8px;background:#120e0e;border:1px solid var(--border);color:var(--text);border-radius:3px">
  <input name="reason" placeholder="Reason (e.g. chained, farm policy violation)" style="flex:2;min-width:200px;padding:8px;background:#120e0e;border:1px solid var(--border);color:var(--text);border-radius:3px">
  <button class="btn">ADD TARGET</button>
</form>
<?php endif; ?>
</div></div>

<?php $ledger = db()->query('SELECT COUNT(*) hits, SUM(gold) total, MAX(at) last_at FROM steal_events WHERE at >= NOW() - INTERVAL 1 DAY')->fetch();
      $ledgerTop = db()->query('SELECT gold, when_txt, at FROM steal_events ORDER BY gold DESC LIMIT 5')->fetchAll(); ?>
<div class="panel"><h3>💰 WAR LEDGER — gold lost to enemy hits (24h)</h3><div class="inner">
  <div class="stat-row"><span>Hits in last 24h</span><b><?=number_format($ledger['hits'])?></b></div>
  <div class="stat-row"><span>Total gold stolen</span><b style="color:#e6a8a8"><?=number_format($ledger['total'])?></b></div>
  <div class="stat-row"><span>Latest hit</span><b><?=$ledger['last_at'] ?: 'none yet'?></b></div>
  <div class="hyperspace" style="margin:14px 0 8px"><div class="line"></div><div class="core"></div><div class="line"></div></div>
  <p class="tmeta" style="margin-bottom:6px">Largest hits on record:</p>
  <?php foreach ($ledgerTop as $l): ?>
  <div class="stat-row"><span><?=$l['when_txt'] ?: $l['at']?></span><b><?=number_format($l['gold'])?> gold</b></div>
  <?php endforeach; if (!$ledgerTop) echo '<p class="tmeta">No steal data yet — feed it via JFWarScout (warscout_push).</p>'; ?>
</div></div>

<script>
async function refreshTargets(){
  try{
    const r = await fetch('war_api.php'); const t = await r.json();
    document.getElementById('targets').innerHTML = t.length ? t.map(x =>
      '<tr><td>'+(x.target_name||'—')+'</td><td><a href="https://www.kingsofchaos.com/stats.php?id='+x.koc_id+'" target="_blank">'+x.koc_id+' ↗</a></td><td>'+x.reason+'</td>'+
      '<td><span class="status-chip chip-'+x.status+'">'+x.status.toUpperCase()+'</span></td><td>'+x.added_by+'</td></tr>').join('')
      : '<tr><td colspan="5">No active targets. The galaxy is quiet... for now.</td></tr>';
  }catch(e){}
}
refreshTargets(); setInterval(refreshTargets, 10000);
</script>
</div>
<footer><div class="skull">☠ ⚔ ☠</div><p>THE JEDI FACTION — fan-run portal, not affiliated with Kings of Chaos, LLC.</p></footer>
</body></html>