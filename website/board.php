<?php require 'auth.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Message Board — The Jedi Faction</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap" rel="stylesheet">
<link rel="icon" href="emblem.svg">
<link rel="stylesheet" href="style.css">
</head>

<body>

<header class="topbar">
  <div class="crest"><img src="emblem.svg" width="46" height="46" alt="Jedi Faction emblem"></div>
  <div class="brand">THE JEDI FACTION
    <small><span class="saber">⟡</span> KINGS OF CHAOS ALLIANCE — ERA 23 <span class="saber">⟡</span></small>
  </div>
</header>


<nav>
  <a href="index.php" >COMMAND DECK</a>
  <a href="board.php" class="active">MESSAGE BOARD</a>
  <a href="chat.php" >WAR ROOM CHAT</a>
  <a href="warroom.php" >TARGET BOARD</a>
  <a href="tracker.php" >INTEL FEED</a>
  <a href="roster.php" >ROSTER</a>
  <a href="guides.php" >ERA 23 GUIDE</a>
  <a href="https://www.kingsofchaos.com" target="_blank">PLAY KOC ↗</a>
  <?php if ($ME['role'] === 'officer'): ?><a href="admin.php" style="color:var(--gold)">ADMIN PANEL</a><?php endif; ?>
  <a href="logout.php">LOGOUT (<?=$ME['username']?>)</a>
</nav>

<div class="wrap">

<div class="callout">💬 Message board powered by Utterances — a GitHub account is needed to post (free, 2-minute signup). See DEPLOY.md to configure.</div>
<div class="cat-h" style="border-left-color:var(--gold)">✎ START A DISCUSSION</div>
<table class="board"><tr><td style="padding:12px 14px">
To create a new thread, post in the most relevant existing thread or ask an officer — new threads are created by naming a new topic on the board's GitHub page. 
</td></tr></table>
<div class="cat-h">⚔ ANNOUNCEMENTS</div>
<table class="board"><tr class="pinned"><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=era-23-guide">Era 23 Startup Guide — read BEFORE asking how to grow</a><div class="tmeta">Started by <b style="color:var(--gold)">WarCouncil</b> · Pinned · includes full doctrine</div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr><tr><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=alliance-rules">Alliance Rules & Battlefield Policy</a><div class="tmeta">Started by <b style="color:var(--gold)">WarCouncil</b> · Locked</div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr><tr><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=new-recruit-checkin">New recruits — check in here after joining</a><div class="tmeta">Started by <b style="color:var(--gold)">Diplomat</b></div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr></table>
<div class="cat-h">⚔ WAR ROOM</div>
<table class="board"><tr><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=war-list-targets">War List targets — check before EVERY attack</a><div class="tmeta">Started by <b style="color:var(--gold)">Warmaster</b></div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr><tr><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=recon-requests">Recon requests — post target IDs here</a><div class="tmeta">Started by <b style="color:var(--gold)">ReconElf</b></div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr><tr><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=chain-war-reports">Chain war damage reports</a><div class="tmeta">Started by <b style="color:var(--gold)">Warmaster</b></div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr></table>
<div class="cat-h">⚔ STRATEGY & GUIDES</div>
<table class="board"><tr><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=epm-econ-spm-math">EPM vs Econ vs SPM — the math behind the priority order</a><div class="tmeta">Started by <b style="color:var(--gold)">Quartermaster</b></div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr><tr><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=recon-swap-pairings">Recon-swap pairings — find your 30/day buddy</a><div class="tmeta">Started by <b style="color:var(--gold)">Quartermaster</b></div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr><tr><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=vault-discipline">Banking & vault discipline — don't feed the 20% tax</a><div class="tmeta">Started by <b style="color:var(--gold)">Quartermaster</b></div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr></table>
<div class="cat-h">⚔ TAVERN</div>
<table class="board"><tr><td style="width:34px;font-size:18px">💬</td><td><a class="ttitle" href="thread.php?t=introductions">Introduce yourself, new recruits!</a><div class="tmeta">Started by <b style="color:var(--gold)">Diplomat</b></div></td><td class="tcount"><b>—</b>replies</td><td class="lastpost">be the first to post</td></tr></table>


</div>

<footer>
  <div class="skull">☠ ⚔ ☠</div>
  <p>THE JEDI FACTION — a Kings of Chaos alliance portal.<br>
  Fan-run site, not affiliated with or endorsed by Kings of Chaos, LLC.</p>
</footer>

</body>
</html>