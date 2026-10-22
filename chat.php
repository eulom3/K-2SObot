<?php
require 'config.php';
require 'auth.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $msg = trim($_POST['message'] ?? '');
    if ($msg !== '' && mb_strlen($msg) <= 500) {
        db()->prepare('INSERT INTO shouts (member_id, message) VALUES (?,?)')
            ->execute([$ME['id'], $msg]);
    }
    header('Location: chat.php'); exit;
}
?>
<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>War Room Chat — The Jedi Faction</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap" rel="stylesheet">
<link rel="icon" href="emblem.svg">
<link rel="stylesheet" href="style.css">
<style>
#chatlog{height:420px;overflow-y:auto;background:#120e0e;border:1px solid var(--border);border-radius:4px;padding:12px}
.shout{padding:7px 9px;border-bottom:1px dashed #2b1f1f;font-size:14px}
.shout .who{color:var(--gold);font-weight:bold}
.shout .time{color:var(--dim);font-size:11px;margin-left:8px}
.shout.mine{background:#182015}
.chatbar{display:flex;gap:8px;margin-top:10px}
.chatbar input{flex:1;padding:10px;background:#120e0e;border:1px solid var(--border);color:var(--text);border-radius:3px}
</style></head><body>
<?php require 'auth.php'; ?>
<header class="topbar"><div class="crest"><img src="emblem.svg" width="46" height="46" alt="Jedi Faction emblem"></div><div class="brand">THE JEDI FACTION<small><span style="color:var(--jedi)">⟡</span> WAR ROOM CHAT <span style="color:var(--jedi)">⟡</span></small></div></header>
<nav>
  <a href="index.php" >COMMAND DECK</a>
  <a href="board.php" >MESSAGE BOARD</a>
  <a href="chat.php" class="active">WAR ROOM CHAT</a>
  <a href="warroom.php" >TARGET BOARD</a>
  <a href="tracker.php" >INTEL FEED</a>
  <a href="roster.php" >ROSTER</a>
  <a href="guides.php" >ERA 23 GUIDE</a>
  <a href="https://www.kingsofchaos.com" target="_blank">PLAY KOC ↗</a>
  <?php if ($ME['role'] === 'officer'): ?><a href="admin.php" style="color:var(--gold)">ADMIN PANEL</a><?php endif; ?>
  <a href="logout.php">LOGOUT (<?=$ME['username']?>)</a>
</nav>
<div class="wrap" style="max-width:760px">
<div class="panel"><h3>💬 LIVE WAR ROOM — members only</h3><div class="inner">
  <div id="chatlog"></div>
  <form method="post" class="chatbar">
    <input name="message" maxlength="500" placeholder="Speak, warrior... (Enter to send)" autofocus>
    <button class="btn green">SEND</button>
  </form>
  <p class="tmeta" style="margin-top:8px">Auto-refreshes every 5 seconds · 500 char limit · keep it tactical, keep it civil</p>
</div></div>
<p><a href="index.php">← Back to portal</a></p>
</div>
<script>
async function refresh(){
  try{
    const r = await fetch('chat_api.php');
    const msgs = await r.json();
    const box = document.getElementById('chatlog');
    const mine = <?= json_encode($ME['username']) ?>;
    box.innerHTML = msgs.map(m =>
      '<div class="shout'+(m.username===mine?' mine':'')+'">'+
      '<span class="who">'+m.username+'</span>'+
      '<span class="time">'+m.created_at+'</span><br>'+m.message+'</div>').join('');
    box.scrollTop = box.scrollHeight;
  }catch(e){}
}
refresh(); setInterval(refresh, 5000);
</script>
</body></html>
