// Arkana Character Creator v1 - Full JS

// Initial stat values (start at 0, not 1)
const stats = [
    { name: "Strength", value: 0 },
    { name: "Agility", value: 0 },
    { name: "Intellect", value: 0 },
    { name: "Charisma", value: 0 }
];

// Example archetype powers/perks data
const archetypeData = {
    Human: {
        powers: [], // No magic powers
        perks: ["Resourceful", "Adaptable"]
    },
    Spliced: {
        powers: ["Bio-Boost", "Genetic Override"],
        perks: ["Regeneration", "Sensory Upgrade"]
    },
    Strigoi: {
        powers: ["Shadowmeld", "Blood Surge"],
        perks: ["Nocturnal", "Vampiric Charm"],
        common: ["Enhanced Reflexes"]
    },
    Gaki: {
        powers: [],
        perks: ["Gluttonous Strength", "Unnatural Endurance"]
    }
};

let selectedArchetype = "Human";
let cyberneticSlots = 0;

// Render functions
function renderStatRows() {
    return stats.map((stat, idx) => {
        // Modifier logic: if stat is 0, modifier is -3
        const mod = stat.value === 0 ? -3 : stat.value - 1;
        return `
        <div class="arkana-stat-row">
            <span class="arkana-stat-label">${stat.name}</span>
            <input type="number" min="0" max="10" value="${stat.value}" class="arkana-stat-value" data-stat="${idx}" />
            <span class="arkana-stat-mod">${mod >= 0 ? "+" : ""}${mod}</span>
        </div>
        `;
    }).join('');
}

function renderCyberneticSection() {
    const cost = cyberneticSlots * 2;
    return `
    <div class="arkana-cybernetic-section">
        <span class="arkana-cybernetic-label">Cybernetic Slots:</span>
        <input type="number" min="0" max="10" class="arkana-cybernetic-input" value="${cyberneticSlots}" id="cybernetic-input" />
        <span class="arkana-cybernetic-cost">Cost: ${cost} points</span>
    </div>
    `;
}

function renderArchetypeSection() {
    const data = archetypeData[selectedArchetype];
    let powersHtml = '';
    let perksHtml = '';
    let commonHtml = '';

    // Magic powers hidden for Human
    if (selectedArchetype === "Human") {
        powersHtml = '<ul class="arkana-power-list hide-magic"></ul>';
    } else if (data.powers && data.powers.length) {
        powersHtml = `<ul class="arkana-power-list">${data.powers.map(p => `<li>${p}</li>`).join('')}</ul>`;
    } else {
        powersHtml = '<span>No powers available.</span>';
    }

    // Common powers for Strigoi
    if (selectedArchetype === "Strigoi" && data.common && data.common.length) {
        commonHtml = `<div class="arkana-section-subtitle">Common Powers:</div><ul class="arkana-power-list">${data.common.map(p => `<li>${p}</li>`).join('')}</ul>`;
    }

    // Perks for archetype
    if (data.perks && data.perks.length) {
        perksHtml = `<ul class="arkana-perk-list">${data.perks.map(p => `<li>${p}</li>`).join('')}</ul>`;
    } else {
        perksHtml = '<span>No perks available.</span>';
    }

    return `
    <div class="arkana-archetype-section">
        <div class="arkana-section-subtitle">Powers:</div> ${powersHtml}
        ${commonHtml}
        <div class="arkana-section-subtitle">Perks:</div> ${perksHtml}
    </div>
    `;
}

function renderArchetypeSelect() {
    return `
    <div style="margin-bottom: 1em;">
        <label for="archetype-select"><strong>Choose Archetype:</strong></label>
        <select id="archetype-select">
            ${Object.keys(archetypeData).map(a => `<option value="${a}" ${selectedArchetype===a?'selected':''}>${a}</option>`).join('')}
        </select>
    </div>
    `;
}

// Main render function
function renderCharacterCreator() {
    document.getElementById('ark-wizard').innerHTML = `
        <div class="arkana-title">Arkana Character Creator</div>
        ${renderArchetypeSelect()}
        <div class="arkana-section-title">Stats</div>
        ${renderStatRows()}
        <div class="arkana-section-title">Cybernetics</div>
        ${renderCyberneticSection()}
        <div class="arkana-section-title">Archetype Powers & Perks</div>
        ${renderArchetypeSection()}
    `;

    // Stat change handlers
    document.querySelectorAll('.arkana-stat-value').forEach(input => {
        input.addEventListener('input', e => {
            const idx = parseInt(e.target.getAttribute('data-stat'));
            let val = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
            stats[idx].value = val;
            renderCharacterCreator();
        });
    });

    // Cybernetic slot handler
    document.getElementById('cybernetic-input').addEventListener('input', e => {
        cyberneticSlots = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
        renderCharacterCreator();
    });

    // Archetype select handler
    document.getElementById('archetype-select').addEventListener('change', e => {
        selectedArchetype = e.target.value;
        renderCharacterCreator();
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    renderCharacterCreator();
});
