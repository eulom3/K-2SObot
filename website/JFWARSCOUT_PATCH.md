// ============================================================
// JFWarScout v9 -> Jedi Faction domain bridge
// Paste the three edits below into jedi-warscout-koc.js
// ============================================================

// EDIT 1 — in the ==UserScript== metadata block, add one line:
//   @connect     jfactiongaming.com

// EDIT 2 — next to SHARE_MODE / GIST config (around line 20), add:
   var SITE_PUSH  = "https://jfactiongaming.com/bot_api.php";   // The Jedi Faction domain
   var SITE_TOKEN = "SAME_TOKEN_AS_CONFIG_PHP";             // BOT_TOKEN from config.php

// EDIT 3 — add this function anywhere before pushShare(), then call it from pushShare():
   function pushToSite() {
     if (!SITE_PUSH || typeof GM_xmlhttpRequest !== "function") return;
     GM_xmlhttpRequest({
       method: "POST", url: SITE_PUSH,
       headers: { "Content-Type": "application/json", "X-Bot-Token": SITE_TOKEN },
       data: JSON.stringify(Object.assign({ action: "warscout_push" }, boardPack()))
     });
   }
   // ...and inside pushShare(), after the jsonblob/gist call, add one line:
   //   pushToSite();

// WHAT THIS DOES: every time any faction member's script syncs (manual or
// after 1.5s debounce), the TIV leaderboard AND all known target stats are
// pushed permanently into the domain's Intel Feed. jsonblob remains the
// fast in-game sync; the domain becomes the durable, searchable archive.


## FULL INGESTION (automatic — no script changes needed beyond the 3 edits)
warscout_push now consumes the ENTIRE boardPack:
- targets: 8 stats + tech levels + unit counts + weapon pool sizes per player
- histlog: full 48h time series per target (captured timestamps preserved)
- stolen: gold-loss ledger, deduplicated, with 24h rollups on the Target Board
All of it appears on the Intel Feed grouped per player; the ledger panel lives on warroom.php.
