// Arkana Character Creator with Discord and Google Drive Submission (GET method, no CORS issues)
window.onload = function() {
(async function(){
  var root = document.getElementById('ark-wizard');
  var flaws = [], commonPowers = [], perks = [], archPowers = [], cybernetics = [], magicSchools = [];
  var DISCORD_WEBHOOK_URL = "YOUR_DISCORD_WEBHOOK_URL_HERE"; // <-- replace with your Discord webhook
  var GOOGLE_DRIVE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzqopWLaad44vd6kOH7ksfuGTLh4L63p2IUjrgG37zoCgbnf5Uhf90S0UFy4pQJUZQjhA/exec";
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
      if (!m.stats || typeof m.stats !== "object") {
        m.stats = {phys:1,dex:1,mental:1,perc:1,pool:6};
      }
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
    ['phys','dex','mental','perc'].forEach(function(k){
      if(typeof S[k]!=='number' || S[k]<1) S[k]=1;
      S[k]=Math.min(5,Math.max(1,S[k]));
    });
    var race = lc(M.race||'');
    var physBase = 1, dexBase = 1;
    var splicedBonus = (race === "spliced") ? 1 : 0;
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
  function pointsSpentTotal() {
    var S = M.stats || {phys:1,dex:1,mental:1,perc:1};
    var race = lc(M.race||'');
    var splicedBonus = (race === "spliced") ? 1 : 0;
    var statSpent =
      (S.phys-1-splicedBonus>0?S.phys-1-splicedBonus:0) +
      (S.dex-1-splicedBonus>0?S.dex-1-splicedBonus:0) +
      (S.mental-1>0?S.mental-1:0) +
      (S.perc-1>0?S.perc-1:0);
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
    var spentMagic = Array.from(M.magicSchools).map(function(id){
      if (id === M.freeMagicSchool || id === getTechnomancySchoolId()) return 0;
      var found = magicSchools.find(function(x){return x.id===id;});
      if (found && typeof found.cost !== "undefined") return found.cost;
      if (found) return 1;
      return 0;
    }).reduce(function(a,b){return a+b;},0);
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
  // ... (page5_render, page5_wire, page1_render, page1_wire, page2_render, page2_wire, page3_render, page3_wire, page4_render, page4_wire unchanged from previous version) ...
  // For brevity, these are unchanged and previously discussed.

  // --- Discord webhook payload: only Character Name and Second Life Name
  function discordifyCharacterShort(data) {
    return `Character Name: ${data.name}\nSecond Life Name: ${data.sl}`;
  }
  // --- Full character sheet as text for Google Drive
  function characterSheetText(data) {
    return (
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
      `Total Power Points: ${data.base}, Spent: ${data.spent}, Remaining: ${data.remain}\n`
    );
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
  function showSubmissionSuccess() {
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0'; modal.style.top = '0'; modal.style.width = '100vw'; modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.4)';
    modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    var box = document.createElement('div');
    box.style.background = '#fff';
    box.style.borderRadius = '12px';
    box.style.padding = '32px';
    box.style.boxShadow = '0 2px 20px rgba(0,0,0,0.25)';
    box.style.textAlign = 'center';
    box.style.maxWidth = '400px';

    box.innerHTML =
      "<h3>Congratulations!</h3>" +
      "<div style='margin: 12px 0 20px 0;'>Your character sheet has been successfully submitted.<br>" +
      "You may close this window to return to your character sheet.<br>Remember to save a copy for your records.</div>" +
      "<button style='font-size:1.1em;padding:8px 22px;background:#3c6;color:#fff;border:none;border-radius:8px;cursor:pointer;' id='closeModalBtn'>Close</button>";

    modal.appendChild(box);
    document.body.appendChild(modal);

    document.getElementById('closeModalBtn').onclick = function(){
      document.body.removeChild(modal);
    };
  }

  // --- Google Drive GET submission function ---
  function sendToGoogleDrive(name, sl, fullSheet) {
    var baseUrl = GOOGLE_DRIVE_WEBHOOK_URL;
    var url =
      baseUrl +
      "?name=" + encodeURIComponent(name) +
      "&sl=" + encodeURIComponent(sl) +
      "&fullSheet=" + encodeURIComponent(fullSheet);

    fetch(url, { method: "GET" })
      .then(r => r.text())
      .then(txt => {
        console.log("Google Drive response:", txt);
      })
      .catch(e => {
        alert("Google Drive submission failed: " + e.message);
      });
  }

  // --- Wire up submit button ---
  function wireSubmitButton() {
    var btn = document.getElementById('submitBtn');
    if (btn) {
      btn.onclick = async function(){
        btn.disabled = true;
        btn.textContent = "Submitting...";
        const data = getCharacterDataForDiscord();
        // Discord webhook: short version
        try {
          await fetch(DISCORD_WEBHOOK_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ content: discordifyCharacterShort(data) })
          });
        } catch (e) {
          btn.textContent = "Error!";
          alert("Discord submission failed: "+e.message);
          btn.disabled = false;
          btn.textContent = "SUBMIT CHARACTER";
          return;
        }
        // Google Drive webhook: GET full sheet
        sendToGoogleDrive(data.name, data.sl, characterSheetText(data));
        btn.textContent = "Submitted!";
        showSubmissionSuccess();
        setTimeout(()=>{ btn.disabled=false; btn.textContent="SUBMIT CHARACTER"; }, 5000);
      };
    }
  }
  function page6_wire(){
    wireSubmitButton();
  }
  // ... (render function and rest of page functions unchanged) ...
  // Use previous versions for these, as the core logic is unchanged.

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
.ark-subtab-btn.active { background: #fff; border-bottom: 1px solid #fff; color:#222; }
.ark-steps { display: flex; gap: 8px; margin-bottom: 14px; }
.ark-step { border: 1px solid #bbb; border-radius: 50%; background: #eee; cursor: pointer; width: 32px; height: 32px; font-size: 1em; font-weight: bold; display: flex; align-items: center; justify-content: center; }
.ark-step.current { background: #fff; border: 2px solid #0077ff; color: #0077ff; }
.ark-free-pick { background: #eef; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; border:1px solid #bbe; }
.ark-submit-msg { margin-bottom: 18px; }
.ark-submit { font-size:1.2em; padding:10px 28px; background:#3c6; border-radius:8px; color:#fff; border:none; cursor: pointer;}
*/
