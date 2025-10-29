// Javascript/dm-panel-script.js - REBUILT VERSION
// อัปเกรดระบบคำนวณ Stat และระบบเริ่มการต่อสู้ (Combat Start)
// (อัปเดต: แก้ไขระบบ Cooldown ให้นับแบบ Personal Rounds)

let allPlayersDataByUID = {};
let previousPlayerState = null;
let allEnemies = {};
let combatState = {};
const ALL_CLASSES = ['นักรบ', 'นักเวท', 'นักบวช', 'โจร', 'เรนเจอร์', 'อัศวินศักดิ์สิทธิ์', 'บาร์บาเรียน', 'พ่อค้า', 'แทงค์', 'นักปราชญ์', 'อัศวิน', 'เจ้าเมือง', 'นักดาบเวทย์', 'นักบุญหญิง', 'นักฆ่า', 'สตรีศักดิ์สิทธิ์', 'ผู้กล้า', 'จอมมาร', 'เทพเจ้า'];
const ALL_WEAPON_TYPES = ['ดาบ', 'ขวาน', 'ดาบใหญ่', 'หอก', 'มีด', 'ธนู', 'หน้าไม้', 'ดาบสั้น', 'อาวุธซัด', 'คทา', 'ไม้เท้า', 'หนังสือเวท', 'ค้อน', 'กระบอง', 'โล่', 'อาวุธทื่อ'];

// =================================================================================
// ส่วนที่ 1: Utility & Calculation Functions (REBUILT)
// =================================================================================

function showCustomAlert(message, iconType = 'info') {
    const buttonColor = iconType === 'error' ? '#dc3545' : '#28a745';
    Swal.fire({
        title: iconType === 'success' ? 'สำเร็จ!' : iconType === 'error' ? 'ข้อผิดพลาด!' : '⚠️ แจ้งเตือน!',
        text: message,
        icon: iconType,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: buttonColor
    });
}

/**
 * [REBUILT] อัปเกรดฟังก์ชันนี้ให้ตรงกับ player-dashboard-script.js
 * เพื่อให้ DM เห็นค่าพลังที่ถูกต้อง (รวมบัฟ/ดีบัฟ %)
 */
function calculateTotalStat(charData, statKey) {
    if (!charData || !charData.stats) return 0;
    
    const stats = charData.stats;
    const upperStatKey = statKey.toUpperCase();
    
    // 1. คำนวณ Level
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


    // 2. คำนวณ Base Stat (จาก Firebase)
    let baseStat = (stats.baseRaceStats?.[upperStatKey] || 0) +
                   (stats.baseClassStats?.[upperStatKey] || 0) +
                   (stats.investedStats?.[upperStatKey] || 0) +
                   (stats.tempStats?.[upperStatKey] || 0); // บัฟ "God Mode" จาก DM

    // 3. [NEW] คำนวณโบนัสจากสกิลติดตัว (Passive Skills)
    // (หมายเหตุ: DM Panel จะไม่คำนวณ Passive ที่ซับซ้อน,
    // จะเน้นอ่านจาก Active Effects ที่ผู้เล่นส่งมา)
    
    // 4. คำนวณโบนัสจากบัฟ/ดีบัฟชั่วคราว (Active Effects)
    let flatBonus = 0;
    let percentBonus = 0;

    if (Array.isArray(charData.activeEffects)) {
        charData.activeEffects.forEach(effect => {
            if (effect.stat === upperStatKey) {
                if (effect.modType === 'FLAT' || effect.modType === 'SET_VALUE') {
                    flatBonus += (effect.amount || 0);
                } else if (effect.modType === 'PERCENT') {
                    percentBonus += (effect.amount || 0);
                }
            }
        });
    }

    // 5. คำนวณโบนัสจากอุปกรณ์ (Equipped Items)
    if (charData.equippedItems) {
        for (const slot in charData.equippedItems) {
            const item = charData.equippedItems[slot];
            if (item && item.bonuses && item.bonuses[upperStatKey]) {
                flatBonus += item.bonuses[upperStatKey];
            }
        }
    }

    // 6. รวมค่าสถานะ
    // (Base) * (1 + PercentBuffs) + FlatBuffs
    let finalStat = (baseStat * (1 + (percentBonus / 100))) + flatBonus;


    // 7. คำนวณโบนัสจาก Level
    if (finalStat > 0 && totalLevel > 1) { // [ ⭐️ FIX ⭐️ ] ใช้ totalLevel
         const levelBonus = finalStat * (totalLevel - 1) * 0.2;
         finalStat += levelBonus;
    }
   
    // (DM Panel ไม่จำเป็นต้องคำนวณโบนัส/บทลงโทษอาวุธ เพราะเป็นแค่การแสดงผล)

    return Math.floor(finalStat);
}


function calculateHP(charRace, charClass, finalCon) {
    const racialBaseHP = { 'มนุษย์': 10, 'เอลฟ์': 8, 'คนแคระ': 12, 'ฮาล์ฟลิ่ง': 8, 'ไทฟลิ่ง': 9, 'แวมไพร์': 9, 'เงือก': 10, 'ออร์ค': 14, 'โนม': 7, 'เอลฟ์ดำ': 8, 'นางฟ้า': 6, 'มาร': 11, 'โกเลม': 18, 'อันเดด': 25, 'ครึ่งมังกร': 20, 'มังกร': 40, 'ครึ่งเทพ': 30, 'พระเจ้า': 100 };
    const classBaseHP = { 'บาร์บาเรียน': 16, 'แทงค์': 25, 'นักรบ': 12, 'นักดาบเวทย์': 10, 'อัศวิน': 13, 'อัศวินศักดิ์สิทธิ์': 14, 'ผู้กล้า': 18, 'นักเวท': 4, 'นักบวช': 8, 'นักบุญหญิง': 9, 'สตรีศักดิ์สิทธิ์': 10, 'โจร': 8, 'นักฆ่า': 11, 'เรนเจอร์': 10, 'พ่อค้า': 6, 'นักปราชญ์': 4, 'เจ้าเมือง': 15, 'จอมมาร': 22, 'เทพเจ้า': 50 };
    const conModifier = Math.floor((finalCon - 10) / 2);
    const raceHP = racialBaseHP[charRace] || 8;
    const classHP = classBaseHP[charClass] || 6;
    return raceHP + classHP + conModifier;
}

function calculateDamage(damageDice, strBonus) {
    const diceType = parseInt((damageDice || 'd6').replace('d', ''));
    if (isNaN(diceType) || diceType < 1) return 1;
    const damageRoll = Math.floor(Math.random() * diceType) + 1;
    return Math.max(1, damageRoll + strBonus);
}

// [EXP SYSTEM] ฟังก์ชันคำนวณ EXP สำหรับเลเวลถัดไป
function getExpForNextLevel(level) {
    return Math.floor(300 * Math.pow(1.8, level - 1));
}

// (ฟังก์ชัน UI อื่นๆ: populateClassCheckboxes, populateWeaponTypes, getNewRaceStatBonus, getNewClassStatBonus คงไว้เหมือนเดิม)
function populateClassCheckboxes() {
    const container = document.getElementById('recommendedClassCheckboxes');
    if (!container) return;
    container.innerHTML = '';
    ALL_CLASSES.forEach(className => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; align-items: center;';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `class-checkbox-${className}`;
        checkbox.value = className;
        checkbox.className = 'class-checkbox';
        const label = document.createElement('label');
        label.htmlFor = `class-checkbox-${className}`;
        label.textContent = className;
        label.style.cssText = 'margin-left: 5px; font-weight: normal;';
        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
    });
}
function populateWeaponTypes() {
    const select = document.getElementById('customWeaponType');
    if (!select) return;
    select.innerHTML = '<option value="">-- เลือกประเภทอาวุธ --</option>';
    ALL_WEAPON_TYPES.forEach(weaponType => {
        select.innerHTML += `<option value="${weaponType}">${weaponType}</option>`;
    });
}
function getNewRaceStatBonus(charRace) {
    const racialBonuses = { 'มนุษย์': { STR: 2, DEX: 2, CON: 2, INT: 2, WIS: 2, CHA: 2 }, 'เอลฟ์': { DEX: 4, INT: 3, CHA: 2 }, 'คนแคระ': { CON: 5, STR: 3, WIS: 1 }, 'ฮาล์ฟลิ่ง': { DEX: 5, CHA: 3, CON: 1 }, 'ไทฟลิ่ง': { DEX: 4, CHA: 4, INT: 2 }, 'แวมไพร์': { STR: 3, DEX: 4, CHA: 3 }, 'เงือก': { CON: 5, WIS: 3, CHA: 2 }, 'ออร์ค': { STR: 6, CON: 4 }, 'โนม': { INT: 5, DEX: 3, CON: 1 }, 'เอลฟ์ดำ': { DEX: 5, CHA: 3, STR: 2 }, 'นางฟ้า': { WIS: 5, CHA: 4 }, 'มาร': { STR: 5, CHA: 5 }, 'โกเลม': { CON: 8, STR: 6 }, 'อันเดด': { CON: 5, STR: 2, CHA: 2 }, 'ครึ่งมังกร': { STR: 7, CON: 5, INT: 4 }, 'มังกร': { STR: 8, CON: 6, INT: 4, CHA: 4 }, 'ครึ่งเทพ': { STR: 8, INT: 8, CHA: 8 }, 'พระเจ้า': { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } };
    return { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0, ...racialBonuses[charRace] };
}
function getNewClassStatBonus(charClass) {
    const classBonuses = { 'นักรบ': { STR: 18, CON: 12, DEX: 5 }, 'นักเวท': { INT: 20, WIS: 8, CON: 7 }, 'นักบวช': { WIS: 18, CHA: 10, CON: 7 }, 'โจร': { DEX: 20, CHA: 8, INT: 7 }, 'เรนเจอร์': { DEX: 18, WIS: 10, CON: 7 }, 'อัศวินศักดิ์สิทธิ์': { STR: 18, CHA: 12, CON: 10 }, 'บาร์บาเรียน': { STR: 22, CON: 15 }, 'พ่อค้า': { CHA: 20, INT: 15 }, 'แทงค์': { CON: 25, STR: 10 }, 'นักปราชญ์': { INT: 20, WIS: 15 }, 'อัศวิน': { STR: 18, CON: 15, DEX: 2 }, 'เจ้าเมือง': { CHA: 22, INT: 18 }, 'นักดาบเวทย์': { STR: 15, INT: 15, DEX: 5 }, 'นักบุญหญิง': { WIS: 20, CON: 10, CHA: 8 }, 'นักฆ่า': { DEX: 22, STR: 8, INT: 5 }, 'สตรีศักดิ์สิทธิ์': { WIS: 22, CHA: 15 }, 'ผู้กล้า': { STR: 20, CON: 15, CHA: 5 }, 'จอมมาร': { INT: 22, CHA: 18 }, 'เทพเจ้า': { STR: 20, DEX: 20, CON: 20, INT: 20, WIS: 20, CHA: 20 } };
    return { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0, ...classBonuses[charClass] };
}

// =================================================================================
// ส่วนที่ 2: Display Functions (ฟังก์ชันแสดงผล UI)
// =================================================================================

// (ฟังก์ชันส่วนนี้เกือบทั้งหมดคงเดิม: getUidByName, resetPlayerEditor, loadPlayer, 
// updateStatTotals, displayPlayerSummary, loadItemLists, displayDiceLog, 
// displayAllEnemies)
// (ฟังก์ชัน displayCombatState ถูกย้ายไปอยู่หลัง `advanceTurn` เพื่อความสะอาด)

function getUidByName(playerName) {
    for (const uid in allPlayersDataByUID) {
        if (allPlayersDataByUID[uid].name === playerName) {
            return uid;
        }
    }
    return null;
}

function resetPlayerEditor() {
    document.getElementById("playerEditor").querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type === 'number') el.value = 0;
        else if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else el.value = '';
    });
    document.getElementById("editName").value = '';
    document.getElementById("editLevel").textContent = 'N/A';
    document.getElementById("editFreeStatPoints").textContent = 'N/A';
    displayPlayerSummary(null);
}

function loadPlayer() {
    const selectedPlayerName = document.getElementById("playerSelect").value;
    const uid = getUidByName(selectedPlayerName);
    const player = allPlayersDataByUID[uid];

    if (!selectedPlayerName || !player) {
        resetPlayerEditor();
        return;
    }

    document.getElementById("editName").value = player.name;
    document.getElementById("editRace").value = player.race || "มนุษย์";
    document.getElementById("editGender").value = player.gender || "ไม่ระบุ";
    document.getElementById("editAge").value = player.age || "";
    document.getElementById("editClass").value = player.class || "นักรบ";
    document.getElementById("editBackground").value = player.background || "";
    document.getElementById("editHp").value = player.hp;
    document.getElementById("editLevel").textContent = player.level || 1;
    document.getElementById("editFreeStatPoints").textContent = player.freeStatPoints || 0;
    
    // [ ⭐️ FIX ⭐️ ] แก้ไขการอ่าน tempLevel (บัฟเลเวลนักปราชญ์)
    let tempLevel = 0;
    if (Array.isArray(player.activeEffects)) {
         player.activeEffects.forEach(effect => {
             if (effect.stat === 'Level' && effect.modType === 'FLAT') {
                 tempLevel += (effect.amount || 0);
             }
         });
    }
    document.getElementById("tempLevelInput").value = tempLevel;


    const statsKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    statsKeys.forEach(stat => {
        document.getElementById(`edit${stat}Race`).value = player.stats ?.baseRaceStats ?.[stat] || 0;
        document.getElementById(`edit${stat}Class`).value = player.stats ?.baseClassStats ?.[stat] || 0;
        document.getElementById(`edit${stat}Invested`).value = player.stats ?.investedStats ?.[stat] || 0;
        document.getElementById(`edit${stat}Temp`).value = player.stats ?.tempStats ?.[stat] || 0;
        updateStatTotals(stat);
    });

    displayPlayerSummary(player);
    loadItemLists(player);
}

function updateStatTotals(statKey) {
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    if (!uid || !allPlayersDataByUID[uid]) return;

    // สร้างข้อมูลจำลองเพื่อคำนวณ (รวมบัฟ "God Mode" ที่ DM เพิ่งใส่)
    const tempPlayer = JSON.parse(JSON.stringify(allPlayersDataByUID[uid]));
    const tempValue = parseInt(document.getElementById(`edit${statKey}Temp`).value) || 0;

    if (!tempPlayer.stats) tempPlayer.stats = {};
    if (!tempPlayer.stats.tempStats) tempPlayer.stats.tempStats = {};
    tempPlayer.stats.tempStats[statKey] = tempValue;
    
    // [REBUILT] เรียกใช้ฟังก์ชันคำนวณใหม่ที่รองรับบัฟ %
    document.getElementById(`edit${statKey}Total`).value = calculateTotalStat(tempPlayer, statKey);
}

function displayPlayerSummary(player) {
    const output = document.getElementById("playerSummaryPanel");
    if (!output) return;

    if (!player) {
        output.innerHTML = "<h3>สรุปข้อมูลตัวละคร</h3><p>โปรดเลือกผู้เล่นเพื่อดูสรุปข้อมูล</p>";
        previousPlayerState = null;
        return;
    }

    // [REBUILT] คำนวณค่าพลังที่ถูกต้อง
    const finalCon = calculateTotalStat(player, 'CON');
    const maxHpNew = player.maxHp || calculateHP(player.race, player.class, finalCon);
    let currentHp = player.hp;
    if (currentHp > maxHpNew) {
        currentHp = maxHpNew;
    }

    let htmlContent = `<h3>สรุปข้อมูลตัวละคร: ${player.name}</h3><hr>`;
    htmlContent += `<p><strong>เผ่าพันธุ์:</strong> ${player.race}</p><p><strong>อาชีพ:</strong> ${player.class}</p><hr>`;
    
    // [ ⭐️ FIX ⭐️ ] แสดงเลเวลรวมบัฟ (ถ้ามี)
    const permanentLevel = player.level || 1;
    let tempLevel = 0;
    if (Array.isArray(player.activeEffects)) {
         player.activeEffects.forEach(effect => {
             if (effect.stat === 'Level' && effect.modType === 'FLAT') {
                 tempLevel += (effect.amount || 0);
             }
         });
    }
    if (tempLevel > 0) {
        htmlContent += `<p><strong>ระดับ (Level):</strong> ${permanentLevel} <span style="color: #00ff00;">(+${tempLevel})</span></p>`;
    } else {
        htmlContent += `<p><strong>ระดับ (Level):</strong> ${permanentLevel}</p>`;
    }
    // [ ⭐️ END FIX ⭐️ ]
    
    htmlContent += `<p><strong>EXP:</strong> ${player.exp || 0} / ${player.expToNextLevel || 300}</p><hr>`;
    htmlContent += `<p><strong>HP:</strong> ${currentHp} / ${maxHpNew}</p>`;
    for (const stat of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
        htmlContent += `<p><strong>${stat}:</strong> ${calculateTotalStat(player, stat)}</p>`;
    }
    
    // [NEW] แสดงผล Active Effects ใน Summary
    const effects = player.activeEffects || [];
    if(effects.length > 0) {
        htmlContent += `<hr><h4>Active Effects:</h4><ul>`;
        effects.forEach(effect => {
             const modText = effect.modType === 'PERCENT' ? `${effect.amount}%` : `${effect.amount}`;
             htmlContent += `<li>${effect.name}: ${effect.stat} ${modText} (${effect.turnsLeft} เทิร์น)</li>`;
        });
        htmlContent += `</ul>`;
    }

    if (player.quest && player.quest.title) {
        htmlContent += `<div style="border: 1px solid #ffc107; padding: 10px; margin-top: 15px; border-radius: 5px; background-color: #ffc1071a;">
                                <h4>📜 เควสปัจจุบัน: ${player.quest.title}</h4>
                                <p style="font-size: small;"><strong>รายละเอียด:</strong> ${player.quest.detail || '-'}</p>
                                <p style="font-size: small;"><strong>รางวัล:</strong> ${player.quest.reward || '-'}</p>
                                <p style="font-size: small;"><strong>รางวัล EXP:</strong> ${player.quest.expReward || 0}</p>
                                <button onclick="completeQuest()" style="background-color: #28a745; width: 49%;">🏆 สำเร็จเควส</button>
                                <button onclick="cancelQuest()" style="background-color: #dc3545; width: 49%; margin-left: 2%;">❌ ยกเลิกเควส</button>
                            </div>`;
    } else {
        htmlContent += `<p style="margin-top: 10px; color: #777;"><em>ผู้เล่นนี้ยังไม่มีเควส</em></p>`;
    }
    output.innerHTML = htmlContent;
}


function loadItemLists(player) {
    const items = player ?.inventory || [];
    const itemSelect = document.getElementById("itemSelect");
    itemSelect.innerHTML = "";
    if (items.length === 0) {
        itemSelect.innerHTML = "<option disabled>ไม่มีไอเทม</option>";
        return;
    }
    items.forEach((item, index) => {
        const option = `<option value="${index}">${item.name} (x${item.quantity})</option>`;
        itemSelect.innerHTML += option;
    });
}

function displayDiceLog(logs, logElementId) {
    const logList = document.getElementById(logElementId);
    logList.innerHTML = `<li>ไม่มีบันทึก</li>`;
    if (!logs) return;
    const logArray = Object.values(logs).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (logArray.length > 0) logList.innerHTML = "";
    logArray.slice(0, 15).forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString('th-TH');
        let message = `[${time}] ${log.name}: ${log.message}`;
        if (log.type === 'general' || !log.type) {
            const total = log.result.reduce((a, b) => a + b, 0);
            message = `[${time}] ${log.name} ทอย ${log.count}d${log.dice}: [${log.result.join(', ')}] รวม: ${total}`;
        }
        const color = log.type === 'damage' ? '#ff4d4d' : (log.type === 'attack' ? '#17a2b8' : '#fff');
        logList.innerHTML += `<li style="color:${color};">${message}</li>`;
    });
}

function displayAllEnemies(enemies) {
    const container = document.getElementById('enemyListContainer');
    container.innerHTML = '';
    if (!enemies || Object.keys(enemies).length === 0) {
        container.innerHTML = '<p>ยังไม่มีคู่ต่อสู้ในฉากนี้</p>';
        return;
    }

    for (const key in enemies) {
        const enemy = enemies[key];
        const target = allPlayersDataByUID[enemy.targetUid] ? allPlayersDataByUID[enemy.targetUid].name : '<i>(ศัตรูร่วม)</i>';

        const enemyDiv = document.createElement('div');
        enemyDiv.className = 'enemy-list-item';
        enemyDiv.innerHTML = `
            <strong>${enemy.name}</strong> (HP: ${enemy.hp} / ${enemy.maxHp || '??'})<br>
            <small>เป้าหมาย: ${target}</small> | <small>EXP: ${enemy.expValue || 0}</small>
            <div style="float: right;">
                <button onclick="moveEnemy('${key}')" style="background-color:#fd7e14;">ย้าย</button>
                <button onclick="deleteEnemy('${key}')" style="background-color:#c82333;">ลบ</button>
            </div>
        `;
        container.appendChild(enemyDiv);
    }
}


// =================================================================================
// ส่วนที่ 3: Write Functions (ฟังก์ชันบันทึกข้อมูล)
// =================================================================================

// [ ⭐️⭐️⭐️ ฟังก์ชันที่แก้ไข (1/2) ⭐️⭐️⭐️ ]
function checkCooldown(casterData, skill, currentCombatState) {
    // [ ⭐️⭐️⭐️ START COOLDOWN FIX ⭐️⭐️⭐️ ]
    // (เราไม่ต้องการ currentCombatState สำหรับการเช็ค 'PER_TURN' อีกต่อไป)

    if (!skill.cooldown && !skill.successCooldown) return null; 
    
    const cdData = casterData.skillCooldowns || {}; 
    const combatUses = casterData.combatSkillUses || {};
    // const currentTurn = ... (ลบออก)
    
    const skillName = SKILLS_DATA[casterData.class]?.find(s=>s.id===skill.id)?.name || 
                      SKILLS_DATA[casterData.race]?.find(s=>s.id===skill.id)?.name || 
                      ITEM_SKILLS[casterData.equippedItems?.mainHand?.name]?.find(s=>s.id===skill.id)?.name || 
                      skill.id;

    if (skill.cooldown && skill.cooldown.type === 'PER_TURN') {
        // เปลี่ยนจากการเช็ค 'turnEnds > currentTurn'
        // เป็นการเช็ค 'turnsLeft > 0'
        const turnsLeft = cdData[skill.id] || 0;
        if (turnsLeft > 0) { 
            return `สกิล ${skillName} ยังติดคูลดาวน์! (รอ ${turnsLeft} เทิร์น)`; 
        }
    }
    // (ส่วน PER_COMBAT และ successCooldown เหมือนเดิม ไม่ต้องแก้)
    if (skill.cooldown && skill.cooldown.type === 'PER_COMBAT') {
        const uses = combatUses[skill.id] || 0; 
        const allowedUses = skill.cooldown.uses;
        if (uses >= allowedUses) { 
            return `สกิล ${skillName} สามารถใช้ได้ ${allowedUses} ครั้งต่อการต่อสู้เท่านั้น`; 
        }
    }
    if (skill.successCooldown && skill.successCooldown.type === 'PER_COMBAT') {
         const uses = combatUses[skill.id + '_success'] || 0;
         const allowedUses = skill.successCooldown.uses;
         if (uses >= allowedUses) {
             return `สกิล ${skillName} ติดคูลดาวน์ (ใช้งานสำเร็จไปแล้ว)`;
         }
    }
    
    return null;
    // [ ⭐️⭐️⭐️ END COOLDOWN FIX ⭐️⭐️⭐️ ]
}


function forceAdvanceTurn() {
    Swal.fire({
        title: 'บังคับข้ามเทิร์น?',
        text: "คุณต้องการข้ามเทิร์นของผู้เล่นคนนี้ใช่หรือไม่?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ข้ามเลย'
    }).then((result) => {
        if (result.isConfirmed) {
            advanceTurn();
        }
    });
}

async function dmPerformEnemyAttack() {
    const roomId = sessionStorage.getItem('roomId');
    const display = document.getElementById('dm-roll-result-display');
    const attackButton = document.getElementById('enemy-attack-button');
    attackButton.disabled = true;
    display.innerHTML = 'กำลังทอยเต๋าโจมตี...';

    const attackerUnit = combatState.turnOrder[combatState.currentTurnIndex];
    const attackerData = allEnemies[attackerUnit.id];
    const targetPlayerUid = document.getElementById('enemy-attack-target-select').value;
    const targetPlayerData = allPlayersDataByUID[targetPlayerUid];

    if (!attackerData || !targetPlayerData) {
        showCustomAlert('ไม่พบข้อมูลผู้โจมตีหรือเป้าหมาย!', 'error');
        attackButton.disabled = false;
        return;
    }

    const rollResult = Math.floor(Math.random() * 20) + 1;
    const strBonus = Math.floor(((attackerData.stats.STR || 10) - 10) / 2);
    const totalAttack = rollResult + strBonus;

    const playerDEX = calculateTotalStat(targetPlayerData, 'DEX'); // [REBUILT] ใช้ฟังก์ชันใหม่
    const playerAC = 10 + Math.floor((playerDEX - 10) / 2);

    const pendingAttack = {
        attackerKey: attackerUnit.id,
        attackerName: attackerData.name,
        attackRollValue: totalAttack,
        targetAC: playerAC
    };

    if (totalAttack < playerAC) {
        display.innerHTML = `<p style="color: #ff4d4d;"><strong>${attackerData.name}</strong> โจมตี <strong>${targetPlayerData.name}</strong> พลาด!</p><p>ค่าโจมตี: ${totalAttack} (ทอย ${rollResult} + โบนัส ${strBonus}) vs AC ผู้เล่น: ${playerAC}</p>`;
        attackButton.disabled = false;
        setTimeout(advanceTurn, 1500);
        return;
    }

    await db.ref(`rooms/${roomId}/playersByUid/${targetPlayerUid}/pendingAttack`).set(pendingAttack);

    display.innerHTML = `<p><strong>${attackerData.name}</strong> โจมตี <strong>${targetPlayerData.name}</strong>!</p><p>ค่าโจมตี: ${totalAttack} (ทอย ${rollResult} + โบนัส ${strBonus}) vs AC ผู้เล่น: ${playerAC}</p><p style="color: #ffc107;">...กำลังรอการตอบสนองจากผู้เล่น...</p>`;
}


async function handleDefenseResolution(resolution) {
    if (!resolution || Swal.isVisible()) return;

    const roomId = sessionStorage.getItem('roomId');
    const display = document.getElementById('dm-roll-result-display');

    const defenderData = allPlayersDataByUID[resolution.defenderUid];
    const attackerData = allEnemies[resolution.attackerKey];
    if (!defenderData || !attackerData) return;

    const strBonus = Math.floor(((attackerData.stats.STR || 10) - 10) / 2);
    const damageDice = attackerData.damageDice || 'd6';
    const initialDamage = calculateDamage(damageDice, strBonus);

    // ✅ [คงเดิม] โค้ดนี้ดีอยู่แล้ว มันอ่าน 'activeEffects' ถูกต้อง
    let damageReductionFromSkills = 0;
    if (Array.isArray(defenderData.activeEffects)) {
        defenderData.activeEffects.forEach(effect => {
            if (effect.type === 'DAMAGE_REDUCTION') {
                damageReductionFromSkills += (effect.amount || 0);
            }
        });
    }

    let finalHtml = display.innerHTML.replace('<p style="color: #ffc107;">...กำลังรอการตอบสนองจากผู้เล่น...</p>', '');
    let finalDamage = 0;

    switch (resolution.choice) {
        case 'dodge':
            if (resolution.success) {
                finalHtml += `<p style="color: #00ff00;">🏃 <strong>${defenderData.name} หลบได้สำเร็จ!</strong></p>`;
                finalDamage = 0;
            } else {
                finalHtml += `<p style="color: #ff4d4d;">🏃 <strong>${defenderData.name} หลบไม่พ้น!</strong></p>`;
                finalDamage = initialDamage;
            }
            break;
        case 'block':
            const totalReduction = (resolution.damageReduced || 0);
            finalDamage = Math.max(0, initialDamage - totalReduction);
            finalHtml += `<p style="color: #17a2b8;">🛡️ <strong>${defenderData.name} ป้องกัน!</strong></p><p>ลดความเสียหายจากการ Block ${totalReduction} หน่วย</p>`;
            break;
        case 'none':
            finalDamage = initialDamage;
            finalHtml += `<p style="color: #aaa;">😑 <strong>${defenderData.name} ไม่ป้องกัน!</strong></p>`;
            break;
    }
    
    // ✅ [คงเดิม] นำค่าลดความเสียหายจากสกิลมาคำนวณ
    if(damageReductionFromSkills > 0 && finalDamage > 0){
        finalHtml += `<p>สกิลลดความเสียหายลงอีก ${damageReductionFromSkills} หน่วย</p>`;
        finalDamage = Math.max(0, finalDamage - damageReductionFromSkills);
    }
    finalHtml += `<p><strong>รับความเสียหายสุดท้าย ${finalDamage} หน่วย!</strong></p>`;


    const newHp = Math.max(0, defenderData.hp - finalDamage);
    await db.ref(`rooms/${roomId}/playersByUid/${resolution.defenderUid}/hp`).set(newHp);

    display.innerHTML = finalHtml;
    await db.ref(`rooms/${roomId}/combat/resolution`).remove();

    setTimeout(() => {
        advanceTurn();
    }, 3000);
}

/**
 * [REBUILT] ฟังก์ชันเริ่มการต่อสู้ (เพิ่มการล้าง Cooldown)
 */
async function startCombat() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;

    // --- [NEW] 1. ล้าง Cooldown "Per Combat" ---
    // เราต้องอัปเดตผู้เล่นทุกคนใน 'allPlayersDataByUID'
    // เราใช้ `updates` object เพื่อส่งคำสั่งทั้งหมดในครั้งเดียว
    const updates = {};
    for (const uid in allPlayersDataByUID) {
        // ล้าง path 'combatSkillUses' ของผู้เล่นทุกคน
        updates[`/rooms/${roomId}/playersByUid/${uid}/combatSkillUses`] = null;
    }
    // ส่งคำสั่งล้างทั้งหมดไปที่ Firebase
    await db.ref().update(updates);
    console.log("ล้าง Cooldown 'Per Combat' ของผู้เล่นทุกคนแล้ว");
    // --- สิ้นสุดส่วนที่เพิ่มเข้ามา ---


    // --- 2. สร้าง Turn Order (เหมือนเดิม) ---
    const units = [];
    for (const uid in allPlayersDataByUID) {
        const player = allPlayersDataByUID[uid];
        if ((player.hp || 0) > 0) {
            units.push({
                id: uid,
                name: player.name,
                dex: calculateTotalStat(player, 'DEX'), // [REBUILT] ใช้ฟังก์ชันใหม่
                type: 'player'
            });
        }
    }
    for (const key in allEnemies) {
        const enemy = allEnemies[key];
        if ((enemy.hp || 0) > 0) {
            units.push({
                id: key,
                name: enemy.name,
                dex: enemy.stats ?.DEX || 10,
                type: 'enemy'
            });
        }
    }

    if (units.length < 2) {
        showCustomAlert('ต้องมีผู้เข้าร่วมต่อสู้อย่างน้อย 2 ฝ่าย!', 'warning');
        return;
    }

    units.sort((a, b) => b.dex - a.dex);

    const initialCombatState = {
        isActive: true,
        turnOrder: units,
        currentTurnIndex: 0
    };

    db.ref(`rooms/${roomId}/combat`).set(initialCombatState)
        .then(() => showCustomAlert('เริ่มการต่อสู้!', 'success'));
}

function listenForActionComplete() {
  const roomId = sessionStorage.getItem('roomId');
  const actionRef = db.ref(`rooms/${roomId}/combat/actionComplete`);

  actionRef.on('value', async (snap) => {
    const val = snap.val();
    if (!val) return;
    
    console.log(`ผู้เล่น ${val} จบเทิร์นแล้ว`);
    await actionRef.remove(); // เคลียร์ค่า
    await advanceTurn(); // เรียกเทิร์นถัดไป
  });
}

// [ ⭐️⭐️⭐️ ฟังก์ชันที่แก้ไข (2/2) ⭐️⭐️⭐️ ]
async function advanceTurn() {
    const roomId = sessionStorage.getItem('roomId');
    const combatRef = db.ref(`rooms/${roomId}/combat`);

    const snapshot = await combatRef.get();
    const currentCombatState = snapshot.val() || {};
    if (!currentCombatState.isActive) return;

    let nextIndex = (currentCombatState.currentTurnIndex + 1) % currentCombatState.turnOrder.length;
    const maxSkips = currentCombatState.turnOrder.length;
    let skips = 0;

    // --- 1. ข้ามยูนิตที่ตายแล้ว ---
    while (skips < maxSkips) {
        const nextUnit = currentCombatState.turnOrder[nextIndex];
        let isDead = false;

        if (nextUnit.type === 'player') {
            isDead = (allPlayersDataByUID[nextUnit.id]?.hp || 0) <= 0;
        } else if (nextUnit.type === 'enemy') {
            isDead = (allEnemies[nextUnit.id]?.hp || 0) <= 0;
        }

        if (isDead) {
            console.log(`Skipping turn for dead unit: ${nextUnit.name}`);
            nextIndex = (nextIndex + 1) % currentCombatState.turnOrder.length;
            skips++;
        } else break;
    }

    if (skips === maxSkips) {
        endCombat(); // ทุกคนตายหมด/หนีหมด
        return;
    }

    // --- 2. นับเทิร์นบัฟ/ดีบัฟ และ คูลดาวน์ (Active Effects & Cooldowns) ---
    // [ ⭐️⭐️⭐️ START COOLDOWN FIX ⭐️⭐️⭐️ ]
    
    const nextUnit = currentCombatState.turnOrder[nextIndex];
    let unitRef;

    if (nextUnit.type === 'player') {
        unitRef = db.ref(`rooms/${roomId}/playersByUid/${nextUnit.id}`);
    } else { // 'enemy'
        unitRef = db.ref(`rooms/${roomId}/enemies/${nextUnit.id}`);
    }

    if (unitRef) {
        await unitRef.transaction(unitData => {
            if (!unitData) return unitData; // (เพิ่มการป้องกันข้อผิดพลาด)

            // 2.1 ลดค่า turnsLeft ของ Buffs/Debuffs (activeEffects)
            if (Array.isArray(unitData.activeEffects)) {
                unitData.activeEffects.forEach(effect => {
                    if (effect.turnsLeft > 0) {
                        effect.turnsLeft--;
                    }
                });
                // กรองอันที่หมดอายุ (เหลือ 0) ทิ้ง
                unitData.activeEffects = unitData.activeEffects.filter(effect => effect.turnsLeft > 0);
            }
            
            // 2.2 (เพิ่มใหม่) ลดค่า turnsLeft ของ Skill Cooldowns (skillCooldowns)
            if (unitData.skillCooldowns) {
                for (const skillId in unitData.skillCooldowns) {
                    // เช็คว่าเป็นตัวเลข (PER_TURN) และมากกว่า 0
                    if (typeof unitData.skillCooldowns[skillId] === 'number' && unitData.skillCooldowns[skillId] > 0) {
                        unitData.skillCooldowns[skillId]--; // นับลด 1
                        
                        // (ทางเลือก) ล้างค่าเมื่อเป็น 0 เพื่อความสะอาด
                        if (unitData.skillCooldowns[skillId] === 0) {
                            unitData.skillCooldowns[skillId] = null; 
                        }
                    }
                }
            }

            return unitData; // ส่งข้อมูลกลับ
        });
        console.log(`Updated effects AND cooldowns for ${nextUnit.name}`);
    }
    // [ ⭐️⭐️⭐️ END COOLDOWN FIX ⭐️⭐️⭐️ ]
    
    // --- 3. อัปเดตเทิร์น ---
    await combatRef.child('currentTurnIndex').set(nextIndex);
    await combatRef.child('lastUpdated').set(Date.now());

    const display = document.getElementById('dm-roll-result-display');
    if (display) display.innerHTML = 'รอการดำเนินการ...';

    console.log(`เทิร์นต่อไป: ${currentCombatState.turnOrder[nextIndex].name}`);
}


// --- [ ⭐️⭐️⭐️ ฟังก์ชันที่แก้ไข ⭐️⭐️⭐️ ] ---
async function endCombat() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;

    // --- [ ⭐️ ส่วนที่เพิ่มเข้ามา ⭐️ ] ---
    // 1. สร้าง object ว่างๆ เพื่ออัปเดต
    const updates = {};
    updates[`rooms/${roomId}/combat`] = null; // 2. ลบสถานะการต่อสู้ (เหมือนเดิม)

    // 3. ล้างสถานะ (Active Effects) และ Cooldown (Per Combat + Per Turn) ของผู้เล่นทุกคน
    for (const uid in allPlayersDataByUID) {
        updates[`rooms/${roomId}/playersByUid/${uid}/activeEffects`] = null;
        updates[`rooms/${roomId}/playersByUid/${uid}/combatSkillUses`] = null;
        updates[`rooms/${roomId}/playersByUid/${uid}/skillCooldowns`] = null; // ⭐️ ล้าง PER_TURN cooldowns ด้วย
    }

    // 4. ล้างสถานะ (Active Effects) ของศัตรูทั้งหมด
    for (const key in allEnemies) {
        updates[`rooms/${roomId}/enemies/${key}/activeEffects`] = null;
    }

    // 5. สั่งอัปเดตทั้งหมดในครั้งเดียว
    try {
        await db.ref().update(updates);
        showCustomAlert('การต่อสู้จบลงแล้ว (และรีเซ็ตสถานะทั้งหมดแล้ว)', 'info');
    } catch (error) {
        showCustomAlert('เกิดข้อผิดพลาดในการจบการต่อสู้: ' + error.message, 'error');
    }
    // --- [ ⭐️ สิ้นสุดส่วนที่เพิ่ม ⭐️ ] ---
}
// --- [ ⭐️⭐️⭐️ สิ้นสุดฟังก์ชันที่แก้ไข ⭐️⭐️⭐️ ] ---


/**
 * [CONFIRMED] ฟังก์ชันแสดงผล UI การต่อสู้ (คงเดิม)
 * มันอ่าน 'activeEffects' เพื่อเช็ค 'TAUNT' ได้ถูกต้อง
 */
function displayCombatState(state) {
    const inactiveView = document.getElementById('combat-inactive-view');
    const activeView = document.getElementById('combat-active-view');
    const turnOrderList = document.getElementById('turnOrderDisplay');
    const currentTurnActionPanel = document.getElementById('current-turn-action-panel');
    const playerTurnView = document.getElementById('player-turn-view');
    const enemyTurnView = document.getElementById('enemy-turn-view');
    const currentTurnUnitName = document.getElementById('current-turn-unit-name');
    const enemyAttackTargetSelect = document.getElementById('enemy-attack-target-select');

    if (!state || !state.isActive) {
        inactiveView.classList.remove('hidden');
        activeView.classList.add('hidden');
        currentTurnActionPanel.classList.add('hidden');
        return;
    }

    inactiveView.classList.add('hidden');
    activeView.classList.remove('hidden');
    currentTurnActionPanel.classList.remove('hidden');

    turnOrderList.innerHTML = '';
    state.turnOrder.forEach((unit, index) => {
        const li = document.createElement('li');
        li.textContent = `${unit.name} (DEX: ${unit.dex})`;
        if (index === state.currentTurnIndex) {
            li.className = 'current-turn';
        }
        turnOrderList.appendChild(li);
    });

    const currentUnit = state.turnOrder[state.currentTurnIndex];
    currentTurnUnitName.textContent = `เทิร์นของ: ${currentUnit.name}`;

    if (currentUnit.type === 'player') {
        playerTurnView.classList.remove('hidden');
        enemyTurnView.classList.add('hidden');
    } else { // It's an enemy's turn
        playerTurnView.classList.add('hidden');
        enemyTurnView.classList.remove('hidden');

        // --- (โค้ดเช็ค TAUNT นี้สมบูรณ์แบบ คงเดิม) ---
        const currentEnemyData = allEnemies[currentUnit.id];
        const tauntEffect = Array.isArray(currentEnemyData?.activeEffects)
            ? currentEnemyData.activeEffects.find(effect => effect.type === 'TAUNT')
            : null;

        if (tauntEffect && allPlayersDataByUID[tauntEffect.taunterUid]?.hp > 0) {
            const taunter = allPlayersDataByUID[tauntEffect.taunterUid];
            currentTurnUnitName.textContent = `เทิร์นของ: ${currentUnit.name} (ถูกยั่วยุโดย ${taunter.name}!)`;
            enemyAttackTargetSelect.innerHTML = `<option value="${tauntEffect.taunterUid}">${taunter.name} (HP: ${taunter.hp})</option>`;
            enemyAttackTargetSelect.disabled = true;

        } else {
            enemyAttackTargetSelect.disabled = false;
            enemyAttackTargetSelect.innerHTML = '';
            for (const uid in allPlayersDataByUID) {
                if ((allPlayersDataByUID[uid].hp || 0) > 0) {
                    enemyAttackTargetSelect.innerHTML += `<option value="${uid}">${allPlayersDataByUID[uid].name} (HP: ${allPlayersDataByUID[uid].hp})</option>`;
                }
            }
            if (currentEnemyData && currentEnemyData.targetUid && allPlayersDataByUID[currentEnemyData.targetUid]) {
                enemyAttackTargetSelect.value = currentEnemyData.targetUid;
            } else if (enemyAttackTargetSelect.options.length > 0) {
                enemyAttackTargetSelect.selectedIndex = 0;
            }
        }
    }
    document.getElementById('enemy-attack-button').disabled = (currentUnit.type === 'player');
}

// --- (ส่วนที่เหลือทั้งหมด: Player Management, Item Management, Monster, Quest, Room Controls) ---
// --- (คงเดิมทั้งหมด เพราะทำงานได้ดีอยู่แล้ว) ---

async function saveBasicInfo() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    if (!roomId || !uid) return;
    const currentPlayer = allPlayersDataByUID[uid];
    const newClassName = document.getElementById("editClass").value;
    const newRaceName = document.getElementById("editRace").value;
    const updates = {
        hp: parseInt(document.getElementById("editHp").value),
        gender: document.getElementById("editGender").value,
        age: parseInt(document.getElementById("editAge").value) || 1,
        race: newRaceName,
        class: newClassName,
        background: document.getElementById("editBackground").value
    };
    const classChanged = newClassName !== currentPlayer.class;
    const raceChanged = newRaceName !== currentPlayer.race;
    if (classChanged || raceChanged) {
        if (classChanged) updates['stats/baseClassStats'] = getNewClassStatBonus(newClassName);
        if (raceChanged) updates['stats/baseRaceStats'] = getNewRaceStatBonus(newRaceName);
        const oldMaxHp = currentPlayer.maxHp || calculateHP(currentPlayer.race, currentPlayer.class, calculateTotalStat(currentPlayer, 'CON'));
        const isHpFull = currentPlayer.hp >= oldMaxHp;
        let tempPlayer = JSON.parse(JSON.stringify(currentPlayer));
        tempPlayer.class = newClassName;
        tempPlayer.race = newRaceName;
        if (updates['stats/baseClassStats']) tempPlayer.stats.baseClassStats = updates['stats/baseClassStats'];
        if (updates['stats/baseRaceStats']) tempPlayer.stats.baseRaceStats = updates['stats/baseRaceStats'];
        const newMaxHp = calculateHP(tempPlayer.race, tempPlayer.class, calculateTotalStat(tempPlayer, 'CON'));
        updates['maxHp'] = newMaxHp;
        if (isHpFull) updates['hp'] = newMaxHp;
        else updates['hp'] = Math.min(currentPlayer.hp, newMaxHp);
    }
    db.ref(`rooms/${roomId}/playersByUid/${uid}`).update(updates).then(() => {
        showCustomAlert("บันทึกข้อมูลทั่วไปเรียบร้อย!", 'success');
    });
}
function saveStats() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    if (!roomId || !uid) return;
    const tempStats = {
        STR: parseInt(document.getElementById('editSTRTemp').value) || 0,
        DEX: parseInt(document.getElementById('editDEXTemp').value) || 0,
        CON: parseInt(document.getElementById('editCONTemp').value) || 0,
        INT: parseInt(document.getElementById('editINTTemp').value) || 0,
        WIS: parseInt(document.getElementById('editWISTemp').value) || 0,
        CHA: parseInt(document.getElementById('editCHATemp').value) || 0,
    };
    db.ref(`rooms/${roomId}/playersByUid/${uid}/stats/tempStats`).set(tempStats).then(() => showCustomAlert("บันทึกบัฟ/ดีบัฟ (God Mode) เรียบร้อย!", 'success'));
}
function changeLevel(change) {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    const player = allPlayersDataByUID[uid];
    if (!roomId || !player) return;
    let newLevel = (player.level || 1) + change;
    if (newLevel < 1) newLevel = 1;
    let newFreePoints = player.freeStatPoints || 0;
    if (change > 0) newFreePoints += (change * 2);
    else if (change < 0 && player.level > 1) newFreePoints = Math.max(0, newFreePoints + (change * 2));
    db.ref(`rooms/${roomId}/playersByUid/${uid}`).update({
        level: newLevel,
        freeStatPoints: newFreePoints
    });
}
function applyTempLevel() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    if (!roomId || !uid) return;
    // [ ⭐️ FIX ⭐️ ] เปลี่ยนจากการ set 'tempLevel' (ซึ่งเป็นค่าที่เลิกใช้)
    // ไปเป็นการใช้ 'activeEffects' ซึ่งเป็นระบบใหม่
    const tempLevel = parseInt(document.getElementById("tempLevelInput").value) || 0;
    
    db.ref(`rooms/${roomId}/playersByUid/${uid}/activeEffects`).transaction(effects => {
        if (!Array.isArray(effects)) effects = [];
        
        // 1. ลบบัฟเลเวลเก่า (ถ้ามี)
        effects = effects.filter(e => e.skillId !== 'dm_temp_level_buff');
        
        // 2. เพิ่มบัฟเลเวลใหม่ (ถ้าค่ามากกว่า 0)
        if (tempLevel > 0) {
            effects.push({
                skillId: 'dm_temp_level_buff',
                name: 'DM Level Boost',
                type: 'BUFF',
                stat: 'Level',
                modType: 'FLAT',
                amount: tempLevel,
                turnsLeft: 999 // (นานๆ ไปเลย)
            });
        }
        return effects;
    }).then(() => {
        showCustomAlert("ใช้บัฟเลเวลชั่วคราวเรียบร้อย!", 'success');
    });
}
function clearTempLevel() { 
    document.getElementById("tempLevelInput").value = 0; 
    applyTempLevel(); // (เรียกใช้ applyTempLevel ด้วยค่า 0)
}
function deletePlayer() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    if (!roomId || !uid) return;
    Swal.fire({
        title: 'ยืนยันการลบ?', text: `ต้องการลบ "${name}"?`, icon: 'warning',
        showCancelButton: true, confirmButtonText: 'ใช่, ลบเลย!'
    }).then((result) => {
        if (result.isConfirmed) db.ref(`rooms/${roomId}/playersByUid/${uid}`).remove();
    });
}
function awardExp() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    const awardExpAmountEl = document.getElementById("awardExpAmount");
    const amount = parseInt(awardExpAmountEl.value);
    if (!uid || !awardExpAmountEl || isNaN(amount) || amount <= 0) return showCustomAlert('กรุณาเลือกผู้เล่นและใส่ค่า EXP ที่เป็นบวก!', 'warning');
    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`);
    playerRef.transaction((player) => {
        if (player) {
            player.exp = (player.exp || 0) + amount;
            let levelUpCount = 0;
            while (player.exp >= player.expToNextLevel) {
                levelUpCount++;
                player.exp -= player.expToNextLevel;
                player.level = (player.level || 1) + 1;
                player.freeStatPoints = (player.freeStatPoints || 0) + 2;
                player.expToNextLevel = getExpForNextLevel(player.level);
                const finalCon = calculateTotalStat(player, 'CON');
                const newMaxHp = calculateHP(player.race, player.class, finalCon);
                player.maxHp = newMaxHp;
                player.hp = newMaxHp;
            }
            if (levelUpCount > 0) setTimeout(() => showCustomAlert(`${player.name} Level Up! x${levelUpCount}`, 'success'), 100);
        }
        return player;
    }).then(() => {
        showCustomAlert(`มอบ EXP ${amount} ให้ ${name} สำเร็จ!`, 'info');
        awardExpAmountEl.value = '';
    }).catch(error => showCustomAlert('เกิดข้อผิดพลาดในการมอบ EXP!', 'error'));
}
function addItem() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    const itemName = document.getElementById("itemName").value.trim();
    if (!roomId || !uid || !itemName) return;
    const itemQty = parseInt(document.getElementById("itemQty").value) || 1;
    const player = allPlayersDataByUID[uid];
    const inventory = player.inventory || [];
    const existingItem = inventory.find(i => i.name === itemName && !i.bonuses);
    if (existingItem) existingItem.quantity += itemQty;
    else inventory.push({ name: itemName, quantity: itemQty, itemType: 'ทั่วไป' });
    db.ref(`rooms/${roomId}/playersByUid/${uid}/inventory`).set(inventory);
}
function removeItem() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    const selectedIndex = document.getElementById("itemSelect").value;
    if (!roomId || !uid || selectedIndex === null || selectedIndex === "") return showCustomAlert("กรุณาเลือกผู้เล่นและไอเทมที่ต้องการลบ", "warning");
    const itemIndex = parseInt(selectedIndex);
    const qtyToRemove = parseInt(document.getElementById("removeQty").value) || 1;
    const player = allPlayersDataByUID[uid];
    let inventory = player.inventory || [];
    if (itemIndex < 0 || itemIndex >= inventory.length) return showCustomAlert("ไม่พบไอเทมที่ต้องการลบ (Invalid Index)", "error");
    if (inventory[itemIndex].quantity <= qtyToRemove) inventory.splice(itemIndex, 1);
    else inventory[itemIndex].quantity -= qtyToRemove;
    db.ref(`rooms/${roomId}/playersByUid/${uid}/inventory`).set(inventory).then(() => showCustomAlert(`ลบไอเทมจาก ${name} สำเร็จ`, 'success'));
}
function toggleItemFields() {
    const type = document.getElementById('customItemType').value;
    document.getElementById('equipmentFields').classList.toggle('hidden', type !== 'สวมใส่');
    document.getElementById('weaponFields').classList.toggle('hidden', type !== 'อาวุธ');
    document.getElementById('consumableFields').classList.toggle('hidden', type !== 'บริโภค');
}
function sendCustomItem() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    const itemName = document.getElementById("customItemName").value.trim();
    if (!roomId || !uid || !itemName) return showCustomAlert("กรุณาเลือกผู้เล่นและใส่ชื่อไอเทม", 'warning');
    const itemQty = parseInt(document.getElementById("customItemQty").value) || 1;
    const bonuses = {};
    ['HP', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(stat => {
        const value = parseInt(document.getElementById(`itemBonus${stat}`).value);
        if (!isNaN(value) && value !== 0) bonuses[stat.toUpperCase()] = value;
    });
    const itemType = document.getElementById('customItemType').value;
    let newItem = { name: itemName, quantity: itemQty, bonuses: bonuses, originalBonuses: { ...bonuses }, itemType: itemType };
    if (itemType === 'บริโภค') {
        const healAmount = parseInt(document.getElementById('itemEffectHeal').value);
        const permStat = document.getElementById('itemEffectPermStat').value;
        const permAmount = parseInt(document.getElementById('itemEffectPermAmount').value);
        if (healAmount > 0) newItem.consumableEffect = { type: 'HEAL', amount: healAmount };
        else if (permStat && permAmount) newItem.consumableEffect = { type: 'PERM_STAT', stat: permStat, amount: permAmount };
    }
    if (itemType === 'สวมใส่') newItem.slot = document.getElementById('customItemSlot').value;
    else if (itemType === 'อาวุธ') {
        newItem.slot = null;
        newItem.damageDice = document.getElementById('customDamageDice').value.trim();
        newItem.weaponType = document.getElementById('customWeaponType').value;
        const selectedClasses = [];
        document.querySelectorAll('#recommendedClassCheckboxes input:checked').forEach(checkbox => selectedClasses.push(checkbox.value));
        newItem.recommendedClass = selectedClasses;
    }
    const player = allPlayersDataByUID[uid];
    const inventory = player.inventory || [];
    const existingItemIndex = inventory.findIndex(i => i.name === itemName && JSON.stringify(i.originalBonuses || {}) === JSON.stringify(newItem.originalBonuses || {}));
    if (existingItemIndex > -1) inventory[existingItemIndex].quantity += itemQty;
    else inventory.push(newItem);
    db.ref(`rooms/${roomId}/playersByUid/${uid}/inventory`).set(inventory).then(() => showCustomAlert(`ส่งไอเทม "${itemName}" ให้ ${name} สำเร็จ`, 'success'));
}
const monsterTemplates = { 'Goblin': { hp: 5, str: 8, dex: 14, con: 10, int: 8, wis: 10, cha: 6, damageDice: 'd6' }, 'Orc': { hp: 15, str: 16, dex: 12, con: 14, int: 7, wis: 10, cha: 8, damageDice: 'd8' }, 'Dragon (Young)': { hp: 50, str: 20, dex: 10, con: 18, int: 14, wis: 12, cha: 16, damageDice: 'd12' } };
function populateMonsterTemplates() {
    const select = document.getElementById("monsterTemplateSelect");
    select.innerHTML = '<option value="">--- เลือกมอนสเตอร์ ---</option>';
    for (const name in monsterTemplates) select.innerHTML += `<option value="${name}">${name}</option>`;
}
function loadMonsterTemplate() {
    const selectedName = document.getElementById("monsterTemplateSelect").value;
    const template = monsterTemplates[selectedName];
    if (template) {
        document.getElementById("monsterHp").value = template.hp;
        document.getElementById("monsterStr").value = template.str;
        document.getElementById("monsterDex").value = template.dex;
        document.getElementById("monsterCon").value = template.con || 10;
        document.getElementById("monsterInt").value = template.int || 10;
        document.getElementById("monsterWis").value = template.wis || 10;
        document.getElementById("monsterCha").value = template.cha || 10;
        document.getElementById("monsterDamageDice").value = template.damageDice || 'd6';
    }
}
function addMonster(addPerPlayer) {
    const roomId = sessionStorage.getItem('roomId');
    const monsterName = document.getElementById("monsterTemplateSelect").value;
    if (!monsterName) return showCustomAlert("กรุณาเลือกมอนสเตอร์จาก Template ก่อน", 'warning');
    const createEnemyObject = () => {
        const hp = parseInt(document.getElementById("monsterHp").value) || 10;
        return {
            name: monsterName, hp: hp, maxHp: hp, damageDice: document.getElementById("monsterDamageDice").value || 'd6',
            expValue: parseInt(document.getElementById("monsterExpValue").value) || 0,
            stats: { STR: parseInt(document.getElementById("monsterStr").value) || 10, DEX: parseInt(document.getElementById("monsterDex").value) || 10, CON: parseInt(document.getElementById("monsterCon").value) || 10, INT: parseInt(document.getElementById("monsterInt").value) || 10, WIS: parseInt(document.getElementById("monsterWis").value) || 10, CHA: parseInt(document.getElementById("monsterCha").value) || 10, },
            targetUid: document.getElementById('enemyInitialTarget').value
        };
    };
    const enemiesRef = db.ref(`rooms/${roomId}/enemies`);
    if (addPerPlayer) {
        let playerIndex = 1;
        Object.keys(allPlayersDataByUID).forEach(uid => {
            const enemyData = createEnemyObject();
            enemyData.targetUid = uid;
            enemyData.name = `${monsterName} #${playerIndex++}`
            enemiesRef.push(enemyData);
        });
        showCustomAlert(`เพิ่ม ${monsterName} ตามจำนวนผู้เล่นสำเร็จ!`, 'success');
    } else {
        enemiesRef.push(createEnemyObject());
        showCustomAlert(`เพิ่ม ${monsterName} 1 ตัว สำเร็จ!`, 'success');
    }
}
async function addCustomEnemy() {
  const roomId = sessionStorage.getItem('roomId');
  if (!roomId) return showCustomAlert("ไม่พบรหัสห้อง!", "error");
  const name = document.getElementById("customEnemyName").value.trim();
  const hp = parseInt(document.getElementById("customEnemyHp").value) || 0;
  const str = parseInt(document.getElementById("customEnemyStr").value) || 10;
  const dex = parseInt(document.getElementById("customEnemyDex").value) || 10;
  const con = parseInt(document.getElementById("customEnemyCon").value) || 10;
  const intt = parseInt(document.getElementById("customEnemyInt").value) || 10;
  const wis = parseInt(document.getElementById("customEnemyWis").value) || 10;
  const cha = parseInt(document.getElementById("customEnemyCha").value) || 10;
  const damageDice = document.getElementById("customEnemyDamageDice").value.trim() || "d6";
  if (!name || hp <= 0) return showCustomAlert("กรุณาใส่ชื่อและ HP ให้ครบถ้วน!", "warning");
  const enemyData = { name, hp, maxHp: hp, damageDice, stats: { STR: str, DEX: dex, CON: con, INT: intt, WIS: wis, CHA: cha }, type: "enemy", targetUid: "shared", createdAt: Date.now(), };
  try {
    await db.ref(`rooms/${roomId}/enemies`).push(enemyData);
    showCustomAlert(`เพิ่มศัตรู "${name}" สำเร็จ!`, "success");
    if (typeof loadEnemies === "function") loadEnemies();
  } catch (error) { showCustomAlert("เกิดข้อผิดพลาดในการเพิ่มศัตรู", "error"); }
}
function moveEnemy(enemyKey) {
    const roomId = sessionStorage.getItem('roomId');
    let options = { 'shared': 'ยังไม่กำหนดเป้าหมาย (ศัตรูร่วม)' };
    for (const uid in allPlayersDataByUID) options[uid] = allPlayersDataByUID[uid].name;
    Swal.fire({
        title: 'ย้ายเป้าหมาย', input: 'select', inputOptions: options,
        inputPlaceholder: 'เลือกเป้าหมายใหม่', showCancelButton: true, confirmButtonText: 'ย้าย'
    }).then((result) => {
        if (result.isConfirmed && result.value) db.ref(`rooms/${roomId}/enemies/${enemyKey}`).update({ targetUid: result.value });
    });
}
function deleteEnemy(enemyKey) {
    const roomId = sessionStorage.getItem('roomId');
    Swal.fire({
        title: 'ยืนยันการลบ?', text: `ต้องการลบ "${allEnemies[enemyKey].name}" ออกจากฉาก?`, icon: 'warning',
        showCancelButton: true, confirmButtonText: 'ใช่, ลบเลย!', confirmButtonColor: '#c82333'
    }).then((result) => {
        if (result.isConfirmed) db.ref(`rooms/${roomId}/enemies/${enemyKey}`).remove();
    });
}
function clearAllEnemies() {
    const roomId = sessionStorage.getItem('roomId');
    Swal.fire({
        title: 'ยืนยันการล้างบาง?', text: "ต้องการลบคู่ต่อสู้ทั้งหมดในฉากหรือไม่?", icon: 'error',
        showCancelButton: true, confirmButtonText: 'ใช่, ล้างทั้งหมด!', confirmButtonColor: '#c82333'
    }).then((result) => {
        if (result.isConfirmed) db.ref(`rooms/${roomId}/enemies`).remove().then(() => showCustomAlert('ล้างคู่ต่อสู้ทั้งหมดเรียบร้อย!', 'success'));
    });
}
function saveStory() {
    const roomId = sessionStorage.getItem('roomId');
    const storyText = document.getElementById("story").value;
    if (roomId) db.ref(`rooms/${roomId}/story`).set(storyText);
}
function sendQuest() {
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById("playerSelect").value;
    const uid = getUidByName(playerName);
    if (!roomId || !uid) return;
    const quest = {
        title: document.getElementById("questTitle").value,
        detail: document.getElementById("questDetail").value,
        reward: document.getElementById("questReward").value,
        expReward: parseInt(document.getElementById("questExpReward").value) || 0
    };
    if (!quest.title.trim()) return showCustomAlert("กรุณาระบุชื่อเควส", 'warning');
    db.ref(`rooms/${roomId}/playersByUid/${uid}/quest`).set(quest);
}
function completeQuest() {
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById("playerSelect").value;
    const uid = getUidByName(playerName);
    if (roomId && uid) db.ref(`rooms/${roomId}/playersByUid/${uid}/quest`).remove().then(() => showCustomAlert("ยืนยันเควสสำเร็จแล้ว (อย่าลืมมอบ EXP!)", "success"));
}
function cancelQuest() {
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById("playerSelect").value;
    const uid = getUidByName(playerName);
    if (roomId && uid) db.ref(`rooms/${roomId}/playersByUid/${uid}/quest`).remove().then(() => showCustomAlert("ยกเลิกเควสแล้ว", "info"));
}
function changeRoomPassword() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;
    Swal.fire({ title: '🔑 เปลี่ยนรหัสเข้าห้อง', input: 'password', showCancelButton: true }).then((result) => {
        if (result.isConfirmed && result.value) db.ref(`rooms/${roomId}/password`).set(result.value);
    });
}
function changeDMPassword() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;
    Swal.fire({ title: '🔒 เปลี่ยนรหัส DM Panel', input: 'password', showCancelButton: true }).then((result) => {
        if (result.isConfirmed && result.value) db.ref(`rooms/${roomId}/dmPassword`).set(result.value);
    });
}
function deleteRoom() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;
    Swal.fire({
        title: '💣 ยืนยันการลบห้องถาวร?', text: "การกระทำนี้ไม่สามารถย้อนกลับได้!", icon: 'error',
        showCancelButton: true, confirmButtonText: 'ใช่, ลบห้องเลย!'
    }).then((result) => {
        if (result.isConfirmed) db.ref(`rooms/${roomId}`).remove().then(() => {
            sessionStorage.removeItem('roomId');
            window.location.replace('lobby.html');
        });
    });
}
async function rollDmDice() {
    const diceType = parseInt(document.getElementById("dmDiceType").value);
    const diceCount = parseInt(document.getElementById("dmDiceCount").value);
    const rollButton = document.querySelector('button[onclick="rollDmDice()"]');
    if (typeof showDiceRollAnimation === 'function') await showDiceRollAnimation(diceCount, diceType, 'dm-dice-animation-area', 'dmDiceResult', rollButton);
    else showCustomAlert("ฟังก์ชันทอยเต๋าไม่พร้อมใช้งาน", 'error');
}
function clearDiceLogs() { const roomId = sessionStorage.getItem('roomId'); if (roomId) db.ref(`rooms/${roomId}/diceLogs`).set(null); }
function clearCombatLogs() { const roomId = sessionStorage.getItem('roomId'); if (roomId) db.ref(`rooms/${roomId}/combatLogs`).set(null); }

// =================================================================================
// ส่วนที่ 4: Initial Load & Real-time Listeners
// =================================================================================
window.onload = function() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) {
        window.location.replace('lobby.html');
        return;
    }

    // [CONFIRMED] Listener นี้ยังทำงานได้ดีเหมือนเดิม
    const resolutionRef = db.ref(`rooms/${roomId}/combat/resolution`);
    resolutionRef.on('value', (snapshot) => {
        if (snapshot.exists() && snapshot.val() !== null) {
            handleDefenseResolution(snapshot.val());
        }
    });

    const playersRef = db.ref(`rooms/${roomId}/playersByUid`);
    playersRef.on('value', (snapshot) => {
        allPlayersDataByUID = snapshot.val() || {};

        const select = document.getElementById("playerSelect");
        const enemyTargetSelect = document.getElementById("enemyInitialTarget");
        const previouslySelectedName = select.value;

        select.innerHTML = '<option value="">--- เลือกผู้เล่น ---</option>';
        enemyTargetSelect.innerHTML = '<option value="shared">ยังไม่กำหนดเป้าหมาย (ศัตรูร่วม)</option>';

        let foundSelected = false;
        for (let uid in allPlayersDataByUID) {
            const player = allPlayersDataByUID[uid];
            select.innerHTML += `<option value="${player.name}">${player.name}</option>`;
            enemyTargetSelect.innerHTML += `<option value="${uid}">${player.name}</option>`;
            if (player.name === previouslySelectedName) foundSelected = true;
        }

        if (foundSelected) {
            select.value = previouslySelectedName;
            loadPlayer(); // [REBUILT] loadPlayer() จะเรียกใช้ calculateTotalStat() ที่อัปเดตแล้ว
        } else {
            resetPlayerEditor();
        }
        displayCombatState(combatState); // อัปเดต UI การต่อสู้เผื่อไว้
    });

    const enemiesRef = db.ref(`rooms/${roomId}/enemies`);
    enemiesRef.on('value', (snapshot) => {
        allEnemies = snapshot.val() || {};
        displayAllEnemies(allEnemies);
    });

    const combatRef = db.ref(`rooms/${roomId}/combat`);
    combatRef.on('value', (snapshot) => {
        combatState = snapshot.val() || {};
        displayCombatState(combatState); // [REBUILT] ฟังก์ชันนี้สำคัญมากและยังทำงานได้ดี
    });

    const roomRef = db.ref(`rooms/${roomId}`);
    roomRef.child('diceLogs').on('value', s => displayDiceLog(s.val(), 'playerDiceLog'));
    roomRef.child('combatLogs').on('value', s => displayDiceLog(s.val(), 'playerCombatLog'));
    roomRef.child('story').on('value', s => {
        document.getElementById("story").value = s.val() || "";
    });

    populateMonsterTemplates();
    populateClassCheckboxes(); 
    populateWeaponTypes();

    document.getElementById("playerSelect").addEventListener('change', loadPlayer);
    listenForActionComplete(); // [CONFIRMED] Listener นี้ยังทำงานได้ดี
};