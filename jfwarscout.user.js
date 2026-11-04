// ==UserScript==
// @name        JFWarScout
// Built by Jedi Faction. Free for allied use with attribution.
// @namespace   https://www.kingsofchaos.com/
// @version     9.2.21a
// @default      JFWarScout v9.0.0 — paste this entire build into Stay/Tampermonkey as-is.
// @author      Jedi Faction
// @description Jedi Faction shared recon, compact Sab Advisor, war stats and trackers. One script for Stay and Tampermonkey.
// @match       https://www.kingsofchaos.com/*
// @match       https://kingsofchaos.com/*
// @include     https://www.kingsofchaos.com/*
// @include     https://kingsofchaos.com/*
// @run-at      document-end
// @connect     jfactiongaming.com
// @updateURL    https://jfactiongaming.com/jfwarscout.user.js
// @downloadURL  https://jfactiongaming.com/jfwarscout.user.js
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_addStyle
// @grant       GM_xmlhttpRequest
// @grant       GM_registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  // Purge any preexisting storage key once on script execution
  try { localStorage.removeItem("jedi_board_v7"); } catch (e) {}
  try { if (typeof GM_deleteValue === "function") GM_deleteValue("jedi_board_v7"); } catch (e) {}

  // Keep setup controls and styling off login/security and protected list pages.
  if (/\/(?:login|confirm\.login|security)\.php/i.test(location.pathname)) return;

  var jfStatusOnly = /\/(?:warlist|farmlist)\.php/i.test(location.pathname);

  var CONFIG_URL = 'https://jfactiongaming.com/script_config.json';
  var REDIRECT_URL = 'http://jfactiongaming.com/jfwarscout2.user.js';
  var currentVersion = GM_info.script.version;
  var SITE_PUSH = "https://jfactiongaming.com/warscout2_api.php";
  var SITE_TOKEN = "";
  try { SITE_TOKEN = typeof GM_getValue === "function" ? GM_getValue("JF_SCRIPT_ACCESS_KEY", "") : ""; } catch (e) {}
  var jfSyncText = SITE_TOKEN ? "Sharing: connecting…" : "Sharing: not connected";
  var jfLastUpload = null;
  var jfTransferStatus = null;

  function jfShowSync(message) {
    if (/^Sharing: (upload |connected; sync unavailable|unexpected server response)/.test(message)) jfTransferStatus = message;
    if (/^Sharing: last upload/.test(message)) jfTransferStatus = null;
    jfSyncText = message;
    var box = document.getElementById("jf-sharing-status");
    if (box) {
      box.firstChild.textContent = message;
      var button = box.querySelector("button");
      if (button) button.textContent = jfAuthorized || /^Sharing: (connected|last upload)/.test(message) ? "Change sharing key" : "Connect Jedi sharing";
    }
  }

  function jfConnectSharing() {
    var key = prompt("Paste your personal script key from jfactiongaming.com/script-access.php. Never enter your KoC password or a bot token.");
    if (key === null) return;
    key = key.trim();
    if (!/^jfs_[a-f0-9]{64}$/.test(key)) { alert("Use the personal key generated on the website’s Script access page."); return; }
    if (typeof GM_setValue !== "function") { alert("Your extension must support GM_setValue to store the key."); return; }
    jfForgetApproval();
    GM_setValue("JF_SCRIPT_ACCESS_KEY", key); SITE_TOKEN = key;
    jfTransferStatus = null; jfLastUpload = null;
    jfShowSync("Sharing: connecting…");
    jfCheckMembership();
  }

  function jfPlaceInfo() {
    var anchor = document.getElementById("jf-side");
    if (!anchor) {
      var timeHeader = findHeader("Game Time") || findHeader("Server Time");
      anchor = timeHeader ? tableFrom(timeHeader) : null;
    }
    if (!anchor) {
      var logout = document.querySelector("a[href*='logout.php']");
      anchor = logout ? tableFrom(logout) : null;
    }
    ["jf-stamp", "jf-sharing-status"].forEach(function (id) {
      var box = document.getElementById(id);
      if (!box) return;
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
      else if (!box.parentNode) document.body.appendChild(box);
      anchor = box;
    });
  }

  function jfSharingControls() {
    if (document.getElementById("jf-sharing-status")) { jfPlaceInfo(); return; }
    var box = document.createElement("div"); box.id = "jf-sharing-status";
    box.style.cssText = "font-size:11px;padding:6px;";
    box.appendChild(document.createTextNode(jfSyncText));
    var b = document.createElement("button"); b.type = "button"; b.textContent = jfAuthorized || /^Sharing: (connected|last upload)/.test(jfSyncText) ? "Change sharing key" : "Connect Jedi sharing";
    b.style.cssText = "display:block;margin-top:4px"; b.addEventListener("click", jfConnectSharing); box.appendChild(b);
    document.body.appendChild(box);
    jfPlaceInfo();
    if (typeof GM_registerMenuCommand === "function") GM_registerMenuCommand("Connect Jedi sharing", jfConnectSharing);
  }

  var DAY = 24 * 60 * 60 * 1000;
  // Live in-memory only: no disk persistence
  var state = { targets: {}, histlog: {}, tiv: {}, weapons: {}, nameid: {}, me: {} };
  function save() {
    if (typeof scheduleShare === "function") scheduleShare();
  }

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

  function jfApplyStyle() {
    if (typeof GM_addStyle === "function") {
      GM_addStyle(jfCss);
    } else {
      var jfStyleTag = document.createElement("style");
      jfStyleTag.textContent = jfCss;
      (document.head || document.documentElement).appendChild(jfStyleTag);
    }
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
    var existing = document.getElementById("jf-side");
    if (existing) existing.remove();
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
    var existing = document.getElementById("jf-war");
    if (existing) existing.remove();
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
      line("SA estimate", da) +
      line("DA estimate", sa) +
      line("Spy estimate", sentry === null ? null : Math.ceil(sentry / 1.5)) +
      line("Sentry estimate", spy === null ? null : Math.ceil(spy * 1.5)) +
      line("Poison estimate", antidote === null ? null : Math.ceil(antidote / 2)) +
      line("Antidote estimate", poison === null ? null : Math.ceil(poison * 2)) +
      line("Theft estimate", vigilance === null ? null : Math.ceil(vigilance * 1.5)) +
      line("Vigilance estimate", theft === null ? null : Math.ceil(theft / 1.5)) +
      "<tr><td colspan='2'>Reference estimates from stored/displayed target stats. The game's success thresholds are unverified; these are not guaranteed requirements. Zero does not guarantee success.</td></tr>";
    var sriTable = sri ? tableFrom(sri) : null;
    var host = recent ? tableFrom(recent) : null;
    if (sriTable && sriTable.parentNode) sriTable.parentNode.insertBefore(box, sriTable.nextSibling);
    else if (host && host.parentNode) host.parentNode.insertBefore(box, host);
    else document.body.insertBefore(box, document.body.firstChild);
  }

  var jfWeaponCategories = {"sarumans ball":"sa","heavy steed":"sa","chariot":"sa","blackpowder missile":"sa","spider":"da","mithril":"da","ebony platemail":"da","invisibility shield":"da","cloak":"spy","grappling hook":"spy","skeleton key":"spy","nunchaku":"spy","horn":"sentry","tripwire":"sentry","guard dog":"sentry","lookout tower":"sentry","toxic needle dagger":"poison","venomfang staff":"poison","blightbane bow":"poison","plaguebringer scythe":"poison","viperfang dirk":"antidote","basiliskbane halberd":"antidote","wyrmclaw longsword":"antidote","serpentbane arbalest":"antidote","greasy gloves":"theft","rusty lockpick":"theft","shadow cloak":"theft","ethereal grasp":"theft","wooden whistle":"vigilance","steel shackles":"vigilance","silver scepter":"vigilance","adamantine bastion":"vigilance"};
  var jfWeaponMaxima = {"sarumans ball":1,"heavy steed":100,"chariot":600,"blackpowder missile":1000,"spider":10,"mithril":100,"ebony platemail":600,"invisibility shield":1000,"cloak":140,"grappling hook":250,"skeleton key":600,"nunchaku":1000,"horn":140,"tripwire":250,"guard dog":600,"lookout tower":1000,"toxic needle dagger":140,"venomfang staff":250,"blightbane bow":600,"plaguebringer scythe":1000,"viperfang dirk":140,"basiliskbane halberd":250,"wyrmclaw longsword":600,"serpentbane arbalest":1000,"greasy gloves":140,"rusty lockpick":250,"shadow cloak":600,"ethereal grasp":1000,"wooden whistle":140,"steel shackles":250,"silver scepter":600,"adamantine bastion":1000};

  function jfRecognizeWeapon(category,maximum) {
    if(!category||!(maximum>0))return null;
    var names=Object.keys(jfWeaponCategories).filter(function(name){return jfWeaponCategories[name]===category&&jfWeaponMaxima[name]===maximum;});
    return names.length===1?names[0].replace(/\b\w/g,function(c){return c.toUpperCase();}):null;
  }
  function jfEquipmentKnown(field,value) {
    return field==='category'?jfStatFields.indexOf(value)>=0:typeof value==='number'&&isFinite(value)&&value>=0&&(field!=='qty'||Number.isSafeInteger(value));
  }
  function jfMergeEquipment(old,incoming) {
    old=old||{};incoming=incoming||{};
    var by=Object.create(null),out=Object.assign({},old),fields=['category','qty','strength','maxStrength','price'];
    [old,incoming].forEach(function(eq){
      (Array.isArray(eq.items)?eq.items:[]).slice(0,256).forEach(function(item){
        if(!item||typeof item.name!=='string')return;
        var name=item.name.trim().slice(0,80),key=name.toLowerCase();
        if(!name||/\?/.test(name)||['__proto__','constructor','prototype'].indexOf(key)>=0)return;
        var row=by[key]||(by[key]={name:name,fieldAt:{},fieldSource:{}});
        var identityAt=Number(item.nameAt||item.at||eq.at||0),origin=item.nameOrigin==='category+maximum'?'category+maximum':'visible';
        if(identityAt>0&&identityAt<=Date.now()+300000&&(identityAt>(row.nameAt||0)||identityAt===(row.nameAt||0)&&origin==='visible')){row.nameOrigin=origin;row.nameAt=identityAt;}
        fields.forEach(function(f){
          if(!jfEquipmentKnown(f,item[f]))return;
          var at=Number(item.fieldAt&&item.fieldAt[f]!==undefined?item.fieldAt[f]:item.at||eq.at||0);
          if(!(at>0)||!isFinite(at)||at>Date.now()+300000)return;
          if(at>=(row.fieldAt[f]||0)){row[f]=item[f];row.fieldAt[f]=at;row.fieldSource[f]=String(item.fieldSource&&item.fieldSource[f]||item.source||'shared recon').slice(0,100);}
        });
        row.at=Math.max.apply(null,[0].concat(Object.keys(row.fieldAt).map(function(k){return row.fieldAt[k];})));
      });
    });
    if(Number(incoming.at||0)>=Number(old.at||0))['complete','incompleteCategories','unknownCategory'].forEach(function(k){if(incoming[k]!==undefined)out[k]=incoming[k];else delete out[k];});
    out.schema=2;out.at=Math.max(Number(old.at||0),Number(incoming.at||0));
    out.items=Object.keys(by).sort().map(function(k){return by[k];});return out;
  }
  function harvestWeapons() {
    if(!/\/(?:stats|inteldetail|sabotage)\.php$/i.test(location.pathname))return;
    var text=bodyText(),nm=text.match(/into\s+([A-Za-z0-9_.-]{2,32})['’]s\s+camp/i)||text.match(/(?:Reconnaissance|Sabotage|Theft|Attack|Poison)\s+Mission\s*(?:on\s+|against\s+)?([A-Za-z0-9_.-]{2,32})/i);
    var pid=statsId(),id=pid&&/^\d+$/.test(pid)?pid:nm?jfPlayerId(nm[1])||'n:'+nm[1].toLowerCase():null;
    if(!id)return;
    var now=Date.now(),report=new URLSearchParams(location.search).get('report_id'),at=now,source='open profile';
    if(/^\d+$/.test(report||'')){
      state.reconSeen=state.reconSeen||{};at=state.reconSeen[report]||now;source='recon report '+report;
    }
    var eq={schema:2,at:at,items:[],complete:true,incompleteCategories:{},unknownCategory:false},sums={},blocked={},found=false;
    var MAP={attack:'sa',defend:'da',defense:'da',spy:'spy',sentry:'sentry',poison:'poison',antidote:'antidote',theft:'theft',vigilance:'vigilance'};
    function clean(c){return (c&&(c.innerText||c.textContent)||'').replace(/\s+/g,' ').trim();}
    function number(t){return /^\d[\d,]*(?:\.\d+)?$/.test(t)?Number(t.replace(/,/g,'')):null;}
    function cells(row,table){return Array.prototype.filter.call(row.querySelectorAll('th,td'),function(c){return c.closest('tr')===row&&c.closest('table')===table;});}
    var tables=document.querySelectorAll('table');
    for(var ti=0;ti<tables.length;ti++){
      var table=tables[ti];if(table.closest('.jf-block'))continue;
      var rows=Array.prototype.filter.call(table.querySelectorAll('tr'),function(r){return r.closest('table')===table;}),idx=null;
      for(var ri=0;ri<rows.length;ri++){
        var cs=cells(rows[ri],table),h=cs.map(function(c){return clean(c).toLowerCase();});
        if(h.indexOf('name')>=0&&h.indexOf('type')>=0&&h.indexOf('quantity')>=0){idx={name:h.indexOf('name'),type:h.indexOf('type'),qty:h.indexOf('quantity'),strength:h.indexOf('strength'),price:Math.max(h.indexOf('price'),h.indexOf('cost'))};continue;}
        if(!idx||cs.length<=Math.max(idx.name,idx.type,idx.qty))continue;
        found=true;
        var name=clean(cs[idx.name]).slice(0,80),shownType=MAP[clean(cs[idx.type]).toLowerCase()];
        var strength=idx.strength>=0?clean(cs[idx.strength]):'',match=strength.match(/^(\d[\d,]*(?:\.\d+)?|\?+)(?:\s*\/\s*(\d[\d,]*(?:\.\d+)?|\?+))?$/),current=match?number(match[1]):null,maximum=match&&match[2]?number(match[2]):null;
        var invalidStrength=current!==null&&maximum!==null&&current>maximum;
        if(invalidStrength){current=null;maximum=null;}
        var inferred=false;
        if(!name||/\?/.test(name)){var recognized=jfRecognizeWeapon(shownType,maximum);if(recognized){name=recognized;inferred=true;}}
        var knownType=jfWeaponCategories[name.toLowerCase()],category=shownType||knownType;
        var qty=number(clean(cs[idx.qty]));if(!Number.isSafeInteger(qty)||qty<0)qty=null;
        if(category&&qty!==null)sums[category]=(sums[category]||0)+qty;
        else if(category)blocked[category]=true;
        if(!name||/\?/.test(name)||!category||shownType&&knownType&&shownType!==knownType){
          eq.complete=false;if(category)eq.incompleteCategories[category]=true;else eq.unknownCategory=true;
          if(shownType&&knownType&&shownType!==knownType){blocked[shownType]=blocked[knownType]=true;eq.incompleteCategories[knownType]=true;}
          if(!name||/\?/.test(name))continue;
          if(shownType&&knownType&&shownType!==knownType)continue;
        }
        var item={name:name,nameOrigin:inferred?'category+maximum':'visible',nameAt:at,fieldAt:{},fieldSource:{},at:at};
        var values={category:category,qty:qty,strength:current,maxStrength:maximum,price:idx.price>=0?number(clean(cs[idx.price]).replace(/\s*Gold$/i,'')):null};
        Object.keys(values).forEach(function(f){if(jfEquipmentKnown(f,values[f])){item[f]=values[f];item.fieldAt[f]=at;item.fieldSource[f]=source+(inferred?' (name from type+max)':'');}});
        if(qty===null||current===null){eq.complete=false;if(category)eq.incompleteCategories[category]=true;}
        eq.items.push(item);
      }
    }
    if(!found)return;
    if(/^\d+$/.test(report||''))state.reconSeen=state.reconSeen||{};
    Object.keys(blocked).forEach(function(f){delete sums[f];});
    var detail={equipment:eq,weapons:sums,wat:at,fieldAt:{}};
    if(nm)detail.name=nm[1];
    Object.keys(sums).forEach(function(f){detail.fieldAt['weapons.'+f]=at;});
    state.targets[id]=jfMergeTarget(state.targets[id],detail);
    if(nm){var observation=Object.assign({},sums,{at:at,fieldAt:{}});Object.keys(sums).forEach(function(f){observation.fieldAt[f]=at;});state.weapons[nm[1].toLowerCase()]=jfMergeTarget(state.weapons[nm[1].toLowerCase()],observation);}
    save();
  }

  var jfStatFields = ["sa", "da", "spy", "sentry", "poison", "antidote", "theft", "vigilance"];
  function jfFieldTime(row, field, family) {
    var key = family ? family + "." + field : field;
    var explicit = row.fieldAt && row.fieldAt[key];
    var value = explicit !== undefined ? explicit : (family === "weapons" ? row.wat || row.at : row.at);
    value = Number(value || 0);
    return isFinite(value) && value >= 0 ? value : 0;
  }
  function jfMergeTarget(old, incoming) {
    old = old || {}; incoming = incoming || {};
    var out = Object.assign({}, old);
    out.fieldAt = Object.assign({}, old.fieldAt || {});
    [null, "tech", "units", "weapons"].forEach(function (family) {
      var before = family ? old[family] || {} : old;
      var next = family ? incoming[family] || {} : incoming;
      var result = family ? Object.assign({}, before) : out;
      jfStatFields.forEach(function (field) {
        var key = family ? family + "." + field : field;
        if (before[field] !== null && before[field] !== undefined) out.fieldAt[key] = jfFieldTime(old, field, family);
        if (next[field] === null || next[field] === undefined) return;
        var nt = jfFieldTime(incoming, field, family);
        if (before[field] === null || before[field] === undefined || nt >= jfFieldTime(old, field, family)) {
          result[field] = next[field]; out.fieldAt[key] = nt;
        }
      });
      if (family && Object.keys(result).length) out[family] = result;
    });
    if (incoming.name && (!old.name || (incoming.at || 0) >= (old.at || 0))) out.name = incoming.name;
    if (incoming.id) out.id = incoming.id;
    if (Number.isInteger(incoming.rank) && incoming.rank > 0 && (!old.rank || (incoming.rankAt || 0) >= (old.rankAt || 0))) {
      out.rank = incoming.rank; out.rankAt = incoming.rankAt || 0;
    }
    if (incoming.equipment) out.equipment = jfMergeEquipment(old.equipment, incoming.equipment);
    if (incoming.sabCap && (!old.sabCap || incoming.sabCap.at >= old.sabCap.at)) out.sabCap = incoming.sabCap;
    out.statRanks = Object.assign({}, old.statRanks || {});
    Object.keys(incoming.statRanks || {}).forEach(function(key){
      var row=incoming.statRanks[key],before=out.statRanks[key];
      if(row&&Number.isSafeInteger(row.value)&&row.value>0&&(!before||row.at>=before.at))out.statRanks[key]=row;
    });
    out.unitBreakdown = Object.assign({}, old.unitBreakdown || {});
    Object.keys(incoming.unitBreakdown || {}).forEach(function (key) {
      var row=incoming.unitBreakdown[key],before=out.unitBreakdown[key];
      if(row && (!before || row.at>=before.at))out.unitBreakdown[key]=row;
    });
    out.at = Math.max(Number(old.at || 0), Number(incoming.at || 0));
    out.wat = Math.max(Number(old.wat || 0), Number(incoming.wat || 0));
    return out;
  }
  function jfPlayerId(name) {
    var links = document.querySelectorAll('a[href*="stats.php?"]');
    for (var i = 0; i < links.length; i++) {
      var text = (links[i].textContent || "").trim().toLowerCase().replace(/[’\']s$/, "");
      var match = (links[i].getAttribute("href") || "").match(/[?&]id=([0-9]+)(?:&|$)/i);
      if (name && text === name.toLowerCase() && match) return match[1];
    }
    var cached = name && state.nameid[name.toLowerCase()];
    return cached && /^\d+$/.test(cached) ? cached : null;
  }
  function reconCarry() {
    if (!/inteldetail\.php/i.test(location.pathname)) return;
    var nm = bodyText().match(/into\s+([A-Za-z0-9_.-]{2,32})'s\s+camp/i);
    if (!nm) return;
    var id = jfPlayerId(nm[1]) || "n:" + nm[1].toLowerCase();
    state.nameid[nm[1].toLowerCase()] = id;
    var snap = id ? state.targets[id] : null;
    var FIELDS = [["sa", "Strike Action"], ["da", "Defensive Action"], ["spy", "Spy Rating"], ["sentry", "Sentry Rating"], ["poison", "Poison Rating"], ["antidote", "Antidote Rating"], ["theft", "Theft Rating"], ["vigilance", "Vigilance Rating"]];
    var observed = { name: nm[1], at: Date.now(), fieldAt: {} };
    var hasObserved = false;
    FIELDS.forEach(function (f) {
      var live = shown(f[1]);
      if (live !== null) { observed[f[0]] = live; observed.fieldAt[f[0]] = observed.at; hasObserved = true; }
    });
    if (hasObserved) {
      snap = jfMergeTarget(snap, observed);
      state.targets[id] = snap;
      save();
    }
    var nodes = document.querySelectorAll("td, th, div, span");
    var touched = false;
    FIELDS.forEach(function (f) {
      if (!snap || snap[f[0]] === null || snap[f[0]] === undefined) return;
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
    var individual=jfReadUnitBreakdown(observed.at),unitsNew=individual.totals;
    if(!snap&&(Object.keys(techNew).length||Object.keys(individual.values).length)) {
      snap={name:nm[1],at:0};state.targets[id]=snap;
    }
    if (snap && (Object.keys(techNew).length || Object.keys(unitsNew).length || Object.keys(individual.values).length)) {
      var tid = state.nameid[nm[1].toLowerCase()];
      var tRec = tid ? state.targets[tid] : null;
      if (tRec) {
        var detail = { at: observed.at, tech: techNew, units: unitsNew, unitBreakdown: individual.values, fieldAt: {} };
        ["tech", "units"].forEach(function (family) {
          Object.keys(detail[family]).forEach(function (field) { detail.fieldAt[family + "." + field] = observed.at; });
        });
        state.targets[tid] = jfMergeTarget(tRec, detail);
        save();
      }
    }
    touched=jfFillKnownUnits(state.targets[id],observed.at)||touched;
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

  function medianVal(arr) {
    if (!arr.length) return null;
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function jfGrowthBaseline(log, previous, now) {
    var candidates=(log||[]).concat(previous?[previous]:[]).filter(function(row){return row&&row.at>=now-DAY&&row.at<now-60000;});
    candidates.sort(function(a,b){return a.at-b.at;});
    return candidates[0]||null;
  }
  var jfUnitLabels=[
    ["attackSoldiers","Attack Soldiers","sa"],["attackMercenaries","Attack Mercenaries","sa"],
    ["defenseSoldiers","Defense Soldiers","da"],["defenseMercenaries","Defense Mercenaries","da"],
    ["spies","Covert Spies","spy"],["sentries","Sentries","sentry"],
    ["poisonUnits","Venomweavers","poison"],["antidoteUnits","Serpentwardens","antidote"],
    ["thieves","Thieves","theft"],["rangers","Rangers","vigilance"]
  ];
  function jfReadUnitBreakdown(now) {
    var values={},totals={};
    jfUnitLabels.forEach(function(def){var value=shown(def[1]);if(value!==null)values[def[0]]={value:value,at:now};});
    ["sa","da","spy","sentry","poison","antidote","theft","vigilance"].forEach(function(category){
      var needed=jfUnitLabels.filter(function(def){return def[2]===category;});
      if(needed.every(function(def){return values[def[0]]!==undefined;}))totals[category]=needed.reduce(function(sum,def){return sum+values[def[0]].value;},0);
    });
    return {values:values,totals:totals};
  }
  function jfFillKnownUnits(target,now) {
    var touched=false,nodes=document.querySelectorAll("td, th, div, span");
    jfUnitLabels.forEach(function(def){
      var stored=target&&target.unitBreakdown&&target.unitBreakdown[def[0]];
      if(!stored||now-stored.at<0||now-stored.at>2*DAY||typeof stored.value!=="number")return;
      for(var i=0;i<nodes.length;i++){
        var text=(nodes[i].innerText||"").replace(/\s+/g," ").trim();
        if(text===def[1]+": ???"||text===def[1]+" ???"){nodes[i].textContent=def[1]+": "+comma(stored.value);nodes[i].title="Saved individual count ("+((now-stored.at)/3600000).toFixed(1)+"h old); not a fresh observation";touched=true;break;}
        if(text===def[1]||text===def[1]+":"){
          var sibling=nodes[i].nextElementSibling;
          if(sibling&&/^\?+$/.test((sibling.innerText||"").trim())){sibling.textContent=comma(stored.value);sibling.title="Saved individual count ("+((now-stored.at)/3600000).toFixed(1)+"h old); not a fresh observation";touched=true;break;}
        }
      }
    });return touched;
  }
  function jfWeaponValues(target, now) {
    var out={},equipment=target&&target.equipment;
    if(!equipment||!Array.isArray(equipment.items)||now-equipment.at<0||now-equipment.at>2*DAY)return out;
    var defaults={sa:750000,da:750000,spy:1000000,sentry:1000000,poison:1000000,antidote:1000000,theft:1000000,vigilance:1000000};
    equipment.items.forEach(function(item){
      var times=item.fieldAt||{},qat=times.qty!==undefined?times.qty:item.at||equipment.at;
      if(!qat||now-qat<0||now-qat>2*DAY)return;
      if(!jfStatFields.includes(item.category)||!Number.isSafeInteger(item.qty)||item.qty<0)return;
      var group=out[item.category]||(out[item.category]={value:0,estimated:false,partial:!!equipment.unknownCategory || (equipment.incompleteCategories ? !!equipment.incompleteCategories[item.category] : !equipment.complete)});
      var pat=times.price!==undefined?times.price:item.at||equipment.at;
      var price=pat>0&&now>=pat&&now-pat<=2*DAY&&typeof item.price==="number"&&isFinite(item.price)&&item.price>0?item.price:null;
      if(price===null&&item.qty>0){price=defaults[item.category];group.estimated=true;}
      group.value+=item.qty*(price||0);
    });return out;
  }
  function jfCaptureSabCap() {
    if(!/\/(?:stats|sabotage|inteldetail|attack)\.php/i.test(location.pathname))return;
    var match=bodyText().replace(/\s+/g," ").match(/Maximum Daily Sabotage loss:\s*\(?([0-9][0-9,]*)\)?/i);
    if(!match)return;
    var id=new URLSearchParams(location.search).get("id");
    if(!id||!/^\d+$/.test(id))return;
    var value=Number(match[1].replace(/,/g,""));if(!Number.isSafeInteger(value)||value<0)return;
    var usedMatch=bodyText().replace(/\s+/g," ").match(/Total lost from sab(?:b)?s? in (?:the )?last\s*24\s*hours:\s*\(?([0-9][0-9,]*)\)?/i);
    var cap={value:value,at:Date.now()};
    if(usedMatch){var used=Number(usedMatch[1].replace(/,/g,""));if(Number.isSafeInteger(used)&&used>=0)cap.used=used;}
    state.targets[id]=jfMergeTarget(state.targets[id],{sabCap:cap});
    save();
  }
  function jfSabImpact(rating, weaponValue, cap) {
    if(typeof rating!=="number"||rating<0||!weaponValue||weaponValue.partial||!(weaponValue.value>0)||typeof cap!=="number"||!isFinite(cap)||cap<0)return null;
    var fraction=Math.min(1,cap/weaponValue.value);
    return {fraction:fraction,rating:rating*fraction,gold:Math.min(cap,weaponValue.value),estimated:weaponValue.estimated};
  }
  function jfSabNoPickReason(rows) {
    if (!rows.length) return "No known target ratings. View an existing report or profile with visible stats.";
    if (rows.every(function(row){return row.v===0;})) return "All displayed ratings are zero; this does not confirm an empty weapon inventory.";
    if (rows.some(function(row){return row.belowPack;})) return "No category selected: the comparison rules excluded the candidates. This does not establish sabotage damage or rank loss.";
    return "No category selected: comparison ratings are missing or the median is unavailable.";
  }
  function jfRankOwner() {
    var profile=statsId();if(profile&&/^\d+$/.test(profile))return {id:profile};
    if(!/\/base\.php$/i.test(location.pathname))return null;
    var owners=[],tables=document.querySelectorAll("table");
    for(var t=0;t<tables.length;t++) {
      if(tables[t].closest&&tables[t].closest(".jf-block"))continue;
      var rows=Array.prototype.filter.call(tables[t].querySelectorAll("tr"),function(r){return !r.closest||r.closest("table")===tables[t];});
      var info=rows.some(function(r){var c=r.querySelectorAll("th");return c.length===1&&(c[0].innerText||"").trim()==="User Info";});
      if(!info)continue;
      rows.forEach(function(r){var cells=r.querySelectorAll("td");if(cells.length!==2||!/^Name\s*:?$/i.test((cells[0].innerText||"").trim()))return;
        var links=cells[1].querySelectorAll('a[href*="stats.php?"]');if(links.length!==1)return;
        var m=(links[0].getAttribute("href")||"").match(/(?:^|\/)stats\.php\?id=([0-9]+)(?:&|$)/i);
        if(m)owners.push({id:m[1],name:(links[0].textContent||"").trim()});
      });
    }
    if(owners.length!==1)return null;return owners[0];
  }
  function jfCaptureCategoryRanks() {
    var owner=jfRankOwner();if(!owner)return;var id=owner.id;
    var map={strike:"sa","strike action":"sa",attack:"sa",defense:"da","defensive action":"da",defend:"da",spy:"spy",sentry:"sentry",poison:"poison",antidote:"antidote",theft:"theft",vigilance:"vigilance"};
    var tables=document.querySelectorAll("table"),update={at:Date.now(),fieldAt:{},statRanks:{}},found=false;
    for(var t=0;t<tables.length;t++) {
      var rows=tables[t].querySelectorAll("tr"),cols=null;
      for(var r=0;r<rows.length;r++) {
        if(rows[r].closest&&rows[r].closest("table")!==tables[t])continue;
        var cells=Array.prototype.slice.call(rows[r].querySelectorAll("th, td"));
        var labels=cells.map(function(c){return (c.innerText||"").replace(/\s+/g," ").trim().toLowerCase();});
        if(labels.includes("action")&&labels.includes("rating")&&labels.includes("rank")){cols={action:labels.indexOf("action"),rating:labels.indexOf("rating"),rank:labels.indexOf("rank")};continue;}
        if(!cols||cells.length<=Math.max(cols.action,cols.rating,cols.rank))continue;
        var category=map[labels[cols.action]],valueText=(cells[cols.rating].innerText||"").trim(),rankText=(cells[cols.rank].innerText||"").trim();
        if(!category||!/^#?\s*[0-9][0-9,]*$/.test(rankText)||!/^([0-9][0-9,]*)$/.test(valueText))continue;
        var rank=num(rankText),value=num(valueText);
        if(!Number.isSafeInteger(rank)||rank<1||!Number.isSafeInteger(value)||value<0)continue;
        update[category]=value;update.fieldAt[category]=update.at;update.statRanks[category]={value:rank,at:update.at};found=true;
      }
    }
    if(found)for(var t=0;t<tables.length;t++) {
      var rows=tables[t].querySelectorAll("tr"),cols=null;
      for(var r=0;r<rows.length;r++) {
        if(rows[r].closest&&rows[r].closest("table")!==tables[t])continue;
        var cells=Array.prototype.slice.call(rows[r].querySelectorAll("th, td"));
        var labels=cells.map(function(c){return (c.innerText||"").replace(/\s+/g," ").trim().toLowerCase();});
        if(labels.includes("action")&&labels.includes("previous rating")&&labels.includes("next rating")){cols={action:labels.indexOf("action"),previous:labels.indexOf("previous rating"),next:labels.indexOf("next rating")};continue;}
        if(!cols||cells.length<=Math.max(cols.action,cols.previous,cols.next))continue;
        var category=map[labels[cols.action]],prev=(cells[cols.previous].innerText||"").trim(),next=(cells[cols.next].innerText||"").trim();
        if(!category||!update.statRanks[category]||!/^\d[\d,]*$/.test(prev)||!/^\d[\d,]*$/.test(next))continue;
        var before=num(prev),after=num(next);
        if(!Number.isSafeInteger(before)||!Number.isSafeInteger(after)||before<0||before>update[category]||after<update[category])continue;
        update.statRanks[category].previousRating=before;update.statRanks[category].nextRating=after;
      }
    }
    if(found){
      if(owner.name){update.name=owner.name;update.id=id;state.nameid[owner.name.toLowerCase()]=id;}
      state.targets[id]=jfMergeTarget(state.targets[id],update);
      save();
    }
  }
  function jfFreshCategory(row,category,now) {
    var rank=row&&row.statRanks&&row.statRanks[category],rating=row&&row[category],stamp=row&&jfFieldTime(row,category);
    return !!rank&&Number.isSafeInteger(rank.value)&&rank.value>0&&typeof rating==="number"&&isFinite(rating)&&rating>=0&&rank.at>0&&now-rank.at>=0&&now-rank.at<=DAY&&stamp>0&&now-stamp>=0&&now-stamp<=2*DAY&&Math.abs(stamp-rank.at)<=10*60*1000;
  }
  function jfCategoryRankSum(row,now) {
    if(!row||!jfStatFields.every(function(f){return jfFreshCategory(row,f,now);}))return null;
    return jfStatFields.reduce(function(sum,f){return sum+row.statRanks[f].value;},0);
  }
  function jfCategoryLossBounds(id,category,after,now) {
    var target=state.targets[id];
    var stamp=target&&jfFieldTime(target,category);
    if(!target||typeof target[category]!=="number"||!isFinite(target[category])||target[category]<0||!stamp||now-stamp<0||now-stamp>2*DAY||typeof after!=="number"||!isFinite(after)||after<0||after>target[category])return null;
    if(!jfFreshCategory(target,category,now)) {
      var crossed=0,samples=0,seen={},peers=[];
      Object.keys(state.targets).forEach(function(key){
        var row=state.targets[key];if(key===String(id)||!/^\d+$/.test(key)||!jfFreshCategory(row,category,now)||Math.abs(row.statRanks[category].at-stamp)>10*60*1000)return;
        var identity=row.name?row.name.toLowerCase():"#"+key;
        if(seen[identity]||target.name&&identity===target.name.toLowerCase())return;seen[identity]=true;
        peers.push({rank:row.statRanks[category].value,rating:row[category]});
      });
      peers.sort(function(a,b){return a.rank-b.rank;});
      for(var i=1;i<peers.length;i++)if(peers[i].rating>peers[i-1].rating || peers[i].rank===peers[i-1].rank&&peers[i].rating!==peers[i-1].rating)return null;
      peers.forEach(function(peer){samples++;if(after<peer.rating&&peer.rating<target[category])crossed++;});
      if(after===target[category])return {low:0,high:0,crossed:0,samples:samples};
      return samples?{low:crossed,high:null,crossed:crossed,samples:samples,observedCrossings:true}:null;
    }
    var start=target.statRanks[category].value;
    if(after===target[category])return {low:0,high:0,crossed:0,samples:0};
    var minRank=start,maxRank=null,crossed=0,samples=0,seen={},peers=[];
    Object.keys(state.targets).forEach(function(key){
      if(key===String(id)||!/^\d+$/.test(key))return;
      var row=state.targets[key];if(!jfFreshCategory(row,category,now))return;
      var identity=row.name?row.name.toLowerCase():"#"+key;
      if((target.name&&identity===target.name.toLowerCase())||seen[identity])return;
      seen[identity]=true;
      var rank=row.statRanks[category].value,rating=row[category];
      if(rank<=start||rating>=target[category])return;
      peers.push({rank:rank,rating:rating});
    });
    peers.sort(function(a,b){return a.rank-b.rank;});
    for(var i=1;i<peers.length;i++)if(peers[i].rating>peers[i-1].rating || peers[i].rank===peers[i-1].rank&&peers[i].rating!==peers[i-1].rating)return null;
    peers.forEach(function(peer){
      samples++;
      if(after<peer.rating){minRank=Math.max(minRank,peer.rank);crossed++;}
      else if(after>peer.rating)maxRank=maxRank===null?peer.rank-1:Math.min(maxRank,peer.rank-1);
    });
    if(!samples||maxRank!==null&&minRank>maxRank)return null;
    return {low:minRank-start,high:maxRank===null?null:Math.max(0,maxRank-start),crossed:crossed,samples:samples};
  }
  function jfContenderComparison(id,rivalId,category,after,loss,now) {
    var target=state.targets[id],rival=state.targets[rivalId];
    if(String(id)===String(rivalId)||!loss)return null;
    var targetSum=jfCategoryRankSum(target,now),rivalSum=jfCategoryRankSum(rival,now);
    if(targetSum===null||rivalSum===null||after===rival[category]||target[category]===rival[category])return null;
    var passed=target[category]>rival[category]&&after<rival[category];
    var adjusted=rivalSum-(passed?1:0),need=Math.max(0,adjusted-targetSum+1);
    return {targetSum:targetSum,rivalSum:adjusted,needed:need,possible:loss.high===null||loss.high>=need,supported:loss.low>=need};
  }
  function jfDeRankRows(id,now) {
    var target=state.targets[id]||{},cap=target.sabCap;
    var budget=cap&&cap.at>0&&now-cap.at>=0&&now-cap.at<=DAY&&typeof cap.value==="number"&&isFinite(cap.value)&&cap.value>=0?cap.value:null;
    var remainingKnown=budget!==null&&typeof cap.used==="number"&&isFinite(cap.used)&&cap.used>=0;
    var maximum=budget;
    if(remainingKnown)budget=Math.max(0,budget-cap.used);
    var values=jfWeaponValues(target,now),names=["SA","DA","Spy","Sentry","Poison","Antidote","Theft","Vigilance"];
    var rows=jfStatFields.map(function(f,i){
      var stamp=jfFieldTime(target,f),ratingFresh=typeof target[f]==="number"&&isFinite(target[f])&&target[f]>=0&&stamp>0&&now-stamp>=0&&now-stamp<=2*DAY;
      var missing=[];
      if(!ratingFresh)missing.push("recent rating");
      if(!values[f])missing.push("observed weapon inventory");
      else if(values[f].partial)missing.push("revealed quantities for all weapons in this category");
      else if(!(values[f].value>0))missing.push("positive weapon value");
      if(budget===null)missing.push("daily cap (visit target's sabotage page)");
      var impact=ratingFresh?jfSabImpact(target[f],values[f],budget):null;
      var after=impact?Math.max(0,target[f]-impact.rating):null;
      var loss=impact?jfCategoryLossBounds(id,f,after,now):null;
      var rankIssue=!jfFreshCategory(target,f,now)?"Missing recent paired category rank and rating for this target":!impact?"Rank projection waits for the rating-loss inputs":"Missing or inconsistent nearby category-rank/rating observations";
      return {category:f,label:names[i],impact:impact,after:after,loss:loss,missing:missing,rankIssue:rankIssue,estimatedPrice:!!(impact&&impact.estimated)};
    });
    rows.sort(function(a,b){var av=a.loss?a.loss.low:-1,bv=b.loss?b.loss.low:-1;return bv-av;});
    return {budget:budget,maximum:maximum,remainingKnown:remainingKnown,rows:rows};
  }

  var jfCombinationPlanner=null;
  function jfCreateCombinationPlanner(){
    const Lab = (() => {
      const DAY=86400000, WINDOW=30*DAY, FIELDS=['sa','da','spy','sentry','poison','antidote','theft','vigilance'];
      const LABELS={sa:'SA',da:'DA',spy:'Spy',sentry:'Sentry',poison:'Poison',antidote:'Antidote',theft:'Theft',vigilance:'Vigilance'};
      const CATALOG={"sarumans ball":{"category":"sa","price":100,"strength":1},"heavy steed":{"category":"sa","price":50000,"strength":100},"chariot":{"category":"sa","price":450000,"strength":600},"blackpowder missile":{"category":"sa","price":1000000,"strength":1000},"spider":{"category":"da","price":5000,"strength":10},"mithril":{"category":"da","price":50000,"strength":100},"ebony platemail":{"category":"da","price":450000,"strength":600},"invisibility shield":{"category":"da","price":1000000,"strength":1000},"cloak":{"category":"spy","price":140000,"strength":140},"grappling hook":{"category":"spy","price":250000,"strength":250},"skeleton key":{"category":"spy","price":600000,"strength":600},"nunchaku":{"category":"spy","price":1000000,"strength":1000},"horn":{"category":"sentry","price":140000,"strength":140},"tripwire":{"category":"sentry","price":250000,"strength":250},"guard dog":{"category":"sentry","price":600000,"strength":600},"lookout tower":{"category":"sentry","price":1000000,"strength":1000},"toxic needle dagger":{"category":"poison","price":140000,"strength":140},"venomfang staff":{"category":"poison","price":250000,"strength":250},"blightbane bow":{"category":"poison","price":600000,"strength":600},"plaguebringer scythe":{"category":"poison","price":1000000,"strength":1000},"viperfang dirk":{"category":"antidote","price":140000,"strength":140},"basiliskbane halberd":{"category":"antidote","price":250000,"strength":250},"wyrmclaw longsword":{"category":"antidote","price":600000,"strength":600},"serpentbane arbalest":{"category":"antidote","price":1000000,"strength":1000},"greasy gloves":{"category":"theft","price":140000,"strength":140},"rusty lockpick":{"category":"theft","price":250000,"strength":250},"shadow cloak":{"category":"theft","price":600000,"strength":600},"ethereal grasp":{"category":"theft","price":1000000,"strength":1000},"wooden whistle":{"category":"vigilance","price":140000,"strength":140},"steel shackles":{"category":"vigilance","price":250000,"strength":250},"silver scepter":{"category":"vigilance","price":600000,"strength":600},"adamantine bastion":{"category":"vigilance","price":1000000,"strength":1000}};
      const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
      const integer=n=>Number.isSafeInteger(n)&&n>=0;
      const recent=(at,now,age=WINDOW)=>valid(at)&&at>0&&now>=at&&now-at<=age;
      const key=s=>String(s||'').trim().toLowerCase();
      function stamp(t,f){return t&&t.fieldAt&&t.fieldAt[f]!==undefined?t.fieldAt[f]:t&&t.at;}
      function normalItem(item,at,options={}){
        const def=CATALOG[key(item.name)],category=def?def.category:item.category;
        if(!FIELDS.includes(category)||def&&item.category&&FIELDS.includes(item.category)&&item.category!==category)return null;
        const price=valid(item.price)&&item.price>0?item.price:def&&def.price;
        const estimatedStrength=!!item.strengthUnknown||!valid(item.strength);
        const strength=estimatedStrength?def&&def.strength:item.strength;
        if(item.strengthUnknown&&!options.allowCatalogStrength||!integer(item.qty)||!valid(price)||price<=0||!valid(strength)||strength<=0)return null;
        return {name:item.name,category,qty:item.qty,price,strength,estimatedStrength,strengthSource:estimatedStrength?'SR catalog estimate':item.strengthCarried?'carried observation':'observed',at:item.fieldAt&&item.fieldAt.qty||item.at||at,strengthAt:item.fieldAt&&item.fieldAt.strength||item.at||at,strengthCarried:!!item.strengthCarried,priceSource:valid(item.price)&&item.price>0?'recorded':'SR catalog'};
      }
      function mergeWeapon(before,row){
        const out={...(before||{}),name:row.name||(before||{}).name,fieldAt:{...((before||{}).fieldAt||{})},fieldSource:{...((before||{}).fieldSource||{})}};
        for(const f of ['qty','strength','category','price']){
          if(out.fieldAt[f]===undefined&&before&&(f==='category'?FIELDS.includes(before[f]):f==='qty'?integer(before[f]):valid(before[f]))&&!(f==='strength'&&before.strengthUnknown))out.fieldAt[f]=before.at||0;
          const known=f==='qty'?integer(row[f]):f==='category'?FIELDS.includes(row[f]):valid(row[f])&&!(f==='strength'&&row.strengthUnknown);
          const at=row.fieldAt&&row.fieldAt[f]!==undefined?row.fieldAt[f]:row.at||0;
          if(known&&at>0&&at>=(out.fieldAt[f]||0)){out[f]=row[f];out.fieldAt[f]=at;out.fieldSource[f]=row.source||'captured recon';}
        }
        out.latestSeenAt=Math.max(out.latestSeenAt||before&&before.at||0,row.latestSeenAt||row.at||0);
        out.at=Math.max(0,...Object.values(out.fieldAt));out.strengthUnknown=!out.fieldAt.strength;
        return out;
      }
      function projectWeapon(raw,now){
        const row={...raw,fieldAt:{...(raw.fieldAt||{})}};
        for(const f of ['qty','strength','price']){
          const legacy=f==='strength'?(valid(raw.strength)&&!raw.strengthUnknown?raw.at:0):raw.at;
          const at=row.fieldAt[f]!==undefined?row.fieldAt[f]:legacy;
          row.fieldAt[f]=at||0;
          if(!recent(at,now,WINDOW)){row[f]=null;if(f==='strength')row.strengthUnknown=true;}
        }
        row.strengthUnknown=valid(row.strength)?false:!!raw.strengthUnknown||!!row.fieldAt.strength;row.qtyCarried=integer(row.qty)&&(raw.latestSeenAt||raw.at)>row.fieldAt.qty;row.strengthCarried=valid(row.strength)&&(raw.latestSeenAt||raw.at)>row.fieldAt.strength;
        return row;
      }
      function mergeCapture(old,incoming){
        const out={...(old||{}),name:incoming.name||(old||{}).name,id:incoming.id||(old||{}).id,items:{...((old||{}).items||{})},ratings:{...((old||{}).ratings||{})},units:{...((old||{}).units||{})},unitBreakdown:{...((old||{}).unitBreakdown||{})},observations:{...((old||{}).observations||{})}};
        for(const [name,row] of Object.entries(incoming.items||{}))out.items[name]=mergeWeapon(out.items[name],row);
        for(const family of ['ratings','units','unitBreakdown'])for(const [f,row] of Object.entries(incoming[family]||{}))if(row&&integer(row.value)&&row.at>0&&(!out[family][f]||row.at>=out[family][f].at))out[family][f]={...row};
        if(incoming.sabCap&&(!out.sabCap||incoming.sabCap.at>=out.sabCap.at))out.sabCap={...incoming.sabCap};
        if(incoming.observationKey&&(incoming.scanAt||incoming.at)&&!out.observations[incoming.observationKey])out.observations[incoming.observationKey]={at:incoming.scanAt||incoming.at,source:incoming.source||'game report'};
        const cutoff=(incoming.receivedAt||Date.now())-WINDOW;
        out.observations=Object.fromEntries(Object.entries(out.observations).filter(([,r])=>r.at>=cutoff).sort((a,b)=>b[1].at-a[1].at).slice(0,256));
        if(incoming.unknownAt)out.unknownAt=Math.max(out.unknownAt||0,incoming.unknownAt);
        if(incoming.scanAt&&(!old||incoming.scanAt>=(old.scanAt||0))){out.scanAt=incoming.scanAt;out.unresolved=(incoming.unresolved||[]).map(row=>({...row}));}
        return out;
      }
      function pooledTarget(board,id,local,now){
        const original=(board.targets||{})[id]||{},out={name:original.name||local&&local.name,id:String(id),fieldAt:{},units:{},unitBreakdown:{},at:0,sabCap:local&&local.sabCap&&(!original.sabCap||local.sabCap.at>=original.sabCap.at)?local.sabCap:original.sabCap},items={};
        function take(f,value,at,family){if(!integer(value)||!recent(at,now,WINDOW))return;const k=family?family+'.'+f:f;if(at>=(out.fieldAt[k]||0)){if(family)out[family][f]=value;else out[f]=value;out.fieldAt[k]=at;out.at=Math.max(out.at,at);}}
        for(const row of [...((board.histlog||{})[id]||[]),original]){
          if(!row||typeof row!=='object')continue;
          for(const f of FIELDS){take(f,row[f],stamp(row,f));take(f,row.units&&row.units[f],row.fieldAt&&row.fieldAt['units.'+f]!==undefined?row.fieldAt['units.'+f]:row.at,'units');}
          for(const [f,r] of Object.entries(row.unitBreakdown||{}))if(r&&integer(r.value)&&recent(r.at,now,WINDOW)&&(!out.unitBreakdown[f]||r.at>=out.unitBreakdown[f].at))out.unitBreakdown[f]={...r};
          if(row.equipment&&recent(row.equipment.at,now,WINDOW))for(const item of row.equipment.items||[])if(item.name&&!/\?/.test(item.name))items[key(item.name)]=mergeWeapon(items[key(item.name)],{...item,at:row.equipment.at,source:'shared intel'});
        }
        for(const [f,r] of Object.entries(local&&local.ratings||{}))take(f,r.value,r.at);
        for(const [f,r] of Object.entries(local&&local.units||{}))take(f,r.value,r.at,'units');
        for(const [f,r] of Object.entries(local&&local.unitBreakdown||{}))if(r&&integer(r.value)&&recent(r.at,now,WINDOW)&&(!out.unitBreakdown[f]||r.at>=out.unitBreakdown[f].at))out.unitBreakdown[f]={...r};
        for(const [name,row] of Object.entries(local&&local.items||{}))if(recent(row.latestSeenAt||row.at,now,WINDOW))items[name]=mergeWeapon(items[name],row);
        out.equipment={at:now,items:Object.values(items).map(r=>projectWeapon(r,now)),complete:false,pooled:true};
        return out;
      }
      function trackerCapture(payload,id,now){
        if(!payload||String(payload.target_id)!==String(id)||!/^\d+$/.test(String(id)))throw Error('Website data belongs to another target.');
        const target=payload.target||{},capture={id:String(id),name:target.name||payload.name||'#'+id,items:{},ratings:{},units:{},unitBreakdown:{},sabCap:target.sabCap,receivedAt:now,scanAt:0,source:'website tracker',observationKey:'website:'+String(payload.generated_at||now)};
        function take(f,value,at,family){value=typeof value==='number'?value:/^\d+$/.test(String(value))?Number(value):NaN;if(!integer(value)||!recent(at,now,WINDOW))return;const obj=capture[family];if(!obj[f]||at>=obj[f].at)obj[f]={value,at,source:'website tracker'};capture.scanAt=Math.max(capture.scanAt,at);}
        for(const snap of [...(Array.isArray(payload.history)?payload.history:[]),target]){
          if(!snap||typeof snap!=='object')continue;
          for(const f of FIELDS){take(f,snap[f],stamp(snap,f),'ratings');take(f,snap.units&&snap.units[f],snap.fieldAt&&snap.fieldAt['units.'+f]!==undefined?snap.fieldAt['units.'+f]:snap.at,'units');}
          for(const [f,row] of Object.entries(snap.unitBreakdown||{}))if(row&&['attackSoldiers','attackMercenaries','defenseSoldiers','defenseMercenaries','untrained','spies','sentries','poisonUnits','antidoteUnits','thieves','rangers'].includes(f))take(f,row.value,row.at,'unitBreakdown');
          const eq=snap.equipment;if(eq&&recent(eq.at,now,WINDOW))for(const item of eq.items||[])if(typeof item.name==='string'&&!/\?/.test(item.name))capture.items[key(item.name)]=mergeWeapon(capture.items[key(item.name)],{...item,at:eq.at,source:'website shared equipment'});
        }
        for(const row of payload.readings||[]){if(!row||typeof row.metric!=='string')continue;if(FIELDS.includes(row.metric))take(row.metric,row.value,row.at,'ratings');else if(row.metric.startsWith('units_')&&FIELDS.includes(row.metric.slice(6)))take(row.metric.slice(6),row.value,row.at,'units');}
        if(!capture.scanAt)capture.scanAt=Math.max(0,...Object.values(capture.items).map(r=>r.at));
        if(!capture.scanAt)throw Error('No usable website observations from the last 30 days.');return capture;
      }
      function inventory(target,local,now,options={}){
        const entries={},blocked=new Set(),notes=[],knownRows=[],unresolvedCategories=new Set();let unknown=false;
        const eq=target.equipment;
        const manifest=local&&recent(local.scanAt,now)&&(!eq||!recent(eq.at,now)||local.scanAt>=eq.at);
        if(eq&&recent(eq.at,now)){
          unknown=!!eq.unknownCategory&&!manifest;
          for(const item of eq.items||[]){
            if(!item.name||/\?/.test(item.name)){if(!manifest){if(FIELDS.includes(item.category))blocked.add(item.category);else unknown=true;}continue;}
            entries[key(item.name)]=mergeWeapon(entries[key(item.name)],{...item,at:item.at||eq.at});
          }
          if(!manifest)for(const [f,incomplete] of Object.entries(eq.incompleteCategories||{}))if(incomplete)unresolvedCategories.add(f);
        }
        let localNewest=0;
        for(const [name,row] of Object.entries(local&&local.items||{})){
          if(!recent(row.latestSeenAt||row.at,now,WINDOW))continue;
          entries[name]=mergeWeapon(entries[name],row);
          localNewest=Math.max(localNewest,row.at);
        }
        if(manifest){
          unknown=false;
          for(const row of local.unresolved||[])if(FIELDS.includes(row.category))unresolvedCategories.add(row.category);else unknown=true;
        }else{
          if(localNewest&&eq&&localNewest>=eq.at)unknown=false;
          if(local&&recent(local.unknownAt,now)&&local.unknownAt>=localNewest)unknown=true;
        }
        const groups={};
        for(const raw of Object.values(entries)){
          if(!recent(raw.latestSeenAt||raw.at,now,WINDOW))continue;
          const row=projectWeapon(raw,now);
          const def=CATALOG[key(row.name)],f=def?def.category:row.category;
          const price=valid(row.price)&&row.price>0?row.price:def&&def.price;
          knownRows.push({name:row.name,f,qty:integer(row.qty)?row.qty:null,price:valid(price)?price:null,at:row.fieldAt.qty||row.at,strengthAt:row.fieldAt.strength||0,qtyCarried:row.qtyCarried,strengthCarried:row.strengthCarried,priceSource:valid(row.price)&&row.price>0?'recorded':'SR catalog',strengthUnknown:!!row.strengthUnknown,currentStrength:row.strengthUnknown?(options.allowCatalogStrength&&def?def.strength:null):(valid(row.strength)?row.strength:def&&def.strength),strengthSource:row.strengthUnknown?(options.allowCatalogStrength&&def?'SR catalog estimate':'Unknown'):(valid(row.strength)?row.strengthCarried?'carried observation':'observed':'SR catalog estimate')});
          const item=normalItem(row,row.at,options);
          if(!item){if(FIELDS.includes(f))blocked.add(f);else unknown=true;continue;}
          (groups[f]||(groups[f]=[])).push(item);
        }
        for(const f of FIELDS){
          if(blocked.has(f)){delete groups[f];continue;}
          if(!groups[f])continue;
          groups[f].sort((a,b)=>b.strength/b.price-a.strength/a.price||a.name.localeCompare(b.name));
          const cost=groups[f].reduce((s,x)=>s+x.qty*x.price,0),strength=groups[f].reduce((s,x)=>s+x.qty*x.strength,0);
          if(!integer(cost)||!valid(strength)||strength<=0)delete groups[f];
        }
        if(unresolvedCategories.size)notes.push('Pooled known weapons used for '+[...unresolvedCategories].map(f=>LABELS[f]).join(', ')+'; unnamed report rows remain unresolved and are not added again.');
        if(unknown)notes.push('Unidentified report rows remain unresolved; pooled known weapons are used conditionally without adding duplicate unknown stock.');
        if(blocked.size)notes.push('Incomplete stacks excluded only from their affected categories: '+[...blocked].map(f=>LABELS[f]).join(', ')+'.');
        return {groups,notes,knownRows,unknown,partial:unknown||unresolvedCategories.size>0,blocked:[...blocked]};
      }
      function budgetFor(target,tiv,now){
        const cap=target.sabCap;
        if(cap&&recent(cap.at,now,DAY)&&integer(cap.value)){
          if(integer(cap.used))return {value:Math.max(0,cap.value-cap.used),text:'Saved cap minus saved usage; confirm it is still available.',at:cap.at};
          return {value:cap.value,text:'Saved daily maximum. Usage is unknown; enter the actual remaining amount.',at:cap.at};
        }
        if(tiv&&recent(tiv.at,now)&&valid(tiv.invested)&&tiv.invested>0)return {value:Math.floor(tiv.invested*0.154),text:'~ Daily maximum from TIV × 15.4%. Usage is unknown; enter remaining amount.',at:tiv.at};
        return {value:null,text:'No recent cap: enter a scenario budget from the target sabotage page.'};
      }
      function peersFor(board,id,target,f,now){
        const result=[],seen=new Set([key(target.name)]);
        for(const [otherId,t] of Object.entries(board.targets||{}).sort((a,b)=>(stamp(b[1]||{},f)||0)-(stamp(a[1]||{},f)||0))){
          if(otherId===String(id)||!/^\d+$/.test(otherId)||!t||!valid(t[f])||!recent(stamp(t,f),now))continue;
          const identity=key(t.name)||'#'+otherId;
          if(seen.has(identity))continue;seen.add(identity);result.push({id:otherId,name:t.name||'#'+otherId,rating:t[f]});
        }
        return result;
      }
      function removal(items,budget){
        let cost=0,strength=0;const actions=[];
        for(const item of items){
          const qty=Math.min(item.qty,Math.max(0,Math.floor((budget-cost)/item.price)));
          if(qty){cost+=qty*item.price;strength+=qty*item.strength;actions.push({...item,available:item.qty,qty,cost:qty*item.price});}
          if(qty<item.qty)break;
        }
        return {cost,strength,actions};
      }
      function afterFor(rating,totalStrength,removed,floor){return Math.max(0,rating*(floor+(1-floor)*Math.max(0,1-removed/totalStrength)));}
      function stackOrders(items){
        if(items.length>4)return [items,items.slice().reverse()];
        const result=[];
        function walk(prefix,rest){if(!rest.length){result.push(prefix);return;}for(let i=0;i<rest.length;i++)walk(prefix.concat(rest[i]),rest.filter((_,j)=>j!==i));}
        walk([],items);return result;
      }
      function optionsFor(f,rating,items,peers,budget,floor,impact=null){
        const totalCost=items.reduce((s,x)=>s+x.qty*x.price,0),totalStrength=items.reduce((s,x)=>s+x.qty*x.strength,0);
        const limit=Math.min(totalCost,budget),dedup=new Map(),cheapestScore=new Map(),totalQty=items.reduce((s,x)=>s+x.qty,0);
        const peerRatings=peers.map(p=>p.rating).filter(v=>v<rating&&v>rating*floor).sort((a,b)=>a-b),thresholds=[...new Set(peerRatings)];
        function scoreAt(after){let lo=0,hi=peerRatings.length;while(lo<hi){const m=(lo+hi)>>>1;if(peerRatings[m]<=after)lo=m+1;else hi=m;}return peerRatings.length-lo;}
        function worth(cost,strength){if(impact)return true;const prior=dedup.get(cost);if(prior&&prior.removedStrength>=strength)return false;const score=scoreAt(afterFor(rating,totalStrength,strength,floor));return !cheapestScore.has(score)||cost<cheapestScore.get(score);}
        function offer(r,thresholdOnly=false){
          if(r.cost>budget||!integer(r.cost))return;
          const after=impact?impact(r.actions):afterFor(rating,totalStrength,r.strength,floor),score=scoreAt(after);
          if(thresholdOnly&&cheapestScore.has(score)&&cheapestScore.get(score)<=r.cost)return;
          if(!cheapestScore.has(score)||r.cost<cheapestScore.get(score))cheapestScore.set(score,r.cost);
          const option={f,cost:r.cost,actions:r.actions,removedStrength:r.strength,after,before:rating,score,samples:peers.length,full:r.actions.reduce((s,x)=>s+x.qty,0)===totalQty};
          const prior=dedup.get(r.cost);if(!prior||after<prior.after||after===prior.after&&r.actions.length<prior.actions.length)dedup.set(r.cost,option);
        }
        function action(item,qty){return {...item,available:item.qty,qty,cost:qty*item.price};}
        function required(threshold){return totalStrength*(1-(threshold/rating-floor)/(1-floor));}
        function primaryQty(item,strengthSoFar,threshold,baseActions=[]){
          if(impact){const calc=q=>impact(q?baseActions.concat(action(item,q)):baseActions);if(calc(0)<threshold)return 0;if(calc(item.qty)>=threshold)return null;let lo=1,hi=item.qty;while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(calc(mid)<threshold)hi=mid;else lo=mid+1;}return lo;}
          let q=Math.max(0,Math.floor((required(threshold)-strengthSoFar)/item.strength)+1);
          if(q>item.qty)return null;
          while(q>0&&afterFor(rating,totalStrength,strengthSoFar+(q-1)*item.strength,floor)<threshold)q--;
          while(q<=item.qty&&afterFor(rating,totalStrength,strengthSoFar+q*item.strength,floor)>=threshold)q++;
          return q<=item.qty?q:null;
        }
        offer({cost:0,strength:0,actions:[]});
        for(const order of stackOrders(items)){
          for(const spend of [limit,Math.floor(limit*.25),Math.floor(limit*.5),Math.floor(limit*.75)])offer(removal(order,spend));
          if(totalCost<=budget)offer(removal(order,totalCost));
          for(const threshold of thresholds){
            let cost=0,strength=0,actions=[];
            for(const item of order){
              const qty=primaryQty(item,strength,threshold,actions);
              if(qty!==null){offer({cost:cost+qty*item.price,strength:strength+qty*item.strength,actions:qty?actions.concat(action(item,qty)):actions},true);break;}
              cost+=item.qty*item.price;strength+=item.qty*item.strength;if(item.qty)actions.push(action(item,item.qty));
              if(cost>budget)break;
            }
          }
        }
        for(let i=0;i<items.length;i++)for(let j=0;j<items.length;j++){
          if(i===j)continue;const primary=items[i],secondary=items[j],others=items.filter((_,k)=>k!==i&&k!==j);
          const masks=items.length<=4?Array.from({length:2**others.length},(_,k)=>k):[0,2**Math.min(others.length,20)-1];
          for(const mask of masks){
            const base=others.filter((_,k)=>k<20&&(mask&(2**k))),baseCost=base.reduce((s,a)=>s+a.qty*a.price,0),baseStrength=base.reduce((s,a)=>s+a.qty*a.strength,0);
            if(baseCost>budget)continue;const max=Math.min(secondary.qty,Math.floor((budget-baseCost)/secondary.price));
            for(const threshold of thresholds){
              const values=new Set();
              if(max<=128)for(let q=0;q<=max;q++)values.add(q);
              else{
                for(let q=0;q<=8;q++){values.add(q);values.add(max-q);values.add(Math.floor(max*q/8));}
                for(const boundary of [(required(threshold)-baseStrength)/secondary.strength,(required(threshold)-baseStrength-primary.qty*primary.strength)/secondary.strength])for(let delta=-2;delta<=2;delta++)values.add(Math.max(0,Math.min(max,Math.floor(boundary)+delta)));
              }
              for(const q of values){
                const strength=baseStrength+q*secondary.strength,baseActions=base.filter(a=>a.qty>0).map(a=>action(a,a.qty));if(q)baseActions.push(action(secondary,q));const qty=primaryQty(primary,strength,threshold,baseActions);if(qty===null)continue;
                const cost=baseCost+q*secondary.price+qty*primary.price;if(cost>budget||!worth(cost,strength+qty*primary.strength))continue;
                const actions=baseActions;if(qty)actions.push(action(primary,qty));
                offer({cost,strength:strength+qty*primary.strength,actions},true);
              }
            }
          }
        }
        return [...dedup.values()].sort((a,b)=>a.cost-b.cost);
      }
      function pareto(plans){
        const byScore=new Map();
        for(const p of plans){const old=byScore.get(p.score);if(!old||p.cost<old.cost)byScore.set(p.score,p);}
        const list=[...byScore.values()].sort((a,b)=>a.cost-b.cost||b.score-a.score),out=[];let best=-1;
        for(const p of list)if(p.score>best){out.push(p);best=p.score;}
        return out;
      }
      function portfolioFrontier(optionGroups,budget=Infinity){
        let states=[{cost:0,score:0,picks:[]}];
        for(const options of optionGroups){const next=[];for(const s of states)for(const o of options)if(s.cost+o.cost<=budget)next.push({cost:s.cost+o.cost,score:s.score+o.score,picks:o.cost?s.picks.concat(o):s.picks});states=pareto(next);}
        return states.sort((a,b)=>b.score-a.score||a.cost-b.cost);
      }
      function optimize(optionGroups,budget){return portfolioFrontier(optionGroups,budget)[0]||{cost:0,score:0,picks:[]};}
      const SPECIALISTS={sa:'attackPersonnel',da:'defensePersonnel',spy:'spies',sentry:'sentries',poison:'poisonUnits',antidote:'antidoteUnits',theft:'thieves',vigilance:'rangers'};
      const UNIT_LABELS={sa:'Attack personnel',da:'Defense personnel',spy:'Covert Spies',sentry:'Sentries',poison:'Venomweavers',antidote:'Serpentwardens',theft:'Thieves',vigilance:'Rangers'};
      function unitFor(target,f,now,overrides={}){
        if(Object.prototype.hasOwnProperty.call(overrides,f))return integer(overrides[f])?{value:overrides[f],source:'manual scenario'}:null;
        const candidates=[];
        if(f==='sa'||f==='da'){
          const names=f==='sa'?['attackSoldiers','attackMercenaries']:['defenseSoldiers','defenseMercenaries'],parts=names.map(name=>target.unitBreakdown&&target.unitBreakdown[name]),untrained=target.unitBreakdown&&target.unitBreakdown.untrained;
          if(parts.every(part=>part&&integer(part.value)&&recent(part.at,now))){const include=untrained&&integer(untrained.value)&&recent(untrained.at,now);candidates.push({value:parts.reduce((sum,p)=>sum+p.value,0)+(include?untrained.value:0),source:include?'saved combat + untrained counts':'known combat counts; untrained unknown',at:Math.min(...parts.map(p=>p.at),...(include?[untrained.at]:[])),estimated:!include});}
        }
        const part=target.unitBreakdown&&target.unitBreakdown[SPECIALISTS[f]];
        if(part&&integer(part.value)&&recent(part.at,now))candidates.push({value:part.value,source:'saved individual count',at:part.at});
        const value=target.units&&target.units[f],at=target.fieldAt&&target.fieldAt['units.'+f]!==undefined?target.fieldAt['units.'+f]:target.at;
        if(integer(value)&&recent(at,now)){const combat=f==='sa'||f==='da',untrained=target.unitBreakdown&&target.unitBreakdown.untrained,include=combat&&untrained&&integer(untrained.value)&&recent(untrained.at,now);candidates.push({value:value+(include?untrained.value:0),source:combat?(include?'saved combat + untrained counts':'saved combat count; untrained not confirmed'):'saved category count',at:include?Math.min(at,untrained.at):at,estimated:combat&&!include});}
        candidates.sort((a,b)=>b.at-a.at);return candidates[0]||null;
      }
      function equippedStrength(items,personnel,actions=[]){
        const removed=new Map(actions.map(a=>[key(a.name),a.qty]));let left=personnel,strength=0;
        for(const item of items.slice().sort((a,b)=>b.strength-a.strength||a.name.localeCompare(b.name))){const qty=Math.min(left,Math.max(0,item.qty-(removed.get(key(item.name))||0)));strength+=qty*item.strength;left-=qty;if(left<=0)break;}return strength;
      }
      function run(board,id,local,budget,floor,now,settings={mode:"legacy"}){
        const target=pooledTarget(board,id,local,now),inv=inventory(target,local,now,settings),groups=[],coverage=[],inventoryRows=[],reasons={};
        for(const f of FIELDS){
          const items=inv.groups[f];
          if(valid(target[f])&&target[f]===0&&recent(stamp(target,f),now)&&!items){
            const peers=peersFor(board,id,target,f,now),zero={f,cost:0,score:0,actions:[],after:0,before:0,samples:peers.length,full:false};
            groups.push([zero]);coverage.push({f,count:peers.length});inventoryRows.push({f,items:[],knownCost:null,rating:0,samples:peers.length,effectiveFloor:1,unit:{value:null,source:'not needed for zero observed rating'},impact:null,method:'zero recorded rating; inventory unknown',options:[zero]});continue;
          }
          if(!items||!valid(target[f])||!recent(stamp(target,f),now)){reasons[f]='missing, stale or incomplete rating/inventory';continue;}
          let effectiveFloor=floor,unit=null;
          let impact=null,method='legacy residual scenario';
          if(settings.mode==='units'){
            unit=unitFor(target,f,now,settings.overrides||{});
            if(target[f]===0){unit=unit||{value:null,source:'not needed for zero observed rating'};effectiveFloor=1;method='zero recorded rating';}
            else{
              if(!unit){reasons[f]='need recent '+UNIT_LABELS[f]+' count (or enter a manual count)';continue;}
              const qty=items.reduce((sum,item)=>sum+item.qty,0),strength=items.reduce((sum,item)=>sum+item.qty*item.strength,0),held=equippedStrength(items,unit.value);
              if(!(held+unit.value>0)){reasons[f]='zero personnel with positive rating: contribution unknown';continue;}
              effectiveFloor=unit.value/(held+unit.value);
              method=(f==='sa'||f==='da')?'SA/DA equipment estimate':qty>unit.value?'surplus / re-equipped estimate':'weapon strength + personnel';
              if(qty>unit.value)impact=actions=>target[f]*(equippedStrength(items,unit.value,actions)+unit.value)/(held+unit.value);
            }
          }
          const peers=peersFor(board,id,target,f,now);coverage.push({f,count:peers.length});
          const opts=optionsFor(f,target[f],items,peers,budget,effectiveFloor,impact);groups.push(pareto(opts));
          inventoryRows.push({f,items,knownCost:items.reduce((s,x)=>s+x.qty*x.price,0),rating:target[f],samples:peers.length,effectiveFloor,unit,impact,method,options:opts});
        }
        const frontier=portfolioFrontier(groups),best=frontier.filter(p=>p.cost<=budget).sort((a,b)=>b.score-a.score||a.cost-b.cost)[0]||{cost:0,score:0,picks:[]};
        const nextPlan=frontier.filter(p=>p.score>best.score).sort((a,b)=>a.cost-b.cost||b.score-a.score)[0]||null;
        const categoryChoices=inventoryRows.map(row=>({f:row.f,best:row.options.filter(o=>o.cost<=budget).sort((a,b)=>b.score-a.score||a.cost-b.cost)[0],fullCost:row.knownCost}));
        const single=groups.flat().filter(o=>o.cost<=budget).sort((a,b)=>b.score-a.score||a.cost-b.cost)[0]||null;
        const trioFields=['theft','antidote','poison'];let trio=null;
        if(trioFields.every(f=>inventoryRows.some(row=>row.f===f&&row.knownCost!==null))){
          const picks=trioFields.map(f=>{const row=inventoryRows.find(r=>r.f===f),strength=row.items.reduce((sum,a)=>sum+a.qty*a.strength,0),after=row.impact?row.impact(row.items.map(a=>({...a,qty:a.qty}))):afterFor(row.rating,strength,strength,row.effectiveFloor),peers=peersFor(board,id,target,f,now);return {f,cost:row.knownCost,score:peers.filter(p=>after<p.rating&&p.rating<row.rating).length,after,before:row.rating,samples:peers.length,full:true,actions:row.items.filter(a=>a.qty>0).map(a=>({...a,available:a.qty,cost:a.qty*a.price}))};});
          trio={cost:picks.reduce((s,p)=>s+p.cost,0),score:picks.reduce((s,p)=>s+p.score,0),picks,affordable:picks.reduce((s,p)=>s+p.cost,0)<=budget};
        }
        const assessments=FIELDS.map(f=>{const row=inventoryRows.find(row=>row.f===f),choice=categoryChoices.find(c=>c.f===f);return {f,status:row?'modeled':'Unknown',method:row?row.method:reasons[f],score:choice?choice.best.score:null};});
        return {best,single,trio,nextPlan,categoryChoices,assessments,coverage,inventoryRows,knownRows:inv.knownRows,notes:inv.notes,poolPartial:inv.partial,estimatedStrength:inventoryRows.filter(row=>row.items.some(a=>a.estimatedStrength)).map(row=>({f:row.f,items:row.items.filter(a=>a.estimatedStrength).map(a=>({name:a.name,strength:a.strength}))})),reasons,mode:settings.mode,excluded:FIELDS.filter(f=>!inventoryRows.some(r=>r.f===f))};
      }
      return {DAY,WINDOW,FIELDS,LABELS,CATALOG,valid,integer,recent,key,stamp,normalItem,mergeWeapon,projectWeapon,mergeCapture,pooledTarget,trackerCapture,inventory,budgetFor,peersFor,removal,afterFor,stackOrders,optionsFor,pareto,portfolioFrontier,optimize,SPECIALISTS,UNIT_LABELS,unitFor,equippedStrength,run};
    })();

    function board(){return state;}
    function archive(){return {version:1,players:{}};}
    function localFor(t,id){return null;}
    function profileId(){return /\/stats\.php$/i.test(location.pathname)&&/^\d+$/.test(new URLSearchParams(location.search).get('id')||'')?new URLSearchParams(location.search).get('id'):null;}
    let websitePending=null,websiteStatus=null;
    function importWebsite(payload){}
    function loadWebsite(event){}
    function receiveWebsite(event){}

    const money=n=>n===null?'Unknown':n>=1e12?(n/1e12).toFixed(3)+'T':n>=1e9?(n/1e9).toFixed(3)+'B':Math.round(n).toLocaleString();
    const num=n=>Math.round(n).toLocaleString();
    const age=at=>at?Math.max(0,(Date.now()-at)/3600000).toFixed(1)+'h since collection':'age unknown';
    function displayText(value){return String(value).replace(/SR catalog(?: estimate)?/g,'estimate');}
    function node(tag,text,style){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(style)el.style.cssText=style;return el;}
    function table(headers,rows){const wrap=node('div',undefined,'overflow-x:auto'),t=node('table',undefined,'width:100%;font-size:12px;border-collapse:collapse');const hr=node('tr');for(const h of headers)hr.appendChild(node('th',displayText(h),'text-align:left;padding:6px;border-bottom:1px solid #777'));t.appendChild(hr);for(const values of rows){const r=node('tr');for(const value of values)r.appendChild(node('td',displayText(value),'padding:6px;vertical-align:top;border-bottom:1px solid #555'));t.appendChild(r);}wrap.appendChild(t);return wrap;}
    function textLine(parent,text){parent.appendChild(node('p',displayText(text),'margin:6px 0;font-size:12px'));}
    let budgetInput,floorInput,modeInput,catalogInput,floorContainer,unitInputs={},output,budgetNote,activeId,actionStatus,lastData='',calculationPending=false,clickCount=0;

    function renderResult(force=true){
      const id=profileId();if(!jfAuthorized||!id||!output)return;
      const b=board(),base=(b.targets||{})[id]||{},local=localFor(base,id),now=Date.now(),t=Lab.pooledTarget(b,id,local,now);
      const signature=JSON.stringify([b,local,budgetInput.value,floorInput.value,modeInput.value,catalogInput.checked,Object.fromEntries(Object.entries(unitInputs).map(([f,input])=>[f,input.value])),Math.floor(now/60000)]);if(!force&&signature===lastData)return;lastData=signature;
      const opened=[...output.querySelectorAll('details')].filter(d=>d.open).map(d=>d.querySelectorAll('summary')[0]?.textContent);
      output.replaceChildren();
      const raw=budgetInput.value.trim().replace(/,/g,''),budget=/^\d+$/.test(raw)?Number(raw):NaN;
      if(!Lab.integer(budget)){textLine(output,'Enter a non-negative whole Gold scenario budget.');return;}
      const overrides={};
      for(const [f,input] of Object.entries(unitInputs)){const text=input.value.trim().replace(/,/g,'');if(!text)continue;const value=/^\d+$/.test(text)?Number(text):NaN;if(!Lab.integer(value)){textLine(output,'Enter a non-negative whole personnel count for '+Lab.LABELS[f]+', or leave it blank to use saved data.');return;}overrides[f]=value;}
      const settings={mode:modeInput.value,overrides,allowCatalogStrength:!!catalogInput.checked},floor=Number(floorInput.value),result=Lab.run(b,id,local,budget,floor,now,settings);
      const info=Lab.budgetFor(t,(b.tiv||{})[id],now);budgetNote.textContent=(info.at?'Saved allowance: '+age(info.at)+'. ':'No dated allowance. ')+'Confirm remaining budget.';
      const planDetails=node('details');planDetails.open=opened.includes('Plan details');planDetails.appendChild(node('summary','Plan details'));
      function details(title){const d=node('details');d.open=opened.includes(title);d.appendChild(node('summary',title));planDetails.appendChild(d);return d;}
      const best=result.best,single=result.single,picks=best.picks.slice().sort((a,b)=>b.score/Math.max(1,b.cost)-a.score/Math.max(1,a.cost)||a.cost-b.cost);
      textLine(output,(t.name||'#'+id)+' · '+result.inventoryRows.length+'/8 categories modeled'+(settings.mode==='legacy'?' · Legacy scenario':''));
      const flags=[];
      if(result.excluded.length)flags.push('Unknown: '+result.excluded.map(f=>Lab.LABELS[f]).join(', '));
      if(result.estimatedStrength.length)flags.push('~ Estimated strength used');
      if(result.poolPartial)flags.push('Partial inventory');
      if(flags.length)textLine(output,flags.join(' · '));
      if(best.score>0){
        output.appendChild(node('strong','~ Suggested combination: '+picks.map(p=>Lab.LABELS[p.f]).join(' + '),'display:block;margin:8px 0;color:#e8c766'));
        textLine(output,'Budget '+money(budget)+' · ~ Plan cost '+money(best.cost)+' · ~ Left '+money(budget-best.cost));
        textLine(output,'~ '+best.score+' category places lost within saved players. Overall leaderboard loss: unknown.');
        output.appendChild(table(['Weapon / category','Destroy total','~ Cost'],picks.flatMap(p=>p.actions.map(a=>{
          return [a.name+' ('+Lab.LABELS[p.f]+')',num(a.qty),money(a.cost)];
        }))));
        textLine(planDetails,result.nextPlan?'Next tested plan with more crossings costs ~'+money(result.nextPlan.cost)+' — '+money(result.nextPlan.cost-budget)+' over budget.':'The remaining budget adds no observed crossing in the tested plans; further rating damage may still be possible.');
      }else if(!result.inventoryRows.length){textLine(output,'No eligible category yet. Open Plan details → Data & exclusions for missing inputs.');}
      else textLine(output,'No estimated category places lost within saved players. The comparison pool may be incomplete.');
      textLine(output,'~ Estimates · Total quantities, not per mission.');
      output.appendChild(planDetails);
      const all=details('All 8 category comparisons');
      all.appendChild(table(['Category','Assessment','~ Places in saved sample','Method / data needed'],result.assessments.map(a=>[Lab.LABELS[a.f],a.status==='modeled'?'Estimate':'Unknown',a.score===null?'Unknown':a.score,a.method])));
      const why=details('Why this combination?');
      textLine(why,'Score counts only saved opponents passed in each category, not overall ranks lost.');
      textLine(why,'Model: '+(settings.mode==='units'?'Unit-aware candidate':'Legacy residual assumption '+Math.round(floor*100)+'%')+'.');
      textLine(why,'~ Best single category: '+(single&&single.score>0?Lab.LABELS[single.f]+' · '+single.score+' category places in saved players · '+money(single.cost):'none in this sample')+'.');
      if(picks.length)why.appendChild(table(['Weapon / category','Destroy total','Known left'],picks.flatMap(p=>p.actions.map(a=>{const original=result.inventoryRows.find(row=>row.f===p.f)?.items.find(item=>Lab.key(item.name)===Lab.key(a.name)),available=a.available??original?.qty;return [a.name+' ('+Lab.LABELS[p.f]+')',num(a.qty),Lab.integer(available)?num(available-a.qty):'Unknown'];}))));
      if(picks.length)why.appendChild(table(['Category','Recorded rating','~ After','~ Crossings / peers'],picks.map(p=>[Lab.LABELS[p.f],num(p.before),num(p.after),p.score+' / '+p.samples])));
      if(result.categoryChoices.length)why.appendChild(table(['Category alternative','~ Most crossings within budget','~ Cost for that score','~ Full known wipe cost'],result.categoryChoices.map(row=>[Lab.LABELS[row.f],row.best.score,money(row.best.cost),money(row.fullCost)])));
      const trio=result.trio;
      textLine(why,'~ Full known Theft + Antidote + Poison: '+(trio?money(trio.cost)+' · '+(trio.affordable?'fits budget':'OVER budget by '+money(trio.cost-budget))+' · '+trio.score+' modeled crossings':'Unknown — need eligible inventory, ratings and specialist counts for all three.'));
      textLine(why,'The search maximizes modeled crossings, then prefers lower cost. It tests stack orders and partial two-stack mixes; it is not a guaranteed unrestricted optimum. A given opponent crossed in two categories counts twice. Table order is for readability, not a verified mission sequence.');
      const data=details('Data & exclusions');
      textLine(data,'Budget source: '+info.text+(info.at?' ('+age(info.at)+')':'')+'. Edited budgets are manual scenarios.');
      textLine(data,'Target pool: last 30 days of saved observations.');
      if(result.estimatedStrength.length)textLine(data,'~ Estimated current strength used: '+result.estimatedStrength.map(row=>Lab.LABELS[row.f]+' ('+row.items.map(a=>a.name+' ~'+num(a.strength)).join(', ')+')').join(' · ')+'. Catalog condition, not observed.');
      textLine(data,'Local report capture: none yet on this hostname for this target.');
      if(settings.mode==='units'&&result.inventoryRows.length)textLine(data,'Personnel used: '+result.inventoryRows.map(row=>Lab.LABELS[row.f]+' '+(row.unit.value===null?'Unknown':num(row.unit.value))+' ('+row.unit.source+(row.unit.at?', '+age(row.unit.at):'')+')').join(' · '));
      if(result.excluded.length)textLine(data,'Excluded: '+result.excluded.map(f=>Lab.LABELS[f]+' ('+result.reasons[f]+')').join(' · ')+'.');
      result.notes.forEach(n=>textLine(data,n));
      if(result.knownRows.length)data.appendChild(table(['Category / weapon','Known qty','Current strength','Unit price','Collected'],result.knownRows.map(a=>[(Lab.LABELS[a.f]||'Unknown')+' / '+a.name,a.qty===null?'Unknown':num(a.qty),a.currentStrength===null||a.currentStrength===undefined?'Unknown':(a.strengthSource==='observed'?'':'~ ')+num(a.currentStrength)+' / '+a.strengthSource,a.price===null?'Unknown':(a.priceSource==='recorded'?'':'~ ')+num(a.price),age(a.at)+(a.qtyCarried?' · quantity carried':'')+(a.strengthCarried?' · strength carried ('+age(a.strengthAt)+')':a.strengthUnknown?' · strength hidden':'')])));
      textLine(data,'Observed peers: '+result.coverage.map(c=>Lab.LABELS[c.f]+' '+c.count).join(' · '));
      textLine(data,'Unit-aware formula holds personnel and multipliers fixed. Taxes checks: Theft within 2 rating points; Poison within 13. SA/DA and surplus equipment use an SR-style equipped-strength estimate. Those mechanics and full wipes remain unverified.');
      textLine(data,'~ marks estimated values. Fields merge newest-known within 30 days; collection age does not prove report age. Missing intel and changing multipliers can alter the result. No exact overall rank is predicted; no missions are performed. Planner settings and plans stay on this device.');
      const legacy=details('Legacy comparison: 0%, 10%, 25% residual scenarios');let legacyBuilt=false;
      function showLegacy(){if(!legacy.open||legacyBuilt)return;legacyBuilt=true;try{
        const rows=[0,.1,.25].map(f=>{const r=Lab.run(b,id,local,budget,f,now,{mode:'legacy',allowCatalogStrength:!!catalogInput.checked}),p=r.best;return [Math.round(f*100)+'%',p.score?p.picks.map(x=>Lab.LABELS[x.f]).join(' + '):'No positive crossings',p.score,money(p.cost)];});
        legacy.appendChild(table(['Legacy residual','~ Best tested categories','~ Crossings','~ Cost'],rows));
      }catch(error){textLine(legacy,'Legacy comparison unavailable: '+(error.message||String(error)));}}
      legacy.addEventListener('toggle',showLegacy);showLegacy();
    }
    function compare(event){
      if(event){event.preventDefault?.();event.stopPropagation?.();}
      if(calculationPending)return;
      calculationPending=true;clickCount++;
      actionStatus.textContent='Comparing local intel…';
      setTimeout(()=>{
        try{renderResult(true);actionStatus.textContent='Plan updated.';}
        catch(error){actionStatus.textContent='Comparison could not finish: '+(error.message||String(error));console.error('Sab Advisor comparison:',error);}
        finally{calculationPending=false;}
      },0);
    }
    function mount(){
      const id=profileId();if(!jfAuthorized||!id||document.getElementById('jf-sab'))return;
      activeId=id;const b=board(),base=(b.targets||{})[id]||{},target=Lab.pooledTarget(b,id,localFor(base,id),Date.now()),info=Lab.budgetFor(target,(b.tiv||{})[id],Date.now());
      const host=node('div');host.id='jf-sab';host.className='jf-block';
      const isolated=host.attachShadow?host.attachShadow({mode:'open'}):host;
      const css=node('style',':host{display:block;position:relative;isolation:isolate;color:#eee;background:#111;font:13px Arial,sans-serif;line-height:1.45}*{box-sizing:border-box}button,input,select{font:inherit!important;pointer-events:auto!important;visibility:visible!important;opacity:1!important}button{display:inline-block!important;appearance:auto!important;cursor:pointer!important;background:#e8c766!important;color:#17130a!important;border:1px solid #a88b31!important;border-radius:4px!important;padding:8px 12px!important;min-height:36px!important}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #73b9ff!important;outline-offset:2px}input,select{border:1px solid #777!important;border-radius:3px!important}summary{cursor:pointer;color:#e8c766;padding:7px 0}details{margin:5px 0}details>table{margin-top:5px}table{display:table;width:100%;color:inherit;background:transparent}p{line-height:1.4}p:empty,div:empty,span:empty{display:none}th,td{overflow-wrap:anywhere}summary{font-weight:600}button{padding:5px 9px!important;min-height:32px!important}@media(max-width:540px){th,td{padding:4px!important}input{max-width:100%}}');isolated.appendChild(css);
      const box=node('div',undefined,'border:2px solid #c9a227;padding:10px;margin:10px 0;max-width:100%;color:inherit;background:inherit;box-sizing:border-box');box.className='jf-block';isolated.appendChild(box);
      box.appendChild(node('strong','Sab Advisor'));

      const controls=node('div',undefined,'display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0');
      const budgetLabel=node('label','Remaining budget (Gold) ');budgetInput=node('input');budgetInput.type='text';budgetInput.inputMode='numeric';budgetInput.value=info.value===null?'':String(info.value);budgetInput.style.cssText='width:170px;color:#111;background:#fff;padding:4px';budgetLabel.appendChild(budgetInput);controls.appendChild(budgetLabel);
      const settings=node('details');settings.appendChild(node('summary','Settings'));
      const modelControls=node('div',undefined,'display:flex;flex-wrap:wrap;gap:8px;align-items:center');settings.appendChild(modelControls);
      const modeLabel=node('label','Model ');modeInput=node('select');for(const [value,label] of [['units','Unit-aware candidate (all 8)'],['legacy','Legacy residual scenario']]){const option=node('option',label);option.value=value;modeInput.appendChild(option);}modeInput.value='units';modeInput.style.cssText='color:#111;background:#fff;padding:4px';modeLabel.appendChild(modeInput);modelControls.appendChild(modeLabel);
      const floorLabel=node('label','Legacy residual assumption ');floorContainer=floorLabel;floorContainer.style.display='none';floorInput=node('select');for(const f of [0,.1,.25]){const option=node('option',Math.round(f*100)+'%');option.value=String(f);floorInput.appendChild(option);}floorInput.value='0.1';floorInput.disabled=true;floorInput.style.cssText='color:#111;background:#fff;padding:4px';floorLabel.appendChild(floorInput);modelControls.appendChild(floorLabel);
      const calculate=node('button','Compare plans');calculate.type='button';calculate.disabled=false;calculate.addEventListener('click',compare);controls.appendChild(calculate);box.appendChild(controls);
      const estimateLabel=node('label','', 'display:block;margin:7px 0;font-size:12px');catalogInput=node('input');catalogInput.type='checkbox';catalogInput.checked=true;catalogInput.addEventListener('change',compare);estimateLabel.appendChild(catalogInput);estimateLabel.appendChild(node('span',' Use estimated strength when hidden (scenario only)'));settings.appendChild(estimateLabel);

      budgetInput.addEventListener('keydown',event=>{if(event.key==='Enter')compare(event);});
      budgetInput.addEventListener('change',compare);floorInput.addEventListener('change',compare);modeInput.addEventListener('change',()=>{floorInput.disabled=modeInput.value==='units';floorContainer.style.display=modeInput.value==='units'?'none':'';compare();});
      const counts=node('details');counts.appendChild(node('summary','Specialist counts — saved or manual for this page'));
      textLine(counts,'Leave blank to use a recent saved count. A number entered here is a manual scenario for this target and is not saved or uploaded.');
      for(const f of Object.keys(Lab.SPECIALISTS)){const row=node('label',Lab.LABELS[f]+' / '+Lab.UNIT_LABELS[f]+' ', 'display:block;margin:5px 0'),input=node('input'),saved=Lab.unitFor(target,f,Date.now());input.type='text';input.inputMode='numeric';input.value='';input.placeholder=saved?'Saved: '+num(saved.value):'Unknown — enter known count';input.style.cssText='width:220px;color:#111;background:#fff;padding:4px';input.addEventListener('change',compare);input.addEventListener('keydown',event=>{if(event.key==='Enter')compare(event);});unitInputs[f]=input;row.appendChild(input);counts.appendChild(row);}settings.appendChild(counts);
      actionStatus=node('p','','font-size:12px;margin:6px 0;color:#e8c766');actionStatus.setAttribute('role','status');actionStatus.setAttribute('aria-live','polite');box.appendChild(actionStatus);
      budgetNote=node('p',info.text,'font-size:12px;margin:6px 0');box.appendChild(budgetNote);output=node('div');box.appendChild(output);
      box.appendChild(settings);
      const hist=document.getElementById('jf-hist'),war=document.getElementById('jf-war');if(hist&&hist.parentNode)hist.parentNode.insertBefore(host,hist);else if(war&&war.parentNode)war.parentNode.insertBefore(host,war.nextSibling);else document.body.appendChild(host);
      try{renderResult();}catch(error){actionStatus.textContent='Initial comparison could not finish: '+(error.message||String(error));}
    }
    if(profileId())setInterval(()=>{if(jfAuthorized)try{mount();renderResult(false);}catch(error){console.error('Sab Advisor refresh:',error);}},15000);
    return {refresh(){if(jfAuthorized){mount();renderResult(false);}}};
  }

  function sabAdvisor(){
    if(!jfAuthorized||!/\/stats\.php$/i.test(location.pathname)||!/^\d+$/.test(statsId()||''))return;
    if(!jfCombinationPlanner)jfCombinationPlanner=jfCreateCombinationPlanner();
    jfCombinationPlanner.refresh();
  }

  function jfProfileRank() {
    var cells=document.querySelectorAll("td, th");
    for(var i=0;i<cells.length;i++) {
      if(!/^Rank\s*:?$/i.test((cells[i].innerText||"").trim()))continue;
      var next=cells[i].nextElementSibling;
      var value=next?(next.innerText||"").trim():"";
      if(/^[0-9][0-9,]*$/.test(value))return num(value);
    }
    var match=bodyText().match(/(?:^|\n)\s*Rank\s*:?\s*([0-9][0-9,]*)(?=\s|$)/i);
    return match?num(match[1]):null;
  }

  function targetHistory() {
    var id = statsId();
    if (!id) return;
    var existing = document.getElementById("jf-hist");
    if (existing) existing.remove();
    var F8 = ["sa", "da", "spy", "sentry", "poison", "antidote", "theft", "vigilance"];
    var NAMES = { sa: "SA", da: "DA", spy: "Spy", sentry: "Sentry", poison: "Poison", antidote: "Antidote", theft: "Theft", vigilance: "Vigilance" };
    var LABELS = { sa: "Strike Action", da: "Defensive Action", spy: "Spy Rating", sentry: "Sentry Rating", poison: "Poison Rating", antidote: "Antidote Rating", theft: "Theft Rating", vigilance: "Vigilance Rating" };
    var snap = {};
    F8.forEach(function (f) { snap[f] = shown(LABELS[f]); });
    snap.at = Date.now();
    snap.fieldAt = {};
    var observedRank = jfProfileRank();
    if (observedRank !== null && observedRank > 0) { snap.rank = observedRank; snap.rankAt = snap.at; }
    F8.forEach(function (field) { if (snap[field] !== null) snap.fieldAt[field] = snap.at; });
    var prevKnown = state.targets[id] || {};
    var nmM = bodyText().match(/Name:\s*([A-Za-z0-9_.-]{2,32})/);
    if (nmM) {
      snap.name = nmM[1];
      var nkey = "n:" + nmM[1].toLowerCase();
      if (state.targets[nkey]) {
        var ph = state.targets[nkey];
        F8.forEach(function (f0) {
          if ((snap[f0] === null || snap[f0] === undefined) && ph[f0] !== null && ph[f0] !== undefined) { snap[f0] = ph[f0]; snap.fieldAt[f0] = jfFieldTime(ph, f0); }
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
      snap.fieldAt[ck] = jfFieldTime(prevKnown, ck);
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
    if (!last || Math.floor(snap.at / (5 * 60 * 1000)) !== Math.floor(last.at / (5 * 60 * 1000))) log.push(snap);
    else log[log.length - 1] = snap;
    state.histlog[id] = log;
    snap = jfMergeTarget(prevKnown, snap);
    state.targets[id] = snap;

    var baseline = jfGrowthBaseline(log,prevKnown,snap.at);
    var windowMs = baseline ? Math.max(0, snap.at - baseline.at) : 0;
    var entries = [];
    F8.forEach(function (k) {
      if (snap[k] === null || snap[k] === undefined) return;
      var pct = null;
      if (baseline && baseline[k] !== null && baseline[k] !== undefined && baseline[k] > 0 && snap[k] >= 0 && jfFieldTime(baseline,k)>=snap.at-DAY && jfFieldTime(snap,k)>jfFieldTime(baseline,k)) {
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
    var categoryTiv=jfWeaponValues(state.targets[id],Date.now());
    var rows = "";
    var bestUp = null, bestDown = null;
    entries.forEach(function (en) {
      if (en.never) {
        var seenCount = 0;
        log.forEach(function (row) {
          var fk = F8.filter(function (ff) { return NAMES[ff] === en.label; })[0];
          if (fk && row[fk] !== null && row[fk] !== undefined) seenCount++;
        });
        rows += "<tr data-evid='" + en.label + "|" + seenCount + "|" + log.length + "'><td>" + en.label + "</td><td>—</td><td style=\"text-align:right\"><span style='font-size:11px;opacity:.7'>not recorded \u2014 tap for proof</span></td></tr>";
        return;
      }
      var category=F8.filter(function(key){return NAMES[key]===en.label;})[0],valuation=categoryTiv[category];
      var tivCell=valuation?(valuation.estimated?"~":"")+comma(valuation.value)+(valuation.partial?" (partial)":"")+(valuation.estimated?" (assumed unit prices)":" (observed prices)"):"Unknown";
      var cell = comma(en.val);
      if (en.pct !== null) {
        var cls = en.pct > 0 ? "jf-ok" : en.pct < 0 ? "jf-no" : "";
        var arrow = en.pct > 0 ? "\u25B2 " : en.pct < 0 ? "\u25BC " : "";
        var tag = arrow + (en.pct > 0 ? "+" : "") + en.pct + "%";
        cell += " <span class=\"" + cls + "\" style=\"font-size:11px\">" + tag + "</span>";
        if (en.pct > 0 && (!bestUp || en.pct > bestUp.pct)) bestUp = en;
        if (en.pct < 0 && (!bestDown || en.pct < bestDown.pct)) bestDown = en;
      }
      rows += "<tr><td>" + en.label + "</td><td style=\"text-align:right\">" + tivCell + "</td><td style=\"text-align:right\">" + cell + "</td></tr>";
    });
    if (bestUp || bestDown) {
      var sum = "";
      if (bestUp) sum += "Upkeeping: " + bestUp.label + " (+" + bestUp.pct + "%)";
      if (bestUp && bestDown) sum += " \u00B7 ";
      if (bestDown) sum += "Dropping: " + bestDown.label + " (" + bestDown.pct + "%)";
      rows = "<tr><td colspan=\"3\" style=\"font-size:11px;font-weight:700;\">" + sum + "</td></tr>" + rows;
    }
    if (baseline) {
      var wTxt = windowMs >= DAY ? Math.round(windowMs / DAY * 10) / 10 + "d" : windowMs >= 3600000 ? Math.round(windowMs / 360000) / 10 + "h" : Math.max(1, Math.round(windowMs / 60000)) + "m";
      rows += "<tr><td>Observed change within last 24h</td><td colspan=\"2\" style=\"text-align:right\">" + wTxt + " window</td></tr>";
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
      rows += "<tr><td>Age of newest visible page timestamp (not independently verified)</td><td colspan=\"2\" style=\"text-align:right\">" + ageH + "h old</td></tr>";
    }
    rows+="<tr><td colspan='3'>~ category TIV uses assumed unit prices (SA/DA 750,000 Gold; other categories 1,000,000 Gold) when item prices are unavailable. It is not measured TIV and may differ from the recorded total. Changes cover available observations, not necessarily a full day.</td></tr>";

    var box = document.createElement("table");
    box.id = "jf-hist";
    box.className = "jf-block";
    box.innerHTML = "<tr><td class=\"jf-h\" colspan=\"3\" style=\"" + headerStyle(findHeaderPrefix("Shared Recon Info") || findHeaderPrefix("Recent Battles") || findHeader("Recent Battles")) + "\">Growth Tracker</td></tr>" + "<tr><th>Stat</th><th>Weapon value / estimated TIV</th><th>Rating / observed change</th></tr>" + rows;
    Array.prototype.forEach.call(box.querySelectorAll("tr[data-evid]"), function (tr) {
      tr.style.cursor = "pointer";
      tr.onclick = function () {
        var parts = tr.getAttribute("data-evid").split("|");
        window.alert(parts[0] + ": " + parts[1] + " of your last " + parts[2] + " stored readings ever contained this stat. If 0, this local history has no saved reading for that stat. This does not establish why it is unavailable.");
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
    if (!id || !/^\d+$/.test(id)) id = jfPlayerId(name);
    if (!id) id = name ? "n:" + name.toLowerCase() : null;
    if (!id) return;
    var inv = text.match(/Total Invested Value:?\s*\(?([0-9][0-9,.]*)\)?/i);
    if (!inv) return;
    var invested = num(inv[1]);
    if (!isFinite(invested) || invested < 0) return;
    if (name) {
      var nkey = name.toLowerCase();
      Object.keys(state.tiv).forEach(function (k) {
        if (k !== String(id) && state.tiv[k] && (state.tiv[k].name || "").toLowerCase() === nkey) delete state.tiv[k];
      });
    }
    state.tiv[id] = { id: String(id), name: name || ("#" + id), invested: invested, at: Date.now() };
    save();
  }

  function jfTivRanking(pool, now) {
    var cutoff = now - 30 * 86400000;
    var rows = Object.keys(pool || {}).map(function (k) { return pool[k]; })
      .filter(function (r) {
        if (!r || typeof r.invested !== "number" || !isFinite(r.invested) || r.invested <= 0) return false;
        var t = Number(r.at || 0);
        return t === 0 || t >= cutoff;
      });
    var byKey = {};
    for (var d = 0; d < rows.length; d++) {
      var r = rows[d];
      var nk = String(r.name || r.id || ("#" + d)).trim().toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(byKey, nk) || (Number(r.at) || 0) >= (Number(byKey[nk].at) || 0)) {
        byKey[nk] = r;
      }
    }
    rows = Object.keys(byKey).map(function (k) { return byKey[k]; });
    rows.sort(function (a, b) { return b.invested - a.invested; });
    var total = 0;
    for (var i = 0; i < rows.length; i++) total += rows[i].invested;
    return { top: rows.slice(0, 20), total: total, count: rows.length };
  }

  function tivTracker() {
    if (!/base\.php/i.test(location.pathname)) return;
    var existing = document.getElementById("jf-tiv");
    if (existing) existing.remove();
    var ranking=jfTivRanking(state.tiv,Date.now()),top=ranking.top,total=ranking.total;
    var rows={length:ranking.count};
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
        "<td>" + (/^\d+$/.test(r.id) ? "<a href='stats.php?id=" + r.id + "' style='color:" + linkCol + ";'>" + (r.name || r.id) + "</a>" : (r.name || r.id) + " (ID unknown)") + "</td>" +
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

  function jfUpgradeSection(label, text, available, controlLabels) {
    var accepted=/^(Siege|Fortification|Upgrade (?:Covert|Sentry|Poison|Antidote|Theft|Vigilance) Skill|Increase Experience)$/i;
    if (!accepted.test(label)) return null;
    if (/No More Levels|Upgrade Completed/i.test(text)) return {name:label,maxed:true};
    var explicit=[];
    (controlLabels||[]).forEach(function(value){
      var match=String(value||"").trim().match(/^([0-9][0-9,]*)\s+Gold$/i);
      if(match&&explicit.indexOf(match[1])<0)explicit.push(match[1]);
    });
    var matches=explicit.length?explicit.map(function(value){return [value,value];}):Array.from(text.matchAll(/([0-9][0-9,]*)\s+Gold\b/gi));
    if (matches.length!==1) return {name:label,unknown:true};
    var cost=Number(matches[0][1].replace(/,/g,""));
    if (!Number.isSafeInteger(cost)||cost<0) return {name:label,unknown:true};
    return {name:label,cost:cost,shortfall:available===null?null:Math.max(0,cost-available)};
  }

  function upgradesPlanner() {
    if (!/upgrades\.php/i.test(location.pathname)||document.getElementById("jf-upg")) return;
    var funds=bodyText().match(/Available Funds:\s*([0-9][0-9,]*)\s+Gold/i);
    var available=funds?Number(funds[1].replace(/,/g,"")):null;
    if (available!==null&&!Number.isSafeInteger(available)) available=null;
    var out=[],seen={};
    var tables=document.querySelectorAll("table");
    for(var i=0;i<tables.length;i++){
      var table=tables[i];
      if (table.querySelector("table")) continue;
      var rows=table.querySelectorAll("tr");
      if (!rows.length) continue;
      var heading=rows[0].querySelector("th, td");
      if (!heading) continue;
      var label=(heading.innerText||"").replace(/\s+/g," ").trim();
      var controls=table.querySelectorAll('input[type="submit"], input[type="button"], button');
      var prices=Array.prototype.map.call(controls,function(control){return control.tagName==="INPUT"?control.value:control.innerText||control.textContent||"";});
      var entry=jfUpgradeSection(label,(table.innerText||"").replace(/\s+/g," "),available,prices);
      if(entry&&!seen[label]){out.push(entry);seen[label]=true;}
    }
    var box=document.createElement("table");box.id="jf-upg";box.className="jf-block";
    var title=document.createElement("tr"),titleCell=document.createElement("td");titleCell.colSpan=3;titleCell.className="jf-h";titleCell.textContent="Upgrade Planner";title.appendChild(titleCell);box.appendChild(title);
    function addRow(values){var row=document.createElement("tr");values.forEach(function(value){var cell=document.createElement("td");cell.textContent=value;row.appendChild(cell);});box.appendChild(row);}
    if(!out.length)addRow(["Upgrade layout not recognized. Use the game's displayed prices; no estimate available."]);
    out.forEach(function(entry){
      if(entry.maxed){addRow([entry.name,"MAX","No more levels"]);return;}
      if(entry.unknown){addRow([entry.name,"Cost unavailable","Check the game’s upgrade button"]);return;}
      addRow([entry.name,comma(entry.cost)+" Gold",entry.shortfall===null?"Available funds unknown":entry.shortfall===0?"Affordable now":comma(entry.shortfall)+" Gold short"]);
    });
    addRow([available===null?"Available funds not found":"Available funds: "+comma(available)+" Gold"]);
    addRow(["Each upgrade is compared separately with the same available funds. Gold costs are not EXP costs. No purchase or automatic action is performed."]);
    var anchor=findHeader("Upgrades");var host=anchor?tableFrom(anchor):null;
    if(host&&host.parentNode)host.parentNode.insertBefore(box,host.nextSibling);else insertBlock(box,null,findHeader("Game Time"));
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
    box.textContent = `JFWarScout ${currentVersion}` + (lastErr ? " · ERR: " + lastErr : "");
    document.body.appendChild(box);
    jfPlaceInfo();
  }

  function loggedIn() {
    var gameMenu = document.querySelector("a[href*='base.php']");
    var logoutLink = document.querySelector("a[href*='logout.php']");
    if (gameMenu && logoutLink) return true;
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

  var jfApprovalAt = 0;
  var jfApprovalTTL = 5 * 60000;
  function jfForgetApproval() {
    jfApprovalAt = 0;
    try { GM_setValue("JF_MEMBERSHIP_CACHE", ""); } catch (e) {}
  }
  function jfCachedApproval() {
    try {
      var cache = JSON.parse(GM_getValue("JF_MEMBERSHIP_CACHE", "{}"));
      var age = Date.now() - cache.at;
      if (SITE_TOKEN && cache.key === SITE_TOKEN && age >= 0 && age < jfApprovalTTL) {
        jfApprovalAt = cache.at; return true;
      }
    } catch (e) {}
    return false;
  }
  function jfLaunch() {
    jfAuthorized = true;
    if (!jfStarted) {
      jfStarted = true;
      if (!jfStatusOnly) { jfApplyStyle(); boot(); }
      else { jfSharingControls(); stamp(); }
    }
  }
  var jfAuthorized = false;
  var jfStarted = false;
  var jfMembershipTimer = 0;
  var jfCheckSerial = 0;
  function jfAccessError(status, text) {
    var reply = null; try { reply = JSON.parse(text); } catch (e) {}
    if (status === 401 && reply && reply.error) return "Membership: " + reply.error;
    if (status === 403 && reply && reply.error) return "Membership: " + reply.error;
    return "Membership: verification unavailable (HTTP " + status + ")";
  }
  function jfLock(message) {
    var wasRunning = jfStarted;
    jfAuthorized = false;
    jfForgetApproval();
    jfShowSync(message);
    if (wasRunning) {
      location.reload();
      return;
    }
    jfSharingControls();
  }
  function jfCheckMembership() {
    var serial = ++jfCheckSerial;
    clearTimeout(jfMembershipTimer);
    if (!SITE_TOKEN) { jfLock("Membership: personal key required"); return; }
    httpJson("POST", SITE_PUSH, { action: "membership_check" }, function (status, text) {
      if (serial !== jfCheckSerial) return;
      var result = null; try { result = JSON.parse(text); } catch (e) {}
      if (status === 200 && result && result.ok && result.approved === true) {
        jfApprovalAt = Date.now();
        try { GM_setValue("JF_MEMBERSHIP_CACHE", JSON.stringify({key:SITE_TOKEN,at:jfApprovalAt})); } catch (e) {}
        jfShowSync(jfTransferStatus || jfLastUpload || "Sharing: connected; membership approved");
        jfLaunch();
        jfMembershipTimer = setTimeout(jfCheckMembership, 60000);
      } else if ((status === 0 || status >= 500) && jfAuthorized && Date.now() - jfApprovalAt < jfApprovalTTL) {
        jfShowSync("Sharing: connected; offline, retrying verification");
        jfMembershipTimer = setTimeout(jfCheckMembership, Math.min(60000, jfApprovalTTL - (Date.now() - jfApprovalAt)));
      } else {
        jfLock(status === 401 || status === 403 ? jfAccessError(status, text) : "Membership: verification unavailable (HTTP " + status + ")");
        if (!jfStarted) jfMembershipTimer = setTimeout(jfCheckMembership, 60000);
      }
    }, { "X-JF-Script-Key": SITE_TOKEN });
  }
  function jfStart() {
    if (!loggedIn()) return;
    if (jfCachedApproval()) {
      jfShowSync("Sharing: connected; checking in background");
      jfLaunch();
    }
    jfSharingControls();
    jfCheckMembership();
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) jfCheckMembership();
    });
  }
  var lastErr = "";
  function safe(fn) { try { fn(); } catch (e) { lastErr = e && e.message ? e.message : String(e); } }
  function boot() {
    if (!jfAuthorized || jfStatusOnly) return;
    if (!loggedIn()) {
      var g = document.createElement("div");
      g.id = "jf-guard";
      g.style.cssText = "color:#ff5555;font-size:10px;padding:2px 6px;";
      g.textContent = "JFWarScout 9.1.20 · guard: logged-out signal detected";
      document.body.insertBefore(g, document.body.firstChild);
      return;
    }
    safe(upgradesPlanner);
    safe(harvestWeapons);
    safe(jfCaptureCategoryRanks);
    safe(jfCaptureSabCap);
    safe(reconCarry);
    safe(harvestTiv);
    safe(tivTracker);
    safe(sideCalc);
    safe(jfSharingControls);
    safe(targetHistory);
    safe(warStats);
    safe(sabAdvisor);
    safe(reconLinks);
    safe(function () { pullShare(function () { safe(sabAdvisor); scheduleShare(); }); });
    safe(stamp);
  }

  function httpJson(method, url, body, done, headers) {
    var finished = false;
    function complete(status, text) {
      if (finished) return;
      finished = true;
      if (done) done(status, text);
    }
    var h = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    if (headers) Object.keys(headers).forEach(function (k) { h[k] = headers[k]; });
    var data = body ? JSON.stringify(body) : undefined;

    // Use GM_xmlhttpRequest exclusively to avoid browser CORS/fetch redirects
    if (typeof GM_xmlhttpRequest === "function") {
      try {
        GM_xmlhttpRequest({
          method: method,
          url: url,
          headers: h,
          timeout: 30000,
          data: data,
          ontimeout: function () { complete(0, ""); },
          onerror: function () { complete(0, ""); },
          onload: function (res) {
            complete(res.status, res.responseText || "");
          }
        });
        return;
      } catch (e) {}
    }

    // Direct browser fetch fallback (for environments without GM_xmlhttpRequest)
    try {
      fetch(url, { method: method, headers: h, body: data, credentials: "omit", cache: "no-store" })
        .then(function (response) { return response.text().then(function (text) { complete(response.status, text); }); })
        .catch(function () { complete(0, ""); });
    } catch (e2) { complete(0, ""); }
  }

  function boardPack() {
    return { targets: state.targets || {}, histlog: state.histlog || {}, tiv: state.tiv || {}, weapons: state.weapons || {} };
  }

  function mergeBoard(remote) {
    if (!remote) return;
    var targets = remote.targets || {};
    Object.keys(targets).forEach(function (id) {
      var snap = targets[id];
      if (!snap) return;
      var old = state.targets[id];
      state.targets[id] = old ? jfMergeTarget(old, snap) : jfMergeTarget({}, snap);
    });

    var histlog = remote.histlog || {};
    Object.keys(histlog).forEach(function (id) {
      var mine = state.histlog[id] || [];
      var seen = {};
      mine.concat(histlog[id] || []).forEach(function (row) { if (row && row.at) seen[row.at] = row; });
      state.histlog[id] = Object.keys(seen).sort().map(function (ts) { return seen[ts]; });
    });

    var tiv = remote.tiv || {};
    Object.keys(tiv).forEach(function (id) {
      var row = tiv[id];
      if (!row || typeof row.invested !== "number" || !isFinite(row.invested) || row.invested < 0) return;
      var prev = state.tiv[id];
      if (!prev || (row.at || 0) >= (prev.at || 0)) state.tiv[id] = row;
    });

    var weaponsR = remote.weapons || {};
    Object.keys(weaponsR).forEach(function (n) {
      if (weaponsR[n]) state.weapons[n] = jfMergeTarget(state.weapons[n], weaponsR[n]);
    });
  }

  function pullShare(done) {
    if (!jfAuthorized) { if (done) done(); return; }
    if (!SITE_TOKEN) { jfShowSync("Sharing: not connected"); if (done) done(); return; }
    httpJson("POST", SITE_PUSH, { action: "warscout_pull" }, function (status, text) {
        console.log("[WARSCOUT PULL RAW]", { status: status, text: text });
      if (!jfAuthorized) return;
      if (status >= 200 && status < 300 && text) {
        try {
          var parsed = JSON.parse(text);
          if (parsed && parsed.ok && parsed.board) {
            mergeBoard(parsed.board);
            jfShowSync(jfLastUpload || "Sharing: connected; upload pending");

            // Re-render trackers with newly fetched database contents
            safe(tivTracker);
            safe(sideCalc);
            safe(targetHistory);
            safe(warStats);
            safe(sabAdvisor);
          } else {
            jfShowSync("Sharing: unexpected server response");
          }
        } catch (e) {}
      }
      if (status === 401 || status === 403) { jfLock(jfAccessError(status, text)); return; }
      else if (status < 200 || status >= 300) jfShowSync("Sharing: connected; sync unavailable (" + status + ")");
      if (done) done();
    }, { "X-JF-Script-Key": SITE_TOKEN });
  }

  var lastPushRaw = "";
  var lastPushAt = 0;
  var repushTimer = 0;
  var jfUploadBusy = false;
  var jfUploadRetry = 0;
  var jfUploadRetryTimer = 0;

  function pushToSite() {
    if (!jfAuthorized) return;
    if (!SITE_TOKEN) { jfShowSync("Sharing: not connected"); return; }
    if (jfUploadBusy) return;
    jfUploadBusy = true;
    httpJson("POST", SITE_PUSH, Object.assign({ action: "warscout_push" }, boardPack()), function (status, text) {
      jfUploadBusy = false;
      if (!jfAuthorized) return;
      if (status === 401 || status === 403) { jfLock(jfAccessError(status, text)); return; }
      var result = null; try { result = JSON.parse(text); } catch (e) {}
      if (status >= 200 && status < 300 && result && result.ok) {
        jfUploadRetry = 0; clearTimeout(jfUploadRetryTimer);
        jfLastUpload = "Sharing: last upload " + new Date().toLocaleTimeString();
        jfShowSync(jfLastUpload);
      } else {
        lastPushRaw = "";
        if ((status === 0 || status === 408 || status === 429 || status >= 500) && jfUploadRetry < 3) {
          var delay = [10000, 30000, 60000][jfUploadRetry++];
          jfShowSync("Sharing: upload delayed (" + status + "); retry " + jfUploadRetry + "/3 in " + (delay / 1000) + "s");
          clearTimeout(jfUploadRetryTimer);
          jfUploadRetryTimer = setTimeout(pushToSite, delay);
        } else {
          jfShowSync("Sharing: upload failed (" + status + "); refresh to retry");
        }
      }
    }, { "X-JF-Script-Key": SITE_TOKEN });
  }

  function pushShare() {
    if (!jfAuthorized) return;
    var raw = JSON.stringify(boardPack());
    var now = Date.now();
    if (raw === lastPushRaw) return;
    if (now - lastPushAt < 60000) {
      clearTimeout(repushTimer);
      repushTimer = setTimeout(pushShare, 60000 - (now - lastPushAt));
      return;
    }
    lastPushRaw = raw;
    lastPushAt = now;
    pushToSite();
  }

  var shareTimer = 0;
  function scheduleShare() {
    if (!jfAuthorized) return;
    clearTimeout(shareTimer);
    shareTimer = setTimeout(pushShare, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", jfStart);
  else jfStart();

  // Updater
  GM_xmlhttpRequest({
      method: 'GET',
      url: CONFIG_URL,
      onload: function (response) {
          if (response.status !== 200) return;

          try {
              const config = JSON.parse(response.responseText);
              const remoteVersion = String(config.version ?? '');

              if (remoteVersion && remoteVersion !== currentVersion) {
                  const history = config.history?.[remoteVersion];

                  const updateNotes = Array.isArray(history)
                      ? '\n\nUpdates:\n' + history.map(entry => '- ' + entry).join('\n')
                      : '';

                  const message =
                      'Your warscout version is out of date click OK to update.\n\n' +
                      'Installed version: ' + currentVersion + '\n' +
                      'Required version: ' + remoteVersion +
                      updateNotes;

                  if (confirm(message)) {
                      window.location.href = REDIRECT_URL;
                  }
              }
          } catch (error) {
              console.error('[Version Checker] Error:', error);
          }
      },
      onerror: function () {
          console.error('[Version Checker] Could not retrieve version configuration.');
      }
  });
})();
