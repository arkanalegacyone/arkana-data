// Arkana Character Creator with Discord & Google Drive Submission
window.onload = function() {
(async function(){
  var root = document.getElementById('ark-wizard');
  var flaws = [], commonPowers = [], perks = [], archPowers = [], cybernetics = [], magicSchools = [];
  var DISCORD_WEBHOOK_URL = "https://discordapp.com/api/webhooks/1419119617573388348/MDsOewugKvquE0Sowp3LHSO6e_Tngue5lO6Z8ucFhwj6ZbQPn6RLD7L69rPOpYVwFSXW";
  var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzqopWLaad44vd6kOH7ksfuGTLh4L63p2IUjrgG37zoCgbnf5Uhf90S0UFy4pQJUZQjhA/exec";
  var M = loadModel();

  // --- Utility functions ---
  function esc(s){ return String(s||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function lc(s){ return String(s||'').toLowerCase(); }
  function loadModel(){
    var raw=window.localStorage ? localStorage.getItem('arkModel') : null;
    var base = {
      page:1, identity:{}, race:'', arch:'',
      stats:{phys:1,dex:1,mental:1,perc:1,pool:6},
      cyberSlots:0, flaws:[], picks:[], magicSchools:[],
      page5tab: 'common',
      freeMagicSchool: '', freeMagicWeave: '', synthralFreeWeave: ''
    };
    try{
      var m = raw ? JSON.parse(raw) : base;
      m.flaws = new Set(m.flaws||[]);
      m.picks = new Set(m.picks||[]);
      m.magicSchools = new Set(m.magicSchools||[]);
      m.cyberSlots = m.cyberSlots || 0;
      m.page5tab = m.page5tab || 'common';
      m.freeMagicSchool = m.freeMagicSchool || '';
      m.freeMagicWeave = m.freeMagicWeave || '';
      m.synthralFreeWeave = m.synthralFreeWeave || '';
      // stats default for new users
      if (!m.stats || typeof m.stats !== "object") {
        m.stats = {phys:1,dex:1,mental:1,perc:1,pool:6};
      }
      // ensure stats are at least 1
      ['phys','dex','mental','perc'].forEach(function(k){
        if (typeof m.stats[k]!=="number" || m.stats[k]<1) m.stats[k]=1;
      });
      return Object.assign(base,m);
    }catch(_){
      return Object.assign({}, base, {
        flaws: new Set(), picks: new Set(), magicSchools: new Set()
      });
    }
  }
  function saveModel(){
    try{
      if(window.localStorage){
        var dump = {
          page:M.page, identity:M.identity, race:M.race, arch:M.arch, stats:M.stats,
          cyberSlots:M.cyberSlots,
          flaws:Array.from(M.flaws),
          picks:Array.from(M.picks),
          magicSchools:Array.from(M.magicSchools),
          page5tab: M.page5tab,
          freeMagicSchool: M.freeMagicSchool,
          freeMagicWeave: M.freeMagicWeave,
          synthralFreeWeave: M.synthralFreeWeave
        };
        localStorage.setItem('arkModel', JSON.stringify(dump));
      }
    }catch(_){}
  }
  async function loadAllData() {
    const urls = [
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/flaws3.json",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/common_powers2.json?nocache=1",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/perks2.json?nocache=1",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/archetype_powers4.json?nocache=1",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/cybernetics2.json?nocache=1",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/magic_schools8.json?nocache=1"
    ];
    var [flawsData, commonData, perksData, archData, cyberData, magicData] = await Promise.all(urls.map(u=>fetch(u).then(r=>{
      if (!r.ok) throw new Error("Failed to fetch "+u);
      return r.json();
    })));
    flaws = flawsData;
    commonPowers = commonData;
    perks = perksData;
    archPowers = archData;
    cybernetics = cyberData;
    magicSchools = magicData;
  }
  // --- Data helpers ---
  function flawsForRace(race, arch) {
    if (!race) return [];
    var r = lc(race);
    var a = arch ? lc(arch) : "";
    var humanSpeciesTypes = {
      "human (no powers)": "human_without_power",
      "arcanist": "arcanist",
      "synthral": "synthral",
      "psion": "psion"
    };
    if(r === "human"){
      var speciesTag = humanSpeciesTypes[a] || "human_without_power";
      return flaws.filter(function(flaw){
        var tags = flaw.tags ? flaw.tags.map(lc) : [];
        return tags.indexOf("species:" + speciesTag) >= 0;
      });
    }
    return flaws.filter(function(flaw){
      var tags = flaw.tags ? flaw.tags.map(lc) : [];
      if (r === "strigoi" && tags.indexOf("race:strigoi") >= 0) return true;
      if (r === "gaki" && tags.indexOf("race:gaki") >= 0) return true;
      if(tags.indexOf("race:" + r) >= 0) return true;
      if(a && (tags.indexOf("arch:" + a) >= 0 || tags.indexOf("spec:" + a) >= 0)) return true;
      return false;
    });
  }
  function perksForRace(race, arch) {
    var r = lc(race||"");
    var a = lc(arch||"");
    return perks.filter(function(perk){
      if (perk.species && lc(perk.species) !== r) return false;
      if (perk.arch && a && lc(perk.arch) !== a) return false;
      return true;
    });
  }
  function commonPowersForRace(race) {
    var r = lc(race||"");
    return commonPowers.filter(function(p){ return p.species && lc(p.species) === r; });
  }
  function archPowersForRaceArch(race, arch) {
    var r = lc(race||"");
    var a = lc(arch||"");
    return archPowers.filter(function(p){
      if (p.species && lc(p.species) !== r) return false;
      if (p.arch && a && lc(p.arch) !== a) return false;
      return true;
    });
  }
  function cyberneticsAll() {
    return cybernetics;
  }
  function canUseMagic(race, arch) {
    if(lc(race) === "human" && lc(arch) === "human (no powers)") return false;
    if(lc(race) === "spliced") return false;
    return true;
  }
  function groupMagicSchoolsBySection(arr, race, arch) {
    var isSynthral = lc(race) === "human" && lc(arch) === "synthral";
    var out = {};
    arr.forEach(function(item){
      var section = item.section || "Other";
      if (lc(section) === "technomancy" && !isSynthral) return;
      if (!out[section]) out[section] = [];
      out[section].push(item);
    });
    Object.keys(out).forEach(function(section){
      out[section].sort(function(a,b){
        if (a.id.startsWith("school_")) return -1;
        if (b.id.startsWith("school_")) return 1;
        return 0;
      });
    });
    return out;
  }
  function magicSchoolsAllGrouped(race, arch) {
    return groupMagicSchoolsBySection(magicSchools, race, arch);
  }
  function statMod(v){ return v===1?-2 : v===2?0 : v===3?2 : v===4?4 : v===5?6:0; }
  function normalizeStats(){
    var S = M.stats = M.stats || {phys:1,dex:1,mental:1,perc:1};
    // Set minimum stat to 1
    ['phys','dex','mental','perc'].forEach(function(k){
      if(typeof S[k]!=='number' || S[k]<1) S[k]=1;
      S[k]=Math.min(5,Math.max(1,S[k]));
    });
    // Spliced bonus: 1 free point Phys+Dex
    var race = lc(M.race||'');
    var physBase = 1, dexBase = 1;
    var splicedBonus = (race === "spliced") ? 1 : 0;
    // Total points spent = stats - base (1 for each stat, +1 for spliced Phys/Dex)
    var spent = (S.phys-physBase-splicedBonus>0?S.phys-physBase-splicedBonus:0) +
                (S.dex-dexBase-splicedBonus>0?S.dex-dexBase-splicedBonus:0) +
                (S.mental-1>0?S.mental-1:0) +
                (S.perc-1>0?S.perc-1:0);

    var pool = 6 - spent;
    S.pool = Math.max(0, pool);
    return S;
  }
  function groupCyberneticsBySection(arr) {
    var sectionLabels = [
      "Sensory Mods",
      "Combat/Utility Mods",
      "Augmented Strength/Durability",
      "Street-Level Popular Mods",
      "Stealth/Infiltration - Hacking",
      "Defensive/Countermeasures - Hacking",
      "Breaching/Intrusion Protocols - Hacking"
    ];
    var out = {};
    sectionLabels.forEach(s => out[s] = []);
    arr.forEach(function(item){
      var sec = item.section || "";
      if (out[sec]) out[sec].push(item);
    });
    return out;
  }
  function numCyberModsSelected() {
    return Array.from(M.picks).filter(pid => cybernetics.find(c => c.id === pid)).length;
  }
  function enforceCyberModLimit() {
    var cyberSlots = M.cyberSlots || 0;
    var cyberBoxes = Array.from(document.querySelectorAll('#page5 input[data-cyber="1"]'));
    var selected = cyberBoxes.filter(ch => ch.checked);
    if (selected.length > cyberSlots) {
      selected.slice(cyberSlots).forEach(ch => {
        ch.checked = false;
        M.picks.delete(ch.dataset.id);
      });
      saveModel();
      render();
      return;
    }
    if (cyberSlots < 1) {
      cyberBoxes.forEach(ch => ch.disabled = true);
      return;
    }
    if (selected.length >= cyberSlots) {
      cyberBoxes.forEach(ch => { if (!ch.checked) ch.disabled = true; });
    } else {
      cyberBoxes.forEach(ch => { if (!ch.checked) ch.disabled = false; });
    }
  }
  function renderList(title, arr, selectedSet, opt) {
    opt = opt||{};
    var html = title ? '<h3>'+esc(title)+'</h3>' : '';
    if (!arr.length) return html + '<div class="muted">None available.</div>';
    html += '<div class="list">';
    arr.forEach(function(item){
      var sel = selectedSet.has(item.id) ? ' checked' : '';
      var costVal = (typeof item.cost !== "undefined") ? item.cost : 1;
      var disabled = (sel ? '' : (opt.willOverspend && opt.willOverspend(costVal)?' disabled':''))
        + (opt.max && selectedSet.size>=opt.max && !sel ? ' disabled' : '');
      var cost = (typeof item.cost !== "undefined") ? '<span class="pill">'+item.cost+' pts</span>' : '';
      html += '<label class="item"><input type="checkbox" data-id="'+item.id+'"'+sel+disabled+'>'+esc(item.name)+': '+esc(item.desc)+' '+cost+'</label>';
    });
    html += '</div>';
    return html;
  }
  // --- Magic UI helpers ---
  function getTechnomancySchoolId() {
    for (var i=0; i<magicSchools.length; ++i) {
      var sch = magicSchools[i];
      if (lc(sch.section) === "technomancy" && sch.id.startsWith("school_")) return sch.id;
    }
    return "";
  }
  function getSchoolWeaves(schoolId) {
    var schoolEntry = magicSchools.find(x=>x.id===schoolId);
    if (!schoolEntry) return [];
    var section = schoolEntry.section;
    return magicSchools.filter(function(x){
      return x.section === section && !x.id.startsWith("school_");
    });
  }
  function getSchoolIdsForArcanist() {
    var grouped = magicSchoolsAllGrouped(M.race, M.arch);
    var ids = [];
    Object.keys(grouped).forEach(section=>{
      if (grouped[section].length) {
        var school = grouped[section][0];
        if (school.id.startsWith("school_")) ids.push(school.id);
      }
    });
    return ids;
  }
  function getSchoolName(id) {
    var sch = magicSchools.find(x=>x.id===id);
    return sch ? sch.name : id;
  }
  function getWeaveName(id) {
    var weave = magicSchools.find(x=>x.id===id);
    return weave ? weave.name : id;
  }
  // --- Points calculation ---
  function pointsSpentTotal() {
    // 1. Stat points: spent
    var S = M.stats || {phys:1,dex:1,mental:1,perc:1};
    var race = lc(M.race||'');
    var splicedBonus = (race === "spliced") ? 1 : 0;
    var statSpent =
      (S.phys-1-splicedBonus>0?S.phys-1-splicedBonus:0) +
      (S.dex-1-splicedBonus>0?S.dex-1-splicedBonus:0) +
      (S.mental-1>0?S.mental-1:0) +
      (S.perc-1>0?S.perc-1:0);

    // 2. Powers, Perks, Arch, Cybernetics
    var allPicks = Array.from(M.picks);
    var spentPicks = allPicks.map(function(pid){
      if (pid === M.freeMagicWeave || pid === M.synthralFreeWeave) return 0;
      var arrs = [commonPowers, perks, archPowers, cybernetics];
      for(var i=0;i<arrs.length;i++){
        var found=arrs[i].find(function(x){return x.id===pid;});
        if (found && typeof found.cost !== "undefined") return found.cost;
        if (found) return 1;
      }
      return 0;
    }).reduce(function(a,b){return a+b;},0);

    // 3. Magic schools
    var spentMagic = Array.from(M.magicSchools).map(function(id){
      if (id === M.freeMagicSchool || id === getTechnomancySchoolId()) return 0;
      var found = magicSchools.find(function(x){return x.id===id;});
      if (found && typeof found.cost !== "undefined") return found.cost;
      if (found) return 1;
      return 0;
    }).reduce(function(a,b){return a+b;},0);

    // 4. Cyber slot cost: now 1 point per slot
    var cyberSlotCost = (M.cyberSlots || 0) * 1;

    return statSpent + spentPicks + spentMagic + cyberSlotCost;
  }
  function willOverspend(extra) {
    var spent = pointsSpentTotal();
    var total = pointsTotal();
    return spent + extra > total;
  }
  function pointsTotal() {
    var total = 15 + Array.from(M.flaws).reduce(function(s,fid){
      var f=flaws.find(function(x){return x.id===fid;});
      return s+(f?f.cost:0);
    },0);
    return total;
  }

  // ----------- SUBTABS PAGE 5 + FREE PICKS UI ----------------
  // ... (no changes needed for page5_render, page5_wire, etc., so omitted for brevity)
  // --- Page 1, 2, 3, 4 unchanged ---
  // ... (no changes needed for page1_render, page1_wire, page2_render, page2_wire, page3_render, page3_wire, page4_render, page4_wire, so omitted for brevity)

  // --- Summary & Submission ---
  function page6_render(){
    var S = M.stats || {phys:1,dex:1,mental:1,perc:1};
    var race = lc(M.race||'');
    var splicedBonus = (race === "spliced") ? 1 : 0;
    var hp = (S.phys||1)*5;
    var base = pointsTotal();
    var spent = pointsSpentTotal();
    var remain = base - spent;
    function spentFor(arr){
      return Array.from(arr).map(function(id){
        if (id === M.freeMagicWeave || id === M.synthralFreeWeave) return 0;
        var found =
          commonPowers.find(x=>x.id===id) ||
          perks.find(x=>x.id===id) ||
          archPowers.find(x=>x.id===id) ||
          cybernetics.find(x=>x.id===id) ||
          magicSchools.find(x=>x.id===id);
        return found && typeof found.cost !== "undefined" ? found.cost : 1;
      }).reduce(function(a,b){return a+b;},0);
    }
    // --- fields for Discord ---
    var flawsSummary = Array.from(M.flaws).map(fid=>flaws.find(f=>f.id===fid)?.name).filter(Boolean);
    var powersSummary = Array.from(M.picks).map(pid =>
      commonPowers.find(p=>p.id===pid)?.name ||
      perks.find(p=>p.id===pid)?.name ||
      archPowers.find(p=>p.id===pid)?.name ||
      cybernetics.find(p=>p.id===pid)?.name
    ).filter(Boolean);
    var magicSchoolsSummary = Array.from(M.magicSchools).map(id => magicSchools.find(s=>s.id===id)?.name).filter(Boolean);
    var freeMagicSchoolName = M.freeMagicSchool ? (magicSchools.find(s=>s.id===M.freeMagicSchool)?.name || '') : '';
    var freeMagicWeaveName = M.freeMagicWeave ? (magicSchools.find(w=>w.id===M.freeMagicWeave)?.name || '') : '';
    var synthralFreeWeaveName = M.synthralFreeWeave ? (magicSchools.find(w=>w.id===M.synthralFreeWeave)?.name || '') : '';
    // --- Points breakdown ---
    var flawPts = Array.from(M.flaws).map(fid=>{
      var f=flaws.find(x=>x.id===fid);
      return f?f.cost:0;
    }).reduce((a,b)=>a+b,0);
    var statPts =
      (S.phys-1-splicedBonus>0?S.phys-1-splicedBonus:0) +
      (S.dex-1-splicedBonus>0?S.dex-1-splicedBonus:0) +
      (S.mental-1>0?S.mental-1:0) +
      (S.perc-1>0?S.perc-1:0);
    var cyberSlotPts = (M.cyberSlots||0)*1;
    var powersPts = spentFor(M.picks);
    var magicPts = spentFor(M.magicSchools);
    // --- UI ---
    return (
      '<div class="ark-submit-msg" style="background:#f3f7ee;padding:14px 16px;border-radius:8px;border:1px solid #ccd;">' +
      '<b>When you are happy with your character, click SUBMIT CHARACTER to submit your character sheet to the admin team.</b> ' +
      'Copy your character sheet for your records and paste it in your Second Life picks. Due to Second Life text restrictions, you may need to remove your character background or fields not applicable to your character.' +
      '</div>' +
      '<h2>Summary</h2>' +
      '<div class="group">' +
        '<div><b>Character Name:</b> '+esc(M.identity.name||'-')+'</div>' +
        '<div><b>Second Life Name:</b> '+esc(M.identity.sl||'-')+'</div>' +
        '<div><b>Alias / Callsign:</b> '+esc(M.identity.alias||'-')+'</div>' +
        '<div><b>Faction / Allegiance:</b> '+esc(M.identity.faction||'-')+'</div>' +
        '<div><b>Concept / Role:</b> '+esc(M.identity.concept||'-')+'</div>' +
        '<div><b>Job:</b> '+esc(M.identity.job||'-')+'</div>' +
        '<div><b>Race:</b> '+esc(M.race||'-')+' <span class="muted">/ '+esc(M.arch||'—')+'</span></div>' +
        '<div><b>Stats:</b> Phys '+S.phys+' (HP '+hp+'), Dex '+S.dex+', Mental '+S.mental+', Perc '+S.perc+' <span class="muted">(Points spent: '+statPts+')</span></div>' +
        '<div><b>Flaws:</b> '+(flawsSummary.length?esc(flawsSummary.join(', ')):'None')+' <span class="muted">(Points gained: '+flawPts+')</span></div>' +
        '<div><b>Common Powers/Perks/Arch/Cyber:</b> '+(powersSummary.length?esc(powersSummary.join(', ')):'None')+' <span class="muted">(Points spent: '+powersPts+')</span></div>' +
        '<div><b>Cybernetic Slots:</b> '+(M.cyberSlots||0)+' <span class="muted">(Points spent: '+cyberSlotPts+')</span></div>' +
        '<div><b>Magic Schools:</b> '+(magicSchoolsSummary.length?esc(magicSchoolsSummary.join(', ')):'None')+' <span class="muted">(Points spent: '+magicPts+')</span></div>' +
        (freeMagicSchoolName ? '<div><b>Free Magic School:</b> '+esc(freeMagicSchoolName)+'</div>' : '') +
        (freeMagicWeaveName ? '<div><b>Free Magic Weave:</b> '+esc(freeMagicWeaveName)+'</div>' : '') +
        (synthralFreeWeaveName ? '<div><b>Synthral Free Weave:</b> '+esc(synthralFreeWeaveName)+'</div>' : '') +
        '<div style="white-space:pre-wrap"><b>Background:</b> '+esc(M.identity.background||'-')+'</div>' +
        '<div class="totals">Power Points: '+base+' • Spent '+spent+' • Remaining '+remain+'</div>' +
      '</div>' +
      '<button id="submitBtn" type="button" class="ark-submit" style="margin-top:18px;font-size:1.2em;padding:10px 28px;background:#3c6;border-radius:8px;color:#fff;border:none;">SUBMIT CHARACTER</button>'
    );
  }

  // --- Discord: Only First Two Lines ---
  function discordifyCharacter(data) {
    return (
      `**Arkana Character Submission**\n` +
      `**Character Name:** ${data.name}\n` +
      `**Second Life Name:** ${data.sl}\n`
    );
  }

  // --- Full Summary for Google Drive (Plain Text) ---
  function discordFullSummary(data) {
    let msg =
      `Arkana Character Submission\n` +
      `Character Name: ${data.name}\n` +
      `Second Life Name: ${data.sl}\n` +
      `Alias / Callsign: ${data.alias}\n` +
      `Faction / Allegiance: ${data.faction}\n` +
      `Concept / Role: ${data.concept}\n` +
      `Job: ${data.job}\n` +
      `Race / Archetype: ${data.race} / ${data.arch}\n` +
      `Stats: Phys ${data.stats.phys} (HP ${data.hp}), Dex ${data.stats.dex}, Mental ${data.stats.mental}, Perc ${data.stats.perc} (Points spent: ${data.statPts})\n` +
      `Flaws: ${(data.flaws.length ? data.flaws.join(', ') : 'None')} (Points gained: ${data.flawPts})\n` +
      `Common Powers/Perks/Arch/Cyber: ${(data.powers.length ? data.powers.join(', ') : 'None')} (Points spent: ${data.powersPts})\n` +
      `Cybernetic Slots: ${data.cyberSlots} (Points spent: ${data.cyberSlotPts})\n` +
      `Magic Schools: ${(data.magicSchools.length ? data.magicSchools.join(', ') : 'None')} (Points spent: ${data.magicPts})\n` +
      (data.freeMagicSchool ? `Free Magic School: ${data.freeMagicSchool}\n` : '') +
      (data.freeMagicWeave ? `Free Magic Weave: ${data.freeMagicWeave}\n` : '') +
      (data.synthralFreeWeave ? `Synthral Free Weave: ${data.synthralFreeWeave}\n` : '') +
      `Background: ${data.background}\n` +
      `Total Power Points: ${data.base}, Spent: ${data.spent}, Remaining: ${data.remain}\n`;
    return msg;
  }

  // --- Send Summary to Google Drive ---
  async function sendSummaryToGoogleDrive(summaryText) {
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: summaryText })
      });
      return true;
    } catch (e) {
      console.error("Google Drive submission failed", e);
      return false;
    }
  }

  function getCharacterDataForDiscord() {
    var S = M.stats || {phys:1,dex:1,mental:1,perc:1};
    var race = lc(M.race||'');
    var splicedBonus = (race === "spliced") ? 1 : 0;
    var hp = (S.phys||1)*5;
    var base = pointsTotal();
    var spent = pointsSpentTotal();
    var remain = base - spent;
    var flawsSummary = Array.from(M.flaws).map(fid=>flaws.find(f=>f.id===fid)?.name).filter(Boolean);
    var flawPts = Array.from(M.flaws).map(fid=>{
      var f=flaws.find(x=>x.id===fid);
      return f?f.cost:0;
    }).reduce((a,b)=>a+b,0);
    var statPts =
      (S.phys-1-splicedBonus>0?S.phys-1-splicedBonus:0) +
      (S.dex-1-splicedBonus>0?S.dex-1-splicedBonus:0) +
      (S.mental-1>0?S.mental-1:0) +
      (S.perc-1>0?S.perc-1:0);
    var powersSummary = Array.from(M.picks).map(pid =>
      commonPowers.find(p=>p.id===pid)?.name ||
      perks.find(p=>p.id===pid)?.name ||
      archPowers.find(p=>p.id===pid)?.name ||
      cybernetics.find(p=>p.id===pid)?.name
    ).filter(Boolean);
    var powersPts = Array.from(M.picks).map(function(id){
      if (id === M.freeMagicWeave || id === M.synthralFreeWeave) return 0;
      var found =
        commonPowers.find(x=>x.id===id) ||
        perks.find(x=>x.id===id) ||
        archPowers.find(x=>x.id===id) ||
        cybernetics.find(x=>x.id===id);
      return found && typeof found.cost !== "undefined" ? found.cost : 1;
    }).reduce(function(a,b){return a+b;},0);
    var cyberSlotPts = (M.cyberSlots||0)*1;
    var magicSchoolsSummary = Array.from(M.magicSchools).map(id => magicSchools.find(s=>s.id===id)?.name).filter(Boolean);
    var magicPts = Array.from(M.magicSchools).map(function(id){
      if (id === M.freeMagicSchool || id === getTechnomancySchoolId()) return 0;
      var found = magicSchools.find(x=>x.id===id);
      return found && typeof found.cost !== "undefined" ? found.cost : 1;
    }).reduce(function(a,b){return a+b;},0);
    var freeMagicSchoolName = M.freeMagicSchool ? (magicSchools.find(s=>s.id===M.freeMagicSchool)?.name || '') : '';
    var freeMagicWeaveName = M.freeMagicWeave ? (magicSchools.find(w=>w.id===M.freeMagicWeave)?.name || '') : '';
    var synthralFreeWeaveName = M.synthralFreeWeave ? (magicSchools.find(w=>w.id===M.synthralFreeWeave)?.name || '') : '';
    return {
      name: M.identity.name || '',
      sl: M.identity.sl || '',
      alias: M.identity.alias || '',
      faction: M.identity.faction || '',
      concept: M.identity.concept || '',
      job: M.identity.job || '',
      background: M.identity.background || '',
      race: M.race,
      arch: M.arch,
      stats: S,
      hp, base, spent, remain,
      statPts, flaws: flawsSummary, flawPts,
      powers: powersSummary, powersPts,
      cyberSlots: M.cyberSlots||0, cyberSlotPts,
      magicSchools: magicSchoolsSummary, magicPts,
      freeMagicSchool: freeMagicSchoolName,
      freeMagicWeave: freeMagicWeaveName,
      synthralFreeWeave: synthralFreeWeaveName
    };
  }

  // --- Submission Button Wiring ---
  function wireSubmitButton() {
    var btn = document.getElementById('submitBtn');
    if (btn) {
      btn.onclick = async function(){
        btn.disabled = true;
        btn.textContent = "Submitting...";
        const data = getCharacterDataForDiscord();
        const discordContent = discordifyCharacter(data);
        const fullSummary = discordFullSummary(data);

        // Send to Discord (first two lines)
        let discordOk = false;
        try {
          await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: discordContent })
          });
          discordOk = true;
        } catch (e) {
          btn.textContent = "Discord Error!";
          alert("Discord submission failed: " + e.message);
        }

        // Send to Google Drive
        let driveOk = false;
        try {
          driveOk = await sendSummaryToGoogleDrive(fullSummary);
          if (!driveOk) throw new Error("Google Drive submission failed");
        } catch (e) {
          btn.textContent = "Google Drive Error!";
          alert("Google Drive submission failed: " + e.message);
        }

        if (discordOk && driveOk) {
          btn.textContent = "Submitted!";
        }
        setTimeout(() => { btn.disabled = false; btn.textContent = "SUBMIT CHARACTER"; }, 5000);
      };
    }
  }
  function page6_wire(){
    wireSubmitButton();
  }
  // --- Main render & wiring ---
  function render(){
    var steps = ['Identity','Race & Archetype','Stats','Optional Flaws','Powers/Perks/Cybernetics/Magic','Summary'];
    root.innerHTML =
      '<h2>Arkana Character Creator</h2>' +
      '<div class="ark-steps" id="steps">' +
      steps.map(function(t,i){
        var current = M.page === i+1 ? ' current' : '';
        return '<button type="button" class="ark-step'+current+'" data-step="'+(i+1)+'">'+(i+1)+'</button>';
      }).join('') +
      '</div>' +
      '<div id="page"></div>' +
      '<div class="ark-nav">' +
        '<button id="backBtn" type="button">← Back</button>' +
        '<button id="nextBtn" type="button">Next →</button>' +
      '</div>' +
      '<div class="diag" id="diag">page '+M.page+'</div>';
    document.getElementById('backBtn').onclick = function(){ M.page=Math.max(1,M.page-1); saveModel(); render(); };
    document.getElementById('nextBtn').onclick = function(){ M.page=Math.min(6,M.page+1); saveModel(); render(); };
    Array.prototype.forEach.call(document.querySelectorAll('.ark-step'), function(btn){
      btn.onclick = function(){
        var step = parseInt(btn.getAttribute('data-step'), 10);
        if (step !== M.page) {
          M.page = step;
          saveModel();
          render();
        }
      };
    });
    var host = document.getElementById('page');
    if (M.page===1){ host.innerHTML = page1_render(); page1_wire(); }
    if (M.page===2){ host.innerHTML = page2_render(); page2_wire(); }
    if (M.page===3){ host.innerHTML = page3_render(); page3_wire(); }
    if (M.page===4){ host.innerHTML = page4_render(); page4_wire(); }
    if (M.page===5){ host.innerHTML = '<div id="page5">'+page5_render()+'</div>'; page5_wire(); }
    if (M.page===6){ host.innerHTML = page6_render(); page6_wire(); }
  }
  try {
    await loadAllData();
    render();
  } catch(e) {
    root.innerHTML = '<div class="note">Error loading public Arkana data: '+esc(e.message)+'</div>';
  }
})();
};

/* Add to your CSS for subtabs and step styling:
.ark-subtabs { margin: 12px 0 10px 0; display: flex; gap: 8px; }
.ark-subtab-btn { background: #eee; border: 1px solid #bbb; border-radius: 6px 6px 0 0; padding: 6px 16px; cursor: pointer; font-weight: bold; }
.ark-subtab-btn.active { background: #fff; border-bottom: 1px solid #fff; color: #222; }

.ark-steps { display: flex; gap: 8px; margin-bottom: 14px; }
.ark-step { border: 1px solid #bbb; border-radius: 50%; background: #eee; cursor: pointer; width: 32px; height: 32px; font-size: 1em; font-weight: bold; display: flex; align-items: center; justify-content: center; }
.ark-step.current { background: #fff; border: 2px solid #0077ff; color: #0077ff; }

.ark-free-pick { background: #eef; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; border:1px solid #bbe; }
.ark-submit-msg { margin-bottom: 18px; }
.ark-submit { font-size:1.2em; padding:10px 28px; background:#3c6; border-radius:8px; color:#fff; border:none; cursor: pointer;}
*/
