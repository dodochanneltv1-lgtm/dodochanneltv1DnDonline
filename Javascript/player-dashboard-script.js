// Javascript/player-dashboard-script.js

let allPlayersInRoom = {};
let allEnemiesInRoom = {};
let combatState = {};
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
};
// ✨ [ปรับปรุง] เพิ่มรายการอาวุธที่ควรใช้ DEX เพื่อให้โค้ดตรวจสอบได้ง่ายขึ้น
const DEX_WEAPONS = ['มีด', 'ธนู', 'หน้าไม้', 'ดาบสั้น', 'อาวุธซัด'];


// =================================================================================
// ส่วนที่ 1: Utility & Calculation Functions
// =================================================================================
function showCustomAlert(message, iconType = 'info') { Swal.fire({ title: iconType === 'success' ? 'สำเร็จ!' : '⚠️ แจ้งเตือน!', text: message, icon: iconType }); }
function calculateHP(charRace, charClass, finalCon) { const racialBaseHP = { 'มนุษย์': 10, 'เอลฟ์': 8, 'คนแคระ': 12, 'ฮาล์ฟลิ่ง': 8, 'ไทฟลิ่ง': 9, 'แวมไพร์': 9, 'เงือก': 10, 'ออร์ค': 14, 'โนม': 7, 'เอลฟ์ดำ': 8, 'นางฟ้า': 6, 'มาร': 11, 'โกเลม': 18, 'อันเดด': 25, 'ครึ่งมังกร': 20, 'มังกร': 40, 'ครึ่งเทพ': 30, 'พระเจ้า': 100 }; const classBaseHP = { 'บาร์บาเรียน': 16, 'แทงค์': 25, 'นักรบ': 12, 'นักดาบเวทย์': 10, 'อัศวิน': 13, 'อัศวินศักดิ์สิทธิ์': 14, 'ผู้กล้า': 18, 'นักเวท': 4, 'นักบวช': 8, 'นักบุญหญิง': 9, 'สตรีศักดิ์สิทธิ์': 10, 'โจร': 8, 'นักฆ่า': 11, 'เรนเจอร์': 10, 'พ่อค้า': 6, 'นักปราชญ์': 4, 'เจ้าเมือง': 15, 'จอมมาร': 22, 'เทพเจ้า': 50 }; const conModifier = Math.floor((finalCon - 10) / 2); const raceHP = racialBaseHP[charRace] || 8; const classHP = classBaseHP[charClass] || 6; return raceHP + classHP + conModifier; }

// ✅ [ยืนยันความถูกต้อง] calculateTotalStat ใช้ upperStatKey ในการเข้าถึง Stat ทุกส่วนแล้ว
function calculateTotalStat(charData, statKey) {
    if (!charData || !charData.stats) return 0;
    const stats = charData.stats;
    const permanentLevel = charData.level || 1;
    const tempLevel = charData.tempLevel || 0;
    const totalLevel = permanentLevel + tempLevel;
    let equipmentBonus = 0;
    const upperStatKey = statKey.toUpperCase();

    if (charData.equippedItems) {
        for (const slot in charData.equippedItems) {
            const item = charData.equippedItems[slot];
            if (item && item.bonuses && item.bonuses[upperStatKey]) {
                equipmentBonus += item.bonuses[upperStatKey];
            }
        }
    }

    const baseStat = (stats.baseRaceStats?.[upperStatKey] || 0) +
        (stats.baseClassStats?.[upperStatKey] || 0) +
        (stats.investedStats?.[upperStatKey] || 0) +
        (stats.tempStats?.[upperStatKey] || 0) +
        equipmentBonus;
    if (baseStat === 0) return 0;
    const levelBonus = baseStat * (totalLevel - 1) * 0.2;
    
    let finalStat = Math.floor(baseStat + levelBonus);

    const mainWeapon = charData.equippedItems?.mainHand;
    const offHandItem = charData.equippedItems?.offHand;

    // 🐞 [แก้ไข] ตรวจสอบโบนัส/บทลงโทษให้ถูก Stat
    // โบนัสจะมีผลต่อ STR หรือ DEX เท่านั้น ขึ้นอยู่กับชนิดอาวุธ
    if (mainWeapon) {
        const isDexWeapon = DEX_WEAPONS.includes(mainWeapon.weaponType);
        const relevantStat = isDexWeapon ? 'DEX' : 'STR';

        if (upperStatKey === relevantStat) {
            if (mainWeapon.classBonus) {
                finalStat += 3; 
            } else if (mainWeapon.proficiencyPenalty) {
                finalStat -= 2; 
            }
        }
    }
    
    if (offHandItem && offHandItem.itemType === 'อาวุธ' && upperStatKey === 'DEX') {
        finalStat -= 2; 
    }

    return finalStat;
}

// =================================================================================
// ส่วนที่ 2: Display Functions
// =================================================================================

const CHARACTER_INFO_HTML = `
    <h2>ข้อมูลตัวละคร</h2>
    <p><strong>ชื่อ:</strong>
    <span id="name">
    </span></p>
    <p><strong>เผ่าพันธุ์:</strong>
    <span id="race"></span></p>
    <p><strong>อายุ:</strong> 
    <span id="age"></span></p>
    <p><strong>เพศ:</strong> 
    <span id="gender"></span></p>
    <p><strong>อาชีพ:</strong> 
    <span id="class"></span></p>
    <details><summary>
    <strong>ภูมิหลัง (คลิกเพื่อดู)</strong>
    </summary><p id="background" style="margin-top: 5px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px;"></p>
    </details><p><strong>เลเวล:</strong> <span id="level"></span></p>
    <div style="margin: 5px 0;"><small><strong>EXP:</strong> 
    <span id="exp">0</span> / <span id="expToNextLevel">300</span></small>
    <div style="background-color: #333; border-radius: 5px; padding: 2px;">
    <div id="expBar" style="height: 8px; width: 0%; background-color: #00bcd4; border-radius: 3px; transition: width 0.5s ease-in-out;"></div></div></div>
    <p><strong>พลังชีวิต:</strong> <span id="hp"></span></p><ul><li>พลังโจมตี (STR): <span id="str"></span></li><li>ความคล่องแคล่ว (DEX): <span id="dex"></span></li>
    <li>ความทนทาน (CON): <span id="con"></span></li><li>สติปัญญา (INT): <span id="int"></span></li><li>จิตใจ (WIS): <span id="wis"></span></li><li>เสน่ห์ (CHA): <span id="cha"></span></li></ul>
`;

function updateCharacterStatsDisplay(charData) {
    if (!charData) return;
    const statsKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    
    // ✨ [ปรับปรุง] เพิ่ม Logic การแสดงผลอนิเมชัน Stat Up/Down
    statsKeys.forEach(key => {
        const el = document.getElementById(key.toLowerCase());
        if(el) {
            const currentValue = parseInt(el.textContent || "0");
            const newValue = calculateTotalStat(charData, key);

            // เปรียบเทียบค่าและเพิ่ม class สำหรับ animation
            if (newValue > currentValue) {
                el.classList.add('stat-up');
            } else if (newValue < currentValue) {
                el.classList.add('stat-down');
            }
            
            el.textContent = newValue;

            // ตั้งเวลาเพื่อลบ class ออกหลังจาก animation จบ
            if (newValue !== currentValue) {
                setTimeout(() => {
                    el.classList.remove('stat-up', 'stat-down');
                }, 1500); // 1.5 วินาที
            }
        }
    });

    const maxHp = charData.maxHp || calculateHP(charData.race, charData.class, calculateTotalStat(charData, 'CON'));
    const hpEl = document.getElementById('hp');
    if (hpEl) hpEl.textContent = `${charData.hp || 0} / ${maxHp}`;
    
    const levelEl = document.getElementById('level');
    if (levelEl) levelEl.textContent = charData.level || 1;
    
    const currentExp = charData.exp || 0;
    const expForNext = charData.expToNextLevel || 300;
    const expEl = document.getElementById('exp');
    if (expEl) expEl.textContent = currentExp;
    
    const expNextEl = document.getElementById('expToNextLevel');
    if (expNextEl) expNextEl.textContent = expForNext;

    const expBarEl = document.getElementById('expBar');
    if (expBarEl) expBarEl.style.width = `${Math.min(100, (currentExp / expForNext) * 100)}%`;

    const upgradeButton = document.getElementById("goToStatsButton");
    const freePoints = charData.freeStatPoints || 0;
    if (upgradeButton) {
        upgradeButton.style.display = freePoints > 0 ? 'block' : 'none';
        if (freePoints > 0) upgradeButton.textContent = `✨ อัปเกรดสถานะ (${freePoints} แต้ม) ✨`;
    }
}


function displayCharacter(character) {
    const infoPanel = document.getElementById("characterInfoPanel");
    if (infoPanel && !infoPanel.querySelector('#name')) {
        infoPanel.innerHTML = CHARACTER_INFO_HTML;
    }
    document.getElementById("name").textContent = character.name || "-";
    document.getElementById("race").textContent = character.race || "-";
    document.getElementById("age").textContent = character.age || "-";
    document.getElementById("gender").textContent = character.gender || "-";
    document.getElementById("class").textContent = character.class || "-";
    document.getElementById("background").textContent = character.background || "ไม่มีข้อมูล";
    updateCharacterStatsDisplay(character);
}

function handlePendingAttack(attackData, playerRef) {
    const currentUserUid = playerRef.key;
    if (!attackData || !attackData.attackerName) {
        playerRef.child('pendingAttack').remove();
        return;
    }
    Swal.fire({
        title: `คุณถูกโจมตี!`,
        html: `<strong>${attackData.attackerName}</strong> กำลังโจมตีคุณ (ค่าโจมตี: ${attackData.attackRollValue} vs AC คุณ: ${attackData.targetAC || '??'})<br>คุณจะทำอะไร?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '🛡️ ป้องกัน (Block)',
        cancelButtonText: '🏃 หลบ (Dodge)',
        showDenyButton: true,
        denyButtonText: '😑 ไม่ทำอะไร',
        timer: 10000,
        timerProgressBar: true,
        allowOutsideClick: false,
    }).then(async (result) => {
        const snapshot = await playerRef.get();
        const playerData = snapshot.val();
        let defenseResponse = {
            defenderUid: currentUserUid,
            attackerKey: attackData.attackerKey,
            attackRollValue: attackData.attackRollValue
        };
        let feedbackTitle = '', feedbackHtml = '';

        if (result.isConfirmed) {
            const blockRoll = Math.floor(Math.random() * 20) + 1;
            const totalCon = calculateTotalStat(playerData, 'CON');
            const conBonus = Math.floor((totalCon - 10) / 2);
            const totalBlock = blockRoll + conBonus;
            const damageReduction = Math.floor(totalBlock / 3);
            defenseResponse.choice = 'block';
            defenseResponse.roll = totalBlock;
            defenseResponse.damageReduced = damageReduction;
            feedbackTitle = '🛡️ ผลการป้องกัน! 🛡️';
            feedbackHtml = `คุณทอยค่าป้องกันได้ <strong>${totalBlock}</strong>.<br>คุณลดความเสียหายที่ได้รับลง <strong>${damageReduction}</strong> หน่วย!`;
        } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
            const dodgeRoll = Math.floor(Math.random() * 20) + 1;
            const totalDex = calculateTotalStat(playerData, 'DEX');
            const dexBonus = Math.floor((totalDex - 10) / 2);
            const totalDodge = dodgeRoll + dexBonus;
            const isSuccess = totalDodge > attackData.attackRollValue;
            defenseResponse.choice = 'dodge';
            defenseResponse.roll = totalDodge;
            defenseResponse.success = isSuccess;
            feedbackTitle = '🏃 ผลการหลบหลีก! 🏃';
            feedbackHtml = isSuccess ? `คุณทอยค่าหลบหลีกได้ <strong>${totalDodge}</strong>...<br><strong style="color: #4caf50;">หลบหลีกได้สมบูรณ์!</strong>` : `คุณทอยค่าหลบหลีกได้ <strong>${totalDodge}</strong>...<br><strong style="color: #f44336;">หลบหลีกไม่พ้น!</strong>`;
        } else {
            defenseResponse.choice = 'none';
            feedbackTitle = '😑 ไม่ป้องกัน 😑';
            feedbackHtml = 'คุณเลือกที่จะไม่ป้องกันการโจมตีนี้';
        }
        Swal.fire({ title: feedbackTitle, html: feedbackHtml, icon: 'info', timer: 3500, timerProgressBar: true, showConfirmButton: false });
        const roomId = sessionStorage.getItem('roomId');
        await db.ref(`rooms/${roomId}/combat/resolution`).set(defenseResponse);
        await playerRef.child('pendingAttack').remove();
    });
}

function updateTurnDisplay(state, currentUserUid) {
    const indicator = document.getElementById('turnIndicator');
    const attackButton = document.getElementById('attackRollButton');
    const damageRollSection = document.getElementById('damageRollSection');
    if (!state || !state.isActive) {
        if (indicator) indicator.classList.add('hidden');
        if (attackButton) attackButton.disabled = true;
        if (damageRollSection) damageRollSection.style.display = 'none';
        return;
    }
    if (indicator) indicator.classList.remove('hidden');
    const currentTurnUnit = state.turnOrder[state.currentTurnIndex];
    if (currentTurnUnit.id === currentUserUid) {
        if (indicator) {
            indicator.className = 'my-turn';
            indicator.textContent = '🔥 เทิร์นของคุณ! 🔥';
        }
        if (attackButton) attackButton.disabled = false;
    } else {
        if (indicator) {
            indicator.className = 'other-turn';
            indicator.textContent = `กำลังรอเทิร์นของ... ${currentTurnUnit.name}`;
        }
        if (attackButton) attackButton.disabled = true;
        if (damageRollSection) damageRollSection.style.display = 'none';
    }
}

function displayInventory(inventory = []) {
    const list = document.getElementById("inventory");
    if(!list) return;
    list.innerHTML = inventory.length === 0 ? "<li>ยังไม่มีไอเทม</li>" : "";
    inventory.forEach(item => {
        if (!item || !item.name) return;
        const li = document.createElement("li");
        let itemText = `${item.name} (x${item.quantity})`;
        if (item.itemType === 'สวมใส่' || item.itemType === 'อาวุธ') {
            const escapedName = item.name.replace(/'/g, "\\'");
            itemText += ` <button onclick="equipItem('${escapedName}')" style="margin-left: 10px; padding: 2px 8px; font-size: 0.8em;">สวมใส่</button>`;
        }
        li.innerHTML = itemText;
        list.appendChild(li);
    });
}

function displayEquippedItems(equippedItems = {}) {
    ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet'].forEach(slot => {
        const span = document.getElementById(`eq-${slot}`);
        if (!span) return;
        const button = span.nextElementSibling;
        const item = equippedItems[slot];
        if (item) {
            let displayName = item.name;
            if (item.classBonus) displayName += " (ชำนาญ)";
            else if (item.proficiencyPenalty) displayName += " (ไม่ชำนาญ)";
            else if (item.offHandPenalty) displayName += " (มือรอง)";
            span.textContent = displayName;
            if(button) button.style.display = 'inline-block';
        } else {
            span.textContent = "-";
            if(button) button.style.display = 'none';
        }
    });
}

function displayTeammates(currentUserUid) {
    const select = document.getElementById('teammateSelect');
    if(!select) return;
    const currentSelection = select.value;
    select.innerHTML = '<option value="">-- เลือกดูข้อมูล --</option>';
    for (const uid in allPlayersInRoom) {
        if (uid !== currentUserUid) {
            select.innerHTML += `<option value="${uid}">${allPlayersInRoom[uid].name}</option>`;
        }
    }
    select.value = currentSelection;
}

function showTeammateInfo() {
    const infoDiv = document.getElementById('teammateInfo');
    const select = document.getElementById('teammateSelect');
    if (!infoDiv || !select) return;
    const selectedUid = select.value;
    if (!selectedUid || !allPlayersInRoom[selectedUid]) {
        infoDiv.innerHTML = "<p>เลือกเพื่อนร่วมทีมเพื่อดูข้อมูล</p>";
        return;
    }
    const player = allPlayersInRoom[selectedUid];
    const maxHp = player.maxHp || calculateHP(player.race, player.class, calculateTotalStat(player, 'CON'));
    infoDiv.innerHTML = `<p><strong>ชื่อ:</strong> ${player.name}</p><p><strong>HP:</strong> ${player.hp}/${maxHp}</p>`;
}

function displayQuest(quest) {
    if(document.getElementById("questTitle")) document.getElementById("questTitle").textContent = quest?.title || "ไม่มีเควส";
    if(document.getElementById("questDetail")) document.getElementById("questDetail").textContent = quest?.detail || "-";
    if(document.getElementById("questReward")) document.getElementById("questReward").textContent = quest?.reward || "-";
}

function displayStory(storyData) { if(document.getElementById("story")) document.getElementById("story").textContent = storyData || "ยังไม่มีเนื้อเรื่องจาก DM"; }

function displayEnemies(enemies = {}, currentUserUid) {
    const container = document.getElementById('enemyPanelContainer');
    const targetSelect = document.getElementById('enemyTargetSelect');
    if (!container || !targetSelect) return;
    container.innerHTML = '';
    targetSelect.innerHTML = '';
    const myEnemies = Object.entries(enemies)
        .filter(([key, enemy]) => enemy.targetUid === currentUserUid || enemy.targetUid === 'shared')
        .map(([key, enemy]) => ({ key, ...enemy }));

    if (myEnemies.length === 0) {
        container.innerHTML = '<p><em>ไม่มีศัตรู</em></p>';
        targetSelect.innerHTML = '<option value="">ไม่มีเป้าหมาย</option>';
        return;
    }
    myEnemies.forEach(enemy => {
        const enemyDiv = document.createElement('div');
        enemyDiv.className = 'enemy-item';
        enemyDiv.innerHTML = `<p><strong>${enemy.name}</strong> (HP: ${enemy.hp}/${enemy.maxHp})</p>`;
        container.appendChild(enemyDiv);
        targetSelect.innerHTML += `<option value="${enemy.key}">${enemy.name} (HP: ${enemy.hp})</option>`;
    });
}

function addToCombatLog(message) {
    const log = document.getElementById('combatLog');
    if (log) {
        log.innerHTML += `<p>${message}</p>`;
        log.scrollTop = log.scrollHeight;
    }
}

// =================================================================================
// ส่วนที่ 3: Core Logic
// =================================================================================
async function playerRollDice() {
    const diceType = parseInt(document.getElementById("diceType").value);
    const diceCount = parseInt(document.getElementById("diceCount").value);
    const rollButton = document.querySelector('button[onclick="playerRollDice()"]');
    const rollData = typeof showDiceRollAnimation === 'function' ? await showDiceRollAnimation(diceCount, diceType, 'player-dice-animation-area', 'dice-result', rollButton) : { results: [] };
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById('name').textContent;
    if (roomId && playerName) {
        const logEntry = { name: playerName, dice: diceType, count: diceCount, result: rollData.results, timestamp: new Date().toISOString(), type: 'general' };
        db.ref(`rooms/${roomId}/diceLogs`).push(logEntry);
    }
}

async function equipItem(itemName) {
    const uid = firebase.auth().currentUser?.uid;
    const roomId = sessionStorage.getItem('roomId');
    if (!uid || !roomId) return;

    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`);
    const snapshot = await playerRef.get();
    if (!snapshot.exists()) return;

    const charData = snapshot.val();
    let { inventory = [], equippedItems = {} } = charData;
    
    const itemIdx = inventory.findIndex(i => i.name === itemName);
    if (itemIdx === -1) return;

    const itemToEquip = { ...inventory[itemIdx] }; 

    const processEquip = async (targetSlot) => {
        // 1. ถอดของเก่า (ถ้ามี) และนำกลับเข้า inventory ในสภาพสมบูรณ์
        if (equippedItems[targetSlot]) {
            const itemToUnequip = { ...equippedItems[targetSlot] };
            
            const baseItemToReturn = { 
                ...itemToUnequip,
                bonuses: { ...(itemToUnequip.originalBonuses || itemToUnequip.bonuses) },
                quantity: 1
             };
            delete baseItemToReturn.classBonus;
            delete baseItemToReturn.proficiencyPenalty;
            delete baseItemToReturn.offHandPenalty;

            const existingIdx = inventory.findIndex(i => i.name === baseItemToReturn.name);
            if (existingIdx > -1) {
                inventory[existingIdx].quantity++;
            } else {
                inventory.push(baseItemToReturn);
            }
        }
        
        // 2. กำหนดสถานะโบนัส/บทลงโทษให้กับไอเทม (ไม่แก้ชื่อ)
        delete itemToEquip.classBonus;
        delete itemToEquip.offHandPenalty;
        delete itemToEquip.proficiencyPenalty;

        if (itemToEquip.itemType === 'อาวุธ') {
            if (targetSlot === 'mainHand') {
                if (itemToEquip.recommendedClass && itemToEquip.recommendedClass.includes(charData.class)) {
                    itemToEquip.classBonus = true;
                } else if (itemToEquip.recommendedClass && itemToEquip.recommendedClass.length > 0) {
                     itemToEquip.proficiencyPenalty = true;
                }
            } else if (targetSlot === 'offHand') {
                itemToEquip.offHandPenalty = true;
            }
        }
        
        // 3. สวมใส่ของใหม่
        equippedItems[targetSlot] = { ...itemToEquip, quantity: 1 };

        // 4. ลด/ลบของออกจาก inventory
        const originalItemIndexInInventory = inventory.findIndex(i => i.name === itemName);
        if (originalItemIndexInInventory !== -1) {
             if (inventory[originalItemIndexInInventory].quantity > 1) {
                inventory[originalItemIndexInInventory].quantity--;
            } else {
                inventory.splice(originalItemIndexInInventory, 1);
            }
        }
        
        await playerRef.update({ inventory, equippedItems });
        showCustomAlert(`สวมใส่ ${itemToEquip.name} สำเร็จ!`, 'success');
    };

    if (itemToEquip.itemType === 'อาวุธ') {
        Swal.fire({
            title: 'เลือกช่องสวมใส่',
            text: `คุณต้องการสวมใส่ ${itemName} ที่ไหน?`,
            showDenyButton: true,
            confirmButtonText: 'มือหลัก (Main Hand)',
            denyButtonText: 'มือรอง (Off-Hand)',
        }).then((result) => {
            if (result.isConfirmed) {
                processEquip('mainHand');
            } else if (result.isDenied) {
                processEquip('offHand');
            }
        });
    } else if (itemToEquip.slot) {
        processEquip(itemToEquip.slot);
    } else {
        showCustomAlert('ไอเทมนี้ไม่สามารถสวมใส่ได้', 'error');
    }
}


async function unequipItem(slot) {
    const uid = firebase.auth().currentUser?.uid;
    const roomId = sessionStorage.getItem('roomId');
    if (!uid || !roomId) return;
    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`);
    const snapshot = await playerRef.get();
    if (!snapshot.exists()) return;
    const charData = snapshot.val();
    let { inventory = [], equippedItems = {} } = charData;

    const itemToUnequip = equippedItems[slot];
    if (!itemToUnequip) return;

    const baseItem = { 
        ...itemToUnequip, 
        bonuses: { ...(itemToUnequip.originalBonuses || itemToUnequip.bonuses) },
        quantity: 1 
    };
    delete baseItem.classBonus;
    delete baseItem.offHandPenalty;
    delete baseItem.proficiencyPenalty;

    const existingIdx = inventory.findIndex(i => i.name === baseItem.name);
    if (existingIdx > -1) {
        inventory[existingIdx].quantity++;
    } else {
        inventory.push(baseItem);
    }
    
    equippedItems[slot] = null;
    await playerRef.update({ inventory, equippedItems });
    showCustomAlert(`ถอด ${baseItem.name} ออกแล้ว`, 'info');
}

async function performAttackRoll() {
    const uid = firebase.auth().currentUser?.uid;
    if (!uid || !combatState || !combatState.isActive || combatState.turnOrder[combatState.currentTurnIndex].id !== uid) {
        return showCustomAlert("ยังไม่ถึงเทิร์นของคุณ!", 'warning');
    }
    const selectedEnemyKey = document.getElementById('enemyTargetSelect').value;
    if (!selectedEnemyKey) return showCustomAlert("กรุณาเลือกเป้าหมาย!", 'warning');

    const roomId = sessionStorage.getItem('roomId');
    const enemyData = allEnemiesInRoom[selectedEnemyKey];
    const playerData = (await db.ref(`rooms/${roomId}/playersByUid/${uid}`).get()).val();
    if (!enemyData || !playerData) return showCustomAlert("ไม่พบข้อมูลเป้าหมายหรือผู้เล่น!", 'error');

    document.getElementById('attackRollButton').disabled = true;
    const enemyAC = 10 + Math.floor(((enemyData.stats?.DEX || 10) - 10) / 2);
    const roll = Math.floor(Math.random() * 20) + 1;

    // 🐞 [แก้ไข] ตรวจสอบชนิดอาวุธเพื่อเลือกใช้ STR หรือ DEX Bonus
    const mainWeapon = playerData.equippedItems?.mainHand;
    const isDexWeapon = mainWeapon && DEX_WEAPONS.includes(mainWeapon.weaponType);
    const attackStat = isDexWeapon ? 'DEX' : 'STR';
    const attackBonus = Math.floor((calculateTotalStat(playerData, attackStat) - 10) / 2);
    const totalAttack = roll + attackBonus;

    const resultCard = document.getElementById('rollResultCard');
    const outcomeText = totalAttack >= enemyAC ? '✅ โจมตีโดน!' : '💥 โจมตีพลาด!';
    resultCard.innerHTML = `<h4>ผลการโจมตี: ${enemyData.name}</h4><p>ทอย (d20): ${roll} + ${attackStat} Bonus: ${attackBonus} = <strong>${totalAttack}</strong></p><p>AC ศัตรู: ${enemyAC}</p><p class="outcome">${outcomeText}</p>`;
    resultCard.className = `result-card ${totalAttack >= enemyAC ? 'hit' : 'miss'}`;

    if (totalAttack >= enemyAC) {
        document.getElementById('damageWeaponName').textContent = mainWeapon?.name || "มือเปล่า";
        document.getElementById('damageDiceInfo').textContent = mainWeapon?.damageDice || "d4";
        document.getElementById('damageRollSection').style.display = 'block';
    } else {
        setTimeout(async () => {
            await db.ref(`rooms/${roomId}/combat/actionComplete`).set(uid);
         }, 2000); // รอ 2 วินาทีเพื่อให้ผู้เล่นเห็นผลก่อนจบเทิร์น
    }
}

async function performDamageRoll() {
    const uid = firebase.auth().currentUser?.uid;
    const roomId = sessionStorage.getItem('roomId');
    const selectedEnemyKey = document.getElementById('enemyTargetSelect').value;
    if (!uid || !roomId || !selectedEnemyKey) return;

    document.getElementById('damageRollSection').style.display = 'none';
    const enemyRef = db.ref(`rooms/${roomId}/enemies/${selectedEnemyKey}`);
    const [enemySnapshot, playerSnapshot] = await Promise.all([
        enemyRef.get(),
        db.ref(`rooms/${roomId}/playersByUid/${uid}`).get()
    ]);

    if (!enemySnapshot.exists() || !playerSnapshot.exists()) return;

    const enemyData = enemySnapshot.val();
    const playerData = playerSnapshot.val();
    
    const mainWeapon = playerData.equippedItems?.mainHand;
    const diceTypeString = mainWeapon?.damageDice || 'd4';
    const diceType = parseInt(diceTypeString.replace('d', ''));
    const damageRoll = Math.floor(Math.random() * diceType) + 1;

    // 🐞 [แก้ไข] ตรวจสอบชนิดอาวุธเพื่อเลือกใช้ STR หรือ DEX Bonus สำหรับความเสียหาย
    const isDexWeapon = mainWeapon && DEX_WEAPONS.includes(mainWeapon.weaponType);
    const damageStat = isDexWeapon ? 'DEX' : 'STR';
    const damageBonus = Math.floor((calculateTotalStat(playerData, damageStat) - 10) / 2);
    const totalDamage = Math.max(1, damageRoll + damageBonus);
    
    const resultCard = document.getElementById('rollResultCard');
    resultCard.innerHTML = `<h4>ผลความเสียหาย: ${enemyData.name}</h4><p>ทอย (${diceTypeString}): ${damageRoll} + ${damageStat} Bonus: ${damageBonus} = <strong>${totalDamage}</strong></p><p class="outcome">🔥 สร้างความเสียหาย ${totalDamage} หน่วย! 🔥</p>`;
    resultCard.className = 'result-card hit';
    
    const newHp = enemyData.hp - totalDamage;

    setTimeout(async () => {
        if (newHp <= 0) {
            addToCombatLog(`🎉 ${enemyData.name} ถูกกำจัดแล้ว!`);
            await enemyRef.remove();
        } else {
            await enemyRef.child('hp').set(newHp);
        }
        await db.ref(`rooms/${roomId}/combat/actionComplete`).set(uid);
    }, 2000); // Wait 2 seconds before ending turn
}

// =================================================================================
// ส่วนที่ 4: Initializer & Real-time Listener
// =================================================================================
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        let isInitialLoadComplete = false;
        const currentUserUid = user.uid;
        const roomId = sessionStorage.getItem('roomId');
        if (!roomId) {
            window.location.replace('lobby.html');
            return;
        }

        showLoading('กำลังโหลดข้อมูลตัวละคร...');
        const playerRef = db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}`);

        db.ref(`rooms/${roomId}/playersByUid`).on('value', snapshot => {
            const infoPanel = document.getElementById("characterInfoPanel");
            allPlayersInRoom = snapshot.val() || {};
            const charData = allPlayersInRoom[currentUserUid];
            if (charData) {
                displayCharacter(charData);
                displayInventory(charData.inventory);
                displayEquippedItems(charData.equippedItems);
                displayQuest(charData.quest);
                displayTeammates(currentUserUid);
            } else if (infoPanel) {
                infoPanel.innerHTML = `
                    <h2>สร้างตัวละคร</h2>
                    <p>คุณยังไม่มีตัวละครในห้องนี้</p>
                    <a href="PlayerCharecter.html"><button style="width:100%;">สร้างตัวละครใหม่</button></a>
                `;
            }
            if (!isInitialLoadComplete) {
                hideLoading();
                isInitialLoadComplete = true;
            }
        });

        db.ref(`rooms/${roomId}/enemies`).on('value', s => { allEnemiesInRoom = s.val() || {}; displayEnemies(s.val(), currentUserUid); });
        db.ref(`rooms/${roomId}/combat`).on('value', s => { combatState = s.val(); updateTurnDisplay(s.val(), currentUserUid); });
        db.ref(`rooms/${roomId}/story`).on('value', s => displayStory(s.val()));
        playerRef.child('pendingAttack').on('value', s => {
            if (s.exists() && !Swal.isVisible()) {
                handlePendingAttack(s.val(), playerRef);
            }
        });
    } else {
        window.location.replace('login.html');
    }
});
