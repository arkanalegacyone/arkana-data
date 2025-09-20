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
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/flaws1.json",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/common_powers1.json?nocache=1",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/perks1.json?nocache=1",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/archetype_powers1.json?nocache=1",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/cybernetics1.json?nocache=1",
      "https://cdn.jsdelivr.net/gh/arkanalegacyone/arkana-data/magic_schools1.json?nocache=1"
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
    if(r === "strigoi" || r === "gaki") {
      return flaws.filter(function(flaw){
        var tags = flaw.tags ? flaw.tags.map(lc) : [];
        if(tags.indexOf("race:vampire") >= 0) return true;
        if(a && (tags.indexOf("arch:" + a) >= 0 || tags.indexOf("spec:" + a) >= 0)) return true;
        return false;
      });
    }
    if(r === "human") {
      return flaws.filter(function(flaw){
        var tags = flaw.tags ? flaw.tags.map(lc) : [];
        if(tags.indexOf("race:human") >= 0) return true;
        if(a && tags.indexOf("spec:" + a) >= 0) return true;
        return false;
      });
    }
    return flaws.filter(function(flaw){
      var tags = flaw.tags ? flaw.tags.map(lc) : [];
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
  function magicSchoolsAll() {
    return magicSchools.filter(function(s){ return true; });
  }
  function statMod(v){ return v===0?-3 : v===1?-2 : v===2?0 : v===3?2 : v===4?4 : v===5?6:0; }
  function normalizeStats(){
    var S = M.stats = M.stats || {phys:0,dex:0,mental:0,perc:0};
    ['phys','dex','mental','perc'].forEach(function(k){ if(typeof S[k]!=='number') S[k]=0; S[k]=Math.min(5,Math.max(0,S[k])); });
    var spent = (S.phys)+(S.dex)+(S.mental)+(S.perc);
    S.pool = Math.max(0, 10 - spent);
    return S;
  }

  // --- Collapsible code starts here ---
  function page5_render(){
    var race = M.race || "";
    var arch = M.arch || "";
    var total = 15 + Array.from(M.flaws).reduce(function(s,fid){
      var f=flaws.find(function(x){return x.id===fid;});
      return s+(f?f.cost:0);
    },0);

    var cyberSlotCost = (M.cyberSlots || 0) * 2;
    var allPicks = Array.from(M.picks);
    var spent = allPicks.map(function(pid){
      var arrs = [commonPowers, perks, archPowers, cybernetics, magicSchools];
      for(var i=0;i<arrs.length;i++){
        var found=arrs[i].find(function(x){return x.id===pid;});
        if(found) return found.cost||1;
      }
      return 0;
    }).reduce(function(a,b){return a+b;},0);

    spent += cyberSlotCost;
    var remain = total - spent;
    var canMagic = canUseMagic(race, arch);

    function willOverspend(extra) {
      return spent + extra > total;
    }
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
    function renderList(title, arr, selectedSet, opt) {
      opt = opt||{};
      var html = title ? '<h3>'+esc(title)+'</h3>' : '';
      if (!arr.length) return html + '<div class="muted">None available.</div>';
      html += '<div class="list">';
      arr.forEach(function(item){
        var sel = selectedSet.has(item.id) ? ' checked' : '';
        var costVal = item.cost||1;
        var disabled = (sel ? '' : (willOverspend(costVal)?' disabled':'')) + (opt.max && selectedSet.size>=opt.max && !sel ? ' disabled' : '');
        var cost = item.cost ? '<span class="pill">'+item.cost+' pts</span>' : '';
        html += '<label class="item"><input type="checkbox" data-id="'+item.id+'"'+sel+disabled+'>'+esc(item.name)+': '+esc(item.desc)+' '+cost+'</label>';
      });
      html += '</div>';
      return html;
    }

    var commonPowersHtml = renderList("Common Powers", commonPowersForRace(race), M.picks);
    var perksHtml = renderList("Perks", perksForRace(race, arch), M.picks);
    var cyberneticsHtml =
      '<div class="cybernetic-section" style="margin-bottom:12px;">' +
      '<label class="ark-input" style="font-weight:600;width:auto;display:inline-block;margin-right:12px;">Cybernetic Slots</label>' +
      '<input type="number" min="0" max="10" class="cybernetic-input" id="cyberneticSlotInput" value="'+(M.cyberSlots||0)+'"'+((remain<2 && M.cyberSlots < 10)?' disabled':'')+'">' +
      '<span class="cybernetic-cost" style="margin-left:10px;">Cost: '+cyberSlotCost+' points</span>' +
      ((remain<2 && M.cyberSlots < 10) ? '<span class="muted" style="margin-left:10px;">No points left for more slots</span>':'') +
      '</div>' +
      renderList("", cyberneticsAll(), M.picks);

    var magicHtml = canMagic
      ? renderList("Magic Schools & Weaves", magicSchoolsAll(), M.magicSchools)
      : '<h3>Magic Schools & Weaves</h3><div class="muted">Not available for '+esc(race)+(arch?' ('+esc(arch)+')':'')+'.</div>';

    var html =
      '<h2>Powers, Perks, Augmentations, Magic, and Hacking</h2>' +
      '<div class="totals">Points: <b>'+total+'</b> • Spent <b>'+spent+'</b> • Remaining <b>'+remain+'</b></div>' +
      '<div class="note">Select any combination of powers, perks, cybernetics, magic school weaves, and cybernetic slots. You cannot spend more points than you have.</div>' +
      collapsibleSection("common", "Common Powers", commonPowersHtml, true) +
      collapsibleSection("perks", "Perks", perksHtml, true) +
      collapsibleSection("cyber", "Cybernetic Augmentations & Hacking", cyberneticsHtml, true) +
      collapsibleSection("magic", "Magic Schools & Weaves", magicHtml, true);

    return html;
  }

  function page5_wire(){
    Array.prototype.forEach.call(document.querySelectorAll('#page5 input[type="checkbox"][data-id]'),function(ch){
      ch.onchange = function(){
        var id = ch.dataset.id;
        var arrs = [commonPowers, perks, archPowers, cybernetics, magicSchools];
        var found;
        for(var i=0;i<arrs.length;i++){
          found = arrs[i].find(function(x){return x.id===id;});
          if(found) break;
        }
        var costVal = found ? (found.cost||1) : 1;
        var race = M.race || "";
        var arch = M.arch || "";
        var total = 15 + Array.from(M.flaws).reduce(function(s,fid){
          var f=flaws.find(function(x){return x.id===fid;}); return s+(f?f.cost:0);
        },0);
        var cyberSlotCost = (M.cyberSlots || 0) * 2;
        var picksSpent = Array.from(M.picks).map(function(pid){
          for(var i=0;i<arrs.length;i++){
            var f=arrs[i].find(function(x){return x.id===pid;}); if(f) return f.cost||1;
          }
          return 0;
        }).reduce(function(a,b){return a+b;},0);
        var spent = picksSpent + cyberSlotCost;
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
    });
    Array.prototype.forEach.call(document.querySelectorAll('#page5 input[type="checkbox"][data-id]'),function(ch){
      if (magicSchools.find(function(x){return x.id===ch.dataset.id;})) {
        ch.onchange = function(){
          var id = ch.dataset.id;
          var arrs = [commonPowers, perks, archPowers, cybernetics, magicSchools];
          var found = magicSchools.find(function(x){return x.id===id;});
          var costVal = found ? (found.cost||1) : 1;
          var race = M.race || "";
          var arch = M.arch || "";
          var total = 15 + Array.from(M.flaws).reduce(function(s,fid){
            var f=flaws.find(function(x){return x.id===fid;}); return s+(f?f.cost:0);
          },0);
          var cyberSlotCost = (M.cyberSlots || 0) * 2;
          var picksSpent = Array.from(M.picks).map(function(pid){
            for(var i=0;i<arrs.length;i++){
              var f=arrs[i].find(function(x){return x.id===pid;}); if(f) return f.cost||1;
            }
            return 0;
          }).reduce(function(a,b){return a+b;},0);
          var spent = picksSpent + cyberSlotCost;
          var remain = total - spent;
          if (ch.checked && remain < costVal) {
            ch.checked = false;
            return;
          }
          if (ch.checked) M.magicSchools.add(id);
          else M.magicSchools.delete(id);
          saveModel();
          render();
        };
      }
    });
    var slotInput = document.getElementById('cyberneticSlotInput');
    if (slotInput) {
      slotInput.oninput = function(e){
        var val = Math.max(0, Math.min(10, parseInt(e.target.value)||0));
        var race = M.race || "";
        var arch = M.arch || "";
        var total = 15 + Array.from(M.flaws).reduce(function(s,fid){
          var f=flaws.find(function(x){return x.id===fid;}); return s+(f?f.cost:0);
        },0);
        var allPicks = Array.from(M.picks);
        var picksSpent = allPicks.map(function(pid){
          var arrs = [commonPowers, perks, archPowers, cybernetics, magicSchools];
          for(var i=0;i<arrs.length;i++){
            var found=arrs[i].find(function(x){return x.id===pid;}); if(found) return found.cost||1;
          }
          return 0;
        }).reduce(function(a,b){return a+b;},0);
        var spent = picksSpent + (val*2);
        var remain = total - spent;
        if ((val > M.cyberSlots) && remain < 2) {
          val = M.cyberSlots;
        }
        M.cyberSlots = val;
        saveModel();
        render();
      };
    }
    // Collapsible logic
    Array.prototype.forEach.call(document.querySelectorAll('.ark-collapse-btn'), function(btn){
      btn.onclick = function(){
        var targetId = btn.getAttribute('data-target');
        var body = document.getElementById(targetId);
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        body.style.display = expanded ? 'none' : 'block';
        btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        var arrow = btn.querySelector('.arrow');
        if (arrow) arrow.textContent = expanded ? '►' : '▼';
      };
    });
  }

  // --- (rest of code unchanged: page6_render, render, etc.)

  function page1_render(){ /* unchanged */ }
  function page1_wire(){ /* unchanged */ }
  function page2_render(){ /* unchanged */ }
  function page2_wire(){ /* unchanged */ }
  function page3_render(){ /* unchanged */ }
  function page3_wire(){ /* unchanged */ }
  function page4_render(){ /* unchanged */ }
  function page4_wire(){ /* unchanged */ }
  function page6_render(){ /* unchanged */ }
  function render(){
    var steps = ['Identity','Race & Archetype','Stats','Optional Flaws','Powers/Perks/Cybernetics/Magic','Summary'];
    root.innerHTML =
      '<h2>Arkana Character Creator</h2>' +
      '<div class="ark-steps" id="steps">' +
      steps.map(function(t,i){return '<div class="ark-step'+(M.page===i+1?' current':'')+'">'+(i+1)+'</div>';}).join('') +
      '</div>' +
      '<div id="page"></div>' +
      '<div class="ark-nav">' +
        '<button id="backBtn" type="button">← Back</button>' +
        '<button id="nextBtn" type="button">Next →</button>' +
      '</div>' +
      '<div class="diag" id="diag">page '+M.page+'</div>';
    document.getElementById('backBtn').onclick = function(){ M.page=Math.max(1,M.page-1); saveModel(); render(); };
    document.getElementById('nextBtn').onclick = function(){ M.page=Math.min(6,M.page+1); saveModel(); render(); };
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
