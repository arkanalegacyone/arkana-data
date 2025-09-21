window.onload = function() {
(async function(){
  var root = document.getElementById('ark-wizard');
  var flaws = [], commonPowers = [], perks = [], archPowers = [], cybernetics = [], magicSchools = [];
  var M = loadModel();

  function esc(s){ return String(s||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function lc(s){ return String(s||'').toLowerCase(); }
  function loadModel(){
    var raw=window.localStorage ? localStorage.getItem('arkModel') : null;
    var base = { page:1, identity:{}, race:'', arch:'', stats:{phys:0,dex:0,mental:0,perc:0,pool:10}, cyberSlots:0, flaws:[], picks:[], magicSchools:[], page5tab: 'common' };
    try{
      var m = raw ? JSON.parse(raw) : base;
      m.flaws = new Set(m.flaws||[]);
      m.picks = new Set(m.picks||[]);
      m.magicSchools = new Set(m.magicSchools||[]);
      m.cyberSlots = m.cyberSlots || 0;
      m.page5tab = m.page5tab || 'common';
      return Object.assign(base,m);
    }catch(_){
      return { page:1, identity:{}, race:'', arch:'', stats:{phys:0,dex:0,mental:0,perc:0,pool:10}, cyberSlots:0, flaws:new Set(), picks:new Set(), magicSchools:new Set(), page5tab: 'common' };
    }
  }
  function saveModel(){
    try{
      if(window.localStorage){
        var dump = {page:M.page, identity:M.identity, race:M.race, arch:M.arch, stats:M.stats, cyberSlots:M.cyberSlots, flaws:Array.from(M.flaws), picks:Array.from(M.picks), magicSchools:Array.from(M.magicSchools), page5tab: M.page5tab};
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
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/magic_schools7.json?nocache=1"
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
  function statMod(v){ return v===0?-3 : v===1?-2 : v===2?0 : v===3?2 : v===4?4 : v===5?6:0; }
  function normalizeStats(){
    var S = M.stats = M.stats || {phys:0,dex:0,mental:0,perc:0};
    ['phys','dex','mental','perc'].forEach(function(k){ if(typeof S[k]!=='number') S[k]=0; S[k]=Math.min(5,Math.max(0,S[k])); });
    var spent = (S.phys)+(S.dex)+(S.mental)+(S.perc);
    S.pool = Math.max(0, 10 - spent);
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

  function magicSectionHtml(section, arr) {
    var schoolEntry = arr[0];
    var schoolSelected = M.magicSchools.has(schoolEntry.id);
    var html = '<h4 style="margin-top:14px;">'+esc(section)+'</h4><div class="list">';
    arr.forEach(function(item, idx){
      var sel = M.magicSchools.has(item.id) ? ' checked' : '';
      var costVal = (typeof item.cost !== "undefined") ? item.cost : 1;
      var disabled = '';
      if (idx === 0) {
        disabled = (sel ? '' : (willOverspend(costVal)?' disabled':''));
      } else {
        if (!schoolSelected) disabled = ' disabled';
        else disabled = (sel ? '' : (willOverspend(costVal)?' disabled':''));
      }
      var cost = (typeof item.cost !== "undefined") ? '<span class="pill">'+item.cost+' pts</span>' : '';
      html += '<label class="item"><input type="checkbox" data-id="'+item.id+'" data-magic="1"'+sel+disabled+'>'+esc(item.name)+': '+esc(item.desc)+' '+cost+'</label>';
    });
    html += '</div>';
    return html;
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

  function pointsSpentTotal() {
    var allPicks = Array.from(M.picks);
    var spentPicks = allPicks.map(function(pid){
      var arrs = [commonPowers, perks, archPowers, cybernetics];
      for(var i=0;i<arrs.length;i++){
        var found=arrs[i].find(function(x){return x.id===pid;});
        if (found && typeof found.cost !== "undefined") return found.cost;
        if (found) return 1;
      }
      return 0;
    }).reduce(function(a,b){return a+b;},0);

    var spentMagic = Array.from(M.magicSchools).map(function(id){
      var found = magicSchools.find(function(x){return x.id===id;});
      if (found && typeof found.cost !== "undefined") return found.cost;
      if (found) return 1;
      return 0;
    }).reduce(function(a,b){return a+b;},0);

    var cyberSlotCost = (M.cyberSlots || 0) * 2;

    return spentPicks + spentMagic + cyberSlotCost;
  }

  // ----------- SUBTABS PAGE 5 ----------------
  function page5_render(){
    var race = M.race || "";
    var arch = M.arch || "";
    var total = pointsTotal();
    var spent = pointsSpentTotal();
    var remain = total - spent;
    var canMagic = canUseMagic(race, arch);

    var cyberSlots = M.cyberSlots || 0;
    var groupedMods = groupCyberneticsBySection(cyberneticsAll());
    var groupedMagicSchools = magicSchoolsAllGrouped(race, arch);

    function cyberSectionHtml(section, arr) {
      var html = '<h4 style="margin-top:14px;">'+esc(section)+'</h4><div class="list">';
      var modsSelected = numCyberModsSelected();
      arr.forEach(function(item){
        var sel = M.picks.has(item.id) ? ' checked' : '';
        var costVal = (typeof item.cost !== "undefined") ? item.cost : 1;
        var disabled = '';
        if (cyberSlots < 1) disabled = ' disabled';
        else if (!sel && modsSelected >= cyberSlots) disabled = ' disabled';
        else if (!sel && willOverspend(costVal)) disabled = ' disabled';
        var cost = (typeof item.cost !== "undefined") ? '<span class="pill">'+item.cost+' pts</span>' : '';
        html += '<label class="item"><input type="checkbox" data-id="'+item.id+'" data-cyber="1"'+sel+disabled+'>'+esc(item.name)+': '+esc(item.desc)+' '+cost+'</label>';
      });
      html += '</div>';
      return html;
    }

    var sectionHtmls = {
      common: renderList("Common Powers", commonPowersForRace(race), M.picks),
      perks: renderList("Perks", perksForRace(race, arch), M.picks),
      archetype: renderList("Archetype Powers", archPowersForRaceArch(race, arch), M.picks),
      cyber: (
        '<div class="cybernetic-section" style="margin-bottom:12px;">' +
        '<div class="muted" style="margin-bottom:8px;font-size:1em;">To purchase <b>Cybernetic Augmentations & Hacking</b> items, you must first purchase a slot.</div>' +
        '<label class="ark-input" style="font-weight:600;width:auto;display:inline-block;margin-right:12px;">Cybernetic Slots</label>' +
        '<input type="number" min="0" max="10" class="cybernetic-input" id="cyberneticSlotInput" value="'+cyberSlots+'"'+((remain<2 && cyberSlots < 10)?' disabled':'')+'">' +
        '<span class="cybernetic-cost" style="margin-left:10px;">Cost: '+(cyberSlots*2)+' points</span>' +
        ((remain<2 && cyberSlots < 10) ? '<span class="muted" style="margin-left:10px;">No points left for more slots</span>':'') +
        '</div>' +
        Object.keys(groupedMods).map(section=>cyberSectionHtml(section, groupedMods[section])).join('')
      ),
      magic: (
        canMagic
          ? Object.keys(groupedMagicSchools).length
              ? Object.keys(groupedMagicSchools).map(section=>magicSectionHtml(section, groupedMagicSchools[section])).join('')
              : '<div class="muted">No magic schools available for this archetype.</div>'
          : '<h3>Magic Schools & Weaves</h3><div class="muted">Not available for '+esc(race)+(arch?' ('+esc(arch)+')':'')+'.</div>'
      )
    };

    var tabs = [
      { id: 'common', label: 'Common Powers' },
      { id: 'perks', label: 'Perks' },
      { id: 'archetype', label: 'Archetype Powers' },
      { id: 'cyber', label: 'Cybernetics & Hacking' },
      { id: 'magic', label: 'Magic Schools & Weaves' }
    ];

    var tabsHtml = `
      <div class="ark-subtabs">
        ${tabs.map(tab =>
          `<button type="button" class="ark-subtab-btn${M.page5tab===tab.id?' active':''}" data-tab="${tab.id}">${esc(tab.label)}</button>`
        ).join('')}
      </div>
    `;

    var html =
      '<h2>Powers, Perks, Augmentations, Magic, and Hacking</h2>' +
      '<div class="totals">Points: <b>'+total+'</b> • Spent <b>'+spent+'</b> • Remaining <b>'+remain+'</b></div>' +
      '<div class="note">Select any combination of powers, perks, archetype powers, cybernetics (requires slot), magic school weaves, and cybernetic slots. You cannot spend more points than you have.</div>' +
      tabsHtml +
      `<div class="ark-subtab-content" id="ark-subtab-content">${sectionHtmls[M.page5tab]||''}</div>`;

    return html;
  }

  function page5_wire(){
    // Wire subtabs
    Array.prototype.forEach.call(document.querySelectorAll('.ark-subtab-btn'), function(btn){
      btn.onclick = function(){
        var tab = btn.getAttribute('data-tab');
        M.page5tab = tab;
        saveModel();
        render();
      };
    });

    var cyberSlotInput = document.getElementById('cyberneticSlotInput');
    if (cyberSlotInput) {
      cyberSlotInput.oninput = function(e){
        var val = Math.max(0, Math.min(10, parseInt(e.target.value)||0));
        var total = pointsTotal();
        var spent = pointsSpentTotal();
        if (val < 0) val = 0;
        if (val > 10) val = 10;
        var cyberMods = Array.from(M.picks).filter(pid => cybernetics.find(c => c.id === pid));
        if (val === 0) {
          cyberMods.forEach(pid=>M.picks.delete(pid));
        } else if (cyberMods.length > val) {
          cyberMods.slice(val).forEach(pid=>M.picks.delete(pid));
        }
        M.cyberSlots = val;
        saveModel();
        render();
      };
    }
    Array.prototype.forEach.call(document.querySelectorAll('#page5 input[type="checkbox"][data-id]'),function(ch){
      if(!ch.dataset.cyber && !ch.dataset.magic){
        ch.onchange = function(){
          var id = ch.dataset.id;
          var arrs = [commonPowers, perks, archPowers];
          var found;
          for(var i=0;i<arrs.length;i++){
            found = arrs[i].find(function(x){return x.id===id;});
            if(found) break;
          }
          var costVal = (found && typeof found.cost !== "undefined") ? found.cost : 1;
          var total = pointsTotal();
          var spent = pointsSpentTotal();
          var remain = total - spent;
          if (ch.checked && remain < costVal) {
            ch.checked = false;
            return;
          }
          if (ch.checked) M.picks.add(id);
          else M.picks.delete(id);
          saveModel();
          render();
        };
      }
      if(ch.dataset.magic){
        ch.onchange = function(){
          var id = ch.dataset.id;
          var school = magicSchools.find(function(x){return x.id===id;});
          var costVal = (school && typeof school.cost !== "undefined") ? school.cost : 1;
          var section = school.section;
          var grouped = magicSchoolsAllGrouped(M.race, M.arch);
          var arr = grouped[section] || [];
          var isSchoolEntry = arr.length && arr[0].id === id;
          var total = pointsTotal();
          var spent = pointsSpentTotal();
          var remain = total - spent;
          if (!isSchoolEntry && !M.magicSchools.has(arr[0].id)) {
            ch.checked = false;
            return;
          }
          if (ch.checked && remain < costVal) {
            ch.checked = false;
            return;
          }
          if (ch.checked) {
            M.magicSchools.add(id);
          } else {
            M.magicSchools.delete(id);
            if (isSchoolEntry) {
              arr.slice(1).forEach(item => M.magicSchools.delete(item.id));
            }
          }
          saveModel();
          render();
        };
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('#page5 input[data-cyber="1"]'), function(ch){
      ch.onchange = function(){
        var id = ch.dataset.id;
        var found = cybernetics.find(function(x){return x.id===id;});
        var costVal = (found && typeof found.cost !== "undefined") ? found.cost : 1;
        var total = pointsTotal();
        var spent = pointsSpentTotal();
        var remain = total - spent;
        var cyberSlots = M.cyberSlots || 0;
        var numModsSelected = Array.from(M.picks).filter(pid => cybernetics.find(c => c.id === pid)).length;
        if (cyberSlots < 1 || (!ch.checked && numModsSelected >= cyberSlots) || (ch.checked && remain < costVal)) {
          ch.checked = false;
          return;
        }
        if (ch.checked) M.picks.add(id);
        else M.picks.delete(id);
        enforceCyberModLimit();
        saveModel();
        render();
      };
    });
    enforceCyberModLimit();
  }
  // --------- END SUBTABS PAGE 5 -----------

  function page1_render(){
    var I = M.identity || (M.identity={});
    return (
      '<h2>Identity</h2>' +
      '<div class="ark-row">' +
        '<div><label>Character Name</label><input class="ark-input" id="i_name" value="'+esc(I.name||'')+'"></div>' +
        '<div><label>Second Life Name</label><input class="ark-input" id="i_sl" value="'+esc(I.sl||'')+'"></div>' +
        '<div><label>Alias / Callsign <span class="muted">(optional)</span></label><input class="ark-input" id="i_alias" value="'+esc(I.alias||'')+'"></div>' +
        '<div><label>Faction / Allegiance <span class="muted">(optional)</span></label><input class="ark-input" id="i_faction" value="'+esc(I.faction||'')+'"></div>' +
        '<div><label>Concept / Role</label><input class="ark-input" id="i_concept" value="'+esc(I.concept||'')+'"></div>' +
        '<div><label>Job</label><input class="ark-input" id="i_job" value="'+esc(I.job||'')+'"></div>' +
        '<div style="grid-column:1/-1"><label>Background</label><textarea class="ark-input" rows="5" id="i_bg">'+esc(I.background||'')+'</textarea></div>' +
      '</div>'
    );
  }
  function page1_wire(){
    var I = M.identity;
    [['i_name','name'],['i_sl','sl'],['i_alias','alias'],['i_faction','faction'],['i_concept','concept'],['i_job','job'],['i_bg','background']]
      .forEach(function(pair){ var id=pair[0],key=pair[1]; var n=document.getElementById(id); if(n) n.oninput=function(e){ I[key]=e.target.value; saveModel(); }; });
  }
  function page2_render(){
    var races = [
      { name: "Human", arches: ["Human (no powers)","Arcanist","Synthral","Psion"] },
      { name: "Veilborn", arches: ["Echoes","Veils","Blossoms","Glass"] },
      { name: "Spliced", arches: ["Predators","Avian","Aquatic","Reptilian","Insectoid","Chimeric"] },
      { name: "Strigoi", arches: ["Life","Death","Warrior","Ruler"] },
      { name: "Gaki", arches: ["Yin","Hun","Yang","P’o","Chudo"] }
    ];
    var race = M.race || '';
    var arch = M.arch || '';
    var current = races.find(function(r){return r.name === race;});
    var arches  = current ? current.arches : [];
    return (
      '<h2>Race & Archetype</h2>' +
      '<div>' +
        '<label>Race</label>' +
        '<select id="raceSel" class="ark-input">' +
          '<option value="">— choose —</option>' +
          races.map(function(r){return '<option value="'+esc(r.name)+'"'+(r.name===race?' selected':'')+'>'+esc(r.name)+'</option>';}).join('') +
        '</select>' +
      '</div>' +
      '<div style="margin-top:10px">' +
        '<label>Archetype / Path / Court <span class="muted">(optional)</span></label>' +
        '<select id="archSel" class="ark-input"'+(race?'':' disabled')+'>' +
          '<option value="">— optional —</option>' +
          arches.map(function(a){return '<option value="'+esc(a)+'"'+(a===arch?' selected':'')+'>'+esc(a)+'</option>';}).join('') +
        '</select>' +
      '</div>' +
      '<div class="note" style="margin-top:10px">Humans include <b>Human (no powers)</b>. Veilborn do not include Unaffiliated.</div>'
    );
  }
  function page2_wire(){
    var raceSel = document.getElementById('raceSel');
    var archSel = document.getElementById('archSel');
    if (!(M.flaws instanceof Set)) M.flaws = new Set(M.flaws||[]);
    if (!(M.picks instanceof Set)) M.picks = new Set(M.picks||[]);
    if (!(M.magicSchools instanceof Set)) M.magicSchools = new Set(M.magicSchools||[]);
    if (raceSel){
      var onRace = function(){
        var newRace = raceSel.value || '';
        M.race = newRace;
        M.arch = '';
        M.flaws.clear();
        M.picks.clear();
        M.magicSchools.clear();
        var races = [
          { name: "Human", arches: ["Human (no powers)","Arcanist","Synthral","Psion"] },
          { name: "Veilborn", arches: ["Echoes","Veils","Blossoms","Glass"] },
          { name: "Spliced", arches: ["Predators","Avian","Aquatic","Reptilian","Insectoid","Chimeric"] },
          { name: "Strigoi", arches: ["Life","Death","Warrior","Ruler"] },
          { name: "Gaki", arches: ["Yin","Hun","Yang","P’o","Chudo"] }
        ];
        var cur = races.find(function(r){return r.name === newRace;});
        var arches = cur ? cur.arches : [];
        if (archSel){
          archSel.disabled = !newRace;
          archSel.innerHTML = '<option value="">— optional —</option>' +
            arches.map(function(a){return '<option value="'+esc(a)+'">'+esc(a)+'</option>';}).join('');
        }
        saveModel();
        render();
      };
      raceSel.addEventListener('change', onRace, { passive:true });
      raceSel.addEventListener('input',  onRace, { passive:true });
    }
    if (archSel){
      archSel.addEventListener('change', function(){
        M.arch = archSel.value || '';
        saveModel();
        render();
      }, { passive:true });
    }
  }
  function page3_render(){
    var S = normalizeStats();
    function row(k,label){
      return (
        '<div class="stat" data-k="'+k+'">' +
          '<div style="width:210px">'+label+'</div>' +
          '<button type="button" class="minus">–</button>' +
          '<strong class="val">'+S[k]+'</strong>' +
          '<button type="button" class="plus">+</button>' +
          '<span class="stat-mod">mod: '+(statMod(M.stats[k])>=0?'+':'')+statMod(M.stats[k])+'</span>' +
        '</div>'
      );
    }
    return (
      '<h2>Stats (10 points total; each stat 0–5)</h2>' +
      '<div class="totals">Points Remaining: <b id="pts">'+S.pool+'</b></div>' +
      row('phys','Physical (HP = ×5)') +
      row('dex','Dexterity') +
      row('mental','Mental') +
      row('perc','Perception')
    );
  }
  function page3_wire(){
    normalizeStats();
    var ptsEl = document.getElementById('pts');
    function refreshRow(row){
      var k=row.dataset.k, val=row.querySelector('.val'), pill=row.querySelector('.stat-mod');
      var minus=row.querySelector('.minus'), plus=row.querySelector('.plus');
      val.textContent = M.stats[k];
      pill.textContent = 'mod: ' + (statMod(M.stats[k])>=0?'+':'') + statMod(M.stats[k]);
      minus.disabled = (M.stats[k]===0);
      plus.disabled  = (M.stats[k]===5 || M.stats.pool===0);
      ptsEl.textContent = M.stats.pool;
    }
    Array.prototype.forEach.call(document.querySelectorAll('.stat'),function(row){
      refreshRow(row);
      var k=row.dataset.k, minus=row.querySelector('.minus'), plus=row.querySelector('.plus');
      minus.onclick = function(e){ e.preventDefault(); if (M.stats[k]>0){ M.stats[k]--; normalizeStats(); refreshRow(row); saveModel(); } };
      plus.onclick  = function(e){ e.preventDefault(); normalizeStats(); if (M.stats[k]<5 && M.stats.pool>0){ M.stats[k]++; normalizeStats(); refreshRow(row); saveModel(); } };
    });
  }
  function page4_render() {
    var race = M.race || "Human";
    var arch = M.arch || "";
    var flawList = flawsForRace(race, arch);
    var total = 15;
    var flawPts = 0;
    flawList.forEach(function(flaw){ if (M.flaws.has(flaw.id)) flawPts += flaw.cost; });
    total += flawPts;
    var html =
      '<h2>Optional Flaws for '+esc(race)+(arch ? " ("+esc(arch)+")" : "")+'</h2>' +
      '<div class="note">Select flaws below to gain extra points for powers on the next page.</div>' +
      '<div class="totals">Flaw Points: <b>'+flawPts+'</b> &nbsp;|&nbsp; Starting Power Points: <b>'+total+'</b></div>' +
      '<div id="flawDisplay">';
    if (!flawList.length) {
      html += "<div>No flaws found for this race.</div>";
    } else {
      html += "<ul>";
      flawList.forEach(function(flaw){
        html += '<li>' +
          '<label class="item">' +
            '<input type="checkbox" data-id="'+flaw.id+'"'+(M.flaws.has(flaw.id)?' checked':'')+'>' +
            '<b>'+esc(flaw.name)+'</b>: '+esc(flaw.desc)+' [<span class="pill">'+flaw.cost+' pts</span>]' +
          '</label>' +
        '</li>';
      });
      html += "</ul>";
    }
    html += "</div>";
    return html;
  }
  function page4_wire(){
    Array.prototype.forEach.call(document.querySelectorAll('#flawDisplay input[type="checkbox"][data-id]'),function(ch){
      ch.onchange = function(){
        var id = ch.dataset.id;
        if (ch.checked) M.flaws.add(id);
        else M.flaws.delete(id);
        saveModel();
        render();
      };
    });
  }
  function page6_render(){
    var S = M.stats || {phys:0,dex:0,mental:0,perc:0};
    var hp = (S.phys||0)*5;
    var base = pointsTotal();
    var spent = pointsSpentTotal();
    var remain = base - spent;
    var magicPicks = Array.from(M.magicSchools).map(function(id){
      return esc((magicSchools.find(function(x){return x.id===id;})||{}).name||id);
    }).join(', ') || '—';
    var getNames = function(arr, ids){
      return Array.from(ids).map(function(id){ return esc((arr.find(function(x){return x.id===id;})||{}).name||id); }).filter(Boolean).join(', ');
    };
    return (
      '<h2>Summary</h2>' +
      '<div class="group">' +
        '<div><b>Name:</b> '+esc(M.identity.name||'-')+' <span class="muted">('+esc(M.identity.sl||'-')+')</span></div>' +
        '<div><b>Race:</b> '+esc(M.race||'-')+' <span class="muted">/ '+esc(M.arch||'—')+'</span></div>' +
        '<div><b>Stats:</b> Phys '+S.phys+' (HP '+hp+'), Dex '+S.dex+', Mental '+S.mental+', Perc '+S.perc+'</div>' +
        '<div><b>Flaws:</b> '+getNames(flaws, M.flaws)+'</div>' +
        '<div><b>Common Powers:</b> '+getNames(commonPowers, M.picks)+'</div>' +
        '<div><b>Perks:</b> '+getNames(perks, M.picks)+'</div>' +
        '<div><b>Archetype Powers:</b> '+getNames(archPowers, M.picks)+'</div>' +
        '<div><b>Cybernetic Slots:</b> '+(M.cyberSlots||0)+' (cost '+((M.cyberSlots||0)*2)+' pts)</div>' +
        '<div><b>Cybernetics:</b> '+getNames(cybernetics, M.picks)+'</div>' +
        '<div><b>Magic Schools & Weaves:</b> '+magicPicks+'</div>' +
        '<div class="totals">Power Points: '+base+' • Spent '+spent+' • Remaining '+remain+'</div>' +
      '</div>'
    );
  }
  function render(){
    var steps = ['Identity','Race & Archetype','Stats','Optional Flaws','Powers/Perks/Cybernetics/Magic','Summary'];
    root.innerHTML =
      '<h2>Arkana Character Creator</h2>' +
      '<div class="ark-steps" id="steps">' +
      steps.map(function(t,i){
        var current = M.page === i+1 ? ' current' : '';
        // Make step clickable
        return '<button type="button" class="ark-step'+current+'" data-step="'+(i+1)+'">'+(i+1)+'</button>';
      }).join('') +
      '</div>' +
      '<div id="page"></div>' + // <-- FIXED: this ensures document.getElementById('page') works below!
      '<div class="ark-nav">' +
        '<button id="backBtn" type="button">← Back</button>' +
        '<button id="nextBtn" type="button">Next →</button>' +
      '</div>' +
      '<div class="diag" id="diag">page '+M.page+'</div>';
    document.getElementById('backBtn').onclick = function(){ M.page=Math.max(1,M.page-1); saveModel(); render(); };
    document.getElementById('nextBtn').onclick = function(){ M.page=Math.min(6,M.page+1); saveModel(); render(); };

    // Add clickable wiring for step buttons
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
    if (M.page===6){ host.innerHTML = page6_render(); }
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
*/
