<?php require 'auth.php'; ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Era 23 Startup Guide — The Jedi Faction</title>
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
  <a href="board.php" >MESSAGE BOARD</a>
  <a href="chat.php" >WAR ROOM CHAT</a>
  <a href="warroom.php" >TARGET BOARD</a>
  <a href="tracker.php" >INTEL FEED</a>
  <a href="roster.php" >ROSTER</a>
  <a href="guides.php" class="active">ERA 23 GUIDE</a>
  <a href="https://www.kingsofchaos.com" target="_blank">PLAY KOC ↗</a>
  <?php if ($ME['role'] === 'officer'): ?><a href="admin.php" style="color:var(--gold)">ADMIN PANEL</a><?php endif; ?>
  <a href="logout.php">LOGOUT (<?=$ME['username']?>)</a>
</nav>

<div class="wrap">

<div class="callout">📜 This is the full Era 23 startup doctrine, maintained by the Faction. Last verified against the official ruleset October 2026. Questions → Message Board → Strategy.</div>
<div class="panel"><div class="inner guide-body"><h1 id="kings-of-chaos-era-23-startup-growth-guide">Kings of Chaos — Era
23 Startup &amp; Growth Guide</h1>
<p><em>For new alliance members — verified against the current Era 23
ruleset (kingsofchaos.com/help.php, Oct 2026)</em></p>
<hr />
<h2 id="the-one-thing-that-determines-your-era-experience">1. The One
Thing That Determines Your Era: Experience</h2>
<p>Your final rank is driven by stats (SA/DA/Spy/Sentry), and stats
scale with <strong>Tech level (multiplier), weapons (linear), and
soldiers (linear)</strong>. Gold buys weapons. <strong>Experience buys
everything that multiplies</strong> — Tech (up to 8.15x ALL stats),
Econ, Safe, SPM. Exp is the <em>binding constraint</em>: endgame exp
needs total <strong>~1.02 million exp</strong> (Tech L43 812,790 + Safe
L7 145,000 + Econ L10 32,925 + SPM ~31,000).</p>
<p><strong>Exp income per day by EPM (Experience Per Turn)
level:</strong></p>
<table style="width:100%;">
<colgroup>
<col style="width: 6%" />
<col style="width: 12%" />
<col style="width: 25%" />
<col style="width: 23%" />
<col style="width: 31%" />
</colgroup>
<thead>
<tr class="header">
<th>EPM</th>
<th>exp/turn</th>
<th>+ Conquest + Login</th>
<th>90-day era total</th>
<th>% of endgame exp needs</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>1 (start)</td>
<td>1,440</td>
<td>~3,000</td>
<td>~270,000</td>
<td>33%</td>
</tr>
<tr class="even">
<td>2</td>
<td>2,880</td>
<td>~4,450</td>
<td>~400,000</td>
<td>49%</td>
</tr>
<tr class="odd">
<td>3</td>
<td>4,320</td>
<td>~5,900</td>
<td>~530,000</td>
<td>65%</td>
</tr>
<tr class="even">
<td>4</td>
<td>5,760</td>
<td>~7,300</td>
<td>~660,000</td>
<td>81%</td>
</tr>
<tr class="odd">
<td>5 (max)</td>
<td>7,200</td>
<td>~8,750</td>
<td>~790,000</td>
<td>97%</td>
</tr>
</tbody>
</table>
<p><strong>Conclusion:</strong> EPM upgrades are the single highest-ROI
purchase in the game. Every level of EPM (+1 exp/turn) yields
<strong>+129,600 exp over a 90-day era</strong> — roughly 16% of the
entire Tech tree. Each level costs only gold (L2: 200m, L3: 550m, L4:
800m, L5: 1b), and attack gold now goes straight to your Vault, so you
fund EPM by hitting people. <strong>Rush EPM to L3 minimum, L5
ideally.</strong></p>
<hr />
<h2 id="priority-order-spend-every-resource-in-this-order">2. Priority
Order (spend every resource in this order)</h2>
<h3 id="gold-priority">GOLD priority</h3>
<ol type="1">
<li><strong>EPM upgrades</strong> (Upgrades page) — see table above.
Never let gold sit idle.</li>
<li><strong>Weapons for your chosen stat</strong> +
<strong>repairs</strong> — keep them at 100% (damaged weapons are wasted
strength).</li>
<li><strong>Conquest capability</strong> — you need ~2x the opponent’s
strength in SA per conquest level. Buy enough SA weapons to clear the
level you’re grinding, no more.</li>
<li>Stack hits in your Vault <strong>only</strong> when saving for the
next EPM level — then spend immediately.</li>
</ol>
<h3
id="experience-priority-bank-in-the-exp-safe-on-the-safe-page-deposit-only-what-you-need-banked-exp-you-dont-spend-is-wasted">EXPERIENCE
priority (bank in the Exp Safe on the Safe page — deposit only what you
need; banked exp you don’t spend is wasted)</h3>
<ol type="1">
<li><strong>Tech</strong> to ~L7 early (3,320 exp → 1.41x all stats).
Dirt cheap, multiplies everything incl. weapons you already own. This is
what unlocks higher conquest levels → more exp → flywheel.</li>
<li><strong>SPM</strong> levels steadily (any level under ~2,000 exp
pays for itself vs soldier-trading in under ~9 days; cheap early levels
pay back in <strong>hours</strong>).</li>
<li><strong>Econ</strong> L1–L6 (cumulative 4,725 exp for +39,000 gpt).
After L6 the marginal ROI drops below other options.</li>
<li><strong>Safe</strong> upgrades (Safe L2–L4 = 30,000 exp total,
protects 20% of TBG) once you start holding meaningful gold.</li>
<li>Soldier trades (100 exp = 650 soldiers) <strong>only</strong> for
instant TFF when you need it — see ROI table below.</li>
</ol>
<h3 id="exp-spend-roi-goldturn-gained-per-1-exp">EXP-spend ROI
(gold/turn gained per 1 exp)</h3>
<table>
<colgroup>
<col style="width: 29%" />
<col style="width: 44%" />
<col style="width: 25%" />
</colgroup>
<thead>
<tr class="header">
<th>Option</th>
<th>gpt per exp</th>
<th>Notes</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>Soldier trade</td>
<td>14.95</td>
<td>Instant, but soldiers die &amp; raise your TFF</td>
</tr>
<tr class="even">
<td>Econ L1–L5</td>
<td>4.0–7.8</td>
<td>Flat, safe, partially protected via Safe</td>
</tr>
<tr class="odd">
<td>Econ L6</td>
<td>9.75</td>
<td></td>
</tr>
<tr class="even">
<td>Econ L7</td>
<td>12.2</td>
<td></td>
</tr>
<tr class="odd">
<td><strong>Econ L10</strong></td>
<td><strong>16.4</strong></td>
<td>Best flat income, but 32,925 cumulative exp</td>
</tr>
<tr class="even">
<td>SPM (est.)</td>
<td>beats trade in days</td>
<td>Compounds daily; the true long-term king</td>
</tr>
</tbody>
</table>
<p>Soldier trading beats Econ on raw income until L10 — but soldiers are
<em>fragile</em> income (casualties, hostages, raids). Econ is
unstealable, works while you sleep, and feeds your Safe. Balanced
approach: Tech → SPM → Econ L1–L6 → Safe, trades only for TFF
spikes.</p>
<hr />
<h2
id="hour-1-checklist-during-5-min-protection-do-all-of-this-before-it-drops">3.
Hour 1 Checklist (during 5-min protection — do ALL of this before it
drops)</h2>
<ol type="1">
<li>Register, pick race (see §4), claim the <strong>account-creation
reward</strong> on the Rewards page.</li>
<li>Log in every single day — the login chain pays
<strong>150→300→450→600→1,000→1,200→2,000 exp/soldiers/turns</strong>,
average <strong>~814/day</strong>. Missing one day resets you to Day 1.
This alone is ~25% of a free player’s exp income.</li>
<li>Spend starting gold: cheapest SA weapons, get enough SA to beat
<strong>Wolves</strong> conquest (~2x opponent strength).</li>
<li>Grind conquests immediately — <strong>50 exp each</strong>, and
conquest exp does <strong>not</strong> count toward the 30,000 cap.
First levels also pay soldiers (10–20/conquest) straight to your
army.</li>
<li>Train nothing yet — keep soldiers untrained (they earn full 2.3 gpt;
trained covert troops earn only 0.92).</li>
<li>Join your alliance, set it as primary, bookmark the Farm List and
War List pages.</li>
</ol>
<hr />
<h2 id="race-choice-era-23-bonuses">4. Race Choice (Era 23 bonuses)</h2>
<p>All races get +15% income (2.3 gpt/soldier). The 25% racial bonus
defines your playstyle:</p>
<table>
<colgroup>
<col style="width: 26%" />
<col style="width: 30%" />
<col style="width: 43%" />
</colgroup>
<thead>
<tr class="header">
<th>Race</th>
<th>Bonus</th>
<th>Best for</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td><strong>Orcs</strong></td>
<td>25% Attack</td>
<td>Conquest grinding &amp; farming (fastest exp flywheel — recommended
for actives)</td>
</tr>
<tr class="even">
<td><strong>Dwarves</strong></td>
<td>25% Defense</td>
<td>Turtlers; holding banks, low maintenance</td>
</tr>
<tr class="odd">
<td><strong>Elves</strong></td>
<td>25% Spy</td>
<td>Sab accounts, recon for the alliance</td>
</tr>
<tr class="even">
<td><strong>Undead</strong></td>
<td>25% Sentry</td>
<td>Anti-sab, protecting big armories</td>
</tr>
<tr class="odd">
<td><strong>Trolls</strong></td>
<td>25% Theft</td>
<td>Stealing weapons in wars</td>
</tr>
<tr class="even">
<td><strong>Goblins</strong></td>
<td>25% Vigilance</td>
<td>Anti-theft</td>
</tr>
<tr class="odd">
<td><strong>Humans</strong></td>
<td>15% hostage / 10% poison</td>
<td>Growth via hostages → healing → soldiers</td>
</tr>
</tbody>
</table>
<p><strong>For new members: Orcs (active attackers) or Dwarves
(casual).</strong> A race change costs 10,000 exp — choose well. For
your alliance’s coverage: make sure you have at least one Elf
(recon/sab) and one Undead (sentry) per strike team.</p>
<hr />
<h2 id="daily-routine-the-compounding-loop">5. Daily Routine (the
compounding loop)</h2>
<ol type="1">
<li><strong>Login</strong> (keep the streak alive) → claim bonus.</li>
<li><strong>Conquests</strong> (your level × up to ~15–20/day) —
uncapped 50 exp each, biggest early exp source. Exp per level decays
after 53 attempts; soldier/gold rewards stop after 600. Move up a level
when you can (needs the Siege upgrade listed per level + ~2x SA).</li>
<li><strong>Spend exp</strong> from Safe: next Tech/SPM/Econ level per
§2.</li>
<li><strong>Attacks:</strong> use banked turns (cap 20,000) for up to 10
attacks/day <span class="citation" data-cites="120">@120</span> turns.
Attack players with <strong>higher TFF</strong> than you — steal is
90–100% of their gold vs only 75–85% vs lower TFF. Gold goes to Vault
(safe from steals).</li>
<li><strong>Spend vault gold the same day</strong> — <strong>Vault tax
is 20% per 24h</strong> (5% every 6h). Holding 1b for 3 days ≈ 488m
gone.</li>
<li><strong>Heal hostages</strong> (1,500g each) → free untrained
soldiers. Unhealed hostages <strong>die every Sunday</strong> — 100% of
them.</li>
<li><strong>Recon your swap buddy 30x</strong> (see section 8) — free
rewards for you both.</li>
<li><strong>Repair weapons</strong> before logging off. Damaged weapons
= invisible stat loss.</li>
</ol>
<hr />
<h2 id="traps-that-kill-new-accounts">6. Traps That Kill New
Accounts</h2>
<ul>
<li>❌ <strong>Hoarding gold in the Vault</strong> — 20%/day tax. Spend,
Safe it, or upgrade.</li>
<li>❌ <strong>Letting the login streak break</strong> — lose ~814
exp+soldiers+turns/day and restart at 150.</li>
<li>❌ <strong>Over-training covert early</strong> — spies/sentries earn
0.92 gpt vs 2.3 untrained. Keep ~85–90% as soldiers until TBG is
fat.</li>
<li>❌ <strong>Exp sitting at the 30,000 cap</strong> — on-hand exp
stops accumulating past 30k; overflow only auto-banks from EPT. Deposit
into the Exp Safe and spend it.</li>
<li>❌ <strong>Ignoring weapon damage</strong> — your real SA/DA is
repair-adjusted. Half-repaired IS half-strength.</li>
<li>❌ <strong>Armory prefill presets</strong> — if you keep presets
filled while saving vault gold for an upgrade, one click spends your
entire vault on weapons.</li>
<li>❌ <strong>Sabbing without ratio</strong> — you need Spy ≥ 1/1.5 of
target’s Sentry to sab, 1/3 to recon, 2/1 to see gold. Failed sabs
inside ratio still feed their revenge counter.</li>
<li>❌ <strong>Mercenaries beyond 33% of force</strong> — impossible,
and mercs earn 0 TBG. Buy only for war stats.</li>
<li>❌ <strong>Multiple accounts / VPN / scripts</strong> — instant ban,
and it endangers your whole IP/household per the rules.</li>
</ul>
<hr />
<h2 id="covert-ratios-cheat-sheet-era-23">7. Covert Ratios Cheat Sheet
(Era 23)</h2>
<table>
<colgroup>
<col style="width: 29%" />
<col style="width: 70%" />
</colgroup>
<thead>
<tr class="header">
<th>Action</th>
<th>Spy:Sentry needed</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>See gold on battlefield</td>
<td>2 : 1</td>
</tr>
<tr class="even">
<td>Successful recon</td>
<td>1 : 3</td>
</tr>
<tr class="odd">
<td>Successful sabotage / revenge sab</td>
<td>1 : 1.5</td>
</tr>
<tr class="even">
<td>Limits: recon 30/24h · sab 10 attempts &amp; 10 successes/24h ·
revenge sab 4/24h · attacks 10/day · raids 15 turns each</td>
<td></td>
</tr>
</tbody>
</table>
<p>Sab note: to earn exp/gold from a sab you must sab <strong>100m+
value</strong> in one mission (e.g., 223× 600-strength weapons).</p>
<hr />
<h2 id="alliance-duties-for-new-members">8. Alliance Duties for New
Members</h2>
<ul>
<li>Set the alliance as <strong>primary</strong> (alliance rank counts
only primary members).</li>
<li>Recon/share targets via the alliance Discord webhook buttons on
stats pages.</li>
<li>Keep Sentry at a sane level (~1:1 with your Spy) or you paint a
target on the alliance’s farms.</li>
<li>Check the <strong>War List</strong> daily; never hit chain targets
outside war rules.</li>
<li>Ask before sabbing — sabs start wars, wars cost everyone turns and
repairs.</li>
</ul>
<hr />
<h2 id="alliance-recon-swaps-free-rewards-every-day">8. Alliance Recon
Swaps — Free Rewards Every Day</h2>
<p>The Rewards page pays out for <strong>actions undertaken against
you</strong> — including recons intercepted in your Intelligence log.
Reconning a target is capped at <strong>30 attempts per 24 hours per
player</strong>, so every member should have an assigned <strong>recon
buddy</strong>:</p>
<ul>
<li><strong>Each member recons their buddy up to 30x every day.</strong>
That is up to 30 free intercepted-intel entries per member per day
toward their “actions against you” reward counters — a pair generates up
to 60/day combined.</li>
<li><strong>Send the minimum number of spies</strong> so the recon
<em>fails</em> (you need 1:3 Spy:Sentry to succeed — deliberately
undershoot it). Since the Era 22 change, <strong>failed recons no longer
kill any spies</strong>, so this costs you nothing but a few turns.</li>
<li>The reconned member’s “last reconned” intel and last-recon gold/DA
snapshot also update for the whole alliance on their stats page — so the
swap doubles as live intel hygiene.</li>
<li>Not every mission is intercepted (“ghosting”), so real totals will
land somewhere below 30/day — run the swap anyway, it is free.</li>
<li><strong>Rotation:</strong> if your reward tier needs more than 30,
pair with a second buddy and split the cap (15/15) so nobody burns their
recon budget on one target.</li>
</ul>
<p>Add “recon my buddy 30x” to the daily routine in section 5 — it takes
under a minute.</p>
<hr />
<h2 id="tldr-for-the-lazy-recruit">TL;DR for the lazy recruit</h2>
<p><strong>EPM max &gt; daily login streak &gt; conquest grind &gt; Tech
to 7 &gt; SPM &gt; Econ &gt; weapons matching your role. Spend gold the
same day you earn it (20% vault tax). Never let exp sit capped at 30k.
Heal hostages before Sunday.</strong></p>
</div></div>

</div>

<footer>
  <div class="skull">☠ ⚔ ☠</div>
  <p>THE JEDI FACTION — a Kings of Chaos alliance portal.<br>
  Fan-run site, not affiliated with or endorsed by Kings of Chaos, LLC.</p>
</footer>

</body>
</html>