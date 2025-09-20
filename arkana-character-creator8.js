window.onload = function() {
(async function(){

  // ... (all previous code up to page5_render unchanged)

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

    // Helper for collapsible section
    function collapsibleSection(id, title, content, open) {
      return `
        <div class="ark-collapsible-section" id="section-${id}">
          <button class="ark-collapse-btn" type="button" data-target="section-${id}-body" aria-expanded="${open?'true':'false'}">
            ${esc(title)} <span class="arrow">${open ? '▼' : '►'}</span>
          </button>
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

    // Section contents
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

    // Compose collapsible sections, all open by default
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

  // ... (rest of previous page5_wire code unchanged, now add collapsible logic below)

  function page5_wire(){
    // Checkbox logic (unchanged)
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
        btn.querySelector('.arrow').textContent = expanded ? '►' : '▼';
      };
    });
  }

  // ... (rest of code unchanged)
  // (page6_render, render, etc.)

  // --- REMAINDER OF CODE UNCHANGED ---

})();
};
