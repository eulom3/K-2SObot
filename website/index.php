<?php require 'auth.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portal — The Jedi Faction</title>
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
  <a href="index.php" class="active">COMMAND DECK</a>
  <a href="board.php" >MESSAGE BOARD</a>
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

<div class="hero">
  <h1>⚔️ THE <span class="saber">JEDI</span> FACTION ⚔️</h1>
  <p>Growth through discipline. Strength through knowledge. A Kings of Chaos alliance built on the
  Era 23 startup doctrine — experience first, economy second, waste nothing.</p>
  <p style="margin-top:18px"><a class="btn green" href="guides.php">📜 READ THE STARTUP GUIDE</a>
  &nbsp; <a class="btn" href="board.php">💬 ENTER THE MESSAGE BOARD</a></p>
</div>

<div class="grid2">
  <div class="panel">
    <h3>⟡ THE DOCTRINE (TL;DR)</h3>
    <div class="inner">
      <ul class="tick">
        <li><b>EPM max first</b> — every level = +129,600 exp per era (~16% of the full Tech tree)</li>
        <li><b>Login streak daily</b> — ~814 exp/soldiers/turns per day, resets if you miss one</li>
        <li><b>Conquest grind</b> — 50 exp each, doesn't count toward the 30k cap</li>
        <li><b>Tech → L7, then SPM, then Econ L1–6</b></li>
        <li><b>Spend gold same day</b> — the vault eats 20% every 24h</li>
        <li><b>Heal hostages before Sunday</b> — 100% die weekly</li>
        <li><b>Recon your swap buddy 30×/day</b> — free rewards, costs nothing</li>
      </ul>
    </div>
  </div>
  <div class="panel">
    <h3>⟡ ERA STATUS</h3>
    <div class="inner">
      <div class="stat-row"><span>Era</span><b>Era 23</b></div>
      <div class="stat-row"><span>Alliance focus</span><b>Growth &amp; war readiness</b></div>
      <div class="stat-row"><span>Race coverage</span><b>Orc · Dwarf · Elf · Undead</b></div>
      <div class="stat-row"><span>Recruiting</span><b style="color:var(--jedi)">OPEN — see board</b></div>
    </div>
  </div>
</div>

<div class="panel">
  <h3>⟡ EXP INCOME BY EPM LEVEL — WHY WE RUSH IT</h3>
  <div class="inner">
    <table>
      <tr><th>EPM level</th><th>Exp/day (incl. conquest + login)</th><th>90-day era total</th><th>% of endgame exp needs (~1.02M)</th></tr>
      <tr><td>1 (start)</td><td>~3,000</td><td>~270,000</td><td>33%</td></tr>
      <tr><td>2</td><td>~4,450</td><td>~400,000</td><td>49%</td></tr>
      <tr><td>3</td><td>~5,900</td><td>~530,000</td><td>65%</td></tr>
      <tr><td>4</td><td>~7,300</td><td>~660,000</td><td>81%</td></tr>
      <tr><td><b>5 (max)</b></td><td><b>~8,750</b></td><td><b>~790,000</b></td><td><b>97%</b></td></tr>
    </table>
  </div>
</div>

<div class="saber-div"><div class="hilt"></div><div class="blade"></div></div>
<div class="grid2">
  <div class="panel">
    <h3>⟡ NEW RECRUITS — HOUR ONE</h3>
    <div class="inner">
      <ul class="tick">
        <li>Pick <b>Orcs</b> (active) or <b>Dwarves</b> (casual)</li>
        <li>Claim your account-creation reward on the Rewards page</li>
        <li>Buy SA weapons, beat <b>Wolves</b> conquest</li>
        <li>Grind conquests during your 5-min protection</li>
        <li>Keep soldiers untrained (2.3 gpt vs 0.92 covert)</li>
        <li>Join the board, find your recon-swap buddy</li>
      </ul>
    </div>
  </div>
  <div class="panel">
    <h3>⟡ COVERT RATIO CHEAT SHEET</h3>
    <div class="inner">
      <ul class="tick">
        <li>See gold on battlefield — Spy:Sentry <b>2:1</b></li>
        <li>Successful recon — <b>1:3</b> · 30 attempts/24h per target</li>
        <li>Sabotage / revenge sab — <b>1:1.5</b> · 10 attempts &amp; 10 successes/24h</li>
        <li>Attack higher TFF targets — steal 90–100% of holdings (vs 75–85% lower)</li>
        <li>Sab must clear <b>100m value</b> per mission to earn exp/gold</li>
      </ul>
    </div>
  </div>
</div>

</div>

<footer>
  <div class="skull">☠ ⚔ ☠</div>
  <p>THE JEDI FACTION — a Kings of Chaos alliance portal.<br>
  Fan-run site, not affiliated with or endorsed by Kings of Chaos, LLC.</p>
</footer>

</body>
</html>