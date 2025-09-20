window.onload = function() {
(async function(){
  var root = document.getElementById('ark-wizard');
  var flaws = [], commonPowers = [], perks = [], archPowers = [], cybernetics = [], magicSchools = [];
  var M = loadModel();

  function esc(s){ return String(s||'').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];}); }
  function lc(s){ return String(s||'').toLowerCase(); }
  function mapRaceToSpecies(race) {
    var mapping = {
      'strigoi': 'vampire',
      'gaki': 'gaki',
      'spliced': 'spliced',
      'human': 'human',
      'veilborn': 'veilborn'
    };
    return mapping[lc(race)] || lc(race);
  }
  function loadModel(){
    var raw=window.localStorage ? localStorage.getItem('arkModel') : null;
    var base = { page:1, identity:{}, race:'', arch:'', stats:{phys:0,dex:0,mental:0,perc:0,pool:10}, flaws:[], picks:[], magicSchools:[], cyberSlots:0 };
    try{
      var m = raw ? JSON.parse(raw) : base;
      m.flaws = new Set(m.flaws||[]);
      m.picks = new Set(m.picks||[]);
      m.magicSchools = new Set(m.magicSchools||[]);
      return Object.assign(base,m);
    }catch(_){
      return { page:1, identity:{}, race:'', arch:'', stats:{phys:0,dex:0,mental:0,perc:0,pool:10}, flaws:new Set(), picks:new Set(), magicSchools:new Set(), cyberSlots:0 };
    }
  }
  function saveModel(){
    try{
      if(window.localStorage){
        var dump = {page:M.page, identity:M.identity, race:M.race, arch:M.arch, stats:M.stats, flaws:Array.from(M.flaws), picks:Array.from(M.picks), magicSchools:Array.from(M.magicSchools), cyberSlots:M.cyberSlots||0};
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
    var species = mapRaceToSpecies(race);
    var a = lc(arch||"");
    return perks.filter(function(perk){
      if (perk.species && lc(perk.species) !== species) return false;
      if (perk.arch && a && lc(perk.arch) !== a) return false;
      return true;
    });
  }
  function commonPowersForRace(race) {
    var species = mapRaceToSpecies(race);
    return commonPowers.filter(function(p){ return p.species && lc(p.species) === species; });
  }
  function archPowersForRaceArch(race, arch) {
    var species = mapRaceToSpecies(race);
    var a = lc(arch||"");
    return archPowers.filter(function(p){
      if (p.species && lc(p.species) !== species) return false;
      if (p.arch && a && lc(p.arch) !== a) return false;
      return true;
    });
  }
  function cyberneticsAll() {
    return cybernetics;
  }
  function canUseMagic(race, arch) {
    if (lc(race) === "spliced") return false;
    if (lc(race) === "human" && lc(arch||"") === "human (no powers)") return false;
    return true;
  }
  function magicSchoolsAll() {
    return magicSchools.filter(function(s){ return true; });
  }

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
      { name: "Veilborn", arches: ["Echoes","Veils","Blossoms","Glass","Unaffiliated"] },
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
      '<div class="note" style="margin-top:10px">Humans include <b>Human (no powers)</b>. Veilborn may select <b>Unaffiliated</b>.</div>'
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
          { name: "Veilborn", arches: ["Echoes","Veils","Blossoms","Glass","Unaffiliated"] },
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

  function statMod(v){ return v===0?-3 : v===1?-2 : v===2?0 : v===3?2 : v===4?4 : 6; }
  function normalizeStats(){
    var S = M.stats = M.stats || {phys:0,dex:0,mental:0,perc:0};
    ['phys','dex','mental','perc'].forEach(function(k){ if(typeof S[k]!=='number') S[k]=0; S[k]=Math.min(5,Math.max(0,S[k])); });
    var spent = S.phys+S.dex+S.mental+S.perc;
    S.pool = Math.max(0, 10 - spent);
    return S;
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
          '<span class="pill">mod: '+(statMod(S[k])>=0?'+':'')+statMod(S[k])+'</span>' +
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
      var k=row.dataset.k, val=row.querySelector('.val'), pill=row.querySelector('.pill');
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

  function page5_render(){
    var race = M.race || "";
    var arch = M.arch || "";
    var total = 15 + Array.from(M.flaws).reduce(function(s,fid){
      var f=flaws.find(function(x){return x.id===fid;});
      return s+(f?f.cost:0);
    },0);

    var allPicks = Array.from(M.picks);
    var spent = allPicks.map(function(pid){
      var arrs = [commonPowers, perks, archPowers, cybernetics, magicSchools];
      for(var i=0;i<arrs.length;i++){
        var found=arrs[i].find(function(x){return x.id===pid;});
        if(found) return found.cost||1;
      }
      return 0;
    }).reduce(function(a,b){return a+b;},0);

    // Add cybernetic slots cost
    var cyberSlotsCost = (M.cyberSlots||0) * 2;
    spent += cyberSlotsCost;

    var remain = total - spent;

    var canMagic = canUseMagic(race, arch);

    function renderList(title, arr, selectedSet, opt) {
      opt = opt||{};
      var html = '<h3>'+esc(title)+'</h3>';
      if (!arr.length) return html + '<div class="muted">None available.</div>';
      html += '<div class="list">';
      arr.forEach(function(item){
        var sel = selectedSet.has(item.id) ? ' checked' : '';
        var disabled = opt.max && selectedSet.size>=opt.max && !sel ? ' disabled' : '';
        var cost = item.cost ? '<span class="pill">'+item.cost+' pts</span>' : '';
        html += '<label class="item"><input type="checkbox" data-id="'+item.id+'"'+sel+disabled+'>'+esc(item.name)+': '+esc(item.desc)+' '+cost+'</label>';
      });
      html += '</div>';
      return html;
    }

    function renderCyberneticsSection() {
      var cyberSlots = M.cyberSlots || 0;
      var slotsCost = cyberSlots * 2;
      var html = '<h3>Cybernetic Augmentations & Hacking</h3>';
      html += '<div style="margin-bottom:10px;">';
      html += '<label>Cybernetic Slots (2 points each): <input type="number" id="cyberSlotsInput" value="'+cyberSlots+'" min="0" max="10" style="width:60px;margin-left:5px;"></label>';
      html += '<span class="pill" style="margin-left:10px;">Cost: '+slotsCost+' pts</span>';
      html += '</div>';
      
      var arr = cyberneticsAll();
      if (!arr.length) {
        html += '<div class="muted">None available.</div>';
      } else {
        html += '<div class="list">';
        arr.forEach(function(item){
          var sel = M.picks.has(item.id) ? ' checked' : '';
          var cost = item.cost ? '<span class="pill">'+item.cost+' pts</span>' : '';
          html += '<label class="item"><input type="checkbox" data-id="'+item.id+'"'+sel+'>'+esc(item.name)+': '+esc(item.desc)+' '+cost+'</label>';
        });
        html += '</div>';
      }
      return html;
    }

    var html =
      '<h2>Powers, Perks, Augmentations, Magic, and Hacking</h2>' +
      '<div class="totals">Points: <b>'+total+'</b> • Spent <b>'+spent+'</b> • Remaining <b>'+remain+'</b></div>' +
      '<div class="note">Select any combination of powers, perks, cybernetics, and magic school weaves. Be sure not to overspend your available points.</div>' +
      renderList("Common Powers", commonPowersForRace(race), M.picks) +
      renderList("Perks", perksForRace(race, arch), M.picks) +
      renderList("Archetype Powers", archPowersForRaceArch(race, arch), M.picks) +
      renderCyberneticsSection() +
      (canMagic ? renderList("Magic Schools & Weaves", magicSchoolsAll(), M.magicSchools) : '<h3>Magic Schools & Weaves</h3><div class="muted">Not available for Spliced or Human (no powers).</div>');

    return html;
  }
  function page5_wire(){
    // Handle cybernetic slots input
    var cyberSlotsInput = document.getElementById('cyberSlotsInput');
    if (cyberSlotsInput) {
      cyberSlotsInput.oninput = function() {
        M.cyberSlots = Math.max(0, parseInt(this.value) || 0);
        saveModel();
        render();
      };
    }

    Array.prototype.forEach.call(document.querySelectorAll('#page5 input[type="checkbox"][data-id]'),function(ch){
      ch.onchange = function(){
        var id = ch.dataset.id;
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
          if (ch.checked) M.magicSchools.add(id);
          else M.magicSchools.delete(id);
          saveModel();
          render();
        };
      }
    });
  }

  function page6_render(){
    var S = M.stats || {phys:0,dex:0,mental:0,perc:0};
    var hp = Math.max(1, S.phys*5);
    var base = 15 + Array.from(M.flaws).reduce(function(s,fid){ var f=flaws.find(function(x){return x.id===fid;}); return s+(f?f.cost:0); },0);
    var spent = Array.from(M.picks).reduce(function(s,pid){
      var arrs = [commonPowers, perks, archPowers, cybernetics, magicSchools];
      for(var i=0;i<arrs.length;i++){
        var found=arrs[i].find(function(x){return x.id===pid;});
        if(found) return s+(found.cost||1);
      }
      return s;
    },0);
    // Add cybernetic slots cost
    var cyberSlotsCost = (M.cyberSlots||0) * 2;
    spent += cyberSlotsCost;
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
        '<div><b>Cybernetics:</b> '+getNames(cybernetics, M.picks)+'</div>' +
        '<div><b>Cybernetic Slots:</b> '+(M.cyberSlots||0)+' (Cost: '+cyberSlotsCost+' pts)</div>' +
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
