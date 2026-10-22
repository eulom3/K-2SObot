<?php require 'auth.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Discussion — The Jedi Faction</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800&display=swap" rel="stylesheet">
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

<div class="breadcrumb"><a href="board.php">← MESSAGE BOARD</a> / <span id="crumbTitle"></span></div>
<div class="panel">
  <div class="thread-head"><h2 id="threadTitle"></h2>
  <div class="tmeta" style="margin-top:6px">Members post with their GitHub account — keep your KoC username in your profile or signature.</div></div>
  <div class="inner utterances-frame" id="comments"></div>
</div>
<script>
const THREADS = {"era-23-guide": "Era 23 Startup Guide — read BEFORE asking how to grow", "alliance-rules": "Alliance Rules & Battlefield Policy", "new-recruit-checkin": "New recruits — check in here after joining", "war-list-targets": "War List targets — check before EVERY attack", "recon-requests": "Recon requests — post target IDs here", "chain-war-reports": "Chain war damage reports", "epm-econ-spm-math": "EPM vs Econ vs SPM — the math behind the priority order", "recon-swap-pairings": "Recon-swap pairings — find your 30/day buddy", "vault-discipline": "Banking & vault discipline — don"t feed the 20% tax", "introductions": "Introduce yourself, new recruits!"};
const slug = new URLSearchParams(location.search).get('t') || 'era-23-guide';
const title = THREADS[slug] || 'Discussion';
document.getElementById('threadTitle').textContent = title;
document.getElementById('crumbTitle').textContent = title;
document.title = title + ' — The Jedi Faction';

// ▼▼▼ AFTER DEPLOY: replace with YOUR GitHub username/repo (see DEPLOY.md step 3) ▼▼▼
const REPO = "YOUR-GITHUB-USERNAME/jedifaction-board";

const s = document.createElement('script');
s.src = 'https://utteranc.es/client.js';
s.setAttribute('repo', REPO);
s.setAttribute('issue-term', slug);
s.setAttribute('theme', 'github-dark');
s.setAttribute('crossorigin', 'anonymous');
s.async = true;
document.getElementById('comments').appendChild(s);
</script>

</div>

<footer>
  <div class="skull">☠ ⚔ ☠</div>
  <p>THE JEDI FACTION — a Kings of Chaos alliance portal.<br>
  Fan-run site, not affiliated with or endorsed by Kings of Chaos, LLC.</p>
</footer>

</body>
</html>