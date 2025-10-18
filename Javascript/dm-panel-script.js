// =================================================================================
// D&D DM Panel - FINAL Room-Aware Version (Complete)
// =================================================================================

let allPlayersData = {};
let previousPlayerState = null;

// =================================================================================
// ส่วนที่ 1: Utility & Calculation Functions
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
    const baseStat = (stats.baseRaceStats?.[statKey] || 0) +
                     (stats.baseClassStats?.[statKey] || 0) +
                     (stats.investedStats?.[statKey] || 0) +
                     (stats.tempStats?.[statKey] || 0);
    if (baseStat === 0) return 0;
    const levelBonus = baseStat * (totalLevel - 1) * 0.2;
    return Math.floor(baseStat + levelBonus);
}

function calculateHP(charRace, charClass, finalCon) {
    const racialBaseHP = { 'มนุษย์': 10, 'เอลฟ์': 8, 'คนแคระ': 12, 'ฮาล์ฟลิ่ง': 8, 'ไทฟลิ่ง': 9, 'แวมไพร์': 9, 'เงือก': 10, 'ออร์ค': 14, 'โนม': 7, 'เอลฟ์ดำ': 8, 'นางฟ้า': 6, 'มาร': 11, 'โกเลม': 18, 'อันเดด': 25, 'ครึ่งมังกร': 20, 'มังกร': 40, 'ครึ่งเทพ': 30, 'พระเจ้า': 100 };
    const classBaseHP = { 'บาร์บาเรียน': 16, 'แทงค์': 25, 'นักรบ': 12, 'นักดาบเวทย์': 10, 'อัศวิน': 13, 'อัศวินศักดิ์สิทธิ์': 14, 'ผู้กล้า': 18, 'นักเวท': 4, 'นักบวช': 8, 'นักบุญหญิง': 9, 'สตรีศักดิ์สิทธิ์': 10, 'โจร': 8, 'นักฆ่า': 11, 'เรนเจอร์': 10, 'พ่อค้า': 6, 'นักปราชญ์': 4, 'เจ้าเมือง': 15, 'จอมมาร': 22, 'เทพเจ้า': 50 };
    const conModifier = Math.floor((finalCon - 10) / 2);
    const raceHP = racialBaseHP[charRace] || 8;
    const classHP = classBaseHP[charClass] || 6;
    return raceHP + classHP + conModifier;
}

// =================================================================================
// ส่วนที่ 2: Display Functions
// =================================================================================

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
    const name = document.getElementById("playerSelect").value;
    const player = allPlayersData[name];

    if (!name || !player) {
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
    if (!name || !allPlayersData[name]) return;

    const tempPlayer = JSON.parse(JSON.stringify(allPlayersData[name]));
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

    const currentStats = {
        Level: player.level || 1, TempLevel: player.tempLevel || 0,
        HP: player.hp, MaxHP: calculateHP(player.race, player.class, calculateTotalStat(player, 'CON')),
        STR: calculateTotalStat(player, 'STR'), DEX: calculateTotalStat(player, 'DEX'),
        CON: calculateTotalStat(player, 'CON'), INT: calculateTotalStat(player, 'INT'),
        WIS: calculateTotalStat(player, 'WIS'), CHA: calculateTotalStat(player, 'CHA'),
    };

    let htmlContent = `<h3>สรุปข้อมูลตัวละคร: ${player.name}</h3><hr>`;

    if (!previousPlayerState || previousPlayerState.name !== player.name) {
        htmlContent += `<p><strong>เพศ:</strong> ${player.gender}</p><p><strong>อายุ:</strong> ${player.age}</p>`;
        htmlContent += `<p><strong>เผ่าพันธุ์:</strong> ${player.race}</p><p><strong>อาชีพ:</strong> ${player.class}</p><hr>`;
        let levelDisplay = `<strong>ระดับ (Level):</strong> ${currentStats.Level}`;
        if (currentStats.TempLevel !== 0) {
            const totalLevel = currentStats.Level + currentStats.TempLevel;
            levelDisplay += ` <span style="color: ${currentStats.TempLevel > 0 ? buffColor : debuffColor}; ${shadowStyle}">(${totalLevel})</span>`;
        }
        htmlContent += `<p>${levelDisplay}</p><hr>`;
        htmlContent += `<p><strong>HP:</strong> ${currentStats.HP} / ${currentStats.MaxHP}</p>`;
        for(const stat of ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']){
            htmlContent += `<p><strong>${stat}:</strong> ${currentStats[stat]}</p>`;
        }
    } else {
        htmlContent += `<p><strong>เพศ:</strong> ${player.gender}</p><p><strong>อายุ:</strong> ${player.age}</p>`;
        const raceChangeHtml = previousPlayerState.Race !== player.race ? ` ${previousPlayerState.Race} -> <span style="color:${buffColor};">${player.race}</span>` : player.race;
        htmlContent += `<p><strong>เผ่าพันธุ์:</strong> ${raceChangeHtml}</p>`; 
        const classChangeHtml = previousPlayerState.Class !== player.class ? ` ${previousPlayerState.Class} -> <span style="color:${buffColor};">${player.class}</span>` : player.class;
        htmlContent += `<p><strong>อาชีพ:</strong> ${classChangeHtml}</p><hr>`;

        let levelHtml = `<strong>ระดับ (Level):</strong> `;
        if(previousPlayerState.Level !== currentStats.Level){
            levelHtml += `${previousPlayerState.Level} -> <span style="color:${currentStats.Level > previousPlayerState.Level ? buffColor : debuffColor};">${currentStats.Level}</span>`;
        } else {
            levelHtml += `${currentStats.Level}`;
        }
        if (currentStats.TempLevel !== 0) {
            const newTotalLevel = currentStats.Level + currentStats.TempLevel;
            levelHtml += ` <span style="color: ${currentStats.TempLevel > 0 ? buffColor : debuffColor};">(${newTotalLevel})</span>`;
        }
        htmlContent += `<p>${levelHtml}</p><hr>`;
        
        for (const stat of ['HP', 'MaxHP', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']) {
            const oldValue = previousPlayerState[stat];
            const newValue = currentStats[stat];
            let indicator = newValue > oldValue ? '⏫' : (newValue < oldValue ? '⏬' : '');
            let changeHtml = oldValue !== newValue ? ` ${oldValue} -> <span style="color:${newValue > oldValue ? buffColor : debuffColor};">${newValue} ${indicator}</span>` : newValue;
            if (stat === 'HP') {
                htmlContent += `<p><strong>HP:</strong> ${changeHtml} / ${currentStats.MaxHP}</p>`;
            } else if (stat !== 'MaxHP') {
                htmlContent += `<p><strong>${stat}:</strong> ${changeHtml}</p>`;
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
        htmlContent += `<p style="margin-top: 10px; color: #777;"><em>ผู้เล่นนี้ยังไม่มีเควสที่ใช้งานอยู่</em></p>`;
    }
    output.innerHTML = htmlContent;
    previousPlayerState = { name: player.name, Race: player.race, Class: player.class, ...currentStats };
}


function loadItemLists(player) {
    const items = player?.inventory || [];
    const itemSelect = document.getElementById("itemSelect");
    const existingItemSelect = document.getElementById("existingItemSelect");
    itemSelect.innerHTML = "";
    existingItemSelect.innerHTML = "";
    if (items.length === 0) {
        const option = "<option disabled>ไม่มีไอเทม</option>";
        itemSelect.innerHTML = option;
        existingItemSelect.innerHTML = option;
        return;
    }
    items.forEach(item => {
        const option = `<option value="${item.name}">${item.name} (x${item.quantity})</option>`;
        itemSelect.innerHTML += option;
        existingItemSelect.innerHTML += option;
    });
}

function displayDiceLog(logs) {
    const logList = document.getElementById("playerDiceLog");
    logList.innerHTML = "<li>ไม่มีบันทึกการทอยเต๋า</li>";
    if (!logs) return;

    const logArray = Object.values(logs).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (logArray.length > 0) logList.innerHTML = "";

    logArray.slice(0, 10).forEach(log => {
        const total = log.result.reduce((a, b) => a + b, 0);
        const time = new Date(log.timestamp).toLocaleTimeString('th-TH');
        logList.innerHTML += `<li>[${time}] ${log.name} ทอย ${log.count}d${log.dice}: [${log.result.join(', ')}] รวม: ${total}</li>`;
    });
}

// =================================================================================
// ส่วนที่ 3: Write Functions (FIXED)
// =================================================================================

function saveBasicInfo() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    if (!roomId || !name) return;
    const updates = {
        gender: document.getElementById("editGender").value, age: parseInt(document.getElementById("editAge").value) || 1,
        race: document.getElementById("editRace").value, class: document.getElementById("editClass").value,
        background: document.getElementById("editBackground").value, hp: parseInt(document.getElementById("editHp").value) || 1,
    };
    db.ref(`rooms/${roomId}/players/${name}`).update(updates)
      .then(() => showCustomAlert("บันทึกข้อมูลทั่วไปเรียบร้อย!", 'success'))
      .catch(err => showCustomAlert("เกิดข้อผิดพลาด: " + err.message, 'error'));
}

function saveStats() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    if (!roomId || !name) return;
    const tempStats = {
        STR: parseInt(document.getElementById('editSTRTemp').value) || 0, DEX: parseInt(document.getElementById('editDEXTemp').value) || 0,
        CON: parseInt(document.getElementById('editCONTemp').value) || 0, INT: parseInt(document.getElementById('editINTTemp').value) || 0,
        WIS: parseInt(document.getElementById('editWISTemp').value) || 0, CHA: parseInt(document.getElementById('editCHATemp').value) || 0,
    };
    db.ref(`rooms/${roomId}/players/${name}/stats/tempStats`).set(tempStats)
      .then(() => showCustomAlert("บันทึกบัฟ/ดีบัฟเรียบร้อย!", 'success'))
      .catch(err => showCustomAlert("เกิดข้อผิดพลาด: " + err.message, 'error'));
}

function changeLevel(change) {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const player = allPlayersData[name];
    if (!roomId || !player) return;
    let newLevel = (player.level || 1) + change;
    if (newLevel < 1) newLevel = 1;
    let newFreePoints = player.freeStatPoints || 0;
    if (change > 0) newFreePoints += (change * 2);
    else if (change < 0 && player.level > 1) newFreePoints = Math.max(0, newFreePoints + (change * 2));
    db.ref(`rooms/${roomId}/players/${name}`).update({ level: newLevel, freeStatPoints: newFreePoints })
        .then(() => showCustomAlert(`ปรับเลเวลของ ${name} เป็น ${newLevel} สำเร็จ!`, 'success'));
}

function applyTempLevel() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    if (!roomId || !name) return;
    const tempLevel = parseInt(document.getElementById("tempLevelInput").value) || 0;
    db.ref(`rooms/${roomId}/players/${name}`).update({ tempLevel: tempLevel })
      .then(() => showCustomAlert(`ใช้ Temp Level: ${tempLevel} กับ ${name} แล้ว`, 'success'));
}

function clearTempLevel() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    if (!roomId || !name) return;
    db.ref(`rooms/${roomId}/players/${name}`).update({ tempLevel: 0 })
      .then(() => {
        document.getElementById("tempLevelInput").value = 0;
        showCustomAlert(`รีเซ็ต Temp Level ของ ${name} แล้ว`, 'success');
      });
}

function addItem() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const itemName = document.getElementById("itemName").value.trim();
    if (!roomId || !name || !itemName) return;
    const itemQty = parseInt(document.getElementById("itemQty").value) || 1;
    const player = allPlayersData[name];
    const inventory = player.inventory || [];
    const existingItem = inventory.find(i => i.name === itemName);
    if (existingItem) existingItem.quantity += itemQty;
    else inventory.push({ name: itemName, quantity: itemQty });
    db.ref(`rooms/${roomId}/players/${name}/inventory`).set(inventory)
      .then(() => showCustomAlert(`เพิ่มไอเทมให้ ${name} สำเร็จ`, 'success'));
}

function increaseItemQuantity() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const itemName = document.getElementById("existingItemSelect").value;
    if (!roomId || !name || !itemName) return;
    const qtyToAdd = parseInt(document.getElementById("existingItemQty").value);
    if (isNaN(qtyToAdd) || qtyToAdd <= 0) return;
    const player = allPlayersData[name];
    const inventory = player.inventory || [];
    const item = inventory.find(i => i.name === itemName);
    if (!item) return;
    item.quantity += qtyToAdd;
    db.ref(`rooms/${roomId}/players/${name}/inventory`).set(inventory)
      .then(() => showCustomAlert(`เพิ่ม "${itemName}" สำเร็จ!`, 'success'));
}

function removeItem() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    const itemName = document.getElementById("itemSelect").value;
    if (!roomId || !name || !itemName) return;
    const qtyToRemove = parseInt(document.getElementById("removeQty").value) || 1;
    const player = allPlayersData[name];
    let inventory = player.inventory || [];
    const itemIndex = inventory.findIndex(i => i.name === itemName);
    if (itemIndex === -1) return;
    if (inventory[itemIndex].quantity <= qtyToRemove) inventory.splice(itemIndex, 1);
    else inventory[itemIndex].quantity -= qtyToRemove;
    db.ref(`rooms/${roomId}/players/${name}/inventory`).set(inventory)
      .then(() => showCustomAlert(`ลบไอเทมจาก ${name} สำเร็จ`, 'success'));
}

function deletePlayer() {
    const roomId = sessionStorage.getItem('roomId');
    const name = document.getElementById("playerSelect").value;
    if (!roomId || !name) return;
    Swal.fire({ title: 'ยืนยันการลบ?', text: `ต้องการลบ "${name}"?`, icon: 'warning', showCancelButton: true, confirmButtonText: 'ใช่, ลบเลย!' })
        .then((result) => {
            if (result.isConfirmed) {
                db.ref(`rooms/${roomId}/players/${name}`).remove()
                  .then(() => showCustomAlert(`ลบผู้เล่น "${name}" เรียบร้อย!`, 'success'));
            }
        });
}

function saveStory() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;
    const story = document.getElementById("story").value;
    db.ref(`rooms/${roomId}/story`).set(story)
      .then(() => showCustomAlert("บันทึกเนื้อเรื่องเรียบร้อย!", 'success'));
}

function sendMonster() {
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById("playerSelect").value;
    if (!roomId || !playerName) return;
    const monster = {
        name: document.getElementById("monsterTemplateSelect").value, hp: parseInt(document.getElementById("monsterHp").value),
        stats: {
            STR: parseInt(document.getElementById("monsterStr").value), DEX: parseInt(document.getElementById("monsterDex").value),
            CON: parseInt(document.getElementById("monsterCon").value), INT: parseInt(document.getElementById("monsterInt").value),
            WIS: parseInt(document.getElementById("monsterWis").value), CHA: parseInt(document.getElementById("monsterCha").value)
        }
    };
    db.ref(`rooms/${roomId}/players/${playerName}/enemy`).set(monster)
      .then(() => showCustomAlert(`ส่งมอนสเตอร์ "${monster.name}" ให้ ${playerName} แล้ว!`, 'success'));
}

function addCustomEnemy() {
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById("playerSelect").value;
    if (!roomId || !playerName) return;
    const enemyName = document.getElementById("customEnemyName").value;
    if (!enemyName.trim()) return;
    const enemy = {
        name: enemyName, hp: parseInt(document.getElementById("customEnemyHp").value) || 1,
        stats: {
            STR: parseInt(document.getElementById("customEnemyStr").value), DEX: parseInt(document.getElementById("customEnemyDex").value),
            CON: parseInt(document.getElementById("customEnemyCon").value), INT: parseInt(document.getElementById("customEnemyInt").value),
            WIS: parseInt(document.getElementById("customEnemyWis").value), CHA: parseInt(document.getElementById("customEnemyCha").value)
        }
    };
    db.ref(`rooms/${roomId}/players/${playerName}/enemy`).set(enemy)
      .then(() => showCustomAlert(`เพิ่มคู่ต่อสู้ "${enemy.name}" ให้ ${playerName} แล้ว`, 'success'));
}

function clearEnemy() {
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById("playerSelect").value;
    if (!roomId || !playerName) return;
    db.ref(`rooms/${roomId}/players/${playerName}/enemy`).remove()
      .then(() => showCustomAlert(`กำจัดศัตรูของ ${playerName} แล้ว!`, 'success'));
}

function sendQuest() {
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById("playerSelect").value;
    if (!roomId || !playerName) return;
    const quest = {
        title: document.getElementById("questTitle").value,
        detail: document.getElementById("questDetail").value,
        reward: document.getElementById("questReward").value
    };
    if (!quest.title.trim()) {
        showCustomAlert("กรุณาระบุชื่อเควส", 'warning');
        return;
    }

    db.ref(`rooms/${roomId}/players/${playerName}/quest`).set(quest)
      .then(() => {
        showCustomAlert(`ส่งเควส "${quest.title}" ให้ ${playerName} แล้ว!`, 'success');
        // รีเซ็ตช่องกรอกหลังจากส่ง
        document.getElementById("questTitle").value = '';
        document.getElementById("questDetail").value = '';
        document.getElementById("questReward").value = '';
      });
}
function cancelQuest() {
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById("playerSelect").value;
    const player = allPlayersData[playerName];

    if (!roomId || !playerName || !player || !player.quest) {
        showCustomAlert("ผู้เล่นนี้ไม่มีเควสที่ใช้งานอยู่", 'info');
        return;
    }

    const currentQuestTitle = player.quest.title;

    Swal.fire({
        title: 'ยืนยันการยกเลิกเควส?',
        text: `ต้องการยกเลิกเควส "${currentQuestTitle}" ของ ${player.name} หรือไม่? (เควสจะถูกลบ)`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '❌ ยืนยันการยกเลิก',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            db.ref(`rooms/${roomId}/players/${playerName}/quest`).remove()
              .then(() => showCustomAlert(`เควส "${currentQuestTitle}" ถูกยกเลิกและลบออกเรียบร้อย`, 'success'))
              .catch(error => showCustomAlert("เกิดข้อผิดพลาดในการลบเควส: " + error.message, 'error'));
        }
    });
}
function completeQuest() {
    const roomId = sessionStorage.getItem('roomId');
    const playerName = document.getElementById("playerSelect").value;
    const player = allPlayersData[playerName];
    
    if (!roomId || !playerName || !player || !player.quest) {
        showCustomAlert("ผู้เล่นนี้ไม่มีเควสที่ใช้งานอยู่", 'info');
        return;
    }

    const currentQuest = player.quest;

    Swal.fire({
        title: 'ยืนยันเควสสำเร็จ?',
        html: `ต้องการยืนยันว่า <strong>${player.name}</strong> ทำเควส <strong>"${currentQuest.title}"</strong> สำเร็จ?<br>รางวัลที่คาดว่าจะได้รับ: ${currentQuest.reward}`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: '✅ มอบรางวัลและลบเควส',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            // ลบเควสออกจากผู้เล่น
            db.ref(`rooms/${roomId}/players/${playerName}/quest`).remove()
              .then(() => {
                // (สามารถเพิ่มโค้ดการเพิ่มไอเทมหรือแต้ม XP อัตโนมัติในภายหลังได้ที่นี่)
                showCustomAlert(`เควส "${currentQuest.title}" สำเร็จแล้ว! เควสถูกลบออกเรียบร้อย`, 'success');
              })
              .catch(error => showCustomAlert("เกิดข้อผิดพลาดในการลบเควส: " + error.message, 'error'));
        }
    });
}

async function rollDmDice() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;
    const diceType = parseInt(document.getElementById("dmDiceType").value);
    const diceCount = parseInt(document.getElementById("dmDiceCount").value);
    if (isNaN(diceType) || isNaN(diceCount) || diceCount <= 0) return;
    const { results } = await showDiceRollAnimation(diceCount, diceType, 'dm-dice-animation-area', 'dmDiceResult', event.target);
    const dmLog = { name: "DM", dice: diceType, count: diceCount, result: results, timestamp: new Date().toISOString() };
    db.ref(`rooms/${roomId}/diceLogs`).push(dmLog);
}

function clearDiceLogs() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;
    db.ref(`rooms/${roomId}/diceLogs`).remove()
      .then(() => showCustomAlert('ล้างประวัติการทอยทั้งหมดแล้ว', 'success'));
}

const monsterTemplates = {
  "ก็อบลิน": { hp: 15, stats: { STR: 8, DEX: 14, CON: 10, INT: 8, WIS: 8, CHA: 6 } },
  "ออร์ค": { hp: 30, stats: { STR: 16, DEX: 12, CON: 14, INT: 7, WIS: 11, CHA: 10 } },
};
function populateMonsterTemplates() {
  const select = document.getElementById("monsterTemplateSelect");
  if (!select) return;
  select.innerHTML = "";
  for (let name in monsterTemplates) {
    select.innerHTML += `<option value="${name}">${name}</option>`;
  }
  loadMonsterTemplate();
}
function loadMonsterTemplate() {
    const name = document.getElementById("monsterTemplateSelect").value;
    const monster = monsterTemplates[name];
    if (!monster) return;
    document.getElementById("monsterHp").value = monster.hp;
    document.getElementById("monsterStr").value = monster.stats.STR;
    document.getElementById("monsterDex").value = monster.stats.DEX;
    document.getElementById("monsterCon").value = monster.stats.CON;
    document.getElementById("monsterInt").value = monster.stats.INT;
    document.getElementById("monsterWis").value = monster.stats.WIS;
    document.getElementById("monsterCha").value = monster.stats.CHA;
}

function deleteRoom() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;

    Swal.fire({
        title: '⚠️ ยืนยันการลบห้อง?',
        html: `คุณกำลังจะลบห้อง <strong>ID: ${roomId}</strong> นี้<br>ข้อมูลผู้เล่นทั้งหมดในห้องจะถูกลบ!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '💣 ใช่, ลบห้องถาวร!',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#dc3545'
    }).then((result) => {
        if (result.isConfirmed) {
            db.ref(`rooms/${roomId}`).remove()
              .then(() => {
                sessionStorage.removeItem('roomId');
                showCustomAlert(`ลบห้อง ID: ${roomId} เรียบร้อย!`, 'success')
                .then(() => {
                    window.location.replace('lobby.html');
                });
              })
              .catch(err => showCustomAlert("เกิดข้อผิดพลาดในการลบห้อง: " + err.message, 'error'));
        }
    });
}

function changeRoomPassword() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;

    Swal.fire({
        title: 'เปลี่ยนรหัสผ่านเข้าห้อง',
        text: 'รหัสผ่านนี้ใช้สำหรับผู้เล่นที่ต้องการเข้าร่วมห้อง',
        input: 'password',
        inputLabel: 'รหัสผ่านใหม่ (ว่าง = ไม่มีรหัส)',
        inputPlaceholder: 'กรอกรหัสผ่านใหม่',
        showCancelButton: true,
        confirmButtonText: '💾 บันทึก',
    }).then((result) => {
        if (result.isConfirmed) {
            const newPassword = result.value.trim() || null; // ใช้ null ในการลบ password field
            const updateData = newPassword ? { password: newPassword } : { password: null };
            db.ref(`rooms/${roomId}`).update(updateData)
              .then(() => {
                const message = newPassword ? "ตั้งรหัสผ่านเข้าห้องใหม่เรียบร้อย!" : "ยกเลิกรหัสผ่านเข้าห้องเรียบร้อย (สาธารณะ)";
                showCustomAlert(message, 'success');
              })
              .catch(err => showCustomAlert("เกิดข้อผิดพลาด: " + err.message, 'error'));
        }
    });
}

function changeDMPassword() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) return;

    Swal.fire({
        title: 'เปลี่ยนรหัสผ่าน DM Panel',
        text: 'รหัสผ่านนี้ใช้เพื่อเข้า DM Panel ของห้องนี้',
        input: 'password',
        inputLabel: 'รหัสผ่าน DM ใหม่',
        inputPlaceholder: 'กรอกรหัสผ่านใหม่',
        showCancelButton: true,
        confirmButtonText: '💾 บันทึก',
        inputValidator: (value) => {
            if (!value) {
                return 'กรุณาใส่รหัสผ่านใหม่!';
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const newDMPassword = result.value.trim();
            db.ref(`rooms/${roomId}`).update({ dmPassword: newDMPassword })
              .then(() => showCustomAlert("เปลี่ยนรหัสผ่าน DM Panel เรียบร้อย!", 'success'))
              .catch(err => showCustomAlert("เกิดข้อผิดพลาด: " + err.message, 'error'));
        }
    });
}

// =================================================================================
// ส่วนที่ 4: Initial Load & Real-time Listeners
// =================================================================================

window.onload = function() {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) {
        alert("ไม่พบ ID ห้อง! กำลังกลับไปที่ Lobby...");
        window.location.replace('lobby.html');
        return;
    }

    const playersInRoomRef = db.ref(`rooms/${roomId}/players`);
    playersInRoomRef.on('value', (snapshot) => {
        allPlayersData = snapshot.val() || {};
        const select = document.getElementById("playerSelect");
        const previouslySelected = select.value;
        select.innerHTML = '<option value="">--- เลือกผู้เล่น ---</option>';
        for (let name in allPlayersData) {
            select.innerHTML += `<option value="${name}">${name}</option>`;
        }
        if (allPlayersData[previouslySelected]) {
            select.value = previouslySelected;
            loadPlayer();
        } else {
            resetPlayerEditor();
        }
    });

    db.ref(`rooms/${roomId}/diceLogs`).on('value', (snapshot) => displayDiceLog(snapshot.val()));
    db.ref(`rooms/${roomId}/story`).on('value', (snapshot) => {
        document.getElementById("story").value = snapshot.val() || "";
    });

    document.getElementById("playerSelect").addEventListener('change', loadPlayer);
    populateMonsterTemplates();
};