// ==UserScript==
// @name        JFWarScout
// Built by Jedi Faction. Free for allied use with attribution.
// @namespace   https://www.kingsofchaos.com/
// @version     9.0.0
// @default      JFWarScout v9.0.0 — paste this entire build into Stay/Tampermonkey as-is.
// @author      Jedi Faction
// @description Left-column calculator, war-stats block, and target history. One script for Stay and Tampermonkey.
// @match       https://www.kingsofchaos.com/*
// @match       https://kingsofchaos.com/*
// @include     https://www.kingsofchaos.com/*
// @include     https://kingsofchaos.com/*
// @run-at      document-end
// @connect     jsonblob.com
// @connect     api.github.com
// @updateURL    https://raw.githubusercontent.com/YOUR-REPO/main/jedi-warscout.user.js
// @downloadURL  https://raw.githubusercontent.com/YOUR-REPO/main/jedi-warscout.user.js
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// ==/UserScript==

(function () {
  "use strict";

  var KEY = "jedi_board_v7";
  var ALLIANCE_SHARE = "jedi-faction-era23";
  // Sync backend. "jsonblob" (default, free but not permanent) or "gist"
  // (permanent, faction-controlled). For gist: create a SECRET gist with one
  // file named jf-board.json containing {}, then paste its ID and a classic
  // PAT with only the "gist" scope below.
  var SHARE_MODE = "jsonblob";
  var GIST_ID = "";
  var GIST_TOKEN = "";
  var DAY = 24 * 60 * 60 * 1000;
  var state = { targets: {}, histlog: {}, stolen: [], tiv: {}, weapons: {} };

  function read() {
    try {
      if (typeof GM_getValue === "function") return JSON.parse(GM_getValue(KEY, "{}"));
    } catch (e) {}
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e2) { return {}; }
  }
  function prune() {
    var cutoff = Date.now() - DAY;
    var hkeys = Object.keys(state.histlog || {});
    for (var hk = 0; hk < hkeys.length; hk++) {
      state.histlog[hkeys[hk]] = (state.histlog[hkeys[hk]] || []).filter(function (r) { return r && r.at && r.at >= cutoff - DAY; });
    }
    state.stolen = (state.stolen || []).filter(function (r) { return r && r.at && r.at >= Date.now() - 2 * DAY; });
    var tkeys = Object.keys(state.tiv || {});
    for (var tk = 0; tk < tkeys.length; tk++) {
      if (state.tiv[tkeys[tk]] && state.tiv[tkeys[tk]].at && state.tiv[tkeys[tk]].at < Date.now() - 30 * DAY) delete state.tiv[tkeys[tk]];
    }
  }
  function save() {
    prune();
    var raw = JSON.stringify(state);
    try { if (typeof GM_setValue === "function") GM_setValue(KEY, raw); } catch (e) {}
    try { localStorage.setItem(KEY, raw); } catch (e2) {}
    if (typeof scheduleShare === "function") scheduleShare();
  }
  state = Object.assign(state, read());
  if (!state.targets) state.targets = {};
  if (!state.histlog) state.histlog = {};
  if (!state.stolen) state.stolen = [];
  if (!state.tiv) state.tiv = {};
  if (!state.weapons) state.weapons = {};
  if (!state.nameid) state.nameid = {};
  if (!state.me) state.me = {};

  function themeColors() {
    function sample(el) {
      if (!el) return null;
      try {
        var cs = window.getComputedStyle(el);
        var bg = cs.backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return { bg: bg, fg: cs.color || "#000" };
      } catch (e) {}
      return null;
    }
    var hit = sample(document.body) || sample(document.documentElement);
    if (hit) return hit;
    var nodes = document.querySelectorAll("td, div");
    for (var i = 0; i < nodes.length && i < 200; i++) {
      hit = sample(nodes[i]);
      if (hit) return hit;
    }
    return { bg: "#fff", fg: "#000" };
  }
  var THEME = themeColors();
  var jfCss =
    
      ".jf-block{width:100%;border-collapse:collapse;margin:6px 0;background:" + THEME.bg + ";color:" + THEME.fg + "}" +
      ".jf-block td{padding:5px 6px;border-top:1px solid #777;text-align:left;color:" + THEME.fg + ";background:" + THEME.bg + "}" +
      ".jf-h{font-weight:700;text-align:center;padding:6px;color:#fff}" +
      ".jf-input{width:88px;text-align:right;color:" + THEME.fg + ";background:" + THEME.bg + ";border:1px solid #777}" +
      ".jf-ok{color:#0b6b32;font-weight:700}.jf-no{color:#9b1c1c;font-weight:700}";
  if (typeof GM_addStyle === "function") {
    GM_addStyle(jfCss);
  } else {
    var jfStyleTag = document.createElement("style");
    jfStyleTag.textContent = jfCss;
    (document.head || document.documentElement).appendChild(jfStyleTag);
  }

  function num(v) {
    var n = Number(String(v || "").replace(/[^0-9.]/g, ""));
    return isFinite(n) ? n : 0;
  }
  function comma(n) { return Math.round(n).toLocaleString(); }
  function bodyText() { return document.body ? document.body.innerText : ""; }
  function shown(label) {
    var hit = bodyText().match(new RegExp(label + "\\s*:?\\s*\\(?\\s*(\\?+|[0-9][0-9,]*\\.?[0-9]*)", "i"));
    if (!hit || hit[1].indexOf("?") !== -1) return null;
    return num(hit[1]);
  }
  function labeled(label) {
    var n = shown(label);
    return n === null ? 0 : n;
  }
  function findHeader(label) {
    var nodes = document.querySelectorAll("td, th, div");
    for (var i = 0; i < nodes.length; i++) {
      if ((nodes[i].innerText || "").replace(/\s+/g, " ").trim() === label) return nodes[i];
    }
    return null;
  }
  function findHeaderPrefix(label) {
    var nodes = document.querySelectorAll("td, th, div");
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].innerText || "").replace(/\s+/g, " ").trim();
      if (t.indexOf(label) === 0) return nodes[i];
    }
    return null;
  }

  function headerStyle(node) {
    if (!node) return "background:#a11212;color:#fff;";
    var cs = window.getComputedStyle(node);
    if (!cs || !cs.backgroundColor || cs.backgroundColor === "rgba(0, 0, 0, 0)") return "background:#a11212;color:#fff;";
    return "background:" + cs.backgroundColor + ";color:" + (cs.color || "#fff") + ";";
  }
  function tableFrom(header) {
    var node = header;
    while (node && node.tagName !== "TABLE") node = node.parentNode;
    return node;
  }
  function insertBlock(box, prevId, fallbackHeader) {
    var prev = prevId ? document.getElementById(prevId) : null;
    if (prev && prev.parentNode) { prev.parentNode.insertBefore(box, prev.nextSibling); return; }
    var host = fallbackHeader ? tableFrom(fallbackHeader) : null;
    if (host && host.parentNode) host.parentNode.insertBefore(box, host);
    else document.body.appendChild(box);
  }
  function statsId() {
    if (!/stats\.php/i.test(location.pathname)) return null;
    return new URLSearchParams(location.search).get("id");
  }

  function sideCalc() {
    if (document.getElementById("jf-side")) return;
    var rank = findHeader("Rank:");
    if (!rank) {
      var nodes = document.querySelectorAll("td, div");
      for (var i = 0; i < nodes.length; i++) {
        if (/^Rank:\s*[0-9,]+/.test((nodes[i].innerText || "").trim())) rank = nodes[i];
      }
    }
    var xp = labeled("Experience");
    var turns = labeled("Turns");
    if (!turns && state.me && state.me.turns) turns = num(state.me.turns);
    if (!xp && state.me && state.me.xp) xp = num(state.me.xp);
    save();
    var attacks = Math.floor(turns / 120);
    var tradeTurns = Math.floor(xp / 1425) * 500;
    var tradeAttacks = Math.floor(tradeTurns / 120);
    var style = headerStyle(findHeader("Game Time") || findHeader("Server Time"));
    var box = document.createElement("table");
    box.id = "jf-side";
    box.className = "jf-block";
    var rowsHtml = "<tr><td class=\"jf-h\" style=\"" + style + "\">Turn Calculator</td></tr>" +
      "<tr><td>Attacks left " + comma(attacks) + "</td></tr>" +
      "<tr><td>XP trade attacks " + comma(tradeAttacks) + "</td></tr>";
    if (/base\.php/i.test(location.pathname)) {
      var prodM = bodyText().match(/([0-9][0-9,]*)\s*Gold\s*\(in 24 hours?\)/i);
      var produced = prodM ? num(prodM[1]) : 0;
      var stolen24 = 0;
      (state.stolen || []).forEach(function (r) { if (r.at >= Date.now() - DAY) stolen24 += r.gold; });
      if (produced > 0) {
        var pct = Math.max(0, Math.min(100, Math.round((1 - stolen24 / produced) * 1000) / 10));
        var cls = pct >= 60 ? "jf-ok" : "jf-no";
        rowsHtml += "<tr><td>Banked <span class=\"" + cls + "\">" + pct.toFixed(1) + "%</span></td></tr>";
      }
    }
    box.innerHTML = rowsHtml;
    var gt = findHeader("Game Time") || findHeader("Server Time");
    var gtTable = gt ? tableFrom(gt) : null;
    var rankTable = rank ? (rank.closest ? rank.closest("table") : tableFrom(rank)) : null;
    var host = gtTable || rankTable;
    if (host && host.parentNode) host.parentNode.insertBefore(box, host.nextSibling);
    else document.body.insertBefore(box, document.body.firstChild);
  }

  function warStats() {
    var id = statsId();
    if (!id) return;
    if (document.getElementById("jf-war")) return;
    var sri = findHeaderPrefix("Shared Recon Info");
    var recent = findHeaderPrefix("Recent Battles") || findHeader("Recent Battles");
    var style = headerStyle(sri || recent);
    var known = (state.targets && state.targets[id]) || {};
    function val(field, label) {
      var live = shown(label);
      if (live !== null) return live;
      return (known[field] !== null && known[field] !== undefined) ? num(known[field]) : null;
    }
    var sa = val("sa", "Strike Action");
    var da = val("da", "Defensive Action");
    var sentry = val("sentry", "Sentry Rating");
    var spy = val("spy", "Spy Rating");
    var poison = val("poison", "Poison Rating");
    var antidote = val("antidote", "Antidote Rating");
    var theft = val("theft", "Theft Rating");
    var vigilance = val("vigilance", "Vigilance Rating");
    function line(name, need) {
      if (need === null || !isFinite(need)) return "<tr><td>" + name + "</td><td style=\"text-align:right\">NA</td></tr>";
      return "<tr><td>" + name + "</td><td style=\"text-align:right\">" + comma(need) + "</td></tr>";
    }
    var box = document.createElement("table");
    box.id = "jf-war";
    box.className = "jf-block";
    box.innerHTML = "<tr><td class=\"jf-h\" colspan=\"2\" style=\"" + style + "\">War Stats</td></tr>" +
      line("SA required", da) +
      line("DA required", sa) +
      line("Spy required", sentry === null ? null : Math.ceil(sentry / 1.5)) +
      line("Sentry required", spy === null ? null : Math.ceil(spy * 1.5)) +
      line("Poison required", antidote === null ? null : Math.ceil(antidote / 2)) +
      line("Antidote required", poison === null ? null : Math.ceil(poison * 2)) +
      line("Theft required", vigilance === null ? null : Math.ceil(vigilance * 1.5)) +
      line("Vigilance required", theft === null ? null : Math.ceil(theft / 1.5));
    var sriTable = sri ? tableFrom(sri) : null;
    var host = recent ? tableFrom(recent) : null;
    if (sriTable && sriTable.parentNode) sriTable.parentNode.insertBefore(box, sriTable.nextSibling);
    else if (host && host.parentNode) host.parentNode.insertBefore(box, host);
    else document.body.insertBefore(box, document.body.firstChild);
  }


  function harvestWeapons() {
    var tables = document.querySelectorAll("table");
    for (var t = 0; t < tables.length; t++) {
      var rows = tables[t].querySelectorAll("tr");
      var hRow = -1, head = null, typeIdx = -1, qtyIdx = -1;
      for (var hr = 0; hr < Math.min(3, rows.length); hr++) {
        var hc = rows[hr].querySelectorAll("th, td");
        if (hc.length < 4) continue;
        var h = [];
        for (var h2 = 0; h2 < hc.length; h2++) h.push((hc[h2].innerText || "").replace(/\s+/g, " ").trim().toLowerCase());
        if (h.indexOf("quantity") === -1 || h.indexOf("strength") === -1) continue;
        var ti = h.indexOf("type");
        var qi = h.indexOf("quantity");
        if (ti === -1 || qi === -1) continue;
        hRow = hr; head = h; typeIdx = ti; qtyIdx = qi;
        break;
      }
      if (hRow === -1) continue;
      var MAP = { attack: "sa", defend: "da", spy: "spy", sentry: "sentry", poison: "poison", antidote: "antidote", theft: "theft", vigilance: "vigilance" };
      var wpns = {};
      for (var r = hRow + 1; r < rows.length; r++) {
        var cells = rows[r].querySelectorAll("td");
        if (cells.length <= Math.max(typeIdx, qtyIdx)) continue;
        var typeKey = MAP[(cells[typeIdx].innerText || "").trim().toLowerCase()];
        if (!typeKey) continue;
        var q = num(cells[qtyIdx].innerText || "");
        if (q > 0) wpns[typeKey] = (wpns[typeKey] || 0) + q;
      }
      if (!Object.keys(wpns).length) return;
      var text = bodyText();
      var nm = text.match(/into\s+([A-Za-z0-9_.-]{2,32})'s\s+camp/i) ||
               text.match(/(?:Reconnaissance|Sabotage|Theft|Attack|Poison)\s+Mission\s*(?:on\s+|against\s+)?([A-Za-z0-9_.-]{2,32})/i);
      if (!nm) return;
      var id0 = null;
      try { id0 = new URLSearchParams(location.search).get("id"); } catch (e) {}
      if (id0) {
        var t0 = state.targets[id0] || {};
        state.targets[id0] = Object.assign({}, t0, { weapons: wpns, wat: Date.now() });
      }
      state.weapons[nm[1].toLowerCase()] = wpns;
      save();
      return;
    }
  }
  function reconCarry() {
    if (!/inteldetail\.php/i.test(location.pathname)) return;
    var nm = bodyText().match(/into\s+([A-Za-z0-9_.-]{2,32})'s\s+camp/i);
    if (!nm) return;
    var id = state.nameid && state.nameid[nm[1].toLowerCase()];
    var snap = id ? state.targets[id] : null;
    var FIELDS = [["sa", "Strike Action"], ["da", "Defensive Action"], ["spy", "Spy Rating"], ["sentry", "Sentry Rating"], ["poison", "Poison Rating"], ["antidote", "Antidote Rating"], ["theft", "Theft Rating"], ["vigilance", "Vigilance Rating"]];
    var nodes = document.querySelectorAll("td, th, div, span");
    var touched = false;
    FIELDS.forEach(function (f) {
      if (snap[f[0]] === null || snap[f[0]] === undefined) return;
      for (var n = 0; n < nodes.length; n++) {
        var raw = (nodes[n].innerText || "").replace(/\s+/g, " ").trim();
        if (raw.length > 60) continue;
        if (new RegExp("^" + f[1] + "\\s*:?\\s*\\?+$", "i").test(raw)) {
          nodes[n].textContent = f[1] + ": " + comma(num(snap[f[0]]));
          touched = true;
          break;
        }
        if (new RegExp("^" + f[1] + "\\s*:?$", "i").test(raw)) {
          var sib = nodes[n].nextElementSibling;
          if (sib && /^\?+$/.test((sib.innerText || "").replace(/\s+/g, "").trim())) {
            sib.textContent = comma(num(snap[f[0]]));
            touched = true;
            break;
          }
        }
      }
    });
    if (!snap) {
      var key = "n:" + nm[1].toLowerCase();
      var created = { name: nm[1], at: Date.now() };
      var anyVal = false;
      FIELDS.forEach(function (f) {
        var live = shown(f[1]);
        if (live !== null) { created[f[0]] = live; anyVal = true; }
      });
      if (anyVal) {
        state.targets[key] = created;
        state.nameid[nm[1].toLowerCase()] = key;
        snap = created;
        save();
      }
    }
    var techNew = {};
    var flat = bodyText().replace(/\s+/g, " ");
    function grabTech(re, field) {
      var m = flat.match(re);
      if (m) techNew[field] = num(m[1]);
    }
    grabTech(/Covert Skill:\s*\(?([0-9]+)\)?/i, "spy");
    grabTech(/Sentry Skill:\s*\(?([0-9]+)\)?/i, "sentry");
    grabTech(/Toxic Infusion Level:\s*\(?([0-9]+)\)?/i, "poison");
    grabTech(/Viperbane Vigilance Level:\s*\(?([0-9]+)\)?/i, "vigilance");
    grabTech(/Shadowmeld Level:\s*\(?([0-9]+)\)?/i, "theft");
    grabTech(/Sentinel Vigil Level:\s*\(?([0-9]+)\)?/i, "antidote");
    var unitsNew = {};
    function grabUnit(re, field) {
      var mu = flat.match(re);
      if (mu) unitsNew[field] = (unitsNew[field] || 0) + num(mu[1]);
    }
    grabUnit(/Attack Soldiers:\s*([0-9][0-9,]*)/i, "sa");
    grabUnit(/Attack Mercenaries:\s*([0-9][0-9,]*)/i, "sa");
    grabUnit(/Defense Soldiers:\s*([0-9][0-9,]*)/i, "da");
    grabUnit(/Defense Mercenaries:\s*([0-9][0-9,]*)/i, "da");
    grabUnit(/Covert Spies:\s*([0-9][0-9,]*)/i, "spy");
    grabUnit(/Sentries:\s*([0-9][0-9,]*)/i, "sentry");
    grabUnit(/Venomweavers:\s*([0-9][0-9,]*)/i, "poison");
    grabUnit(/Serpentwardens:\s*([0-9][0-9,]*)/i, "antidote");
    grabUnit(/Thieves:\s*([0-9][0-9,]*)/i, "theft");
    grabUnit(/Rangers:\s*([0-9][0-9,]*)/i, "vigilance");
    if (snap && (Object.keys(techNew).length || Object.keys(unitsNew).length)) {
      var tid = state.nameid[nm[1].toLowerCase()];
      var tRec = tid ? state.targets[tid] : null;
      if (tRec) {
        tRec.tech = Object.assign({}, tRec.tech || {}, techNew);
        tRec.units = Object.assign({}, tRec.units || {}, unitsNew);
        save();
      }
    }
    if (snap && id) {
      var upd = Object.assign({}, state.targets[id] || {});
      var got = false;
      FIELDS.forEach(function (f) {
        var live = shown(f[1]);
        if (live !== null && (upd[f[0]] === null || upd[f[0]] === undefined)) {
          upd[f[0]] = live;
          got = true;
        }
      });
      if (got) { state.targets[id] = upd; save(); }
    }
    if (touched) {
      var ageH = Math.max(0, Math.round((Date.now() - (snap.at || Date.now())) / 360000) / 10);
      var note = document.createElement("div");
      note.id = "jf-carrynote";
      note.style.cssText = "font-size:10px;opacity:.7;padding:2px 8px;";
      note.textContent = "??? filled from your last known data (" + ageH + "h old).";
      var hdr = findHeaderPrefix("Military Stats");
      var ht = hdr ? tableFrom(hdr) : null;
      if (ht && ht.parentNode) ht.parentNode.insertBefore(note, ht.nextSibling);
      else document.body.insertBefore(note, document.body.firstChild);
    }
  }

  function dayBoundary() {
    var m = bodyText().match(/Server Time\s+(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/i);
    if (!m) return Date.now() - DAY;
    var sNow = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
    var b = new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0).getTime();
    if (b > sNow) b -= DAY;
    return Date.now() - (sNow - b);
  }

  function medianVal(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function sabAdvisor() {
    var id = statsId();
    if (!id) return;
    if (document.getElementById("jf-sab")) return;
    var known = (state.targets && state.targets[id]) || {};
    function val(field, label) {
      var live = shown(label);
      if (live !== null) return live;
      return (known[field] !== null && known[field] !== undefined) ? num(known[field]) : null;
    }
    var fields = [["sa", "SA", "Strike Action"], ["da", "DA", "Defensive Action"], ["spy", "Spy", "Spy Rating"], ["sentry", "Sentry", "Sentry Rating"], ["poison", "Poison", "Poison Rating"], ["antidote", "Antidote", "Antidote Rating"], ["theft", "Theft", "Theft Rating"], ["vigilance", "Vigilance", "Vigilance Rating"]];
    var meds = {};
    fields.forEach(function (f) {
      var vals = [];
      Object.keys(state.targets || {}).forEach(function (k) {
        var t = state.targets[k];
        if (t && t[f[0]] !== null && t[f[0]] !== undefined && t[f[0]] > 0) vals.push(num(t[f[0]]));
      });
      meds[f[0]] = medianVal(vals);
    });
    var nmHit = bodyText().match(/Name:\s*([A-Za-z0-9_.-]{2,32})/);
    var wpns = (nmHit && state.weapons && state.weapons[nmHit[1].toLowerCase()]) || known.weapons || {};
    function depthOf(qty) {
      if (!qty) return { f: 0.45, tag: "no tools seen" };
      if (qty < 200000) return { f: 1, tag: "shallow pool" };
      if (qty < 2000000) return { f: 0.75, tag: "moderate pool" };
      return { f: 0.4, tag: "deep pool" };
    }
    var rows = fields.map(function (f) {
      var v = val(f[0], f[2]);
      var med = meds[f[0]];
      var ratio = (v !== null && v > 0 && med) ? v / med : null;
      var qty = wpns[f[0]] || 0;
      var depth = depthOf(qty);
      var units = (known.units || {})[f[0]] || 0;
      var banked = units > 0 && qty >= units * 2;
      var belowPack = ratio !== null && ratio < 0.05 && !banked;
      var techLvl = (known.tech || {})[f[0]];
      var techF = techLvl ? Math.max(0.6, 1.6 - techLvl * 0.05) : 1;
      var score = (ratio === null || belowPack) ? null : ratio * depth.f * techF;
      return { label: f[1], v: v, ratio: ratio, qty: qty, depth: depth, score: score, belowPack: belowPack, banked: banked };
    }).filter(function (r) { return r.v !== null; });
    rows.sort(function (a, b) {
      if (a.score === null && b.score === null) return 0;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return a.score - b.score;
    });
    var style = headerStyle(findHeaderPrefix("Shared Recon Info") || findHeaderPrefix("Recent Battles"));
    var knownN = Object.keys(state.targets || {}).length;
    var html = "";
    var pick = rows.length && rows[0].score !== null ? rows[0] : null;
    rows.forEach(function (r, i) {
      var cell = comma(r.v);
      if (r.v === 0) {
        cell += " <span style='font-size:11px'>nothing to sab</span>";
      } else if (r.banked) {
        cell += " <span style='font-size:11px'>banked \u2014 destroys hidden rank</span>";
      } else if (r.belowPack) {
        cell += " <span style='font-size:11px'>already below pack \u2014 minimal gain</span>";
      } else {
        if (r.ratio !== null) {
          cell += " <span style='font-size:11px'>" + (r.ratio >= 1 ? r.ratio.toFixed(2) + "x median" : Math.round(r.ratio * 100) + "% of median") + "</span>";
        }
      }
      var rs = (pick && r.label === pick.label) ? " style='outline:1px solid #888;'" : "";
      html += "<tr" + rs + "><td>" + (i + 1) + ". " + r.label + "</td><td style='text-align:right'>" + cell + "</td></tr>";
    });
    if (pick) {
      html = "<tr><td colspan='2' style='font-size:11px;font-weight:700;'>Target: " + pick.label + " \u2014 " + Math.round(pick.ratio * 100) + "% of median across " + knownN + " known accounts</td></tr>" + html;
    } else {
      html = "<tr><td colspan='2'>Recon this target (and allies must recon others) \u2014 the pack comparison needs data.</td></tr>" + html;
    }
    var box = document.createElement("table");
    box.id = "jf-sab";
    box.className = "jf-block";
    box.innerHTML = "<tr><td class='jf-h' colspan='2' style='" + style + "'>Sab Advisor</td></tr>" + html;
    var hist = document.getElementById("jf-hist");
    var warBox = document.getElementById("jf-war");
    var recent = findHeaderPrefix("Recent Battles");
    var host = hist ? hist : (warBox ? warBox : (recent ? tableFrom(recent) : null));
    if (hist && hist.parentNode) hist.parentNode.insertBefore(box, hist);
    else if (host && host.parentNode) host.parentNode.insertBefore(box, host.nextSibling);
    else document.body.insertBefore(box, document.body.firstChild);
  }

  function targetHistory() {
    var id = statsId();
    if (!id) return;
    if (document.getElementById("jf-hist")) return;
    var F8 = ["sa", "da", "spy", "sentry", "poison", "antidote", "theft", "vigilance"];
    var NAMES = { sa: "SA", da: "DA", spy: "Spy", sentry: "Sentry", poison: "Poison", antidote: "Antidote", theft: "Theft", vigilance: "Vigilance" };
    var LABELS = { sa: "Strike Action", da: "Defensive Action", spy: "Spy Rating", sentry: "Sentry Rating", poison: "Poison Rating", antidote: "Antidote Rating", theft: "Theft Rating", vigilance: "Vigilance Rating" };
    var snap = {};
    F8.forEach(function (f) { snap[f] = shown(LABELS[f]); });
    snap.at = Date.now();
    var prevKnown = state.targets[id] || {};
    var nmM = bodyText().match(/Name:\s*([A-Za-z0-9_.-]{2,32})/);
    if (nmM) {
      snap.name = nmM[1];
      var nkey = "n:" + nmM[1].toLowerCase();
      if (state.targets[nkey]) {
        var ph = state.targets[nkey];
        F8.forEach(function (f0) {
          if ((snap[f0] === null || snap[f0] === undefined) && ph[f0] !== null && ph[f0] !== undefined) snap[f0] = ph[f0];
        });
        if (!prevKnown.at) prevKnown = ph;
        delete state.targets[nkey];
      }
      state.nameid[nmM[1].toLowerCase()] = id;
    }
    F8.forEach(function (ck) {
      if (snap[ck] !== null && snap[ck] !== undefined) return;
      if (prevKnown[ck] === null || prevKnown[ck] === undefined) return;
      snap[ck] = prevKnown[ck];
      var nodes = document.querySelectorAll("td, th, div, span");
      for (var n = 0; n < nodes.length; n++) {
        var raw = (nodes[n].innerText || "").replace(/\s+/g, " ").trim();
        if (raw.length > 60) continue;
        if (new RegExp("^" + LABELS[ck] + "\\s*:?\\s*\\?+$", "i").test(raw)) {
          nodes[n].textContent = LABELS[ck] + ": " + comma(snap[ck]);
          break;
        }
        if (new RegExp("^" + LABELS[ck] + "\\s*:?$", "i").test(raw)) {
          var sib = nodes[n].nextElementSibling;
          if (sib && /^\?+$/.test((sib.innerText || "").replace(/\s+/g, "").trim())) {
            sib.textContent = comma(snap[ck]);
            break;
          }
        }
      }
    });
    var log = state.histlog[id] || [];
    if (state.targets[id] && state.targets[id].at && !log.length) log.push(state.targets[id]);
    var cutoff = Date.now() - DAY;
    log = log.filter(function (row) { return row && row.at && row.at >= cutoff - DAY; });
    var last = log[log.length - 1];
    if (!last || snap.at - last.at > 10 * 60 * 1000) log.push(snap);
    else log[log.length - 1] = snap;
    state.histlog[id] = log;
    state.targets[id] = snap;
    // ---- bulletproof baseline: previous reading in log, else last-known snapshot (any age) ----
    var baseline = log.length > 1 ? log[log.length - 2] : null;
    if (!baseline && prevKnown && prevKnown.at && prevKnown.at < snap.at - 60000) {
      var anyKnown = F8.some(function (f) { return prevKnown[f] !== null && prevKnown[f] !== undefined; });
      if (anyKnown) baseline = prevKnown;
    }
    var windowMs = baseline ? Math.max(0, snap.at - baseline.at) : 0;
    var entries = [];
    F8.forEach(function (k) {
      if (snap[k] === null || snap[k] === undefined) return;
      var pct = null;
      if (baseline && baseline[k] !== null && baseline[k] !== undefined && baseline[k] > 0 && snap[k] > 0) {
        pct = Math.round((snap[k] - baseline[k]) / baseline[k] * 1000) / 10;
      }
      entries.push({ label: NAMES[k], val: snap[k], pct: pct });
    });
    entries.sort(function (a, b) {
      if (a.pct === null && b.pct === null) return 0;
      if (a.pct === null) return 1;
      if (b.pct === null) return -1;
      return b.pct - a.pct;
    });
    F8.forEach(function (k) {
      var has = entries.some(function (e) { return e.label === NAMES[k]; });
      if (!has) entries.push({ label: NAMES[k], val: null, pct: null, never: true });
    });
    var rows = "";
    var bestUp = null, bestDown = null;
    entries.forEach(function (en) {
      if (en.never) {
        var seenCount = 0;
        log.forEach(function (row) {
          var fk = F8.filter(function (ff) { return NAMES[ff] === en.label; })[0];
          if (fk && row[fk] !== null && row[fk] !== undefined) seenCount++;
        });
        rows += "<tr data-evid='" + en.label + "|" + seenCount + "|" + log.length + "'><td>" + en.label + "</td><td style=\"text-align:right\"><span style='font-size:11px;opacity:.7'>never known \u2014 tap for proof</span></td></tr>";
        return;
      }
      var cell = comma(en.val);
      if (en.pct !== null) {
        var cls = en.pct > 0 ? "jf-ok" : en.pct < 0 ? "jf-no" : "";
        var arrow = en.pct > 0 ? "\u25B2 " : en.pct < 0 ? "\u25BC " : "";
        var tag = arrow + (en.pct > 0 ? "+" : "") + en.pct + "%";
        cell += " <span class=\"" + cls + "\" style=\"font-size:11px\">" + tag + "</span>";
        if (en.pct > 0 && (!bestUp || en.pct > bestUp.pct)) bestUp = en;
        if (en.pct < 0 && (!bestDown || en.pct < bestDown.pct)) bestDown = en;
      }
      rows += "<tr><td>" + en.label + "</td><td style=\"text-align:right\">" + cell + "</td></tr>";
    });
    if (bestUp || bestDown) {
      var sum = "";
      if (bestUp) sum += "Upkeeping: " + bestUp.label + " (+" + bestUp.pct + "%)";
      if (bestUp && bestDown) sum += " \u00B7 ";
      if (bestDown) sum += "Dropping: " + bestDown.label + " (" + bestDown.pct + "%)";
      rows = "<tr><td colspan=\"2\" style=\"font-size:11px;font-weight:700;\">" + sum + "</td></tr>" + rows;
    }
    if (baseline) {
      var wTxt = windowMs >= DAY ? Math.round(windowMs / DAY * 10) / 10 + "d" : windowMs >= 3600000 ? Math.round(windowMs / 360000) / 10 + "h" : Math.max(1, Math.round(windowMs / 60000)) + "m";
      rows += "<tr><td>Since last recon</td><td style=\"text-align:right\">" + wTxt + " window</td></tr>";
    }
    var scrubbed = bodyText().replace(/Server Time\s+20\d\d-\d\d-\d\d[ T]\d\d:\d\d:\d\d/i, "");
    var tsM = scrubbed.match(/20\d\d-\d\d-\d\d[ T]\d\d:\d\d:\d\d/g) || [];
    var newestTs = 0;
    tsM.forEach(function (ts) {
      var tp = new Date(ts.replace(" ", "T")).getTime();
      if (!isNaN(tp) && tp > newestTs) newestTs = tp;
    });
    if (newestTs) {
      var ageH = Math.max(0, Math.round((Date.now() - newestTs) / 360000) / 10);
      rows += "<tr><td>Data age</td><td style=\"text-align:right\">" + ageH + "h old</td></tr>";
    }
    save();
    var box = document.createElement("table");
    box.id = "jf-hist";
    box.className = "jf-block";
    box.innerHTML = "<tr><td class=\"jf-h\" colspan=\"2\" style=\"" + headerStyle(findHeaderPrefix("Shared Recon Info") || findHeaderPrefix("Recent Battles") || findHeader("Recent Battles")) + "\">Growth Tracker</td></tr>" + rows;
    Array.prototype.forEach.call(box.querySelectorAll("tr[data-evid]"), function (tr) {
      tr.style.cursor = "pointer";
      tr.onclick = function () {
        var parts = tr.getAttribute("data-evid").split("|");
        window.alert(parts[0] + ": " + parts[1] + " of your last " + parts[2] + " stored readings ever contained this stat. If 0, KoC never displayed it to you \u2014 the game is hiding it (needs a deeper recon), not the script losing it.");
      };
    });
    var rankNode = findHeader("Rank:");
    if (!rankNode) {
      var cands = document.querySelectorAll("td, div");
      for (var j = 0; j < cands.length; j++) {
        if (/^Rank:\s*[0-9,]+/.test((cands[j].innerText || "").trim())) rankNode = cands[j];
      }
    }
    var host = rankNode ? (rankNode.closest ? rankNode.closest("table") : tableFrom(rankNode)) : null;
    if (host && host.parentNode) host.parentNode.insertBefore(box, host.nextSibling);
    else insertBlock(box, null, findHeaderPrefix("Shared Recon Info") || findHeader("Recent Battles"));
  }

  function hoursAgoText(text) {
    var t = String(text || "").toLowerCase();
    var m = t.match(/(\d+)\s*hour/);
    if (m) return Number(m[1]);
    if (/minute|second|just now/.test(t)) return 0;
    var d = t.match(/(\d+)\s*day/);
    if (d) return Number(d[1]) * 24;
    return 99;
  }
  function stealHarvest() {
    if (!/attacklog/i.test(location.pathname)) return;
    var head = findHeaderPrefix("Attacks On You");
    var table = head ? tableFrom(head) : null;
    if (!table) return;
    var rows = table.querySelectorAll("tr");
    var added = 0;
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].querySelectorAll("td");
      if (cells.length < 3) continue;
      if (hoursAgoText(cells[0].innerText || "") > 24) continue;
      var result = (cells[2].innerText || "");
      if (!/gold stolen/i.test(result)) continue;
      var g = result.match(/([0-9][0-9,]*)\s*gold/i);
      if (!g) continue;
      var gold = num(g[1]);
      var when = cells[0].innerText || "";
      var dup = (state.stolen || []).some(function (r) { return r.gold === gold && r.when === when; });
      if (!dup) { state.stolen.push({ at: Date.now(), gold: gold, when: when }); added++; }
    }
    if (added) save();
  }

  function harvestTiv() {
    var text = bodyText().replace(/\s+/g, " ");
    if (!/Sabotage Mission|Theft Mission|Reconnaissance Mission/i.test(text)) return;
    if (!/Total Invested Value/i.test(text)) return;
    var id = null;
    try { id = new URLSearchParams(location.search).get("id"); } catch (e) {}
    if (!id) {
      var fromUrl = location.href.match(/[?&]id=(\d+)/i);
      id = fromUrl ? fromUrl[1] : null;
    }
    var nameHit = text.match(/(?:Reconnaissance|Sabotage|Theft|Attack|Poison) Mission\s*(?:on\s+|against\s+)?([A-Za-z0-9_.-]{2,32})/i);
    var name = nameHit ? nameHit[1] : "";
    if (!id) id = name || null;
    if (!id) return;
    var inv = text.match(/Total Invested Value:?\s*\(?([0-9][0-9,.]*)\)?/i);
    if (!inv) return;
    var invested = num(inv[1]);
    if (!invested) return;
    if (name) {
      var nkey = name.toLowerCase();
      Object.keys(state.tiv).forEach(function (k) {
        if (k !== String(id) && state.tiv[k] && (state.tiv[k].name || "").toLowerCase() === nkey) delete state.tiv[k];
      });
    }
    state.tiv[id] = { id: String(id), name: name || ("#" + id), invested: invested, at: Date.now() };
    save();
  }
  function tivTracker() {
    if (!/base\.php/i.test(location.pathname)) return;
    if (document.getElementById("jf-tiv")) return;
    var rows = Object.keys(state.tiv || {}).map(function (k) { return state.tiv[k]; })
      .filter(function (r) { return r && r.invested; });
    var byName = {};
    for (var d = 0; d < rows.length; d++) {
      var nk = (rows[d].name || rows[d].id || "").toLowerCase();
      if (!byName[nk] || (rows[d].at || 0) >= (byName[nk].at || 0)) byName[nk] = rows[d];
    }
    rows = Object.keys(byName).map(function (k) { return byName[k]; });
    rows.sort(function (a, b) { return b.invested - a.invested; });
    var top = rows.slice(0, 20);
    var total = 0;
    for (var s = 0; s < rows.length; s++) total += rows[s].invested;
    function money(n) {
      var a = Math.abs(n);
      if (a >= 1e12) return (n / 1e12).toFixed(2) + "T";
      if (a >= 1e9) return (n / 1e9).toFixed(1) + "B";
      if (a >= 1e6) return (n / 1e6).toFixed(1) + "M";
      return comma(n);
    }
    var style = headerStyle(findHeaderPrefix("Recent Attacks On You") || findHeaderPrefix("Military Overview"));
    var linkCol = THEME.bg === "#fff" ? "#0645ad" : "#7fb3ff";
    var body = "";
    for (var i = 0; i < top.length; i++) {
      var r = top[i];
      body += "<tr><td style='padding:3px 6px;'>" + (i + 1) + "</td>" +
        "<td><a href='stats.php?id=" + r.id + "' style='color:" + linkCol + ";'>" + (r.name || r.id) + "</a></td>" +
        "<td style='text-align:right;padding:3px 6px;'>" + money(r.invested) + "</td></tr>";
    }
    if (!top.length) body = "<tr><td colspan='3' style='padding:6px;'>No data yet — open mission pages on targets to harvest invested values.</td></tr>";
    body += "<tr><td colspan='3' style='padding:4px 6px;font-size:11px;'>Total " + money(total) + " across " + rows.length + " known.</td></tr>";
    var box = document.createElement("table");
    box.id = "jf-tiv";
    box.className = "jf-block";
    box.innerHTML = "<tr><td class='jf-h' colspan='3' style='" + style + "'>TIV Tracker</td></tr>" + body;
    if (top.length) {
      for (var t = 0; t < top.length; t++) {
        var valueCell = box.rows[t + 1].cells[2];
        if (valueCell) {
          valueCell.title = Math.round(Number(top[t].invested) || 0).toLocaleString("en-US");
          valueCell.style.cursor = "help";
        }
      }
      var totalRow = box.rows[box.rows.length - 1];
      if (totalRow && totalRow.cells[0]) {
        totalRow.cells[0].title = Math.round(total).toLocaleString("en-US");
        totalRow.cells[0].style.cursor = "help";
      }
    }
    var ra = findHeaderPrefix("Recent Attacks On You");
    var raTable = ra ? tableFrom(ra) : null;
    var mil = findHeaderPrefix("Military Overview");
    var milTable = mil ? tableFrom(mil) : null;
    if (raTable && raTable.parentNode) raTable.parentNode.insertBefore(box, raTable.nextSibling);
    else if (milTable && milTable.parentNode) milTable.parentNode.insertBefore(box, milTable);
    else insertBlock(box, null, findHeader("Game Time"));
  }

  function upgradesPlanner() {
    if (!/upgrades\.php/i.test(location.pathname)) return;
    if (document.getElementById("jf-upg")) return;
    var flat = bodyText().replace(/\s+/g, " ");
    function grab(re) { var m = flat.match(re); return m ? num(m[1]) : 0; }
    var expOnhand = grab(/Experience:\s*\(?([0-9][0-9,.]*)\)?/i);
    var expBank = grab(/Experience Bank:\s*\(?([0-9][0-9,.]*)\)?/i);
    var expTurn = grab(/Experience Per Turn:\s*([0-9][0-9,.]*)/i);
    var out = [];
    var tables = document.querySelectorAll("table");
    for (var t = 0; t < tables.length; t++) {
      var rows = tables[t].querySelectorAll("tr");
      var costIdx = -1, startRow = -1;
      for (var hr = 0; hr < Math.min(3, rows.length); hr++) {
        var hc = rows[hr].querySelectorAll("th, td");
        if (hc.length < 2) continue;
        for (var i = 0; i < hc.length; i++) {
          if ((hc[i].innerText || "").toLowerCase().indexOf("cost") !== -1) { costIdx = i; startRow = hr; break; }
        }
        if (costIdx !== -1) break;
      }
      if (costIdx === -1) continue;
      for (var r = startRow + 1; r < rows.length; r++) {
        var cells = rows[r].querySelectorAll("td");
        if (cells.length <= costIdx) continue;
        var name = (cells[0].innerText || "").replace(/\s+/g, " ").trim();
        var costTxt = (cells[costIdx].innerText || "").trim();
        if (!name || name.length > 40) continue;
        var maxed = /max|n\/a|\?/i.test(costTxt);
        var cost = maxed ? 0 : num(costTxt);
        if (!maxed && !cost) continue;
        out.push({ name: name, cost: cost, maxed: maxed });
      }
      if (out.length) break;
    }
    if (!out.length) return;
    var avail = expOnhand + expBank;
    var style = headerStyle(findHeaderPrefix("Military Overview") || findHeaderPrefix("User Info"));
    var rowsHtml = "";
    out.slice(0, 15).forEach(function (u) {
      var cell;
      if (u.maxed) cell = "<span class='jf-ok'>MAX</span>";
      else if (u.cost <= avail) cell = "<span class='jf-ok'>affordable now</span>";
      else if (expTurn > 0) {
        var mins = (u.cost - avail) / expTurn;
        var d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), mn = Math.round(mins % 60);
        cell = (d ? d + "d " : "") + (h ? h + "h " : "") + mn + "m";
      } else cell = "\u2014";
      rowsHtml += "<tr><td>" + u.name + "</td><td style='text-align:right'>" + (u.maxed ? "" : comma(u.cost) + " EXP") + "</td><td style='text-align:right'>" + cell + "</td></tr>";
    });
    rowsHtml += "<tr><td colspan='3' style='font-size:11px;'>EXP on hand " + comma(expOnhand) + " + banked " + comma(expBank) + " = " + comma(avail) + " \u00B7 income " + comma(expTurn) + " EXP/turn.</td></tr>";
    var box = document.createElement("table");
    box.id = "jf-upg";
    box.className = "jf-block";
    box.innerHTML = "<tr><td class='jf-h' colspan='3' style='" + style + "'>Upgrade Planner</td></tr>" + rowsHtml;
    insertBlock(box, null, findHeader("Game Time"));
  }

  function reconLinks() {
    var id = statsId();
    if (!id) return;
    if (document.getElementById("jf-reconlinks")) return;
    var head = findHeaderPrefix("Recent Intelligence");
    var table = head ? tableFrom(head) : null;
    if (!table) return;
    var rows = table.querySelectorAll("tr");
    var marked = 0;
    for (var i = 0; i < rows.length; i++) {
      var a = rows[i].querySelector("a[href*='inteldetail.php?report_id=']");
      if (!a) {
        var cells = rows[i].querySelectorAll("td");
        for (var c = 0; c < cells.length; c++) {
          var sub = cells[c].querySelector("a[href*='report_id=']");
          if (sub) { a = sub; break; }
        }
      }
      if (a) { marked++; a.style.textDecoration = "underline"; a.title = "Open this recon \u2014 seeds Growth Tracker baseline"; }
    }
    if (marked > 1 && table.parentNode) {
      var note = document.createElement("div");
      note.id = "jf-reconlinks";
      note.style.cssText = "font-size:10px;opacity:.7;padding:2px 8px;";
      note.textContent = marked + " prior recons linked \u2014 tap one to seed its values into Growth Tracker.";
      table.parentNode.insertBefore(note, table.nextSibling);
    }
  }

  function stamp() {
    if (document.getElementById("jf-stamp")) return;
    var box = document.createElement("div");
    box.id = "jf-stamp";
    box.style.cssText = "font-size:10px;opacity:.65;padding:2px 6px;color:inherit;";
    box.textContent = "JFWarScout 9.0.1" + (lastErr ? " · ERR: " + lastErr : "");
    var side = document.getElementById("jf-side");
    if (side && side.parentNode) side.parentNode.insertBefore(box, side.nextSibling);
    else document.body.insertBefore(box, document.body.firstChild);
  }

  // Security: stay completely dark when logged out or timed out. A live session
  // must show a positive signal (game menu / Command Center); any logoff or
  // timeout marker, or a login-box password field, shuts the script down.
  function loggedIn() {
    var pw = document.querySelector("input[type='password']");
    if (pw) {
      var r = pw.getBoundingClientRect ? pw.getBoundingClientRect() : { width: 1, height: 1 };
      if (r.width > 0 && r.height > 0) return false;
    }
    var text = (document.body ? document.body.innerText : "").slice(0, 30000).toLowerCase();
    var hasMenu = /command center/i.test(text) || !!document.querySelector("a[href*='base.php']");
    if (hasMenu) return true;
    if (/session expired|you must log ?in|you are not logged in|you have been logged out|please log ?in|login to continue/.test(text)) return false;
    return /game time/i.test(text);
  }
  var lastErr = "";
  function safe(fn) { try { fn(); } catch (e) { lastErr = e && e.message ? e.message : String(e); } }
  function boot() {
    if (!loggedIn()) {
      var g = document.createElement("div");
      g.id = "jf-guard";
      g.style.cssText = "color:#ff5555;font-size:10px;padding:2px 6px;";
      g.textContent = "JFWarScout 9.0.0 · guard: logged-out signal detected";
      document.body.insertBefore(g, document.body.firstChild);
      return;
    }
    safe(stealHarvest);
    safe(upgradesPlanner);
    safe(harvestWeapons);
    safe(reconCarry);
    safe(harvestTiv);
    safe(tivTracker);
    safe(sideCalc);
    safe(targetHistory);
    safe(warStats);
    safe(sabAdvisor);
    safe(reconLinks);
    safe(function () { pullShare(function () { scheduleShare(); }); });
    safe(stamp);
  }

  function boardPack() { return { targets: state.targets || {}, histlog: state.histlog || {}, tiv: state.tiv || {}, weapons: state.weapons || {}, at: Date.now() }; }
  function mergeBoard(remote) {
    if (!remote) return;
    var targets = remote.targets || {};
    var STAT_FIELDS = ["sa", "da", "spy", "sentry", "poison", "antidote", "theft", "vigilance"];
    Object.keys(targets).forEach(function (id) {
      var snap = targets[id];
      if (!snap) return;
      var old = state.targets[id];
      if (!old) { state.targets[id] = snap; return; }
      var merged = Object.assign({}, old, snap);
      STAT_FIELDS.forEach(function (f) {
        var nv = snap[f], ov = old[f];
        if (nv === null || nv === undefined) merged[f] = ov;
        else if (ov === null || ov === undefined) merged[f] = nv;
        else merged[f] = (snap.at || 0) >= (old.at || 0) ? nv : ov;
      });
      merged.at = Math.max(snap.at || 0, old.at || 0);
      state.targets[id] = merged;
    });
    var histlog = remote.histlog || {};
    if (!state.histlog) state.histlog = {};
  if (!state.stolen) state.stolen = [];
  if (!state.tiv) state.tiv = {};
  if (!state.weapons) state.weapons = {};
  if (!state.nameid) state.nameid = {};
    Object.keys(histlog).forEach(function (id) {
      var mine = state.histlog[id] || [];
      var seen = {};
      mine.concat(histlog[id] || []).forEach(function (row) { if (row && row.at) seen[row.at] = row; });
      state.histlog[id] = Object.keys(seen).sort().map(function (ts) { return seen[ts]; });
    });
    var tiv = remote.tiv || {};
    if (!state.tiv) state.tiv = {};
  if (!state.weapons) state.weapons = {};
  if (!state.nameid) state.nameid = {};
    Object.keys(tiv).forEach(function (id) {
      var row = tiv[id];
      if (!row || !row.invested) return;
      var prev = state.tiv[id];
      if (!prev || (row.at || 0) >= (prev.at || 0)) state.tiv[id] = row;
    });
    var weaponsR = remote.weapons || {};
    Object.keys(weaponsR).forEach(function (n) {
      if (weaponsR[n]) state.weapons[n] = weaponsR[n];
    });
    save();
  }
  function httpJson(method, url, body, done, headers) {
    var cb = done || function () {};
    if (typeof GM_xmlhttpRequest === "function") {
      var h = { "Content-Type": "application/json", "Accept": "application/json" };
      if (headers) Object.keys(headers).forEach(function (k) { h[k] = headers[k]; });
      GM_xmlhttpRequest({ method: method, url: url, headers: h, data: body ? JSON.stringify(body) : undefined, onload: function (res) { cb(res.status, res.responseText); }, onerror: function () { cb(0, ""); } });
      return;
    }
    cb(0, "");
  }
  function pullShare(done) {
    var finish = function (status, text) {
      if (status >= 200 && status < 300 && text) {
        try {
          if (SHARE_MODE === "gist") {
            var gist = JSON.parse(text);
            var f = gist.files && gist.files["jf-board.json"];
            if (f && f.content) mergeBoard(JSON.parse(f.content));
          } else {
            mergeBoard(JSON.parse(text));
          }
        } catch (e) {}
      }
      if (done) done();
    };
    if (SHARE_MODE === "gist" && GIST_ID && GIST_TOKEN) {
      httpJson("GET", "https://api.github.com/gists/" + GIST_ID, null, finish, { "Authorization": "token " + GIST_TOKEN });
    } else {
      httpJson("GET", "https://jsonblob.com/api/jsonBlob/" + ALLIANCE_SHARE, null, finish);
    }
  }
  var lastPushRaw = "";
  var lastPushAt = 0;
  var repushTimer = 0;
  function pushShare() {
    var raw = JSON.stringify(boardPack());
    var now = Date.now();
    if (raw === lastPushRaw) return;
    if (now - lastPushAt < 60000) { clearTimeout(repushTimer); repushTimer = setTimeout(pushShare, 60000 - (now - lastPushAt)); return; }
    lastPushRaw = raw;
    lastPushAt = now;
    if (SHARE_MODE === "gist" && GIST_ID && GIST_TOKEN) {
      httpJson("POST", "https://api.github.com/gists/" + GIST_ID, { files: { "jf-board.json": { content: JSON.stringify(boardPack()) } } }, function () {}, { "Authorization": "token " + GIST_TOKEN });
    } else {
      httpJson("PUT", "https://jsonblob.com/api/jsonBlob/" + ALLIANCE_SHARE, boardPack(), function () {});
    }
  }
  var shareTimer = 0;
  function scheduleShare() { clearTimeout(shareTimer); shareTimer = setTimeout(pushShare, 1500); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
