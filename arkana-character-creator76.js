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

  // --- Page renders and wires ---
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
    // Race and Archetype selection
    var raceList = ['Human','Strigoi','Gaki','Spliced'];
    var archList = ['Human (No Powers)','Arcanist','Synthral','Psion'];
    return (
      '<h2>Race & Archetype</h2>' +
      '<div><label>Race</label><select id="raceSel">' +
        raceList.map(r=>'<option'+(M.race===r?' selected':'')+'>'+esc(r)+'</option>').join('') +
      '</select></div>' +
      '<div><label>Archetype</label><select id="archSel">' +
        archList.map(a=>'<option'+(M.arch===a?' selected':'')+'>'+esc(a)+'</option>').join('') +
      '</select></div>'
    );
  }
  function page2_wire(){
    var raceSel=document.getElementById('raceSel'), archSel=document.getElementById('archSel');
    if(raceSel)raceSel.onchange=function(e){M.race=e.target.value;saveModel();};
    if(archSel)archSel.onchange=function(e){M.arch=e.target.value;saveModel();};
  }
  function page3_render(){
    var S = M.stats;
    return (
      '<h2>Stats</h2>' +
      ['phys','dex','mental','perc'].map(function(stat){
        return '<div><label>'+stat.charAt(0).toUpperCase()+stat.slice(1)+': </label><input type="number" min="1" max="5" id="stat_'+stat+'" value="'+esc(S[stat])+'"></div>';
      }).join('') +
      '<div><label>Points Left: <span id="ptsLeft">'+esc(S.pool)+'</span></label></div>'
    );
  }
  function page3_wire(){
    ['phys','dex','mental','perc'].forEach(function(stat){
      var n=document.getElementById('stat_'+stat);
      if(n)n.oninput=function(e){S[stat]=parseInt(e.target.value,10)||1;normalizeStats();saveModel();render();};
    });
  }
  function page4_render(){
    // Flaws selection
    var html = '<h2>Optional Flaws</h2>';
    html += flaws.map(function(flaw){
      return '<div><label><input type="checkbox" data-flaw="'+esc(flaw.id)+'"'+(M.flaws.has(flaw.id)?' checked':'')+'>'+esc(flaw.name)+': '+esc(flaw.desc)+'</label></div>';
    }).join('');
    return html;
  }
  function page4_wire(){
    Array.prototype.forEach.call(document.querySelectorAll('input[data-flaw]'),function(ch){
      ch.onchange=function(){
        if(ch.checked)M.flaws.add(ch.getAttribute('data-flaw'));
        else M.flaws.delete(ch.getAttribute('data-flaw'));
        saveModel();
      };
    });
  }
  function page5_render(){
    // Powers, Perks, Cybernetics, Magic selection (simplified)
    var html = '<h2>Powers, Perks, Cybernetics, Magic</h2>';
    html += '<div><label>Cybernetic Slots: <input type="number" min="0" max="5" id="cyberSlots" value="'+esc(M.cyberSlots||0)+'"></label></div>';
    html += '<h3>Common Powers</h3>' +
      commonPowers.map(function(p){return '<div><label><input type="checkbox" data-pick="'+esc(p.id)+'"'+(M.picks.has(p.id)?' checked':'')+'>'+esc(p.name)+': '+esc(p.desc)+'</label></div>';}).join('');
    html += '<h3>Perks</h3>' +
      perks.map(function(p){return '<div><label><input type="checkbox" data-pick="'+esc(p.id)+'"'+(M.picks.has(p.id)?' checked':'')+'>'+esc(p.name)+': '+esc(p.desc)+'</label></div>';}).join('');
    html += '<h3>Archetype Powers</h3>' +
      archPowers.map(function(p){return '<div><label><input type="checkbox" data-pick="'+esc(p.id)+'"'+(M.picks.has(p.id)?' checked':'')+'>'+esc(p.name)+': '+esc(p.desc)+'</label></div>';}).join('');
    html += '<h3>Cybernetics</h3>' +
      cybernetics.map(function(c){return '<div><label><input type="checkbox" data-pick="'+esc(c.id)+'"'+(M.picks.has(c.id)?' checked':'')+'>'+esc(c.name)+': '+esc(c.desc)+'</label></div>';}).join('');
    html += '<h3>Magic Schools</h3>' +
      magicSchools.filter(s=>s.id.startsWith('school_')).map(function(s){return '<div><label><input type="checkbox" data-magicschool="'+esc(s.id)+'"'+(M.magicSchools.has(s.id)?' checked':'')+'>'+esc(s.name)+': '+esc(s.desc)+'</label></div>';}).join('');
    return html;
  }
  function page5_wire(){
    var cs=document.getElementById('cyberSlots');
    if(cs)cs.oninput=function(e){M.cyberSlots=parseInt(e.target.value,10)||0;saveModel();};
    Array.prototype.forEach.call(document.querySelectorAll('input[data-pick]'),function(ch){
      ch.onchange=function(){
        if(ch.checked)M.picks.add(ch.getAttribute('data-pick'));
        else M.picks.delete(ch.getAttribute('data-pick'));
        saveModel();
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[data-magicschool]'),function(ch){
      ch.onchange=function(){
        if(ch.checked)M.magicSchools.add(ch.getAttribute('data-magicschool'));
        else M.magicSchools.delete(ch.getAttribute('data-magicschool'));
        saveModel();
      };
    });
  }
  function page6_render(){
    var I = M.identity;
    return `
      <h2>Summary & Submit</h2>
      <div><strong>Character Name:</strong> ${esc(I.name||'')}</div>
      <div><strong>Second Life Name:</strong> ${esc(I.sl||'')}</div>
      <div><strong>Alias:</strong> ${esc(I.alias||'')}</div>
      <div><strong>Faction:</strong> ${esc(I.faction||'')}</div>
      <div><strong>Concept:</strong> ${esc(I.concept||'')}</div>
      <div><strong>Job:</strong> ${esc(I.job||'')}</div>
      <div><strong>Background:</strong> ${esc(I.background||'')}</div>
      <div><strong>Race:</strong> ${esc(M.race||'')}</div>
      <div><strong>Archetype:</strong> ${esc(M.arch||'')}</div>
      <div><strong>Stats:</strong> Phys ${esc(M.stats.phys)}, Dex ${esc(M.stats.dex)}, Mental ${esc(M.stats.mental)}, Perc ${esc(M.stats.perc)}</div>
      <div><strong>Flaws:</strong> ${Array.from(M.flaws).map(fid=>flaws.find(f=>f.id===fid)?.name||fid).join(', ')||'None'}</div>
      <div><strong>Powers/Perks/Arch/Cyber:</strong> ${Array.from(M.picks).map(pid=>
        commonPowers.find(p=>p.id===pid)?.name||
        perks.find(p=>p.id===pid)?.name||
        archPowers.find(p=>p.id===pid)?.name||
        cybernetics.find(p=>p.id===pid)?.name||pid
      ).join(', ')||'None'}</div>
      <div><strong>Cybernetic Slots:</strong> ${esc(M.cyberSlots||0)}</div>
      <div><strong>Magic Schools:</strong> ${Array.from(M.magicSchools).map(id=>magicSchools.find(s=>s.id===id)?.name||id).join(', ')||'None'}</div>
      <button id="submitBtn">Submit Character</button>
    `;
  }
  function page6_wire(){ wireSubmitButton(); }

  // --- Submission logic ---
  function discordifyCharacterShort(data) {
    return `Character Name: ${data.name}\nSecond Life Name: ${data.sl}`;
  }
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
      `Stats: Phys ${data.stats.phys}, Dex ${data.stats.dex}, Mental ${data.stats.mental}, Perc ${data.stats.perc}\n` +
      `Flaws: ${(data.flaws.length ? data.flaws.join(', ') : 'None')}\n` +
      `Common Powers/Perks/Arch/Cyber: ${(data.powers.length ? data.powers.join(', ') : 'None')}\n` +
      `Cybernetic Slots: ${data.cyberSlots}\n` +
      `Magic Schools: ${(data.magicSchools.length ? data.magicSchools.join(', ') : 'None')}\n` +
      `Background: ${data.background}\n`
    );
  }
  function getCharacterDataForDiscord() {
    var I = M.identity;
    return {
      name: I.name||'',
      sl: I.sl||'',
      alias: I.alias||'',
      faction: I.faction||'',
      concept: I.concept||'',
      job: I.job||'',
      background: I.background||'',
      race: M.race,
      arch: M.arch,
      stats: M.stats,
      flaws: Array.from(M.flaws).map(fid=>flaws.find(f=>f.id===fid)?.name||fid),
      powers: Array.from(M.picks).map(pid=>
        commonPowers.find(p=>p.id===pid)?.name||
        perks.find(p=>p.id===pid)?.name||
        archPowers.find(p=>p.id===pid)?.name||
        cybernetics.find(p=>p.id===pid)?.name||pid
      ),
      cyberSlots: M.cyberSlots||0,
      magicSchools: Array.from(M.magicSchools).map(id=>magicSchools.find(s=>s.id===id)?.name||id)
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
  function wireSubmitButton() {
    var btn = document.getElementById('submitBtn');
    if (btn) {
      btn.onclick = async function(){
        btn.disabled = true;
        btn.textContent = "Submitting...";
        const data = getCharacterDataForDiscord();
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
        sendToGoogleDrive(data.name, data.sl, characterSheetText(data));
        btn.textContent = "Submitted!";
        showSubmissionSuccess();
        setTimeout(()=>{ btn.disabled=false; btn.textContent="SUBMIT CHARACTER"; }, 5000);
      };
    }
  }

  // --- Render function ---
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

  // --- main execution ---
  try {
    await loadAllData();
    render();
  } catch(e) {
    root.innerHTML = '<div class="note">Error loading public Arkana data: '+esc(e.message)+'</div>';
  }
})();
};

/* Add to your CSS for subtabs and step styling:
.ark-row { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 12px; margin-bottom:16px; }
.ark-input { width: 100%; box-sizing: border-box; font-size:1em; padding:6px 10px; border:1px solid #ccc; border-radius:6px; }
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
