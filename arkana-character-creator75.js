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
  function page1_render(){ /* ...identity page code... */ return '<div>Identity Page</div>'; }
  function page1_wire(){ /* ...wire code... */ }
  function page2_render(){ /* ...race page code... */ return '<div>Race Page</div>'; }
  function page2_wire(){ /* ...wire code... */ }
  function page3_render(){ /* ...stats page code... */ return '<div>Stats Page</div>'; }
  function page3_wire(){ /* ...wire code... */ }
  function page4_render(){ /* ...flaws page code... */ return '<div>Flaws Page</div>'; }
  function page4_wire(){ /* ...wire code... */ }
  function page5_render(){ /* ...powers page code... */ return '<div>Powers Page</div>'; }
  function page5_wire(){ /* ...wire code... */ }
  function page6_render(){ 
    return `<div>Summary Page
      <button id="submitBtn">Submit Character</button>
    </div>`;
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
      `Background: ${data.background}\n`
    );
  }
  function getCharacterDataForDiscord() {
    return {
      name: M.identity.name || '',
      sl: M.identity.sl || '',
      background: M.identity.background || ''
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
