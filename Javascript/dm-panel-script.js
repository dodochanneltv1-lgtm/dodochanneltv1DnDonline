// =================================================================================
// D&D DM Panel - FINAL Room-Aware Version (Complete & Item Deletion Bug Fixed)
// =================================================================================

let allPlayersDataByUID = {}; 
let previousPlayerState = null;
let allEnemies = {};
let combatState = {};

// =================================================================================
// ส่วนที่ 1: Utility & Calculation Functions (Minor Fixes/Cleanup)
// =================================================================================

function showCustomAlert(message, iconType = 'info') {
    const buttonColor = iconType === 'error' ? '#dc3545' : '#28a745';
    Swal.fire({
        title: iconType === 'success' ? 'สำเร็จ!' : iconType === 'error' ? 'ข้อผิดพลาด!' : '⚠️ แจ้งเตือน!',
        text: message, icon: iconType, confirmButtonText: 'ตกลง',
        confirmButtonColor: buttonColor
    });
}

function calculateTotalStat(charData, statKey) {
    if (!charData || !charData.stats) return 0;
    const stats = charData.stats;
    const permanentLevel = charData.level || 1;
    const tempLevel = charData.tempLevel || 0;
    const totalLevel = permanentLevel + tempLevel;
    
    const upperStatKey = statKey.toUpperCase();
    
    // [FIX] ต้องรวม Equipment Bonus ใน DM Panel ด้วย
    let equipmentBonus = 0;
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

function calculateHP(charRace, charClass, finalCon) {
    const racialBaseHP = { 
        'มนุษย์': 10, 
        'เอลฟ์': 8, 
        'คนแคระ': 12, 
        'ฮาล์ฟลิ่ง': 8, 
        'ไทฟลิ่ง': 9, 
        'แวมไพร์': 9, 
        'เงือก': 10, 
        'ออร์ค': 14, 
        'โนม': 7, 
        'เอลฟ์ดำ': 8, 
        'นางฟ้า': 6, 
        'มาร': 11, 
        'โกเลม': 18, 
        'อันเดด': 25, 
        'ครึ่งมังกร': 20, 
        'มังกร': 40, 
        'ครึ่งเทพ': 30, 
        'พระเจ้า': 100 };
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

// =================================================================================
// ส่วนที่ 2: Display Functions
// =================================================================================

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
    document.getElementById("tempLevelInput").value = player.tempLevel || 0;

    const statsKeys = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    statsKeys.forEach(stat => {
        document.getElementById(`edit${stat}Race`).value = player.stats?.baseRaceStats?.[stat] || 0;
        document.getElementById(`edit${stat}Class`).value = player.stats?.baseClassStats?.[stat] || 0;
        document.getElementById(`edit${stat}Invested`).value = player.stats?.investedStats?.[stat] || 0;
        document.getElementById(`edit${stat}Temp`).value = player.stats?.tempStats?.[stat] || 0;
        updateStatTotals(stat);
    });

    displayPlayerSummary(player);
    loadItemLists(player);
}

function updateStatTotals(statKey) {
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    if (!uid || !allPlayersDataByUID[uid]) return;

    const tempPlayer = JSON.parse(JSON.stringify(allPlayersDataByUID[uid]));
    const tempValue = parseInt(document.getElementById(`edit${statKey}Temp`).value) || 0;
    
    if (!tempPlayer.stats) tempPlayer.stats = {};
    if (!tempPlayer.stats.tempStats) tempPlayer.stats.tempStats = {};
    tempPlayer.stats.tempStats[statKey] = tempValue;
    
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
    
    const buffColor = '#00ff00';
    const debuffColor = '#ff4d4d';
    const shadowStyle = 'text-shadow: 1px 1px 3px #000, -1px -1px 3px #000;';

    const maxHpNew = calculateHP(player.race, player.class, calculateTotalStat(player, 'CON'));
    let currentHp = player.hp;
    if (currentHp > maxHpNew) {
        currentHp = maxHpNew; 
    }
    
    const currentStats = {
        Level: player.level || 1, TempLevel: player.tempLevel || 0,
        HP: player.hp || 0, 
        MaxHP: maxHpNew,
        STR: calculateTotalStat(player, 'STR'), DEX: calculateTotalStat(player, 'DEX'),
        CON: calculateTotalStat(player, 'CON'), INT: calculateTotalStat(player, 'INT'),
        WIS: calculateTotalStat(player, 'WIS'), CHA: calculateTotalStat(player, 'CHA'),
    };
    
    let htmlContent = `<h3>สรุปข้อมูลตัวละคร: ${player.name}</h3><hr>`;

    if (!previousPlayerState || previousPlayerState.name !== player.name) {
        htmlContent += `<p><strong>เผ่าพันธุ์:</strong> ${player.race}</p><p><strong>อาชีพ:</strong> ${player.class}</p><hr>`;
        let levelDisplay = `<strong>ระดับ (Level):</strong> ${currentStats.Level}`;
        if (currentStats.TempLevel !== 0) {
            const totalLevel = currentStats.Level + currentStats.TempLevel;
            levelDisplay += ` <span style="color: ${currentStats.TempLevel > 0 ? buffColor : debuffColor}; ${shadowStyle}">(${totalLevel})</span>`;
        }
        htmlContent += `<p>${levelDisplay}</p><hr>`;
        htmlContent += `<p><strong>HP:</strong> ${currentHp} / ${currentStats.MaxHP}</p>`; 
        for(const stat of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']){
            htmlContent += `<p><strong>${stat}:</strong> ${currentStats[stat]}</p>`;
        }
    } else {
        htmlContent += `<p><strong>เผ่าพันธุ์:</strong> ${player.race}</p><p><strong>อาชีพ:</strong> ${player.class}</p><hr>`;
        let levelHtml = `<strong>ระดับ (Level):</strong> `;
        const levelDiff = currentStats.Level - previousPlayerState.Level;
        if(levelDiff !== 0){
            const indicator = levelDiff > 0 ? '⬆️' : '⬇️';
            const color = levelDiff > 0 ? buffColor : debuffColor;
            levelHtml += `<span style="color:${color};">**${currentStats.Level}** ${indicator}</span>`;
        } else {
            levelHtml += `${currentStats.Level}`;
        }
        if (currentStats.TempLevel !== 0 || previousPlayerState.TempLevel !== 0) {
            const newTotalLevel = currentStats.Level + currentStats.TempLevel;
            const tempLevelDiff = currentStats.TempLevel - previousPlayerState.TempLevel;
            const indicator = tempLevelDiff > 0 ? '✨' : (tempLevelDiff < 0 ? '💥' : '');
            const color = currentStats.TempLevel > 0 ? buffColor : debuffColor;
            if (currentStats.TempLevel !== 0) {
                levelHtml += ` <span style="color: ${color}; font-weight: bold;">(${newTotalLevel}) ${indicator}</span>`;
            }
        }
        htmlContent += `<p>${levelHtml}</p><hr>`;
        for (const stat of ['HP', 'MaxHP', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
            const oldValue = previousPlayerState[stat];
            const newValue = currentStats[stat];
            if (oldValue !== newValue) {
                const diff = newValue - oldValue;
                const indicator = diff > 0 ? '⏫' : '⏬';
                const color = diff > 0 ? buffColor : debuffColor;
                if (stat === 'HP') {
                    htmlContent += `<p><strong>HP:</strong> <span style="color:${color}; font-weight: bold;">**${currentHp}** ${indicator}</span> / ${currentStats.MaxHP}</p>`; 
                } else if (stat === 'MaxHP') {
                    htmlContent += `<p><strong>${stat}:</strong> <span style="color:${color}; font-weight: bold;">**${newValue}** ${indicator}</span></p>`;
                } else {
                    htmlContent += `<p><strong>${stat}:</strong> <span style="color:${color}; font-weight: bold;">**${newValue}** ${indicator}</span></p>`;
                }
            } else if (stat === 'HP') {
                htmlContent += `<p><strong>HP:</strong> ${currentHp} / ${currentStats.MaxHP}</p>`;
            } else {
                htmlContent += `<p><strong>${stat}:</strong> ${currentStats[stat]}</p>`;
            }
        }
    }
    if (player.quest && player.quest.title) {
        htmlContent += `<div style="border: 1px solid #ffc107; padding: 10px; margin-top: 15px; border-radius: 5px; background-color: #ffc1071a;">
                                <h4>📜 เควสปัจจุบัน: ${player.quest.title}</h4>
                                <p style="font-size: small;"><strong>รายละเอียด:</strong> ${player.quest.detail || '-'}</p>
                                <p style="font-size: small;"><strong>รางวัล:</strong> ${player.quest.reward || '-'}</p>
                                <button onclick="completeQuest()" style="background-color: #28a745; width: 49%;">🏆 สำเร็จเควส</button>
                                <button onclick="cancelQuest()" style="background-color: #dc3545; width: 49%; margin-left: 2%;">❌ ยกเลิกเควส</button>
                            </div>`;
    } else {
        htmlContent += `<p style="margin-top: 10px; color: #777;"><em>ผู้เล่นนี้ยังไม่มีเควส</em></p>`;
    }
    output.innerHTML = htmlContent;
    previousPlayerState = { name: player.name, Race: player.race, Class: player.class, ...currentStats };
}


function loadItemLists(player) {
    const items = player?.inventory || [];
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
        if(log.type === 'general' || !log.type) {
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
            <small>เป้าหมาย: ${target}</small>
            <div style="float: right;">
                <button onclick="moveEnemy('${key}')" style="background-color:#fd7e14;">ย้าย</button>
                <button onclick="deleteEnemy('${key}')" style="background-color:#c82333;">ลบ</button>
            </div>
        `;
        container.appendChild(enemyDiv);
    }
}

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
    } else { 
        playerTurnView.classList.add('hidden');
        enemyTurnView.classList.remove('hidden');

        enemyAttackTargetSelect.innerHTML = '';
        for (const uid in allPlayersDataByUID) {
            if ((allPlayersDataByUID[uid].hp || 0) > 0) {
                 enemyAttackTargetSelect.innerHTML += `<option value="${uid}">${allPlayersDataByUID[uid].name} (HP: ${allPlayersDataByUID[uid].hp})</option>`;
            }
        }
        const currentEnemyData = allEnemies[currentUnit.id];
        if (currentEnemyData && currentEnemyData.targetUid && allPlayersDataByUID[currentEnemyData.targetUid]) {
             enemyAttackTargetSelect.value = currentEnemyData.targetUid;
        } else if(enemyAttackTargetSelect.options.length > 0) {
            enemyAttackTargetSelect.selectedIndex = 0;
        }
    }
    document.getElementById('enemy-attack-button').disabled = (currentUnit.type === 'player');
}

// =================================================================================
// ส่วนที่ 3: Write Functions
// =================================================================================

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

// [FIX] แก้ไข dmPerformEnemyAttack ให้คำนวณการโจมตีสำเร็จ/ล้มเหลว
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

    const playerDEX = calculateTotalStat(targetPlayerData, 'DEX');
    const playerAC = 10 + Math.floor((playerDEX - 10) / 2); 

    const pendingAttack = { 
        attackerKey: attackerUnit.id, 
        attackerName: attackerData.name, 
        attackRollValue: totalAttack,
        targetAC: playerAC 
    };
    
    // [BUG FIX]: ตรวจสอบว่าตีโดน AC หรือไม่ก่อนส่งไปถามผู้เล่น
    if (totalAttack < playerAC) {
        display.innerHTML = `<p style="color: #ff4d4d;"><strong>${attackerData.name}</strong> โจมตี <strong>${targetPlayerData.name}</strong> พลาด!</p><p>ค่าโจมตี: ${totalAttack} (ทอย ${rollResult} + โบนัส ${strBonus}) vs AC ผู้เล่น: ${playerAC}</p>`;
        setTimeout(advanceTurn, 1500);
        return;
    }
    
    await db.ref(`rooms/${roomId}/playersByUid/${targetPlayerUid}/pendingAttack`).set(pendingAttack);

    display.innerHTML = `<p><strong>${attackerData.name}</strong> โจมตี <strong>${targetPlayerData.name}</strong>!</p><p>ค่าโจมตี: ${totalAttack} (ทอย ${rollResult} + โบนัส ${strBonus}) vs AC ผู้เล่น: ${playerAC}</p><p style="color: #ffc107;">...กำลังรอการตอบสนองจากผู้เล่น...</p>`;
}

// [CRITICAL FIX]: ฟังก์ชันจัดการผลลัพธ์การป้องกันจากผู้เล่น
async function handleDefenseResolution(resolution) {
    // ต้องตรวจสอบว่า SweetAlert ปิดแล้วหรือไม่
    if (!resolution || Swal.isVisible()) return; 
    
    const roomId = sessionStorage.getItem('roomId');
    const display = document.getElementById('dm-roll-result-display');

    const defenderData = allPlayersDataByUID[resolution.defenderUid];
    const attackerData = allEnemies[resolution.attackerKey];
    if (!defenderData || !attackerData) return;
    
    const strBonus = Math.floor(((attackerData.stats.STR || 10) - 10) / 2);
    const damageDice = attackerData.damageDice || 'd6';
    const initialDamage = calculateDamage(damageDice, strBonus);

    let finalHtml = display.innerHTML.replace('<p style="color: #ffc107;">...กำลังรอการตอบสนองจากผู้เล่น...</p>', '');
    let finalDamage = 0;
    
    switch (resolution.choice) {
        case 'dodge':
            if (resolution.success) {
                finalHtml += `<p style="color: #00ff00;">🏃 <strong>${defenderData.name} หลบได้สำเร็จ!</strong> (DEX Roll: ${resolution.roll} vs Attack: ${resolution.attackRollValue})</p>`;
                finalDamage = 0;
            } else {
                finalHtml += `<p style="color: #ff4d4d;">🏃 <strong>${defenderData.name} หลบไม่พ้น!</strong> (DEX Roll: ${resolution.roll})</p>`;
                finalDamage = initialDamage;
            }
            break;
        case 'block':
            finalDamage = Math.max(0, initialDamage - (resolution.damageReduced || 0));

            finalHtml += `<p style="color: #17a2b8;">🛡️ <strong>${defenderData.name} ป้องกัน!</strong> (CON Roll: ${resolution.roll})</p>`;
            finalHtml += `<p>ความเสียหายพื้นฐาน ${initialDamage}. ลดได้ ${resolution.damageReduced || 0} หน่วย</p>`;
            finalHtml += `<p>รับความเสียหายสุดท้าย ${finalDamage} หน่วย!</p>`;
            break;
        case 'none':
            finalDamage = initialDamage;
            finalHtml += `<p style="color: #aaa;">😑 <strong>${defenderData.name} ไม่ป้องกัน!</strong></p>`;
            finalHtml += `<p>รับความเสียหายเต็มๆ ${finalDamage} หน่วย!</p>`;
            break;
    }
    
    const newHp = Math.max(0, defenderData.hp - finalDamage);
    await db.ref(`rooms/${roomId}/playersByUid/${resolution.defenderUid}/hp`).set(newHp);
    
    display.innerHTML = finalHtml;
    // เคลียร์ค่า resolution เพื่อรอการโจมตีครั้งต่อไป
    await db.ref(`rooms/${roomId}/combat/resolution`).remove(); 
    
    setTimeout(() => {
        advanceTurn();
    }, 2000);
}

function startCombat() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;

    const units = [];
    for (const uid in allPlayersDataByUID) {
        const player = allPlayersDataByUID[uid];
        if ((player.hp || 0) > 0) {
            units.push({
                id: uid,
                name: player.name,
                dex: calculateTotalStat(player, 'DEX'),
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
                dex: enemy.stats?.DEX || 10, 
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

function advanceTurn() {
    const roomId = sessionStorage.getItem('roomId');
    
    db.ref(`rooms/${roomId}/combat`).get().then((snapshot) => {
        const currentCombatState = snapshot.val() || {};
        if (!currentCombatState.isActive) return;

        let nextIndex = (currentCombatState.currentTurnIndex + 1) % currentCombatState.turnOrder.length;
        const maxSkips = currentCombatState.turnOrder.length;
        let skips = 0;
        
        while(skips < maxSkips) {
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
            } else {
                break; 
            }
        }

        if (skips === maxSkips) {
             endCombat();
             return;
        }

        db.ref(`rooms/${roomId}/combat/currentTurnIndex`).set(nextIndex);
        document.getElementById('dm-roll-result-display').innerHTML = 'รอการดำเนินการ...';
    });
}

function endCombat() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;

    db.ref(`rooms/${roomId}/combat`).remove()
        .then(() => showCustomAlert('การต่อสู้จบลงแล้ว', 'info'));
}

// --- Player Management ---
function saveBasicInfo() { const roomId = sessionStorage.getItem('roomId'); const name = document.getElementById("playerSelect").value; const uid = getUidByName(name); if (!roomId || !uid) return; const updates = { hp: parseInt(document.getElementById("editHp").value), gender: document.getElementById("editGender").value, age: parseInt(document.getElementById("editAge").value) || 1, race: document.getElementById("editRace").value, class: document.getElementById("editClass").value, background: document.getElementById("editBackground").value }; db.ref(`rooms/${roomId}/playersByUid/${uid}`).update(updates).then(() => showCustomAlert("บันทึกข้อมูลทั่วไปเรียบร้อย!", 'success')); }
function saveStats() { const roomId = sessionStorage.getItem('roomId'); const name = document.getElementById("playerSelect").value; const uid = getUidByName(name); if (!roomId || !uid) return; const tempStats = { STR: parseInt(document.getElementById('editSTRTemp').value) || 0, DEX: parseInt(document.getElementById('editDEXTemp').value) || 0, CON: parseInt(document.getElementById('editCONTemp').value) || 0, INT: parseInt(document.getElementById('editINTTemp').value) || 0, WIS: parseInt(document.getElementById('editWISTemp').value) || 0, CHA: parseInt(document.getElementById('editCHATemp').value) || 0, }; db.ref(`rooms/${roomId}/playersByUid/${uid}/stats/tempStats`).set(tempStats).then(() => showCustomAlert("บันทึกบัฟ/ดีบัฟเรียบร้อย!", 'success')); }
function changeLevel(change) { const roomId = sessionStorage.getItem('roomId'); const name = document.getElementById("playerSelect").value; const uid = getUidByName(name); const player = allPlayersDataByUID[uid]; if (!roomId || !player) return; let newLevel = (player.level || 1) + change; if (newLevel < 1) newLevel = 1; let newFreePoints = player.freeStatPoints || 0; if (change > 0) newFreePoints += (change * 2); else if (change < 0 && player.level > 1) newFreePoints = Math.max(0, newFreePoints + (change * 2)); db.ref(`rooms/${roomId}/playersByUid/${uid}`).update({ level: newLevel, freeStatPoints: newFreePoints }); }
function applyTempLevel() { const roomId = sessionStorage.getItem('roomId'); const name = document.getElementById("playerSelect").value; const uid = getUidByName(name); if (!roomId || !uid) return; const tempLevel = parseInt(document.getElementById("tempLevelInput").value) || 0; db.ref(`rooms/${roomId}/playersByUid/${uid}`).update({ tempLevel: tempLevel }); }
function clearTempLevel() { document.getElementById("tempLevelInput").value = 0; applyTempLevel(); }
function deletePlayer() { const roomId = sessionStorage.getItem('roomId'); const name = document.getElementById("playerSelect").value; const uid = getUidByName(name); if (!roomId || !uid) return; Swal.fire({ title: 'ยืนยันการลบ?', text: `ต้องการลบ "${name}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'ใช่, ลบเลย!' }).then((result) => { if (result.isConfirmed) { db.ref(`rooms/${roomId}/playersByUid/${uid}`).remove(); } }); }

// --- Combat Control ---
function dmAttackPlayer() { const roomId = sessionStorage.getItem('roomId'); const targetType = document.getElementById("dmAttackTarget").value; const damage = parseInt(document.getElementById("dmAttackDamage").value); const description = document.getElementById("dmAttackDescription").value.trim() || "การโจมตีจาก DM"; if (!roomId || isNaN(damage) || damage < 0) return; const uidsToAttack = []; if (targetType === 'all') { uidsToAttack.push(...Object.keys(allPlayersDataByUID)); } else { const name = document.getElementById("playerSelect").value; const uid = getUidByName(name); if (uid) uidsToAttack.push(uid); else { showCustomAlert("กรุณาเลือกผู้เล่นเป้าหมาย", 'warning'); return; } } for (const uid of uidsToAttack) { const player = allPlayersDataByUID[uid]; const newHp = Math.max(0, player.hp - damage); db.ref(`rooms/${roomId}/playersByUid/${uid}/hp`).set(newHp); } const targetName = targetType === 'all' ? 'ผู้เล่นทุกคน' : allPlayersDataByUID[uidsToAttack[0]].name; showCustomAlert(`โจมตี ${targetName} ด้วย ${description} สร้างความเสียหาย ${damage} หน่วย!`, 'success'); }

// --- Item Management ---
function addItem() { const roomId = sessionStorage.getItem('roomId'); const name = document.getElementById("playerSelect").value; const uid = getUidByName(name); const itemName = document.getElementById("itemName").value.trim(); if (!roomId || !uid || !itemName) return; const itemQty = parseInt(document.getElementById("itemQty").value) || 1; const player = allPlayersDataByUID[uid]; const inventory = player.inventory || []; const existingItem = inventory.find(i => i.name === itemName && !i.bonuses); if (existingItem) { existingItem.quantity += itemQty; } else { inventory.push({ name: itemName, quantity: itemQty, itemType: 'ทั่วไป' }); } db.ref(`rooms/${roomId}/playersByUid/${uid}/inventory`).set(inventory); }

function removeItem() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const uid = getUidByName(name);
    const selectedIndex = document.getElementById("itemSelect").value;

    if (!roomId || !uid || selectedIndex === null || selectedIndex === "") {
        showCustomAlert("กรุณาเลือกผู้เล่นและไอเทมที่ต้องการลบ", "warning");
        return;
    }

    const itemIndex = parseInt(selectedIndex);
    const qtyToRemove = parseInt(document.getElementById("removeQty").value) || 1;
    const player = allPlayersDataByUID[uid];
    let inventory = player.inventory || [];

    if (itemIndex < 0 || itemIndex >= inventory.length) {
        showCustomAlert("ไม่พบไอเทมที่ต้องการลบ (Invalid Index)", "error");
        return;
    }

    if (inventory[itemIndex].quantity <= qtyToRemove) {
        inventory.splice(itemIndex, 1); 
    } else {
        inventory[itemIndex].quantity -= qtyToRemove; 
    }
    
    db.ref(`rooms/${roomId}/playersByUid/${uid}/inventory`).set(inventory)
        .then(() => showCustomAlert(`ลบไอเทมจาก ${name} สำเร็จ`, 'success'));
}

function toggleItemFields() { const type = document.getElementById('customItemType').value; document.getElementById('equipmentFields').classList.toggle('hidden', type !== 'สวมใส่'); document.getElementById('weaponFields').classList.toggle('hidden', type !== 'อาวุธ'); }
function sendCustomItem() { const roomId = sessionStorage.getItem('roomId'); const name = document.getElementById("playerSelect").value; const uid = getUidByName(name); const itemName = document.getElementById("customItemName").value.trim(); if (!roomId || !uid || !itemName) { showCustomAlert("กรุณาเลือกผู้เล่นและใส่ชื่อไอเทม", 'warning'); return; } const itemQty = parseInt(document.getElementById("customItemQty").value) || 1; const bonuses = {}; ['HP', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(stat => { const value = parseInt(document.getElementById(`itemBonus${stat}`).value); if (!isNaN(value) && value !== 0) bonuses[stat.toUpperCase()] = value; }); const itemType = document.getElementById('customItemType').value; let newItem = { name: itemName, quantity: itemQty, bonuses: bonuses, itemType: itemType }; if (itemType === 'สวมใส่') { newItem.slot = document.getElementById('customItemSlot').value; } else if (itemType === 'อาวุธ') { newItem.slot = document.getElementById('customWeaponSlot').value; newItem.weaponType = document.getElementById('customWeaponType').value.trim(); newItem.damageDice = document.getElementById('customDamageDice').value.trim(); } const player = allPlayersDataByUID[uid]; const inventory = player.inventory || []; const existingItemIndex = inventory.findIndex(i => i.name === itemName && JSON.stringify(i.bonuses || {}) === JSON.stringify(newItem.bonuses)); if (existingItemIndex > -1) { inventory[existingItemIndex].quantity += itemQty; } else { inventory.push(newItem); } db.ref(`rooms/${roomId}/playersByUid/${uid}/inventory`).set(inventory).then(() => showCustomAlert(`ส่งไอเทม "${itemName}" ให้ ${name} สำเร็จ`, 'success')); }

// --- Monster, Story, Quest, Room Controls (Unchanged) ---
const monsterTemplates = { 'Goblin': { hp: 5, str: 8, dex: 14, con: 10, int: 8, wis: 10, cha: 6, damageDice: 'd6' }, 'Orc': { hp: 15, str: 16, dex: 12, con: 14, int: 7, wis: 10, cha: 8, damageDice: 'd8' }, 'Dragon (Young)': { hp: 50, str: 20, dex: 10, con: 18, int: 14, wis: 12, cha: 16, damageDice: 'd12' } }; 
function populateMonsterTemplates() { const select = document.getElementById("monsterTemplateSelect"); select.innerHTML = '<option value="">--- เลือกมอนสเตอร์ ---</option>'; for (const name in monsterTemplates) select.innerHTML += `<option value="${name}">${name}</option>`; }
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
// [NEW] เพิ่ม input สำหรับ Damage Dice ในส่วน Enemy Builder HTML ด้วย
function addMonster(addPerPlayer) {
    const roomId = sessionStorage.getItem('roomId');
    const monsterName = document.getElementById("monsterTemplateSelect").value;
    if (!monsterName) {
        showCustomAlert("กรุณาเลือกมอนสเตอร์จาก Template ก่อน", 'warning');
        return;
    }

    const createEnemyObject = () => {
        const hp = parseInt(document.getElementById("monsterHp").value) || 10;
        return {
            name: monsterName,
            hp: hp,
            maxHp: hp, 
            damageDice: document.getElementById("monsterDamageDice").value || 'd6', 
            stats: {
                STR: parseInt(document.getElementById("monsterStr").value) || 10,
                DEX: parseInt(document.getElementById("monsterDex").value) || 10,
                CON: parseInt(document.getElementById("monsterCon").value) || 10,
                INT: parseInt(document.getElementById("monsterInt").value) || 10,
                WIS: parseInt(document.getElementById("monsterWis").value) || 10,
                CHA: parseInt(document.getElementById("monsterCha").value) || 10,
            },
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

function addCustomEnemy() {
    const roomId = sessionStorage.getItem('roomId');
    const enemyName = document.getElementById("customEnemyName").value;
    if (!enemyName.trim()) {
        showCustomAlert("กรุณาใส่ชื่อคู่ต่อสู้", 'warning');
        return;
    }
    const hp = parseInt(document.getElementById("customEnemyHp").value) || 10;
    const enemyData = {
        name: enemyName,
        hp: hp,
        maxHp: hp,
        damageDice: document.getElementById("customEnemyDamageDice").value || 'd6', 
        stats: {
            STR: parseInt(document.getElementById("customEnemyStr").value) || 10,
            DEX: parseInt(document.getElementById("customEnemyDex").value) || 10,
            CON: parseInt(document.getElementById("customEnemyCon").value) || 10,
            INT: parseInt(document.getElementById("customEnemyInt").value) || 10,
            WIS: parseInt(document.getElementById("customEnemyWis").value) || 10,
            CHA: parseInt(document.getElementById("customEnemyCha").value) || 10,
        },
        targetUid: document.getElementById('enemyInitialTarget').value
    };

    db.ref(`rooms/${roomId}/enemies`).push(enemyData)
        .then(() => showCustomAlert(`เพิ่ม "${enemyName}" สำเร็จ!`, 'success'));
}

function moveEnemy(enemyKey) {
    const roomId = sessionStorage.getItem('roomId');
    let options = { 'shared': 'ยังไม่กำหนดเป้าหมาย (ศัตรูร่วม)' };
    for (const uid in allPlayersDataByUID) {
        options[uid] = allPlayersDataByUID[uid].name;
    }

    Swal.fire({
        title: 'ย้ายเป้าหมาย',
        input: 'select',
        inputOptions: options,
        inputPlaceholder: 'เลือกเป้าหมายใหม่',
        showCancelButton: true,
        confirmButtonText: 'ย้าย'
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            db.ref(`rooms/${roomId}/enemies/${enemyKey}`).update({ targetUid: result.value });
        }
    });
}

function deleteEnemy(enemyKey) {
    const roomId = sessionStorage.getItem('roomId');
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `ต้องการลบ "${allEnemies[enemyKey].name}" ออกจากฉาก?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ลบเลย!',
        confirmButtonColor: '#c82333'
    }).then((result) => {
        if (result.isConfirmed) {
            db.ref(`rooms/${roomId}/enemies/${enemyKey}`).remove();
        }
    });
}

function clearAllEnemies() {
      const roomId = sessionStorage.getItem('roomId');
      Swal.fire({
        title: 'ยืนยันการล้างบาง?',
        text: "ต้องการลบคู่ต่อสู้ทั้งหมดในฉากหรือไม่?",
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ล้างทั้งหมด!',
        confirmButtonColor: '#c82333'
    }).then((result) => {
        if (result.isConfirmed) {
            db.ref(`rooms/${roomId}/enemies`).remove()
                .then(() => showCustomAlert('ล้างคู่ต่อสู้ทั้งหมดเรียบร้อย!', 'success'));
        }
    });
}

function saveStory() { const roomId = sessionStorage.getItem('roomId'); const storyText = document.getElementById("story").value; if (roomId) db.ref(`rooms/${roomId}/story`).set(storyText); }
function sendQuest() { const roomId = sessionStorage.getItem('roomId'); const playerName = document.getElementById("playerSelect").value; const uid = getUidByName(playerName); if (!roomId || !uid) return; const quest = { title: document.getElementById("questTitle").value, detail: document.getElementById("questDetail").value, reward: document.getElementById("questReward").value }; if (!quest.title.trim()) { showCustomAlert("กรุณาระบุชื่อเควส", 'warning'); return; } db.ref(`rooms/${roomId}/playersByUid/${uid}/quest`).set(quest); }
function completeQuest() { const roomId = sessionStorage.getItem('roomId'); const playerName = document.getElementById("playerSelect").value; const uid = getUidByName(playerName); if (roomId && uid) db.ref(`rooms/${roomId}/playersByUid/${uid}/quest`).remove().then(() => showCustomAlert("ยืนยันเควสสำเร็จแล้ว", "success")); }
function cancelQuest() { const roomId = sessionStorage.getItem('roomId'); const playerName = document.getElementById("playerSelect").value; const uid = getUidByName(playerName); if (roomId && uid) db.ref(`rooms/${roomId}/playersByUid/${uid}/quest`).remove().then(() => showCustomAlert("ยกเลิกเควสแล้ว", "info"));}
function changeRoomPassword() { const roomId = sessionStorage.getItem('roomId'); if (!roomId) return; Swal.fire({ title: '🔑 เปลี่ยนรหัสเข้าห้อง', input: 'password', showCancelButton: true }).then((result) => { if (result.isConfirmed && result.value) db.ref(`rooms/${roomId}/password`).set(result.value); }); }
function changeDMPassword() { const roomId = sessionStorage.getItem('roomId'); if (!roomId) return; Swal.fire({ title: '🔒 เปลี่ยนรหัส DM Panel', input: 'password', showCancelButton: true }).then((result) => { if (result.isConfirmed && result.value) db.ref(`rooms/${roomId}/dmPassword`).set(result.value); }); }
function deleteRoom() { const roomId = sessionStorage.getItem('roomId'); if (!roomId) return; Swal.fire({ title: '💣 ยืนยันการลบห้องถาวร?', text: "การกระทำนี้ไม่สามารถย้อนกลับได้!", icon: 'error', showCancelButton: true, confirmButtonText: 'ใช่, ลบห้องเลย!' }).then((result) => { if (result.isConfirmed) { db.ref(`rooms/${roomId}`).remove().then(() => { sessionStorage.removeItem('roomId'); window.location.replace('lobby.html'); }); } }); }
async function rollDmDice() { 
    const diceType = parseInt(document.getElementById("dmDiceType").value); 
    const diceCount = parseInt(document.getElementById("dmDiceCount").value); 
    const rollButton = document.querySelector('button[onclick="rollDmDice()"]'); 
    
    if (typeof showDiceRollAnimation === 'function') {
        await showDiceRollAnimation( diceCount, diceType, 'dm-dice-animation-area', 'dmDiceResult', rollButton ); 
    } else {
        showCustomAlert("ฟังก์ชันทอยเต๋าไม่พร้อมใช้งาน", 'error');
    }
}
function clearDiceLogs() { const roomId = sessionStorage.getItem('roomId'); if(roomId) db.ref(`rooms/${roomId}/diceLogs`).set(null); }
function clearCombatLogs() { const roomId = sessionStorage.getItem('roomId'); if(roomId) db.ref(`rooms/${roomId}/combatLogs`).set(null); }

// =================================================================================
// ส่วนที่ 4: Initial Load & Real-time Listeners
// =================================================================================
window.onload = function() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) { window.location.replace('lobby.html'); return; }
    
    // [FIX] Listener สำหรับ Combat Action (ผู้เล่นกด Damage/Miss)
    const actionCompleteRef = db.ref(`rooms/${roomId}/combat/actionComplete`);
    actionCompleteRef.on('value', (snapshot) => {
        if (snapshot.exists() && snapshot.val() !== null) {
            console.log(`Player ${snapshot.val()} completed their action. Advancing turn.`);
            setTimeout(() => {
                actionCompleteRef.set(null).then(() => {
                    advanceTurn();
                });
            }, 1500);
        }
    });
    
    // [FIX] Listener สำหรับ Defense Resolution (ผู้เล่นกด Block/Dodge/None)
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
            loadPlayer(); 
        } else {
            resetPlayerEditor();
        }
        displayCombatState(combatState); 
    });

    const enemiesRef = db.ref(`rooms/${roomId}/enemies`);
    enemiesRef.on('value', (snapshot) => {
        allEnemies = snapshot.val() || {}; 
        displayAllEnemies(allEnemies);
    });

    const combatRef = db.ref(`rooms/${roomId}/combat`);
    combatRef.on('value', (snapshot) => {
        combatState = snapshot.val() || {};
        displayCombatState(combatState);
    });

    // Listener สำหรับ Logs และ Story
    const roomRef = db.ref(`rooms/${roomId}`);
    roomRef.child('diceLogs').on('value', s => displayDiceLog(s.val(), 'playerDiceLog'));
    roomRef.child('combatLogs').on('value', s => displayDiceLog(s.val(), 'playerCombatLog'));
    roomRef.child('story').on('value', s => { document.getElementById("story").value = s.val() || ""; });

    document.getElementById("playerSelect").addEventListener('change', loadPlayer);
    populateMonsterTemplates();

};
