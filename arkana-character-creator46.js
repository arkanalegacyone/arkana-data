window.onload = function() {
(async function(){
  var root = document.getElementById('ark-wizard');
  var flaws = [], commonPowers = [], perks = [], archPowers = [], cybernetics = [], magicSchools = [];
  var M = loadModel();

  function esc(s){ return String(s||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function lc(s){ return String(s||'').toLowerCase(); }
  function loadModel(){
    var raw=window.localStorage ? localStorage.getItem('arkModel') : null;
    var base = { page:1, identity:{}, race:'', arch:'', stats:{phys:0,dex:0,mental:0,perc:0,pool:10}, cyberSlots:0, flaws:[], picks:[], magicSchools:[] };
    try{
      var m = raw ? JSON.parse(raw) : base;
      m.flaws = new Set(m.flaws||[]);
      m.picks = new Set(m.picks||[]);
      m.magicSchools = new Set(m.magicSchools||[]);
      m.cyberSlots = m.cyberSlots || 0;
      m.page = m.page || 1;
      return Object.assign(base,m);
    }catch(_){
      return { page:1, identity:{}, race:'', arch:'', stats:{phys:0,dex:0,mental:0,perc:0,pool:10}, cyberSlots:0, flaws:new Set(), picks:new Set(), magicSchools:new Set() };
    }
  }
  function saveModel(){
    try{
      if(window.localStorage){
        var dump = {page:M.page, identity:M.identity, race:M.race, arch:M.arch, stats:M.stats, cyberSlots:M.cyberSlots, flaws:Array.from(M.flaws), picks:Array.from(M.picks), magicSchools:Array.from(M.magicSchools)};
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

  // --- Utility functions for filtering, grouping, stats, points ---
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

  // --- Page 1: Identity ---
  function page1_render() {
    return `
      <h2>Identity</h2>
      <div class="group">
        <label>Name</label>
        <input class="ark-input" id="identity-name" value="${esc(M.identity.name||'')}" maxlength="32" autocomplete="off">
        <label>Background</label>
        <textarea class="ark-input" id="identity-bg" rows="3" maxlength="256">${esc(M.identity.bg||'')}</textarea>
      </div>
      <div class="ark-nav">
        <button id="next-btn" type="button">Next</button>
      </div>
    `;
  }
  function page1_wire(){
    document.getElementById('identity-name').oninput = function(e){
      M.identity.name = e.target.value;
      saveModel();
    };
    document.getElementById('identity-bg').oninput = function(e){
      M.identity.bg = e.target.value;
      saveModel();
    };
    document.getElementById('next-btn').onclick = function(){
      M.page = 2;
      saveModel();
      render();
    };
  }

  // --- Page 2: Race & Archetype ---
  function page2_render() {
    const races = ["Human","Strigoi","Gaki","Spliced"];
    const archs = {
      "Human": ["Human (No Powers)","Arcanist","Synthral","Psion"],
      "Strigoi": ["Blooded","Shadowed"],
      "Gaki": ["Haunted","Possessed"],
      "Spliced": ["Spliced"]
    };
    return `
      <h2>Race & Archetype</h2>
      <div class="group">
        <label>Race</label>
        <select class="ark-input" id="race-select">
          <option value="">Select Race</option>
          ${races.map(r=>`<option${M.race===r?' selected':''}>${esc(r)}</option>`).join('')}
        </select>
        <label>Archetype</label>
        <select class="ark-input" id="arch-select">
          <option value="">Select Archetype</option>
          ${(archs[M.race]||[]).map(a=>`<option${M.arch===a?' selected':''}>${esc(a)}</option>`).join('')}
        </select>
      </div>
      <div class="ark-nav">
        <button id="back-btn" type="button">Back</button>
        <button id="next-btn" type="button"${!M.race||!M.arch?' disabled':''}>Next</button>
      </div>
    `;
  }
  function page2_wire(){
    document.getElementById('race-select').onchange = function(e){
      M.race = e.target.value;
      M.arch = '';
      saveModel();
      render();
    };
    document.getElementById('arch-select').onchange = function(e){
      M.arch = e.target.value;
      saveModel();
      render();
    };
    document.getElementById('back-btn').onclick = function(){
      M.page = 1;
      saveModel();
      render();
    };
    document.getElementById('next-btn').onclick = function(){
      M.page = 3;
      saveModel();
      render();
    };
  }

  // --- Page 3: Stats ---
  function page3_render() {
    const statNames = ["Physique","Dexterity","Mental","Perception"];
    const statKeys = ["phys","dex","mental","perc"];
    normalizeStats();
    return `
      <h2>Stats</h2>
      <div class="group">
        ${statKeys.map((k,i)=>`
          <div class="stat">
            <label>${statNames[i]}</label>
            <button type="button" class="stat-minus" data-stat="${k}">-</button>
            <span>${M.stats[k]}</span>
            <button type="button" class="stat-plus" data-stat="${k}">+</button>
          </div>
        `).join("")}
        <div class="muted">You have <b>${M.stats.pool}</b> points left to assign. Maximum per stat: 5.</div>
      </div>
      <div class="ark-nav">
        <button id="back-btn" type="button">Back</button>
        <button id="next-btn" type="button"${M.stats.pool>0?' disabled':''}>Next</button>
      </div>
    `;
  }
  function page3_wire(){
    Array.prototype.forEach.call(document.querySelectorAll('.stat-minus'),function(btn){
      btn.onclick = function(){
        var k = btn.dataset.stat;
        if(M.stats[k]>0){ M.stats[k]--; saveModel(); render(); }
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('.stat-plus'),function(btn){
      btn.onclick = function(){
        var k = btn.dataset.stat;
        if(M.stats[k]<5 && M.stats.pool>0){ M.stats[k]++; saveModel(); render(); }
      };
    });
    document.getElementById('back-btn').onclick = function(){
      M.page = 2;
      saveModel();
      render();
    };
    document.getElementById('next-btn').onclick = function(){
      M.page = 4;
      saveModel();
      render();
    };
  }

  // --- Page 4: Flaws ---
  function page4_render() {
    var fls = flawsForRace(M.race, M.arch);
    var html = `
      <h2>Flaws</h2>
      <div class="group">
        <div class="muted">Select flaws to gain extra points. You may pick up to 2 flaws. Each flaw grants extra points for spending on powers and perks.</div>
        <div class="list">
          ${fls.map(f=>`
            <label class="item">
              <input type="checkbox" data-flaw="${f.id}"${M.flaws.has(f.id)?' checked':''}${M.flaws.size>=2&&!M.flaws.has(f.id)?' disabled':''}>
              ${esc(f.name)}: ${esc(f.desc)}
              <span class="pill">+${f.cost} pts</span>
            </label>
          `).join("")}
        </div>
        <div class="muted">Flaws selected: <b>${M.flaws.size}</b> / 2</div>
      </div>
      <div class="ark-nav">
        <button id="back-btn" type="button">Back</button>
        <button id="next-btn" type="button">Next</button>
      </div>
    `;
    return html;
  }
  function page4_wire(){
    Array.prototype.forEach.call(document.querySelectorAll('input[data-flaw]'),function(ch){
      ch.onchange = function(){
        var id = ch.dataset.flaw;
        if(ch.checked) M.flaws.add(id);
        else M.flaws.delete(id);
        saveModel();
        render();
      };
    });
    document.getElementById('back-btn').onclick = function(){
      M.page = 3;
      saveModel();
      render();
    };
    document.getElementById('next-btn').onclick = function(){
      M.page = 5;
      saveModel();
      render();
    };
  }

  // --- Page 5: Powers, Perks, Augmentations, Magic, and Hacking ---
  function collapsibleSection(id, title, content, open) {
    return `
      <div class="ark-collapsible-section" id="section-${id}">
        <div class="ark-collapse-btn" data-target="section-${id}-body" tabindex="0" aria-expanded="${open?'true':'false'}">
          ${esc(title)} <span class="arrow">${open ? '▼' : '►'}</span>
        </div>
        <div class="ark-collapsible-body" id="section-${id}-body" style="display:${open?'block':'none'};">
          ${content}
        </div>
      </div>
    `;
  }
  function page5_render(){
    var race = M.race || "";
    var arch = M.arch || "";
    var total = pointsTotal();
    var spent = pointsSpentTotal();
    var remain = total - spent;
    var canMagic = canUseMagic(race, arch);

    var cyberSlots = M.cyberSlots || 0;
    var groupedMods = groupCyberneticsBySection(cyberneticsAll());

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

    var cyberneticsHtml =
      '<div class="cybernetic-section" style="margin-bottom:12px;">' +
      '<div class="muted" style="margin-bottom:8px;font-size:1em;">To purchase <b>Cybernetic Augmentations & Hacking</b> items, you must first purchase a slot.</div>' +
      '<label class="ark-input" style="font-weight:600;width:auto;display:inline-block;margin-right:12px;">Cybernetic Slots</label>' +
      '<input type="number" min="0" max="10" class="cybernetic-input" id="cyberneticSlotInput" value="'+cyberSlots+'"'+((remain<2 && cyberSlots < 10)?' disabled':'')+'">' +
      '<span class="cybernetic-cost" style="margin-left:10px;">Cost: '+(cyberSlots*2)+' points</span>' +
      ((remain<2 && cyberSlots < 10) ? '<span class="muted" style="margin-left:10px;">No points left for more slots</span>':'') +
      '</div>' +
      Object.keys(groupedMods).map(section=>cyberSectionHtml(section, groupedMods[section])).join('');

    var groupedMagicSchools = magicSchoolsAllGrouped(race, arch);
    var magicHtml = canMagic
      ? Object.keys(groupedMagicSchools).length
          ? Object.keys(groupedMagicSchools).map(section=>magicSectionHtml(section, groupedMagicSchools[section])).join('')
          : '<div class="muted">No magic schools available for this archetype.</div>'
      : '<h3>Magic Schools & Weaves</h3><div class="muted">Not available for '+esc(race)+(arch?' ('+esc(arch)+')':'')+'.</div>';

    var commonPowersHtml = renderList("Common Powers", commonPowersForRace(race), M.picks);
    var perksHtml = renderList("Perks", perksForRace(race, arch), M.picks);
    var archPowersHtml = renderList("Archetype Powers", archPowersForRaceArch(race, arch), M.picks);

    var html =
      '<h2>Powers, Perks, Augmentations, Magic, and Hacking</h2>' +
      '<div class="totals">Points: <b>'+total+'</b> • Spent <b>'+spent+'</b> • Remaining <b>'+remain+'</b></div>' +
      '<div class="note">Select any combination of powers, perks, archetype powers, cybernetics (requires slot), magic school weaves, and cybernetic slots. You cannot spend more points than you have.</div>' +
      collapsibleSection("common", "Common Powers", commonPowersHtml, false) +
      collapsibleSection("perks", "Perks", perksHtml, false) +
      collapsibleSection("archetype", "Archetype Powers", archPowersHtml, false) +
      collapsibleSection("cyber", "Cybernetic Augmentations & Hacking", cyberneticsHtml, false) +
      collapsibleSection("magic", "Magic Schools & Weaves", magicHtml, false) +
      `<div class="ark-nav">
        <button id="back-btn" type="button">Back</button>
        <button id="next-btn" type="button">Next</button>
      </div>`;
    return html;
  }
  function page5_wire(){
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

    // Collapsible toggle: Only toggle when you click the header, not form controls
    Array.prototype.forEach.call(document.querySelectorAll('.ark-collapse-btn'), function(btn){
      btn.addEventListener('click', function(e){
        if (e.target !== btn) return; // Only toggle if clicking the header itself!
        var targetId = btn.getAttribute('data-target');
        var body = document.getElementById(targetId);
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        body.style.display = expanded ? 'none' : 'block';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        var arrow = btn.querySelector('.arrow');
        if (arrow) arrow.textContent = expanded ? '►' : '▼';
      });
    });

    // Prevent collapse when interacting with inputs/labels inside the collapsible body
    Array.prototype.forEach.call(document.querySelectorAll('.ark-collapsible-body input, .ark-collapsible-body label'), function(el){
      el.addEventListener('click', function(e){
        e.stopPropagation();
      });
    });

    document.getElementById('back-btn').onclick = function(){
      M.page = 4;
      saveModel();
      render();
    };
    document.getElementById('next-btn').onclick = function(){
      M.page = 6;
      saveModel();
      render();
    };
  }

  // --- Page 6: Summary ---
  function page6_render() {
    // Example summary page - customize as needed
    return `
      <h2>Summary</h2>
      <div class="group">
        <div><b>Name:</b> ${esc(M.identity.name||'')}</div>
        <div><b>Background:</b> ${esc(M.identity.bg||'')}</div>
        <div><b>Race:</b> ${esc(M.race||'')}</div>
        <div><b>Archetype:</b> ${esc(M.arch||'')}</div>
        <div><b>Stats:</b> Physique ${M.stats.phys}, Dexterity ${M.stats.dex}, Mental ${M.stats.mental}, Perception ${M.stats.perc}</div>
        <div><b>Flaws:</b> ${Array.from(M.flaws).map(fid=>{
          var f=flaws.find(x=>x.id===fid); return esc(f?f.name:'');
        }).join(', ')}</div>
        <div><b>Powers/Perks:</b> ${Array.from(M.picks).map(pid=>{
          var arrs = [commonPowers, perks, archPowers, cybernetics];
          var found;
          for(var i=0;i<arrs.length;i++){
            found = arrs[i].find(x=>x.id===pid);
            if(found) break;
          }
          return esc(found?found.name:'');
        }).join(', ')}</div>
        <div><b>Magic:</b> ${Array.from(M.magicSchools).map(mid=>{
          var m = magicSchools.find(x=>x.id===mid); return esc(m?m.name:'');
        }).join(', ')}</div>
      </div>
      <div class="ark-nav">
        <button id="back-btn" type="button">Back</button>
      </div>
    `;
  }
  function page6_wire(){
    document.getElementById('back-btn').onclick = function(){
      M.page = 5;
      saveModel();
      render();
    };
  }

  function render(){
    root.innerHTML = '<div id="page"></div>';
    var host = document.getElementById('page');
    let pageHtml = '';
    if(M.page === 1) pageHtml = page1_render();
    else if(M.page === 2) pageHtml = page2_render();
    else if(M.page === 3) pageHtml = page3_render();
    else if(M.page === 4) pageHtml = page4_render();
    else if(M.page === 5) pageHtml = page5_render();
    else if(M.page === 6) pageHtml = page6_render();
    host.innerHTML = pageHtml;

    if(M.page === 1) page1_wire();
    else if(M.page === 2) page2_wire();
    else if(M.page === 3) page3_wire();
    else if(M.page === 4) page4_wire();
    else if(M.page === 5) page5_wire();
    else if(M.page === 6) page6_wire();
  }

  try {
    await loadAllData();
    render();
  } catch(e) {
    root.innerHTML = '<div class="note">Error loading public Arkana data: '+esc(e.message)+'</div>';
  }
})();
};
