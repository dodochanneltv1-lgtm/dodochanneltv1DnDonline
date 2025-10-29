// Javascript/player-dashboard-script.js - COMPLETE CORRECTED VERSION (vFinal)
// (อัปเดต: แก้ไข Logic สกิลติดตัวจอมมารใน performDamageRoll)

let allPlayersInRoom = {};
let allEnemiesInRoom = {};
let combatState = {};
// Define weapon proficiencies for classes
const CLASS_WEAPON_PROFICIENCY = {
    'นักรบ': ['ดาบ', 'ขวาน', 'ดาบใหญ่', 'หอก'],
    'โจร': ['มีด', 'ธนู', 'หน้าไม้', 'ดาบสั้น'],
    'นักฆ่า': ['มีด', 'ดาบสั้น', 'อาวุธซัด'],
    'เรนเจอร์': ['ธนู', 'หน้าไม้', 'ดาบ'],
    'นักเวท': ['คทา', 'ไม้เท้า', 'หนังสือเวท'],
    'นักบวช': ['ค้อน', 'กระบอง', 'โล่'],
    'อัศวิน': ['ดาบ', 'หอก', 'โล่'],
    'อัศวินศักดิ์สิทธิ์': ['ดาบใหญ่', 'ค้อน', 'โล่'],
    'บาร์บาเรียน': ['ขวาน', 'ดาบใหญ่', 'อาวุธทื่อ'],
    'นักดาบเวทย์': ['ดาบ', 'คทา'],
    'ผู้กล้า': ['ดาบ', 'ดาบใหญ่', 'โล่'],
    // Add other classes as needed
};
// Define weapons that use Dexterity for attack/damage bonus
const DEX_WEAPONS = ['มีด', 'ธนู', 'หน้าไม้', 'ดาบสั้น', 'อาวุธซัด'];


// =================================================================================
// ส่วนที่ 1: Utility & Calculation Functions
// =================================================================================
// Make sure getStatBonus is defined globally or imported if needed elsewhere
// Assuming getStatBonus exists from skills-data.js or another common file
// function getStatBonus(statValue) { return Math.floor((statValue - 10) / 2); }

function showCustomAlert(message, iconType = 'info') { Swal.fire({ title: iconType === 'success' ? 'สำเร็จ!' : '⚠️ แจ้งเตือน!', text: message, icon: iconType }); }

function calculateHP(charData, finalCon) {
    const racialBaseHP = { 'มนุษย์': 10, 'เอลฟ์': 8, 'คนแคระ': 12, 'ฮาล์ฟลิ่ง': 8, 'ไทฟลิ่ง': 9, 'แวมไพร์': 9, 'เงือก': 10, 'ออร์ค': 14, 'โนม': 7, 'เอลฟ์ดำ': 8, 'นางฟ้า': 6, 'มาร': 11, 'โกเลม': 18, 'อันเดด': 25, 'ครึ่งมังกร': 20, 'มังกร': 40, 'ครึ่งเทพ': 30, 'พระเจ้า': 100 };
    const classBaseHP = { 'บาร์บาเรียน': 16, 'แทงค์': 25, 'นักรบ': 12, 'นักดาบเวทย์': 10, 'อัศวิน': 13, 'อัศวินศักดิ์สิทธิ์': 14, 'ผู้กล้า': 18, 'นักเวท': 4, 'นักบวช': 8, 'นักบุญหญิง': 9, 'สตรีศักดิ์สิทธิ์': 10, 'โจร': 8, 'นักฆ่า': 11, 'เรนเจอร์': 10, 'พ่อค้า': 6, 'นักปราชญ์': 4, 'เจ้าเมือง': 15, 'จอมมาร': 22, 'เทพเจ้า': 50 };
    const conModifier = typeof getStatBonus !== 'undefined' ? getStatBonus(finalCon) : Math.floor((finalCon - 10) / 2); // Use helper if available
    const raceHP = racialBaseHP[charData?.race] || 8;
    const classHP = classBaseHP[charData?.class] || 6;
    let baseHp = raceHP + classHP + conModifier;
    // Future: Add logic for % HP buffs/passives if needed
    return Math.max(1, baseHp); // Ensure HP is at least 1
}


function calculateTotalStat(charData, statKey) {
    if (!charData || !charData.stats) return 0;
    const stats = charData.stats; const upperStatKey = statKey.toUpperCase();
    const permanentLevel = charData.level || 1; 
    
    // [ ⭐️ FIX ⭐️ ] แก้ไขการอ่าน tempLevel (บัฟเลเวลนักปราชญ์)
    let tempLevel = 0;
    if (Array.isArray(charData.activeEffects)) {
         charData.activeEffects.forEach(effect => {
             if (effect.stat === 'Level' && effect.modType === 'FLAT') {
                 tempLevel += (effect.amount || 0);
             }
         });
    }
    
    const totalLevel = permanentLevel + tempLevel;
    let baseStatValue = (stats.baseRaceStats?.[upperStatKey] || 0) + (stats.baseClassStats?.[upperStatKey] || 0) + (stats.investedStats?.[upperStatKey] || 0) + (stats.tempStats?.[upperStatKey] || 0);

    // Calculate passives (simplified for dashboard - focus on self buffs)
    const allSkills = [...(SKILLS_DATA[charData.class] || []), ...(SKILLS_DATA[charData.race] || [])];
    allSkills.forEach(skill => {
        if (skill.skillTrigger === 'PASSIVE' && skill.effect && (skill.targetType === 'self' || skill.targetType === 'team')) {
             // [ ⭐️ FIX ⭐️ ] เพิ่มการอ่านออร่าดีบัฟของจอมมาร
             if (skill.effect.type === 'AURA_STAT_DEBUFF_PERCENT' && skill.targetType === 'enemy_all') {
                 // (Logic นี้ควรไปอยู่ที่ศัตรู แต่ถ้า DM Panel คำนวณฝั่งผู้เล่น ก็ต้องใส่)
                 // baseStatValue -= baseStatValue * (skill.effect.amount / 100);
             }
             else if (skill.effect.type === 'AURA_STAT_BUFF_PERCENT' || skill.effect.type === 'PASSIVE_STAT_BUFF_PERCENT') {
                 (skill.effect.stats || []).forEach(mod => {
                    if (mod.stat === upperStatKey && mod.type === 'PERCENT') {
                        baseStatValue += baseStatValue * (mod.amount / 100);
                    }
                 });
            }
             // Add other passive skill calculations affecting self here
        }
    });

    let flatBonus = 0; let percentBonus = 0; let setValue = null;
    if (Array.isArray(charData.activeEffects)) {
         charData.activeEffects.forEach(effect => {
             if (effect.stat === upperStatKey) {
                 if (effect.modType === 'FLAT') { flatBonus += (effect.amount || 0); }
                 else if (effect.modType === 'PERCENT') { percentBonus += (effect.amount || 0); }
                 else if (effect.modType === 'SET_VALUE') {
                     setValue = (effect.amount !== undefined ? effect.amount : null);
                 }
             }
         });
    }

    let finalStat;
    if (setValue !== null) {
        finalStat = setValue; 
    } else {
        let equipBonus = 0;
        if (charData.equippedItems) { for (const slot in charData.equippedItems) { const item = charData.equippedItems[slot]; if (item && item.bonuses && item.bonuses[upperStatKey]) { equipBonus += item.bonuses[upperStatKey]; } } }

        let statAfterPercent = baseStatValue * (1 + (percentBonus / 100));
        finalStat = statAfterPercent + flatBonus + equipBonus;

        if (finalStat > 0 && totalLevel > 1) {
             const levelBonus = finalStat * (totalLevel - 1) * 0.2; finalStat += levelBonus;
        }
    }

    const mainWeapon = charData.equippedItems?.mainHand; const offHandItem = charData.equippedItems?.offHand;
    if (mainWeapon) { const isDexWeapon = DEX_WEAPONS.includes(mainWeapon.weaponType); const relevantStat = isDexWeapon ? 'DEX' : 'STR'; if (upperStatKey === relevantStat) { if (mainWeapon.classBonus) finalStat += 3; else if (mainWeapon.proficiencyPenalty) finalStat -= 2; } }
    if (offHandItem && offHandItem.itemType === 'อาวุธ' && upperStatKey === 'DEX') { finalStat -= 2; }

    return Math.floor(finalStat); // Return final calculated stat
}


// =================================================================================
// ส่วนที่ 2: Display Functions
// =================================================================================
const CHARACTER_INFO_HTML = `
    <h2>ข้อมูลตัวละคร</h2>
    <p><strong>ชื่อ:</strong> <span id="name"></span></p>
    <p><strong>เผ่าพันธุ์:</strong> <span id="race"></span></p>
    <p><strong>อายุ:</strong> <span id="age"></span></p>
    <p><strong>เพศ:</strong> <span id="gender"></span></p>
    <p><strong>อาชีพ:</strong> <span id="class"></span></p>
    <details><summary><strong>ภูมิหลัง (คลิกเพื่อดู)</strong></summary>
        <p id="background" style="margin-top: 5px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px;"></p>
    </details>
    <p><strong>เลเวล:</strong> <span id="level"></span></p>
    <div style="margin: 5px 0;"><small><strong>EXP:</strong>
    <span id="exp">0</span> / <span id="expToNextLevel">300</span></small>
    <div style="background-color: #333; border-radius: 5px; padding: 2px;">
    <div id="expBar" style="height: 8px; width: 0%; background-color: #00bcd4; border-radius: 3px; transition: width 0.5s ease-in-out;"></div></div></div>
    <p><strong>พลังชีวิต:</strong> <span id="hp"></span></p>
    <ul>
        <li>พลังโจมตี (STR): <span id="str"></span></li>
        <li>ความคล่องแคล่ว (DEX): <span id="dex"></span></li>
        <li>ความทนทาน (CON): <span id="con"></span></li>
        <li>สติปัญญา (INT): <span id="int"></span></li>
        <li>จิตใจ (WIS): <span id="wis"></span></li>
        <li>เสน่ห์ (CHA): <span id="cha"></span></li>
    </ul>
    <div id="effectsContainer" style="margin-top: 15px;"></div>
`;

function updateCharacterStatsDisplay(charData) {
    if (!charData) return; const statsKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    statsKeys.forEach(key => {
        const el = document.getElementById(key.toLowerCase());
        if(el) {
             const currentValue = parseInt(el.textContent || "0");
             const newValue = calculateTotalStat(charData, key); // Recalculate stat value *every time* for display
             if (newValue > currentValue) el.classList.add('stat-up');
             else if (newValue < currentValue) el.classList.add('stat-down');
             el.textContent = newValue;
             if (newValue !== currentValue) setTimeout(() => el.classList.remove('stat-up', 'stat-down'), 1500);
        }
    });
    // Recalculate CON and then MaxHP for display
    const finalCon = calculateTotalStat(charData, 'CON');
    const displayMaxHp = calculateHP(charData, finalCon); // Use the full charData object
    const hpEl = document.getElementById('hp');
    if (hpEl) {
        // Ensure current HP doesn't visually exceed calculated max HP
        const currentHp = Math.min(charData.hp || 0, displayMaxHp);
        hpEl.textContent = `${currentHp} / ${displayMaxHp}`;
    }
    
    // [ ⭐️ FIX ⭐️ ] แสดงเลเวลรวมบัฟ (ถ้ามี)
    const permanentLevel = charData.level || 1;
    let tempLevel = 0;
    if (Array.isArray(charData.activeEffects)) {
         charData.activeEffects.forEach(effect => {
             if (effect.stat === 'Level' && effect.modType === 'FLAT') {
                 tempLevel += (effect.amount || 0);
             }
         });
    }
    const levelEl = document.getElementById('level'); 
    if (levelEl) {
        if (tempLevel > 0) {
            levelEl.textContent = `${permanentLevel} (+${tempLevel})`;
            levelEl.classList.add('stat-up');
        } else {
            levelEl.textContent = permanentLevel;
            levelEl.classList.remove('stat-up');
        }
    }
    // [ ⭐️ END FIX ⭐️ ]
    
    const currentExp = charData.exp || 0; const expForNext = charData.expToNextLevel || 300;
    const expEl = document.getElementById('exp'); if (expEl) expEl.textContent = currentExp;
    const expNextEl = document.getElementById('expToNextLevel'); if (expNextEl) expNextEl.textContent = expForNext;
    const expBarEl = document.getElementById('expBar'); if (expBarEl) expBarEl.style.width = `${Math.min(100, (currentExp / expForNext) * 100)}%`;
    const upgradeButton = document.getElementById("goToStatsButton"); const freePoints = charData.freeStatPoints || 0;
    if (upgradeButton) { upgradeButton.style.display = freePoints > 0 ? 'block' : 'none'; if (freePoints > 0) upgradeButton.textContent = `✨ อัปเกรดสถานะ (${freePoints} แต้ม) ✨`; }
}


function displayActiveEffects(charData, combatState) {
    const container = document.getElementById("effectsContainer"); if (!container) return; container.innerHTML = "<h4>สถานะและคูลดาวน์</h4>"; let hasEffect = false;
    const effects = charData.activeEffects || []; if (effects.length > 0) { hasEffect = true; effects.forEach(effect => { const modText = effect.modType === 'PERCENT' ? `${effect.amount}%` : (effect.modType === 'SET_VALUE' ? `= ${effect.amount}` : `${effect.amount >= 0 ? '+' : ''}${effect.amount}`); container.innerHTML += `<p class="effect-buff"><strong>${effect.name || effect.skillId}</strong>: ${effect.stat} ${modText} (เหลือ ${effect.turnsLeft} เทิร์น)</p>`; }); }
    const cooldowns = charData.skillCooldowns || {}; const currentTurn = (typeof combatState !== 'undefined' && combatState && typeof combatState.currentTurnIndex === 'number') ? combatState.currentTurnIndex : 0;
    for (const skillId in cooldowns) {
        const turnEnds = cooldowns[skillId];
        if (turnEnds > currentTurn) {
            hasEffect = true;
            const skillName = SKILLS_DATA[charData.class]?.find(s=>s.id===skillId)?.name || SKILLS_DATA[charData.race]?.find(s=>s.id===skillId)?.name || ITEM_SKILLS[charData.equippedItems?.mainHand?.name]?.find(s=>s.id===skillId)?.name || skillId;
            // --- [ EXCALIBUR CHECK ] ---
            let cooldownText;
            if (skillId === 'item_excalibur_strike' && turnEnds > currentTurn + 500) { // Check if it's the long cooldown
                cooldownText = "(ติดคูลดาวน์ข้ามการต่อสู้)"; // Display special text
            } else {
                cooldownText = `(รอ ${turnEnds - currentTurn} เทิร์น)`; // Standard turn display
            }
            // --- [ END CHECK ] ---
            container.innerHTML += `<p class="effect-cooldown"><strong>(CD) ${skillName}</strong>: ${cooldownText}</p>`;
        }
    }
    const combatUses = charData.combatSkillUses || {}; 
    for (const skillId in combatUses) { 
        const skillData = SKILLS_DATA[charData.class]?.find(s => s.id === skillId) || SKILLS_DATA[charData.race]?.find(s => s.id === skillId) || ITEM_SKILLS[charData.equippedItems?.mainHand?.name]?.find(s=>s.id===skillId); 
        if (skillData && skillData.cooldown && skillData.cooldown.type === 'PER_COMBAT') { const uses = combatUses[skillId] || 0; if (uses >= skillData.cooldown.uses) { hasEffect = true; container.innerHTML += `<p class="effect-cooldown"><strong>(CD) ${skillData.name}</strong>: (ใช้ครบแล้ว)</p>`; } } 
        // [ ⭐️ FIX ⭐️ ] เช็ค Cooldown แบบ 'successCooldown'
        if (skillData && skillData.successCooldown && skillData.successCooldown.type === 'PER_COMBAT' && skillId.endsWith('_success')) {
             const uses = combatUses[skillId] || 0;
             if (uses >= skillData.successCooldown.uses) {
                 hasEffect = true;
                 container.innerHTML += `<p class="effect-cooldown"><strong>(CD) ${skillData.name}</strong>: (ใช้ครบแล้ว)</p>`;
             }
        }
    }
    if (!hasEffect) container.innerHTML += "<p><small><em>ไม่มีสถานะหรือคูลดาวน์</em></small></p>";
}

function displayCharacter(character, combatState) {
    const infoPanel = document.getElementById("characterInfoPanel"); if (infoPanel && !infoPanel.querySelector('#name')) infoPanel.innerHTML = CHARACTER_INFO_HTML;
    document.getElementById("name").textContent = character.name || "-"; document.getElementById("race").textContent = character.race || "-"; document.getElementById("age").textContent = character.age || "-"; document.getElementById("gender").textContent = character.gender || "-"; document.getElementById("class").textContent = character.class || "-"; document.getElementById("background").textContent = character.background || "ไม่มีข้อมูล";
    updateCharacterStatsDisplay(character); displayActiveEffects(character, combatState);
}

function handlePendingAttack(attackData, playerRef) {
    const currentUserUid = playerRef.key; if (!attackData || !attackData.attackerName) { playerRef.child('pendingAttack').remove(); return; }
    const acForDisplay = typeof calculateTotalStat !== 'undefined' ? (10 + Math.floor((calculateTotalStat(allPlayersInRoom[currentUserUid], 'DEX') - 10) / 2)) : '??';

    Swal.fire({ title: `คุณถูกโจมตี!`, html: `<strong>${attackData.attackerName}</strong> กำลังโจมตีคุณ (ค่าโจมตี: ${attackData.attackRollValue} vs AC คุณ: ${acForDisplay})<br>คุณจะทำอะไร?`, icon: 'warning', showCancelButton: true, confirmButtonText: '🛡️ ป้องกัน (Block)', cancelButtonText: '🏃 หลบ (Dodge)', showDenyButton: true, denyButtonText: '😑 ไม่ทำอะไร', timer: 10000, timerProgressBar: true, allowOutsideClick: false, }).then(async (result) => {
        const snapshot = await playerRef.get(); const playerData = snapshot.val(); let defenseResponse = { defenderUid: currentUserUid, attackerKey: attackData.attackerKey, attackRollValue: attackData.attackRollValue }; let feedbackTitle = '', feedbackHtml = '';
        if (result.isConfirmed) { const blockRoll = Math.floor(Math.random() * 20) + 1; const totalCon = typeof calculateTotalStat !== 'undefined' ? calculateTotalStat(playerData, 'CON') : 10; const conBonus = typeof getStatBonus !== 'undefined' ? getStatBonus(totalCon) : 0; const totalBlock = blockRoll + conBonus; const damageReduction = Math.floor(totalBlock / 3); defenseResponse.choice = 'block'; defenseResponse.roll = totalBlock; defenseResponse.damageReduced = damageReduction; feedbackTitle = '🛡️ ผลการป้องกัน! 🛡️'; feedbackHtml = `คุณทอยค่าป้องกันได้ <strong>${totalBlock}</strong>.<br>คุณลดความเสียหายที่ได้รับลง <strong>${damageReduction}</strong> หน่วย!`; }
        else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) { const dodgeRoll = Math.floor(Math.random() * 20) + 1; const totalDex = typeof calculateTotalStat !== 'undefined' ? calculateTotalStat(playerData, 'DEX') : 10; const dexBonus = typeof getStatBonus !== 'undefined' ? getStatBonus(totalDex) : 0; const totalDodge = dodgeRoll + dexBonus; const isSuccess = totalDodge > attackData.attackRollValue; defenseResponse.choice = 'dodge'; defenseResponse.roll = totalDodge; defenseResponse.success = isSuccess; feedbackTitle = '🏃 ผลการหลบหลีก! 🏃'; feedbackHtml = isSuccess ? `คุณทอยค่าหลบหลีกได้ <strong>${totalDodge}</strong>...<br><strong style="color: #4caf50;">หลบหลีกได้สมบูรณ์!</strong>` : `คุณทอยค่าหลบหลีกได้ <strong>${totalDodge}</strong>...<br><strong style="color: #f44336;">หลบหลีกไม่พ้น!</strong>`; }
        else { defenseResponse.choice = 'none'; feedbackTitle = '😑 ไม่ป้องกัน 😑'; feedbackHtml = 'คุณเลือกที่จะไม่ป้องกันการโจมตีนี้'; }
        Swal.fire({ title: feedbackTitle, html: feedbackHtml, icon: 'info', timer: 3500, timerProgressBar: true, showConfirmButton: false });
        const roomId = sessionStorage.getItem('roomId'); await db.ref(`rooms/${roomId}/combat/resolution`).set(defenseResponse); await playerRef.child('pendingAttack').remove();
    });
}

function updateTurnDisplay(state, currentUserUid) {
    const indicator = document.getElementById('turnIndicator'); const attackButton = document.getElementById('attackRollButton'); const skillButton = document.getElementById('skillButton'); const damageRollSection = document.getElementById('damageRollSection');
    if (!state || !state.isActive) { if (indicator) indicator.classList.add('hidden'); if (attackButton) attackButton.disabled = true; if(skillButton) skillButton.disabled = true; if (damageRollSection) damageRollSection.style.display = 'none'; return; }
    if (indicator) indicator.classList.remove('hidden'); const currentTurnUnit = state.turnOrder[state.currentTurnIndex];
    const isMyTurn = currentTurnUnit.id === currentUserUid;
    if (isMyTurn) { if (indicator) { indicator.className = 'my-turn'; indicator.textContent = '🔥 เทิร์นของคุณ! 🔥'; } if (attackButton) attackButton.disabled = false; if (skillButton) skillButton.disabled = false; }
    else { if (indicator) { indicator.className = 'other-turn'; indicator.textContent = `กำลังรอเทิร์นของ... ${currentTurnUnit.name}`; } if (attackButton) attackButton.disabled = true; if (skillButton) skillButton.disabled = true; if (damageRollSection) damageRollSection.style.display = 'none'; }
}

function displayInventory(inventory = []) { const list = document.getElementById("inventory"); if(!list) return; list.innerHTML = inventory.length === 0 ? "<li>ยังไม่มีไอเทม</li>" : ""; inventory.forEach((item, index) => { if (!item || !item.name) return; const li = document.createElement("li"); let itemText = `${item.name} (x${item.quantity})`; const escapedName = item.name.replace(/'/g, "\\'"); if (item.itemType === 'สวมใส่' || item.itemType === 'อาวุธ') itemText += ` <button onclick="equipItem('${escapedName}')" style="margin-left: 10px; padding: 2px 8px; font-size: 0.8em;">สวมใส่</button>`; else if (item.itemType === 'บริโภค') itemText += ` <button onclick="useConsumableItem(${index})" style="margin-left: 10px; padding: 2px 8px; font-size: 0.8em; background-color: #28a745;">ใช้</button>`; li.innerHTML = itemText; list.appendChild(li); }); }

async function equipItem(itemName) { const uid = firebase.auth().currentUser?.uid; const roomId = sessionStorage.getItem('roomId'); if (!uid || !roomId) return; const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`); const snapshot = await playerRef.get(); if (!snapshot.exists()) return; const charData = snapshot.val(); let { inventory = [], equippedItems = {} } = charData; const itemIdx = inventory.findIndex(i => i.name === itemName && (i.itemType === 'สวมใส่' || i.itemType === 'อาวุธ')); if (itemIdx === -1) return showCustomAlert('ไม่พบไอเทมที่ต้องการสวมใส่ หรือไอเทมไม่ใช่ประเภทสวมใส่/อาวุธ', 'error'); const itemToEquip = { ...inventory[itemIdx] }; const processEquip = async (targetSlot) => { if (equippedItems[targetSlot]) { const itemToUnequip = { ...equippedItems[targetSlot] }; const baseItemToReturn = { ...itemToUnequip, bonuses: { ...(itemToUnequip.originalBonuses || itemToUnequip.bonuses) }, quantity: 1 }; delete baseItemToReturn.classBonus; delete baseItemToReturn.proficiencyPenalty; delete baseItemToReturn.offHandPenalty; const existingIdx = inventory.findIndex(i => i.name === baseItemToReturn.name && JSON.stringify(i.originalBonuses || {}) === JSON.stringify(baseItemToReturn.bonuses || {})); if (existingIdx > -1) inventory[existingIdx].quantity++; else inventory.push(baseItemToReturn); } delete itemToEquip.classBonus; delete itemToEquip.offHandPenalty; delete itemToEquip.proficiencyPenalty; if (itemToEquip.itemType === 'อาวุธ') { if (targetSlot === 'mainHand') { if (itemToEquip.recommendedClass && itemToEquip.recommendedClass.includes(charData.class)) itemToEquip.classBonus = true; else if (itemToEquip.recommendedClass && itemToEquip.recommendedClass.length > 0 && !(CLASS_WEAPON_PROFICIENCY[charData.class]?.includes(itemToEquip.weaponType))) itemToEquip.proficiencyPenalty = true; } else if (targetSlot === 'offHand') itemToEquip.offHandPenalty = true; } equippedItems[targetSlot] = { ...itemToEquip, quantity: 1 }; const originalItemIndexInInventory = inventory.findIndex(i => i.name === itemName && (i.itemType === 'สวมใส่' || i.itemType === 'อาวุธ')); if (originalItemIndexInInventory !== -1) { if (inventory[originalItemIndexInInventory].quantity > 1) inventory[originalItemIndexInInventory].quantity--; else inventory.splice(originalItemIndexInInventory, 1); } await playerRef.update({ inventory, equippedItems }); showCustomAlert(`สวมใส่ ${itemToEquip.name} สำเร็จ!`, 'success'); }; if (itemToEquip.itemType === 'อาวุธ') Swal.fire({ title: 'เลือกช่องสวมใส่', text: `คุณต้องการสวมใส่ ${itemName} ที่ไหน?`, showDenyButton: true, confirmButtonText: 'มือหลัก (Main Hand)', denyButtonText: 'มือรอง (Off-Hand)', }).then((result) => { if (result.isConfirmed) processEquip('mainHand'); else if (result.isDenied) processEquip('offHand'); }); else if (itemToEquip.slot) processEquip(itemToEquip.slot); else showCustomAlert('ไอเทมนี้ไม่สามารถสวมใส่ได้ (ไม่มีช่อง)', 'error'); }

async function unequipItem(slot) { const uid = firebase.auth().currentUser?.uid; const roomId = sessionStorage.getItem('roomId'); if (!uid || !roomId) return; const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`); const snapshot = await playerRef.get(); if (!snapshot.exists()) return; const charData = snapshot.val(); let { inventory = [], equippedItems = {} } = charData; const itemToUnequip = equippedItems[slot]; if (!itemToUnequip) return; const baseItem = { ...itemToUnequip, bonuses: { ...(itemToUnequip.originalBonuses || itemToUnequip.bonuses) }, quantity: 1 }; delete baseItem.classBonus; delete baseItem.offHandPenalty; delete baseItem.proficiencyPenalty; const existingIdx = inventory.findIndex(i => i.name === baseItem.name && JSON.stringify(i.originalBonuses || {}) === JSON.stringify(baseItem.bonuses || {})); if (existingIdx > -1) inventory[existingIdx].quantity++; else inventory.push(baseItem); equippedItems[slot] = null; await playerRef.update({ inventory, equippedItems }); showCustomAlert(`ถอด ${baseItem.name} ออกแล้ว`, 'info'); }

function displayEquippedItems(equipped = {}) { const slots = ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet']; slots.forEach(slot => { const item = equipped[slot]; const el = document.getElementById(`eq-${slot}`); const btn = el?.nextElementSibling; if (el) el.textContent = item?.name || '-'; if (btn) btn.style.display = item ? 'inline-block' : 'none'; }); }

function displayTeammates(currentUserUid) { const select = document.getElementById('teammateSelect'); if(!select) return; const currentSelection = select.value; select.innerHTML = '<option value="">-- เลือกดูข้อมูล --</option>'; for (const uid in allPlayersInRoom) if (uid !== currentUserUid) select.innerHTML += `<option value="${uid}">${allPlayersInRoom[uid].name}</option>`; select.value = currentSelection; }

function showTeammateInfo() { const infoDiv = document.getElementById('teammateInfo'); const select = document.getElementById('teammateSelect'); if (!infoDiv || !select) return; const selectedUid = select.value; if (!selectedUid || !allPlayersInRoom[selectedUid]) { infoDiv.innerHTML = "<p>เลือกเพื่อนร่วมทีมเพื่อดูข้อมูล</p>"; return; } const player = allPlayersInRoom[selectedUid]; const displayMaxHp = typeof calculateHP !== 'undefined' ? calculateHP(player, typeof calculateTotalStat !== 'undefined' ? calculateTotalStat(player, 'CON'):10): (player.maxHp || '??'); infoDiv.innerHTML = `<p><strong>ชื่อ:</strong> ${player.name}</p><p><strong>HP:</strong> ${player.hp}/${displayMaxHp}</p>`; }

function displayQuest(quest) { if(document.getElementById("questTitle")) document.getElementById("questTitle").textContent = quest?.title || "ไม่มีเควส"; if(document.getElementById("questDetail")) document.getElementById("questDetail").textContent = quest?.detail || "-"; if(document.getElementById("questReward")) document.getElementById("questReward").textContent = quest?.reward || "-"; }

function displayStory(storyData) { if(document.getElementById("story")) document.getElementById("story").textContent = storyData || "ยังไม่มีเนื้อเรื่องจาก DM"; }

function displayEnemies(enemies = {}, currentUserUid) { const container = document.getElementById('enemyPanelContainer'); const targetSelect = document.getElementById('enemyTargetSelect'); if (!container || !targetSelect) return; const myEnemies = Object.entries(enemies).filter(([key, enemy]) => enemy.targetUid === currentUserUid || enemy.targetUid === 'shared').map(([key, enemy]) => ({ key, ...enemy })); container.innerHTML = ''; targetSelect.innerHTML = '<option value="">-- เลือกเป้าหมาย --</option>'; if (myEnemies.length === 0) { container.innerHTML = '<p><em>ไม่มีศัตรูที่กำลังต่อสู้กับคุณ</em></p>'; return; } myEnemies.forEach(enemy => { const enemyKey = enemy.key; const targetText = enemy.targetUid === 'shared' ? 'ศัตรูร่วม' : 'เป้าหมายคุณ'; container.innerHTML += `<div style="border: 1px solid #dc3545; padding: 5px; margin-bottom: 5px; border-radius: 3px; background-color: rgba(255, 0, 0, 0.1);"><strong>${enemy.name}</strong> (HP: ${enemy.hp}/${enemy.maxHp || '??'})<br><small>เป้าหมาย: ${targetText}</small></div>`; targetSelect.innerHTML += `<option value="${enemyKey}">${enemy.name} (HP: ${enemy.hp})</option>`; }); }

function addToCombatLog(message) { const log = document.getElementById('combatLog'); if (log) { log.innerHTML += `<p>${message}</p>`; log.scrollTop = log.scrollHeight; } }

// =================================================================================
// ส่วนที่ 3: Core Logic
// =================================================================================
async function playerRollDice() { const diceType = parseInt(document.getElementById("diceType").value); const diceCount = parseInt(document.getElementById("diceCount").value); const rollButton = document.querySelector('button[onclick="playerRollDice()"]'); const rollData = typeof showDiceRollAnimation === 'function' ? await showDiceRollAnimation(diceCount, diceType, 'player-dice-animation-area', 'dice-result', rollButton) : { results: [] }; const roomId = sessionStorage.getItem('roomId'); const playerName = document.getElementById('name').textContent; if (roomId && playerName) { const logEntry = { name: playerName, dice: diceType, count: diceCount, result: rollData.results, timestamp: new Date().toISOString(), type: 'general' }; db.ref(`rooms/${roomId}/diceLogs`).push(logEntry); } }

async function performAttackRoll() {
    const uid = firebase.auth().currentUser?.uid; if (!uid || !combatState || !combatState.isActive || combatState.turnOrder[combatState.currentTurnIndex].id !== uid) return showCustomAlert("ยังไม่ถึงเทิร์นของคุณ!", 'warning'); const selectedEnemyKey = document.getElementById('enemyTargetSelect').value; if (!selectedEnemyKey) return showCustomAlert("กรุณาเลือกเป้าหมาย!", 'warning'); const roomId = sessionStorage.getItem('roomId'); const enemyData = allEnemiesInRoom[selectedEnemyKey]; const playerData = allPlayersInRoom[uid]; if (!enemyData || !playerData) return showCustomAlert("ไม่พบข้อมูลเป้าหมายหรือผู้เล่น!", 'error');
    document.getElementById('attackRollButton').disabled = true; document.getElementById('skillButton').disabled = true;
    const enemyAC = 10 + Math.floor(((enemyData.stats?.DEX || 10) - 10) / 2); const roll = Math.floor(Math.random() * 20) + 1; const mainWeapon = playerData.equippedItems?.mainHand; const isDexWeapon = mainWeapon && DEX_WEAPONS.includes(mainWeapon.weaponType); const attackStat = isDexWeapon ? 'DEX' : 'STR'; const attackBonus = Math.floor((calculateTotalStat(playerData, attackStat) - 10) / 2);
    const hasTrueStrike = (playerData.activeEffects || []).some(e => e.stat === 'AttackRoll' && e.modType === 'GUARANTEED_HIT');
    const totalAttack = hasTrueStrike ? 99 : roll + attackBonus;
    const resultCard = document.getElementById('rollResultCard'); resultCard.classList.remove('hidden'); const outcomeText = totalAttack >= enemyAC ? '✅ โจมตีโดน!' : '💥 โจมตีพลาด!';
    let rollText = `ทอย (d20): ${roll} + ${attackStat} Bonus: ${attackBonus} = <strong>${roll + attackBonus}</strong>`;
    if(hasTrueStrike) rollText = `<strong style="color:#00ffff;">หัตถ์พระเจ้าทำงาน!</strong> โจมตีโดนแน่นอน!`;
    resultCard.innerHTML = `<h4>ผลการโจมตี: ${enemyData.name}</h4><p>${rollText}</p><p>AC ศัตรู: ${enemyAC}</p><p class="outcome">${outcomeText}</p>`; resultCard.className = `result-card ${totalAttack >= enemyAC ? 'hit' : 'miss'}`;
    if (totalAttack >= enemyAC) { document.getElementById('damageWeaponName').textContent = mainWeapon?.name || "มือเปล่า"; document.getElementById('damageDiceInfo').textContent = mainWeapon?.damageDice || "d4"; document.getElementById('damageRollSection').style.display = 'block'; }
    else { setTimeout(async () => { await endPlayerTurn(uid, roomId); resultCard.classList.add('hidden'); }, 2000); }
}

async function performDamageRoll() {
    const uid = firebase.auth().currentUser?.uid; const roomId = sessionStorage.getItem('roomId'); const selectedEnemyKey = document.getElementById('enemyTargetSelect').value; if (!uid || !roomId || !selectedEnemyKey) return;
    document.getElementById('damageRollSection').style.display = 'none';
    const enemyRef = db.ref(`rooms/${roomId}/enemies/${selectedEnemyKey}`); const enemySnapshot = await enemyRef.get(); const playerData = allPlayersInRoom[uid]; if (!enemySnapshot.exists() || !playerData) return; const enemyData = enemySnapshot.val();
    const mainWeapon = playerData.equippedItems?.mainHand; const diceTypeString = mainWeapon?.damageDice || 'd4'; const diceType = parseInt(diceTypeString.replace('d', '')); const damageRoll = Math.floor(Math.random() * diceType) + 1; const isDexWeapon = mainWeapon && DEX_WEAPONS.includes(mainWeapon.weaponType); const damageStat = isDexWeapon ? 'DEX' : 'STR'; const damageBonus = Math.floor((calculateTotalStat(playerData, damageStat) - 10) / 2);

    // ==========================================================
    // [ ⭐️⭐️⭐️ START DEMON LORD FIX ⭐️⭐️⭐️ ]
    // ==========================================================
    
    // 1. คำนวณความเสียหายพื้นฐาน
    let totalDamage = Math.max(1, damageRoll + damageBonus);
    
    // 2. ดึงบัฟ/สกิลที่เกี่ยวข้องทั้งหมด
    const percentDamageEffect = (playerData.activeEffects || []).find(e => e.stat === 'OutgoingDamage' && e.modType === 'DAMAGE_AS_PERCENT'); // นักฆ่า
    const demonLordPassive = (playerData.class === 'จอมมาร') ? SKILLS_DATA['จอมมาร']?.find(s=>s.id==='demon_lord_passive_attack') : null; // จอมมาร
    const elementalEffect = (playerData.activeEffects || []).find(e => e.stat === 'WeaponDamage' && e.modType === 'ELEMENTAL_PERCENT'); // นักดาบเวทย์

    // 3. เริ่มสร้างข้อความอธิบาย
    let damageExplanation = `ทอย (${diceTypeString}): ${damageRoll} + ${damageStat} Bonus: ${damageBonus}`;

    // 4. ใช้สกิลนักฆ่า (ถ้ามี) - (จะทับความเสียหายพื้นฐาน)
    if(percentDamageEffect){ 
        const percentAmount = percentDamageEffect.amount; 
        totalDamage = Math.floor(totalDamage * (percentAmount / 100)); 
        damageExplanation += ` x ${percentAmount}% (${percentDamageEffect.name})`; 
    }

    // 5. ใช้สกิลนักดาบเวทย์ (ถ้ามี) - (จะบวกเพิ่มจากความเสียหายปัจจุบัน)
    if(elementalEffect) { 
        const elementalBonus = Math.floor(totalDamage * (elementalEffect.amount / 100)); 
        totalDamage += elementalBonus; 
        damageExplanation += ` + ${elementalBonus} (ธาตุ ${elementalEffect.amount}%)`; 
    }

    // 6. ใช้สกิลติดตัวจอมมาร (ถ้ามี) - (จะบวกเพิ่มแยกต่างหาก)
    if (demonLordPassive) {
        const targetCurrentHp = enemyData.hp || 0;
        // สูตร: (dอาวุธ / 100) * HP ศัตรู (dอาวุธ คือ damageRoll)
        const passiveHpDamage = Math.floor((damageRoll / 100) * targetCurrentHp);
        totalDamage += passiveHpDamage;
        damageExplanation += ` + ${passiveHpDamage} (จู่โจม %)`;
    }

    // 7. ทำให้แน่ใจว่าความเสียหายสุดท้ายอย่างน้อย 1
    totalDamage = Math.max(1, totalDamage);
    
    // ==========================================================
    // [ ⭐️⭐️⭐️ END DEMON LORD FIX ⭐️⭐️⭐️ ]
    // ==========================================================

    const resultCard = document.getElementById('rollResultCard'); resultCard.innerHTML = `<h4>ผลความเสียหาย: ${enemyData.name}</h4><p>${damageExplanation} = <strong>${totalDamage}</strong></p><p class="outcome">🔥 สร้างความเสียหาย ${totalDamage} หน่วย! 🔥</p>`; resultCard.className = 'result-card hit';
    const newHp = (enemyData.hp || 0) - totalDamage;
    setTimeout(async () => {
        if (newHp <= 0) { addToCombatLog(`🎉 ${enemyData.name} ถูกกำจัดแล้ว!`); await enemyRef.remove(); }
        else { await enemyRef.child('hp').set(newHp); }
        await endPlayerTurn(uid, roomId);
        resultCard.classList.add('hidden');
    }, 2000);
}

/**
 * [NEW] Function to display the outcome of a skill use in the result card
 */
function displaySkillOutcome(skill, targetData, outcome) {
    if (!outcome) return;

    const resultCard = document.getElementById('rollResultCard');
    resultCard.classList.remove('hidden');
    resultCard.className = 'result-card hit'; // Default to hit/success style

    let html = `<h4>ผลของสกิล: ${skill.name}</h4>`;
    if (targetData) {
        // Use targetData.name (player) or targetData.name (enemy)
        html += `<p>เป้าหมาย: ${targetData.name || targetData.uid}</p>`;
    }

    if (outcome.damageDealt > 0) {
        html += `<p class="outcome" style="color: #ff4d4d;">💥 สร้างความเสียหาย ${outcome.damageDealt} หน่วย! 💥</p>`;
        resultCard.className = 'result-card miss'; // Use miss style (red border) for damage
    } else if (outcome.healAmount > 0) {
        html += `<p class="outcome" style="color: #00ff00;">✨ ฟื้นฟู ${outcome.healAmount} HP! ✨</p>`;
        resultCard.className = 'result-card hit'; // Use hit style (green border) for healing
    } else if (outcome.statusApplied) {
        html += `<p class="outcome" style="color: #ffc107;">🌀 ${outcome.statusApplied}! 🌀</p>`;
        resultCard.className = 'result-card'; // Neutral border for status
         resultCard.style.borderColor = '#ffc107'; // Explicitly set yellow border
    } else {
        html += `<p class="outcome">สกิลทำงานสำเร็จ!</p>`; // Generic success
    }

    resultCard.innerHTML = html;

    // Hide the card after a delay
    setTimeout(() => {
        resultCard.classList.add('hidden');
         resultCard.style.borderColor = ''; // Reset border color
    }, 3000); // Hide after 3 seconds
}


async function showSkillModal() {
    const currentUserUid = firebase.auth().currentUser?.uid; const roomId = sessionStorage.getItem('roomId'); if (!currentUserUid || !roomId) return;
    showLoading("กำลังโหลดข้อมูลสกิล..."); let currentUser; let currentCombatStateForCheck;
    try {
        const roomSnap = await db.ref(`rooms/${roomId}`).get(); if (!roomSnap.exists()) { hideLoading(); return showCustomAlert('ไม่พบข้อมูลห้อง!', 'error'); } const roomData = roomSnap.val();
        currentUser = roomData.playersByUid?.[currentUserUid]; currentCombatStateForCheck = roomData.combat || {};
        if (!currentUser) { hideLoading(); return showCustomAlert('ไม่พบข้อมูลตัวละครของคุณในห้อง!', 'error'); }
         currentUser.uid = currentUserUid; // Add uid
        console.log("Fetched fresh room data for showSkillModal. Player:", JSON.parse(JSON.stringify(currentUser))); console.log("Fetched fresh room data for showSkillModal. Combat:", JSON.parse(JSON.stringify(currentCombatStateForCheck)));
    } catch (error) { hideLoading(); console.error("Error fetching room data for skills:", error); return showCustomAlert('เกิดข้อผิดพลาดในการโหลดข้อมูลสกิล', 'error'); } hideLoading();

    // [ ⭐️ START FIX ⭐️ ]
    // 1. ดึงสกิลคลาสและเผ่าเหมือนเดิม
    let allSkills = [...(SKILLS_DATA[currentUser.class] || []), ...(SKILLS_DATA[currentUser.race] || [])];
    
    // 2. ตรวจสอบอาวุธหลัก
    const mainHand = currentUser.equippedItems?.mainHand;
    
    // 3. ถ้ามีอาวุธหลัก และอาวุธนั้นมีชื่ออยู่ใน ITEM_SKILLS
    if (mainHand && ITEM_SKILLS[mainHand.name]) { 
        // 4. ให้ดึงสกิลจากอาวุธนั้นมาเพิ่มเข้าไปใน allSkills ด้วย
        ITEM_SKILLS[mainHand.name].forEach(itemSkill => {
            if (!allSkills.some(s => s.id === itemSkill.id)) {
                allSkills.push(itemSkill);
            }
        });
    }
    // [ ⭐️ END FIX ⭐️ ]

    // 5. กรองสกิลที่กดใช้ได้ (Active)
    const availableSkills = allSkills.filter(skill => skill.skillTrigger === 'ACTIVE');

    if (!availableSkills || availableSkills.length === 0) return showCustomAlert('คุณไม่มีสกิลที่สามารถใช้ได้', 'info');
    let skillButtonsHtml = '';
    availableSkills.forEach(skill => {
        const cdError = checkCooldown(currentUser, skill, currentCombatStateForCheck); // Pass fetched combat state
        const isDisabled = cdError !== null; const title = isDisabled ? cdError : skill.description;
        console.log(`Cooldown check for ${skill.id} using fetched data: Error='${cdError}', Disabled=${isDisabled}`); skillButtonsHtml += `<button class="swal2-styled" onclick="selectSkillTarget('${skill.id}')" style="margin: 5px; ${isDisabled ? 'background-color: #6c757d; cursor: not-allowed;' : ''}" title="${title}" ${isDisabled ? 'disabled' : ''}>${skill.name}</button>`;
    });
    Swal.fire({ title: 'เลือกสกิล', html: `<div>${skillButtonsHtml}</div>`, showConfirmButton: false, showCancelButton: true, cancelButtonText: 'ปิด' });
}

async function selectSkillTarget(skillId) {
    const currentUserUid = firebase.auth().currentUser?.uid;
    // Use global state for basic info, assume it's reasonably up-to-date for target selection UI
    const currentUser = allPlayersInRoom[currentUserUid];
    if (!currentUser) return showCustomAlert('ไม่พบข้อมูลผู้เล่น', 'error');

    // [ ⭐️ START FIX ⭐️ ]
    // ดึงสกิลทั้งหมด (รวมสกิลอาวุธ) เพื่อให้แน่ใจว่าหา skill ที่เลือกเจอ
    let allSkills = [...(SKILLS_DATA[currentUser.class] || []), ...(SKILLS_DATA[currentUser.race] || [])];
    const mainHand = currentUser.equippedItems?.mainHand;
    if (mainHand && ITEM_SKILLS[mainHand.name]) { 
        ITEM_SKILLS[mainHand.name].forEach(itemSkill => {
            if (!allSkills.some(s => s.id === itemSkill.id)) {
                allSkills.push(itemSkill);
            }
        });
    }
    // [ ⭐️ END FIX ⭐️ ]

    const skill = allSkills.find(s => s.id === skillId); if (!skill) return;
    let targetOptions = {}; let targetId = null; let options = {};

    // Populate targetOptions based on skill target type
    if (skill.targetType === 'self') {
        targetId = currentUserUid; // Set target ID directly
    } else if (skill.targetType.includes('teammate')) {
         for (const uid in allPlayersInRoom) {
             // Optionally exclude self if not explicitly allowed for teammate skills
             // if (uid !== currentUserUid || skill.canTargetSelf) {
                 targetOptions[uid] = allPlayersInRoom[uid].name;
             // }
         }
    } else if (skill.targetType.includes('enemy')) {
        const enemySelect = document.getElementById('enemyTargetSelect');
        for(const option of enemySelect.options) {
            if(option.value) targetOptions[option.value] = option.text; // Key is enemy key, Value is name (HP: ...)
        }
        if (Object.keys(targetOptions).length === 0) return showCustomAlert('ไม่มีศัตรูให้เลือก!', 'warning');
    }

    // Handle special inputs (like Cleric's selectable buff)
    if (skill.effect.type === 'SELECTABLE_TEMP_STAT_BUFF') {
        const statsOptions = { 'STR': 'STR', 'DEX': 'DEX', 'CON': 'CON', 'INT': 'INT', 'WIS': 'WIS', 'CHA': 'CHA' };
        const { value: selectedStats } = await Swal.fire({ title: `เลือกค่าสถานะ (สูงสุด ${skill.effect.maxChoicesPerTarget} อย่าง)`, html: `สกิล: ${skill.name}`, input: 'checkbox', inputOptions: statsOptions, showCancelButton: true, confirmButtonText: 'เลือกเป้าหมาย ➞', inputValidator: (result) => { if (!result || result.length === 0) return 'คุณต้องเลือกอย่างน้อย 1 อย่าง!'; if (result.length > skill.effect.maxChoicesPerTarget) return `เลือกได้สูงสุด ${skill.effect.maxChoicesPerTarget} อย่าง!`; } }); if (!selectedStats) return; options.selectedStats = selectedStats;
    }

    // Handle target selection (single, multi, all)
    let targetIds = [];
    if (skill.targetType === 'teammate_all' || skill.targetType === 'enemy_all') {
         Swal.fire({ title: `กำลังร่าย ${skill.name}...`, text: `ส่งผลต่อ${skill.targetType.includes('teammate') ? 'เพื่อนร่วมทีม' : 'ศัตรู'}ทั้งหมด!`, icon: 'info', timer: 1500 });
         targetIds = Object.keys(skill.targetType.includes('teammate') ? allPlayersInRoom : allEnemiesInRoom); // [ ⭐️ FIX ⭐️ ] แก้ไขการเลือกเป้าหมาย 'all'
         // if(skill.targetType === 'teammate_all') targetIds = targetIds.filter(id => id !== currentUserUid); // (ลบออกเพื่อให้สกิลนักปราชญ์ฮีลตัวเองได้)
    } else if (skill.targetType === 'teammate_multi') {
        // Placeholder: Multi-select UI needed here. Treat as single for now.
        const { value: selectedUid } = await Swal.fire({ title: `เลือกเป้าหมายสำหรับ "${skill.name}"`, input: 'select', inputOptions: targetOptions, inputPlaceholder: 'เลือกเป้าหมาย', showCancelButton: true }); if (!selectedUid) return; targetIds.push(selectedUid);
    } else if (skill.targetType !== 'self') { // Single target selection
        const { value: selectedUid } = await Swal.fire({ title: `เลือกเป้าหมายสำหรับ "${skill.name}"`, input: 'select', inputOptions: targetOptions, inputPlaceholder: 'เลือกเป้าหมาย', showCancelButton: true }); if (!selectedUid) return; targetIds.push(selectedUid);
    } else { // Self target
        targetIds.push(currentUserUid);
    }

    if (targetIds.length > 0) {
        Swal.close(); // Close selection modal if open
        
        // [ ⭐️ FIX ⭐️ ] ทำให้รองรับ Target หลายเป้าหมาย (สำหรับ 'enemy_all'/'teammate_all')
        if (targetIds.length > 1) {
             console.log(`Processing multi-target skill: ${skill.id} for ${targetIds.length} targets.`);
             // ส่ง ID 'all' พิเศษเพื่อให้ useSkillOnTarget (ใน actions.js) รู้ว่าต้องวน Loop
             if (typeof useSkillOnTarget === 'function') useSkillOnTarget(skillId, 'all', options);
        } else {
             // ส่ง Target เดียวปกติ
             if (typeof useSkillOnTarget === 'function') useSkillOnTarget(skillId, targetIds[0], options);
        }
    }
}


// =================================================================================
// ส่วนที่ 4: Initializer & Real-time Listener
// =================================================================================
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        let isInitialLoadComplete = false;
        const currentUserUid = user.uid;
        const roomId = sessionStorage.getItem('roomId');
        if (!roomId) { window.location.replace('lobby.html'); return; }

        if (!isInitialLoadComplete) showLoading('กำลังโหลดข้อมูลตัวละคร...');

        const playerRef = db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}`);

        // Main listener for room data
        db.ref(`rooms/${roomId}`).on('value', snapshot => {
            const roomData = snapshot.val() || {};
            // Update global variables
            allPlayersInRoom = roomData.playersByUid || {};
            allEnemiesInRoom = roomData.enemies || {};
            combatState = roomData.combat || {}; // Crucial for cooldown checks and turn display
            const charData = allPlayersInRoom[currentUserUid];

            if (charData) {
                // Character exists, display everything
                displayCharacter(charData, combatState);
                displayInventory(charData.inventory);
                displayEquippedItems(charData.equippedItems);
                displayQuest(charData.quest);
                displayTeammates(currentUserUid);
                displayEnemies(allEnemiesInRoom, currentUserUid);
                updateTurnDisplay(combatState, currentUserUid);
                displayStory(roomData.story);

                if (!isInitialLoadComplete) {
                    hideLoading();
                    isInitialLoadComplete = true;
                }

            } else if (isInitialLoadComplete && document.getElementById("characterInfoPanel")) {
                 // Character was deleted after initial load
                 document.getElementById("characterInfoPanel").innerHTML = `<h2>สร้างตัวละคร</h2><p>คุณยังไม่มีตัวละครในห้องนี้</p><a href="PlayerCharecter.html"><button style="width:100%;">สร้างตัวละครใหม่</button></a>`;
                 if (Swal.isVisible() && Swal.isLoading()) hideLoading();

            } else if (!isInitialLoadComplete && document.getElementById("characterInfoPanel")) {
                // Initial load finished, but no character found
                hideLoading();
                document.getElementById("characterInfoPanel").innerHTML = `<h2>สร้างตัวละคร</h2><p>คุณยังไม่มีตัวละครในห้องนี้</p><a href="PlayerCharecter.html"><button style="width:100%;">สร้างตัวละครใหม่</button></a>`;
                isInitialLoadComplete = true;
            }
        });

        // Listener for pending attacks (remains the same)
        playerRef.child('pendingAttack').on('value', s => {
            if (s.exists() && !Swal.isVisible() && combatState && combatState.isActive) {
                 handlePendingAttack(s.val(), playerRef);
            } else if (!s.exists() && Swal.isVisible() && Swal.getTitle() === 'คุณถูกโจมตี!') {
                Swal.close();
            }
        });

    } else {
        window.location.replace('login.html');
    }
});