// Javascript/player-dashboard-script.js

let previousPlayerState = null; 
let allPlayersInRoom = {}; 
let allEnemiesInRoom = {}; 
let combatState = {}; 

// =================================================================================
// ส่วนที่ 1: Utility & Calculation Functions
// =================================================================================
function showCustomAlert(message, iconType = 'info') { Swal.fire({ title: iconType === 'success' ? 'สำเร็จ!' : '⚠️ แจ้งเตือน!', text: message, icon: iconType }); }
function calculateHP(charRace, charClass, finalCon) { const racialBaseHP = { 'มนุษย์': 10, 'เอลฟ์': 8, 'คนแคระ': 12, 'ฮาล์ฟลิ่ง': 8, 'ไทฟลิ่ง': 9, 'แวมไพร์': 9, 'เงือก': 10, 'ออร์ค': 14, 'โนม': 7, 'เอลฟ์ดำ': 8, 'นางฟ้า': 6, 'มาร': 11, 'โกเลม': 18, 'อันเดด': 25, 'ครึ่งมังกร': 20, 'มังกร': 40, 'ครึ่งเทพ': 30, 'พระเจ้า': 100 }; const classBaseHP = { 'บาร์บาเรียน': 16, 'แทงค์': 25, 'นักรบ': 12, 'นักดาบเวทย์': 10, 'อัศวิน': 13, 'อัศวินศักดิ์สิทธิ์': 14, 'ผู้กล้า': 18, 'นักเวท': 4, 'นักบวช': 8, 'นักบุญหญิง': 9, 'สตรีศักดิ์สิทธิ์': 10, 'โจร': 8, 'นักฆ่า': 11, 'เรนเจอร์': 10, 'พ่อค้า': 6, 'นักปราชญ์': 4, 'เจ้าเมือง': 15, 'จอมมาร': 22, 'เทพเจ้า': 50 }; const conModifier = Math.floor((finalCon - 10) / 2); const raceHP = racialBaseHP[charRace] || 8; const classHP = classBaseHP[charClass] || 6; return raceHP + classHP + conModifier; }
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
    return Math.floor(baseStat + levelBonus); 
}

// =================================================================================
// ส่วนที่ 2: Display Functions (รวมถึง Combat UI Handlers)
// =================================================================================

// [NEW] โครงสร้าง HTML สำหรับแสดงข้อมูลตัวละคร (ใช้ในกรณีที่ต้องสร้างใหม่เมื่อมีข้อมูล)
const CHARACTER_INFO_HTML = `
    <h2>ข้อมูลตัวละคร</h2>
    <p><strong>ชื่อ:</strong> <span id="name"></span></p>
    <p><strong>เผ่าพันธุ์:</strong> <span id="race"></span></p>
    <p><strong>อายุ:</strong> <span id="age"></span></p>
    <p><strong>เพศ:</strong> <span id="gender"></span></p>
    <p><strong>อาชีพ:</strong> <span id="class"></span></p>
    <details>
        <summary><strong>ภูมิหลัง (คลิกเพื่อดู)</strong></summary>
        <p id="background" style="margin-top: 5px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px;"></p>
    </details>
    <p><strong>เลเวล:</strong> <span id="level"></span></p> 
    <p><strong>พลังชีวิต:</strong> <span id="hp"></span></p>
    <ul>
        <li>พลังโจมตี (STR): <span id="str"></span></li>
        <li>ความคล่องแคล่ว (DEX): <span id="dex"></span></li>
        <li>ความทนทาน (CON): <span id="con"></span></li>
        <li>สติปัญญา (INT): <span id="int"></span></li>
        <li>จิตใจ (WIS): <span id="wis"></span></li>
        <li>เสน่ห์ (CHA): <span id="cha"></span></li>
    </ul>
`;

function updateCharacterStatsDisplay(charData) {
    if (!charData) return;
    const statsKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    
    statsKeys.forEach(key => {
        const totalStat = calculateTotalStat(charData, key);
        document.getElementById(key.toLowerCase()).textContent = totalStat;
    });

    const finalCon = calculateTotalStat(charData, 'CON');
    const maxHp = calculateHP(charData.race, charData.class, finalCon);
    document.getElementById('hp').textContent = `${charData.hp || 0} / ${maxHp}`;
    document.getElementById('level').textContent = charData.level || 1;
    
    const currentStats = {
        Level: charData.level || 1, TempLevel: charData.tempLevel || 0,
        HP: charData.hp || 0, MaxHP: maxHp,
        STR: calculateTotalStat(charData, 'STR'), DEX: calculateTotalStat(charData, 'DEX'),
        CON: calculateTotalStat(charData, 'CON'), INT: calculateTotalStat(charData, 'INT'),
        WIS: calculateTotalStat(charData, 'WIS'), CHA: calculateTotalStat(charData, 'CHA'),
    };
    previousPlayerState = { name: charData.name, ...currentStats };
    
    // แสดงปุ่มอัปเกรดสถานะ (ถ้ามีแต้มเหลือ)
    const upgradeButton = document.getElementById("goToStatsButton");
    const freePoints = charData.freeStatPoints || 0;
    if (upgradeButton) {
        if (freePoints > 0) {
            upgradeButton.style.display = 'block';
            upgradeButton.textContent = `✨ อัปเกรดสถานะ (${freePoints} แต้ม) ✨`;
        } else {
            upgradeButton.style.display = 'none';
        }
    }
}


function displayCharacter(character) { 
    // [FIX]: ตรวจสอบว่าโครงสร้าง HTML ถูกแทนที่ด้วยโครงสร้างที่รองรับการอัปเดตแล้วหรือไม่
    const infoPanel = document.getElementById("characterInfoPanel");
    if (!infoPanel.querySelector('#name')) {
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

function handlePendingAttack(attackData) {
    const roomId = sessionStorage.getItem('roomId');
    const currentUserUid = localStorage.getItem('currentUserUid');
    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}`);

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

        if (result.isConfirmed) { // --- กด "ป้องกัน" (Block) ---
            const blockRoll = Math.floor(Math.random() * 20) + 1;
            const totalCon = calculateTotalStat(playerData, 'CON'); 
            const conBonus = Math.floor((totalCon - 10) / 2);
            const totalBlock = blockRoll + conBonus;
            const damageReduction = Math.floor(totalBlock / 3); 
            
            defenseResponse.choice = 'block';
            defenseResponse.roll = totalBlock;
            defenseResponse.damageReduced = damageReduction;
            addToCombatLog(`🛡️ คุณพยายามป้องกัน! (ทอยได้ ${totalBlock})`);

        } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) { // --- กด "หลบ" (Dodge) ---
            const dodgeRoll = Math.floor(Math.random() * 20) + 1;
            const totalDex = calculateTotalStat(playerData, 'DEX');
            const dexBonus = Math.floor((totalDex - 10) / 2);
            const totalDodge = dodgeRoll + dexBonus;
            const isSuccess = totalDodge > attackData.attackRollValue;

            defenseResponse.choice = 'dodge';
            defenseResponse.roll = totalDodge;
            defenseResponse.success = isSuccess;
            addToCombatLog(`🏃 คุณพยายามหลบ! (ทอยได้ ${totalDodge} vs ${attackData.attackRollValue})`);

        } else { // --- กด "ไม่ทำอะไร" (Deny) หรือหมดเวลา (Timer Dismiss) ---
            defenseResponse.choice = 'none';
            addToCombatLog(result.dismiss === 'timer' ? '⏳ หมดเวลา! คุณไม่ได้ป้องกันการโจมตี!' : '😑 คุณไม่ได้ป้องกันการโจมตี!');
        }

        await db.ref(`rooms/${roomId}/combat/resolution`).set(defenseResponse);
        await playerRef.child('pendingAttack').remove();
    });
}

function updateTurnDisplay(state, currentUserUid) {
    const indicator = document.getElementById('turnIndicator');
    const attackButton = document.getElementById('attackRollButton');
    const damageRollSection = document.getElementById('damageRollSection');
    
    if (!state || !state.isActive) { 
        indicator.classList.add('hidden'); 
        attackButton.disabled = true; 
        damageRollSection.style.display = 'none';
        return; 
    }

    indicator.classList.remove('hidden');
    const currentTurnUnit = state.turnOrder[state.currentTurnIndex];

    if (currentTurnUnit.id === currentUserUid) { 
        indicator.className = 'my-turn'; 
        indicator.textContent = '🔥 เทิร์นของคุณ! 🔥'; 
        attackButton.disabled = false; 
        damageRollSection.style.display = 'none'; 
    } else { 
        indicator.className = 'other-turn'; 
        indicator.textContent = `กำลังรอเทิร์นของ... ${currentTurnUnit.name}`; 
        attackButton.disabled = true; 
        damageRollSection.style.display = 'none';
    }
}

function displayInventory(characterData) { 
    const inventory = characterData?.inventory || []; 
    const list = document.getElementById("inventory"); 
    list.innerHTML = ""; 
    if (inventory.length === 0) { list.innerHTML = "<li>ยังไม่มีไอเทม</li>"; return; } 
    inventory.forEach(item => { 
        if (!item || !item.name) return; 
        const li = document.createElement("li"); 
        let itemText = `${item.name} (x${item.quantity})`; 
        if (item.itemType === 'สวมใส่' || item.itemType === 'อาวุธ') { 
            const escapedName = item.name.replace(/'/g, "\\'"); 
            itemText += ` <button onclick="equipItem('${escapedName}')" style="margin-left: 10px; width: auto; padding: 2px 8px; font-size: 0.8em;">สวมใส่</button>`; 
        } 
        li.innerHTML = itemText; 
        list.appendChild(li); 
    }); 
}

function displayEquippedItems(characterData) { 
    const equipped = characterData?.equippedItems || {}; 
    const slots = ['mainHand', 'offHand', 'head', 'chest', 'legs', 'feet']; 
    slots.forEach(slot => { 
        const span = document.getElementById(`eq-${slot}`); 
        const button = span.nextElementSibling; 
        if (equipped[slot]) { 
            span.textContent = equipped[slot].name; 
            button.style.display = 'inline-block'; 
        } else { 
            span.textContent = "-"; 
            button.style.display = 'none'; 
        } 
    }); 
}

function displayTeammates(currentUserUid) { 
    const select = document.getElementById('teammateSelect'); 
    const currentSelection = select.value; 
    select.innerHTML = '<option value="">-- เลือกดูข้อมูล --</option>'; 
    for (const uid in allPlayersInRoom) { 
        if (uid !== currentUserUid) { 
            const player = allPlayersInRoom[uid]; 
            select.innerHTML += `<option value="${uid}">${player.name}</option>`; 
        } 
    } 
    select.value = currentSelection; 
}

function showTeammateInfo() { 
    const select = document.getElementById('teammateSelect'); 
    const infoDiv = document.getElementById('teammateInfo'); 
    const selectedUid = select.value; 
    if (!selectedUid || !allPlayersInRoom[selectedUid]) { 
        infoDiv.innerHTML = "<p>เลือกเพื่อนร่วมทีมเพื่อดูข้อมูล</p>"; 
        return; 
    } 
    const player = allPlayersInRoom[selectedUid]; 
    const maxHp = calculateHP(player.race, player.class, calculateTotalStat(player, 'CON')); 
    infoDiv.innerHTML = ` <p><strong>ชื่อ:</strong> ${player.name}</p> <p><strong>เผ่าพันธุ์:</strong> ${player.race} | <strong>อาชีพ:</strong> ${player.class}</p> <p><strong>HP:</strong> ${player.hp} / ${maxHp}</p> `; 
}

function displayQuest(characterData) { 
    const quest = characterData.quest; 
    document.getElementById("questTitle").textContent = quest?.title || "ไม่มีเควส"; 
    document.getElementById("questDetail").textContent = quest?.detail || "-"; 
    document.getElementById("questReward").textContent = quest?.reward || "-"; 
}

function displayStory(storyData) { 
    document.getElementById("story").textContent = storyData || "ยังไม่มีเนื้อเรื่องจาก DM"; 
}

function displayEnemies(enemies, currentUserUid) {
    const container = document.getElementById('enemyPanelContainer');
    const targetSelect = document.getElementById('enemyTargetSelect');
    container.innerHTML = '';
    targetSelect.innerHTML = '';
    const myEnemies = [];
    if (enemies) { for (const key in enemies) { if (enemies[key].targetUid === currentUserUid || enemies[key].targetUid === 'shared') { myEnemies.push({ key, ...enemies[key] }); } } }
    if (myEnemies.length === 0) { container.innerHTML = '<p><em>ไม่มีศัตรู</em></p>'; targetSelect.innerHTML = '<option value="">ไม่มีเป้าหมาย</option>'; return; }
    myEnemies.forEach(enemy => { 
        const enemyDiv = document.createElement('div'); 
        enemyDiv.style.cssText = "border-bottom: 1px dashed #555; margin-bottom: 10px; padding-bottom: 10px;"; 
        enemyDiv.innerHTML = `<p><strong>ชื่อ:</strong> ${enemy.name}</p><p><strong>HP:</strong> ${enemy.hp} / ${enemy.maxHp}</p>`; 
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
// ส่วนที่ 3: Core Logic (Items, Combat, Dice)
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
    const roomId = sessionStorage.getItem('roomId'); 
    const uid = localStorage.getItem('currentUserUid'); 
    if (!roomId || !uid) return; 
    
    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`); 
    const snapshot = await playerRef.get(); 
    if (!snapshot.exists()) return; 
    
    const characterData = snapshot.val(); 
    let inventory = characterData.inventory || []; 
    let equippedItems = characterData.equippedItems || {}; 
    
    const itemToEquipIndex = inventory.findIndex(i => i.name === itemName); 
    if (itemToEquipIndex === -1) return; 
    
    const itemToEquip = inventory[itemToEquipIndex]; 
    const slot = itemToEquip.slot; 
    
    if (!slot) { showCustomAlert("ไอเทมนี้ไม่สามารถสวมใส่ได้", 'error'); return; } 
    
    if (equippedItems[slot]) { await unequipItem(slot, true); } 
    
    const updatedSnapshot = await playerRef.get(); 
    inventory = updatedSnapshot.val().inventory || []; 
    
    const itemToEquipFreshIndex = inventory.findIndex(i => i.name === itemName); 
    if (itemToEquipFreshIndex === -1) return;

    equippedItems[slot] = { ...inventory[itemToEquipFreshIndex], quantity: 1 }; 
    
    if (inventory[itemToEquipFreshIndex].quantity > 1) { 
        inventory[itemToEquipFreshIndex].quantity -= 1; 
    } else { 
        inventory.splice(itemToEquipFreshIndex, 1); 
    } 
    
    await playerRef.update({ inventory: inventory, equippedItems: equippedItems }); 
    showCustomAlert(`สวมใส่ ${itemName} ที่ช่อง ${slot} แล้ว!`, 'success'); 
    
    updateCharacterStatsDisplay(await (await playerRef.get()).val());
}

async function unequipItem(slot, silent = false) {
    const roomId = sessionStorage.getItem('roomId');
    const currentUserUid = localStorage.getItem('currentUserUid');
    if (!roomId || !currentUserUid) return;

    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}`);
    const snapshot = await playerRef.get();
    if (!snapshot.exists()) return;

    const characterData = snapshot.val();
    let inventory = characterData.inventory || [];
    let equippedItems = characterData.equippedItems || {};

    const itemToUnequip = equippedItems[slot];
    
    if (!itemToUnequip || !itemToUnequip.name) {
        if (!silent) showCustomAlert(`ไม่มีไอเทมในช่อง ${slot} ให้ถอด`, 'warning');
        equippedItems[slot] = null;
        await playerRef.child('equippedItems').set(equippedItems);
        return;
    }

    const existingItemIndex = inventory.findIndex(i => 
        i.name === itemToUnequip.name && JSON.stringify(i.bonuses || {}) === JSON.stringify(itemToUnequip.bonuses || {})
    );

    if (existingItemIndex > -1) {
        inventory[existingItemIndex].quantity = (inventory[existingItemIndex].quantity || 0) + 1;
    } else {
        inventory.push({ ...itemToUnequip, quantity: 1 });
    }
    
    equippedItems[slot] = null;

    await playerRef.update({ inventory: inventory, equippedItems: equippedItems });
    if (!silent) showCustomAlert(`ถอด ${itemToUnequip.name} แล้ว!`, 'info');
    
    updateCharacterStatsDisplay(await (await playerRef.get()).val());
}

async function performAttackRoll() {
    const roomId = sessionStorage.getItem('roomId');
    const uid = localStorage.getItem('currentUserUid');
    const selectedEnemyKey = document.getElementById('enemyTargetSelect').value;
    const attackButton = document.getElementById('attackRollButton');
    
    if (!selectedEnemyKey) { showCustomAlert("กรุณาเลือกเป้าหมายที่จะโจมตี!", 'warning'); return; }
    const enemyData = allEnemiesInRoom[selectedEnemyKey];
    if (!enemyData) { showCustomAlert("ไม่พบข้อมูลเป้าหมาย!", 'error'); return; }
    
    attackButton.disabled = true; 

    const resultCard = document.getElementById('rollResultCard');
    resultCard.classList.add('hidden'); 
    resultCard.classList.remove('hit', 'miss'); 

    const playerSnapshot = await db.ref(`rooms/${roomId}/playersByUid/${uid}`).get();
    const playerData = playerSnapshot.val();

    const enemyDEX = enemyData.stats?.DEX || 10;
    const enemyAC = 10 + Math.floor((enemyDEX - 10) / 2); 

    const rollResult = Math.floor(Math.random() * 20) + 1;
    const totalSTR = calculateTotalStat(playerData, 'STR'); 
    const strBonus = Math.floor((totalSTR - 10) / 2);
    const totalAttack = rollResult + strBonus;
    
    setTimeout(async () => { 
        if (totalAttack >= enemyAC) {
            resultCard.classList.add('hit');
            addToCombatLog(`✅ โจมตีโดน ${enemyData.name}! (${totalAttack} vs ${enemyAC})`);
            
            const mainWeapon = playerData.equippedItems?.mainHand; 
            document.getElementById('damageWeaponName').textContent = mainWeapon?.name || "มือเปล่า";
            document.getElementById('damageDiceInfo').textContent = mainWeapon?.damageDice || "d4";
            document.getElementById('damageRollSection').style.display = 'block';
            attackButton.disabled = true; 
            
        } else {
            resultCard.classList.add('miss');
            addToCombatLog(`❌ โจมตี ${enemyData.name} พลาด! (${totalAttack} < ${enemyAC})`);
            await db.ref(`rooms/${roomId}/combat/actionComplete`).set(uid); 
            attackButton.disabled = true; 
        }
        
        const outcomeText = totalAttack >= enemyAC ? '✅ โจมตีโดน! ✅' : '💥 โจมตีพลาด! 💥';
        resultCard.innerHTML = `<h4>ผลการโจมตี: ${enemyData.name}</h4><p>ทอย (d20): <strong>${rollResult}</strong></p><p>โบนัส STR ${totalSTR}: <strong>${strBonus}</strong></p><p>AC ศัตรู: <strong>${enemyAC}</strong></p><p class="outcome">${outcomeText}</p>`;
        resultCard.classList.remove('hidden');
    }, 1000);
}

async function performDamageRoll() {
    const roomId = sessionStorage.getItem('roomId');
    const uid = localStorage.getItem('currentUserUid');
    const selectedEnemyKey = document.getElementById('enemyTargetSelect').value;
    
    if (!selectedEnemyKey) { showCustomAlert("เป้าหมายหายไป!", 'warning'); return; }
    
    document.getElementById('damageRollSection').style.display = 'none'; 
    const resultCard = document.getElementById('rollResultCard');
    resultCard.classList.add('hidden'); 

    const playerSnapshot = await db.ref(`rooms/${roomId}/playersByUid/${uid}`).get();
    const playerData = playerSnapshot.val();
    
    const mainWeapon = playerData.equippedItems?.mainHand;
    let diceTypeString = mainWeapon?.damageDice || "d4";
    let diceType = parseInt(diceTypeString.replace('d', ''));
    
    if (isNaN(diceType) || diceType < 1) { 
         diceType = 4;
         diceTypeString = 'd4';
         showCustomAlert("ข้อมูลลูกเต๋าความเสียหายไม่ถูกต้อง! ใช้ d4 แทน", 'error');
    }
    
    const damageRoll = Math.floor(Math.random() * diceType) + 1;
    const totalSTR = calculateTotalStat(playerData, 'STR');
    const strBonus = Math.floor((totalSTR - 10) / 2);
    const totalDamage = Math.max(1, damageRoll + strBonus);

    const currentEnemySnapshot = await db.ref(`rooms/${roomId}/enemies/${selectedEnemyKey}`).get();
    const currentEnemyData = currentEnemySnapshot.val();
    
    if (!currentEnemyData) {
        addToCombatLog('⚠️ เป้าหมายถูกกำจัดไปแล้วโดยคนอื่น!');
        await db.ref(`rooms/${roomId}/combat/actionComplete`).set(uid);
        return;
    }
    
    const newEnemyHp = currentEnemyData.hp - totalDamage;

    setTimeout(async () => { 
        resultCard.classList.remove('hit', 'miss');
        resultCard.classList.add('hit');
        resultCard.innerHTML = `<h4>ผลความเสียหาย: ${currentEnemyData.name}</h4><p>ทอย (${diceTypeString}): <strong>${damageRoll}</strong></p><p>โบนัส STR ${totalSTR}: <strong>${strBonus}</strong></p><p class="outcome">🔥 สร้างความเสียหาย ${totalDamage} หน่วย! 🔥</p>`;
        resultCard.classList.remove('hidden');

        addToCombatLog(`💥 สร้างความเสียหาย ${totalDamage} แก่ ${currentEnemyData.name}! HP เหลือ ${newEnemyHp > 0 ? newEnemyHp : 0}`);
        
        const enemyRef = db.ref(`rooms/${roomId}/enemies/${selectedEnemyKey}`);
        if (newEnemyHp <= 0) {
            addToCombatLog(`🎉 ${currentEnemyData.name} ถูกกำจัดแล้ว!`);
            await enemyRef.remove();
        } else {
            await enemyRef.child('hp').set(newEnemyHp);
        }
        
        await db.ref(`rooms/${roomId}/combat/actionComplete`).set(uid);
    }, 1000);
}

// [NEW] equipItem
async function equipItem(itemName) { 
    const roomId = sessionStorage.getItem('roomId'); 
    const uid = localStorage.getItem('currentUserUid'); 
    if (!roomId || !uid) return; 
    
    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`); 
    const snapshot = await playerRef.get(); 
    if (!snapshot.exists()) return; 
    
    const characterData = snapshot.val(); 
    let inventory = characterData.inventory || []; 
    let equippedItems = characterData.equippedItems || {}; 
    
    const itemToEquipIndex = inventory.findIndex(i => i.name === itemName); 
    if (itemToEquipIndex === -1) return; 
    
    const itemToEquip = inventory[itemToEquipIndex]; 
    const slot = itemToEquip.slot; 
    
    if (!slot) { showCustomAlert("ไอเทมนี้ไม่สามารถสวมใส่ได้", 'error'); return; } 
    
    if (equippedItems[slot]) { await unequipItem(slot, true); } 
    
    const updatedSnapshot = await playerRef.get(); 
    inventory = updatedSnapshot.val().inventory || []; 
    
    const itemToEquipFreshIndex = inventory.findIndex(i => i.name === itemName); 
    if (itemToEquipFreshIndex === -1) return;

    equippedItems[slot] = { ...inventory[itemToEquipFreshIndex], quantity: 1 }; 
    
    if (inventory[itemToEquipFreshIndex].quantity > 1) { 
        inventory[itemToEquipFreshIndex].quantity -= 1; 
    } else { 
        inventory.splice(itemToEquipFreshIndex, 1); 
    } 
    
    await playerRef.update({ inventory: inventory, equippedItems: equippedItems }); 
    showCustomAlert(`สวมใส่ ${itemName} ที่ช่อง ${slot} แล้ว!`, 'success'); 
    
    updateCharacterStatsDisplay(await (await playerRef.get()).val());
}

// [NEW] unequipItem
async function unequipItem(slot, silent = false) {
    const roomId = sessionStorage.getItem('roomId');
    const currentUserUid = localStorage.getItem('currentUserUid');
    if (!roomId || !currentUserUid) return;

    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}`);
    const snapshot = await playerRef.get();
    if (!snapshot.exists()) return;

    const characterData = snapshot.val();
    let inventory = characterData.inventory || [];
    let equippedItems = characterData.equippedItems || {};

    const itemToUnequip = equippedItems[slot];
    
    if (!itemToUnequip || !itemToUnequip.name) {
        if (!silent) showCustomAlert(`ไม่มีไอเทมในช่อง ${slot} ให้ถอด`, 'warning');
        equippedItems[slot] = null;
        await playerRef.child('equippedItems').set(equippedItems);
        return;
    }

    const existingItemIndex = inventory.findIndex(i => 
        i.name === itemToUnequip.name && JSON.stringify(i.bonuses || {}) === JSON.stringify(itemToUnequip.bonuses || {})
    );

    if (existingItemIndex > -1) {
        inventory[existingItemIndex].quantity = (inventory[existingItemIndex].quantity || 0) + 1;
    } else {
        inventory.push({ ...itemToUnequip, quantity: 1 });
    }
    
    equippedItems[slot] = null;

    await playerRef.update({ inventory: inventory, equippedItems: equippedItems });
    if (!silent) showCustomAlert(`ถอด ${itemToUnequip.name} แล้ว!`, 'info');
    
    updateCharacterStatsDisplay(await (await playerRef.get()).val());
}

// =================================================================================
// ส่วนที่ 4: Initializer & Real-time Listener
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (typeof db === 'undefined') {
        console.error("Firebase database 'db' is not initialized.");
        return;
    }
    
    const roomId = sessionStorage.getItem('roomId');
    const currentUserUid = localStorage.getItem('currentUserUid');
    if (!roomId || !currentUserUid) { 
        window.location.replace('lobby.html');
        return; 
    }
    
    // 1. Listener สำหรับข้อมูลตัวละครและเพื่อนร่วมทีม
    db.ref(`rooms/${roomId}/playersByUid`).on('value', s => { 
        const infoPanel = document.getElementById("characterInfoPanel");

        if(s.exists()) { 
            allPlayersInRoom = s.val(); 
            const charData = allPlayersInRoom[currentUserUid]; 
            
            if (charData) { 
                // มีตัวละคร: แสดง Dashboard
                displayCharacter(charData); 
                displayInventory(charData); 
                displayEquippedItems(charData); 
                displayQuest(charData); 
                displayTeammates(currentUserUid); 
                showTeammateInfo(); 
            } else {
                 // [CRITICAL FIX]: ไม่มีตัวละคร: แสดงปุ่มสร้างตัวละคร
                 if(infoPanel) {
                      infoPanel.innerHTML = `
                          <h2>ข้อมูลตัวละคร</h2>
                          <p style="text-align: center;">คุณยังไม่มีตัวละครในห้องนี้</p>
                          <a href="PlayerCharecter.html">
                              <button style="width: 100%; margin-top: 20px; background-color: #007bff;">สร้างตัวละคร</button>
                          </a>
                      `;
                 }
            }
        } else {
            // [FIX]: กรณีไม่มี playersByUid node เลย
            if(infoPanel) {
                infoPanel.innerHTML = `
                    <h2>ข้อมูลตัวละคร</h2>
                    <p style="text-align: center;">คุณยังไม่มีตัวละครในห้องนี้</p>
                    <a href="PlayerCharecter.html">
                        <button style="width: 100%; margin-top: 20px; background-color: #007bff;">สร้างตัวละคร</button>
                    </a>
                `;
            }
        }
    });
    
    // 2. Listener สำหรับข้อมูลศัตรู
    db.ref(`rooms/${roomId}/enemies`).on('value', s => { 
        allEnemiesInRoom = s.val() || {}; 
        displayEnemies(allEnemiesInRoom, currentUserUid); 
    });
    
    // 3. Listener สำหรับสถานะการต่อสู้
    db.ref(`rooms/${roomId}/combat`).on('value', s => { 
        combatState = s.val(); 
        updateTurnDisplay(combatState, currentUserUid); 
    });
    
    // 4. Listener สำหรับเนื้อเรื่อง
    db.ref(`rooms/${roomId}/story`).on('value', s => { 
        displayStory(s.val()); 
    });
    
    // 5. Listener สำหรับการโจมตีที่ค้างอยู่ (Defense Prompt)
    db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}/pendingAttack`).on('value', s => { 
        const attackData = s.val();
        if (attackData && !Swal.isVisible()) { 
             handlePendingAttack(attackData);
        } else if (!attackData) {
             Swal.close(); 
        }
    });
});