// =================================================================================
// D&D Player Dashboard - Real-time Version with Firebase
// =================================================================================

let previousPlayerState = null; // สำหรับเปรียบเทียบค่าเก่า-ใหม่ เพื่อทำไฮไลท์

// =================================================================================
// ส่วนที่ 1: Utility Functions (เหมือนเดิม)
// ฟังก์ชันคำนวณต่างๆ ที่ไม่ต้องแก้ไข
// =================================================================================

function showCustomAlert(message, iconType = 'info') {
    const buttonColor = iconType === 'error' ? '#dc3545' : '#28a745';
    Swal.fire({
        title: iconType === 'success' ? 'สำเร็จ!' : iconType === 'error' ? 'ข้อผิดพลาด!' : '⚠️ แจ้งเตือน!',
        text: message, icon: iconType, confirmButtonText: 'ตกลง',
        confirmButtonColor: buttonColor,
    });
}

function getRaceStatBonus(charRace) {
    const baseStats = { STR: 5, DEX: 5, CON: 5, INT: 5, WIS: 5, CHA: 5 };
    const racialBonuses = {
      'มนุษย์': { STR: 3, DEX: 3, CON: 3, INT: 3, WIS: 3, CHA: 3 }, 'เอลฟ์': { DEX: 8, INT: 4 , CHA: 6},
      'คนแคระ': { CON: 9, STR: 5 }, 'ฮาล์ฟลิ่ง': { DEX: 12, CHA: 3 }, 'ไทฟลิ่ง': { DEX: 6, CHA: 6, INT: 3 },
      'แวมไพร์': { DEX: 7, CHA: 7 }, 'เงือก': { CON: 8, WIS: 4 }, 'ออร์ค': { STR: 10, CON: 5 },
      'โนม': { INT: 7, DEX: 4 }, 'เอลฟ์ดำ': { DEX: 9, CHA: 5 }, 'นางฟ้า': { WIS: 8, CHA: 4 },
      'มาร': { STR: 8, CHA: 8 }, 'โกเลม': { CON: 15, STR: 7 }
    };
    const finalStats = { ...baseStats };
    const bonus = racialBonuses[charRace] || {};
    for (const stat in bonus) { finalStats[stat] += bonus[stat]; }
    return finalStats;
}

function getClassStatBonus(charClass) {
    const classBonuses = {
      'นักรบ': { STR: 20, CON: 12 }, 'นักเวท': { INT: 25, WIS: 10 }, 'นักบวช': { WIS: 22, CHA: 8 },
      'โจร': { DEX: 30, CHA: 10 }, 'เรนเจอร์': { DEX: 15, WIS: 10, CON: 8 }, 'อัศวินศักดิ์สิทธิ์': { STR: 18, CHA: 15 },
      'บาร์บาเรียน': { STR: 35, CON: 15 }, 'พ่อค้า': { CHA: 25, INT: 10 }, 'แทงค์': { CON: 40, STR: 10 },
      'นักปราชญ์': { INT: 20, WIS: 15 }, 'อัศวิน': { STR: 18, CON: 15 }, 'เจ้าเมือง': { CHA: 50, INT: 50 },
      'นักดาบเวทย์': { STR: 12, INT: 18, DEX: 10 }, 'นักบุญหญิง': { WIS: 20, CON: 10  },'นักฆ่า': { DEX: 35, STR: 10  },
      'สตรีศักดิ์สิทธิ์': { WIS: 25, CHA: 15  }, 'ผู้กล้า': { STR: 30, CON: 20  },
      'จอมมาร': { INT: 40, CHA: 30  }, 'เทพเจ้า': { STR: 50, DEX: 50, CON: 50, INT: 50, WIS: 50, CHA: 50 }
    };
    const defaultStats = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    return { ...defaultStats, ...classBonuses[charClass] };
}

function calculateHP(charRace, charClass, finalCon) {
    const racialBaseHP = {
        'มนุษย์': 10, 'เอลฟ์': 8, 'คนแคระ': 12, 'ฮาล์ฟลิ่ง': 8, 'ไทฟลิ่ง': 9,
        'แวมไพร์': 9, 'เงือก': 10, 'ออร์ค': 14, 'โนม': 7, 'เอลฟ์ดำ': 8,
        'นางฟ้า': 6, 'มาร': 11, 'โกเลม': 18
    };
    const classBaseHP = {
      'นักรบ': 12, 'นักเวท': 4, 'นักบวช': 8, 'โจร': 8, 'เรนเจอร์': 10, 'อัศวินศักดิ์สิทธิ์': 14,
      'บาร์บาเรียน': 16, 'พ่อค้า': 6, 'แทงค์': 25, 'นักปราชญ์': 4, 'อัศวิน': 13, 'เจ้าเมือง': 15,
      'นักดาบเวทย์': 10 , 'นักบุญหญิง': 9, 'นักฆ่า': 11, 'สตรีศักดิ์สิทธิ์': 10, 'ผู้กล้า': 18, 'จอมมาร': 22, 'เทพเจ้า': 50
    };
    const conModifier = Math.floor((finalCon - 10) / 2);
    const raceHP = racialBaseHP[charRace] || 8;
    const classHP = classBaseHP[charClass] || 6;
    return raceHP + classHP + conModifier;
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

// =================================================================================
// ส่วนที่ 2: ฟังก์ชันแสดงผล (Display Functions) - แก้ไขให้รับข้อมูลจาก Firebase
// =================================================================================

function displayCharacter(character) {
    const infoPanel = document.getElementById("characterInfoPanel");
    if (!character || !infoPanel) return;

    document.getElementById("name").textContent = character.name || "-";
    document.getElementById("race").textContent = character.race || "-";
    document.getElementById("class").textContent = character.class || "-";
    document.getElementById("gender").textContent = character.gender || "-";
    document.getElementById("age").textContent = character.age || "-";
    document.getElementById("background").textContent = character.background || "ไม่มีข้อมูล";

    const buffColor = '#00ff00';
    const debuffColor = '#ff4d4d';
    const shadowStyle = 'text-shadow: 1px 1px 3px #000, -1px -1px 3px #000;';

    const currentStats = {
        Level: character.level || 1,
        TempLevel: character.tempLevel || 0,
        HP: character.hp,
        MaxHP: calculateHP(character.race, character.class, calculateTotalStat(character, 'CON')),
        STR: calculateTotalStat(character, 'STR'),
        DEX: calculateTotalStat(character, 'DEX'),
        CON: calculateTotalStat(character, 'CON'),
        INT: calculateTotalStat(character, 'INT'),
        WIS: calculateTotalStat(character, 'WIS'),
        CHA: calculateTotalStat(character, 'CHA'),
    };

    let html = `<h2>ข้อมูลตัวละคร</h2>
                <div style="padding: 10px; text-align: center;">
                    <label for="characterSelect"><strong>เลือกตัวละคร:</strong></label>
                    <select id="characterSelect" onchange="switchCharacter()"></select>
                </div>
                <p><strong>ชื่อ:</strong> <span>${character.name}</span></p>
                <p><strong>เผ่าพันธุ์:</strong> <span>${character.race}</span></p>
                <p><strong>อาชีพ:</strong> <span>${character.class}</span></p>`;

    if (!previousPlayerState || previousPlayerState.name !== character.name) {
        let levelDisplay = `${currentStats.Level}`;
        if (currentStats.TempLevel !== 0) {
            const totalLevel = currentStats.Level + currentStats.TempLevel;
            levelDisplay += ` <span style="color: ${currentStats.TempLevel > 0 ? buffColor : debuffColor}; ${shadowStyle}">(${totalLevel}) ${currentStats.TempLevel > 0 ? '⏫' : '⏬'}</span>`;
        }
        html += `<p><strong>เลเวล:</strong> ${levelDisplay}</p>`;
        html += `<p><strong>พลังชีวิต:</strong> ${currentStats.HP} / ${currentStats.MaxHP}</p>`;
        html += `<ul>
                    <li>พลังโจมตี (STR): ${currentStats.STR}</li>
                    <li>ความคล่องแคล่ว (DEX): ${currentStats.DEX}</li>
                    <li>ความทนทาน (CON): ${currentStats.CON}</li>
                    <li>สติปัญญา (INT): ${currentStats.INT}</li>
                    <li>จิตใจ (WIS): ${currentStats.WIS}</li>
                    <li>เสน่ห์ (CHA): ${currentStats.CHA}</li>
                 </ul>`;
    } else {
        let levelDisplay = '';
        if(previousPlayerState.Level !== currentStats.Level){
            levelDisplay = `${previousPlayerState.Level} -> <span style="color: ${currentStats.Level > previousPlayerState.Level ? buffColor : debuffColor}; ${shadowStyle}">${currentStats.Level} ${currentStats.Level > previousPlayerState.Level ? '⏫' : '⏬'}</span>`;
        } else {
            levelDisplay = `${currentStats.Level}`;
            if (currentStats.TempLevel !== 0) {
                const totalLevel = currentStats.Level + currentStats.TempLevel;
                levelDisplay += ` <span style="color: ${currentStats.TempLevel > 0 ? buffColor : debuffColor}; ${shadowStyle}">(${totalLevel}) ${currentStats.TempLevel > 0 ? '⏫' : '⏬'}</span>`;
            }
        }
        html += `<p><strong>เลเวล:</strong> ${levelDisplay}</p>`;

        const statOrder = ['HP', 'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
        for(const stat of statOrder){
            const oldValue = previousPlayerState[stat];
            const newValue = currentStats[stat];
            let indicator = newValue > oldValue ? '⏫' : (newValue < oldValue ? '⏬' : '');
            let color = newValue > oldValue ? buffColor : debuffColor;

            if (stat === 'HP') {
                html += `<p><strong>พลังชีวิต:</strong> ${oldValue !== newValue ? `${oldValue} -> <span style="color:${color}; ${shadowStyle}">${newValue} ${indicator}</span>` : newValue} / ${currentStats.MaxHP}</p><ul>`;
            } else {
                const label = {'STR':'พลังโจมตี', 'DEX':'ความคล่องแคล่ว', 'CON':'ความทนทาน', 'INT':'สติปัญญา', 'WIS':'จิตใจ', 'CHA':'เสน่ห์'}[stat];
                html += `<li>${label} (${stat}): ${oldValue !== newValue ? `${oldValue} -> <span style="color:${color}; ${shadowStyle}">${newValue} ${indicator}</span>` : newValue}</li>`;
            }
        }
        html += `</ul>`;
    }
    
    infoPanel.innerHTML = html;
    
    const upgradeButton = document.getElementById("goToStatsButton");
    const freePoints = character.freeStatPoints || 0;
    if (freePoints > 0) {
        upgradeButton.style.display = 'block';
        upgradeButton.textContent = `✨ อัปเกรดสถานะ (${freePoints} แต้ม) ✨`;
    } else {
        upgradeButton.style.display = 'none';
    }
    
    previousPlayerState = { name: character.name, ...currentStats };
}

function displayInventory(characterData) {
    const inventory = characterData?.inventory || [];
    const list = document.getElementById("inventory");
    list.innerHTML = "";

    if (inventory.length === 0) {
        list.innerHTML = "<li>ยังไม่มีไอเทม</li>";
        return;
    }
    inventory.forEach(item => {
        const li = document.createElement("li");
        li.textContent = `${item.name} (x${item.quantity})`;
        list.appendChild(li);
    });
}

function displayQuest(characterData) {
    const quest = characterData?.quest;
    const questPanel = document.getElementById("questPanel");

    if (quest && quest.title) {
        if(questPanel) {
            questPanel.style.border = '1px solid #ffc107';
            questPanel.style.boxShadow = '0 0 15px rgba(255, 193, 7, 0.4)';
        }
        document.getElementById("questTitle").textContent = quest.title;
        document.getElementById("questDetail").textContent = quest.detail;
        document.getElementById("questReward").textContent = quest.reward || "-";
    } else {
        if(questPanel) {
            questPanel.style.border = '';
            questPanel.style.boxShadow = '';
        }
        document.getElementById("questTitle").textContent = "ไม่มีเควส";
        document.getElementById("questDetail").textContent = "-";
        document.getElementById("questReward").textContent = "-";
    }
}

function displayEnemy(characterData) {
    const enemy = characterData?.enemy;
    const enemyPanel = document.getElementById("enemyPanel");

    if (enemy && enemy.name) {
        if(enemyPanel) {
            enemyPanel.style.border = '1px solid #dc3545';
            enemyPanel.style.boxShadow = '0 0 15px rgba(220, 53, 69, 0.4)';
        }
        document.getElementById("enemyName").textContent = enemy.name;
        document.getElementById("enemyHp").textContent = enemy.hp;
        document.getElementById("enemyStr").textContent = enemy.stats?.STR || '-';
        document.getElementById("enemyDex").textContent = enemy.stats?.DEX || '-';
        document.getElementById("enemyCon").textContent = enemy.stats?.CON || '-';
        document.getElementById("enemyInt").textContent = enemy.stats?.INT || '-';
        document.getElementById("enemyWis").textContent = enemy.stats?.WIS || '-';
        document.getElementById("enemyCha").textContent = enemy.stats?.CHA || '-';
    } else {
        if(enemyPanel) {
            enemyPanel.style.border = '';
            enemyPanel.style.boxShadow = '';
        }
        document.getElementById("enemyName").textContent = "-";
        document.getElementById("enemyHp").textContent = "-";
        // ... clear other stats ...
    }
}

function displayStory(storyData) {
    document.getElementById("story").textContent = storyData || "ยังไม่มีเนื้อเรื่อง";
}

// =================================================================================
// ส่วนที่ 3: Event Handlers - ฟังก์ชันที่ทำงานเมื่อมีการกระทำ
// =================================================================================

async function playerRollDice() {
    // [FIXED] ดึง roomId มาใช้
    const roomId = sessionStorage.getItem('roomId');
    const name = localStorage.getItem("character");
    if (!roomId || !name) return;

    const diceType = parseInt(document.getElementById("diceType").value);
    const diceCount = parseInt(document.getElementById("diceCount").value);
    const rollButton = event.target;

    if (isNaN(diceType) || isNaN(diceCount) || diceCount <= 0) return;

    const { results } = await showDiceRollAnimation(
        diceCount, diceType, 'player-dice-animation-area', 'dice-result', rollButton
    );

    const playerLog = {
        name: name,
        dice: diceType,
        count: diceCount,
        result: results,
        timestamp: new Date().toISOString()
    };
    
    // [FIXED] บันทึก Log การทอยลง Firebase ในห้องที่ถูกต้อง
    db.ref(`rooms/${roomId}/diceLogs`).push(playerLog);
}

function switchCharacter() {
    const selectedName = document.getElementById("characterSelect").value;
    if (selectedName) {
        localStorage.setItem("character", selectedName);
        location.reload();
    }
}

// =================================================================================
// ส่วนที่ 4: การเริ่มต้นและ lắng nghe ข้อมูล (Real-time Core)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // [FIXED] 1. ดึง roomId และ characterName จาก Storage
    const roomId = sessionStorage.getItem('roomId');
    const currentCharacterName = localStorage.getItem("character");

    // [FIXED] 2. ตรวจสอบว่ามีข้อมูลครบถ้วนหรือไม่ ถ้าไม่ ให้กลับไปที่ Lobby
    if (!roomId) {
        alert("ไม่พบข้อมูลห้อง! กำลังกลับไปที่ Lobby...");
        window.location.replace('lobby.html');
        return;
    }
    if (!currentCharacterName) {
        const infoPanel = document.getElementById("characterInfoPanel");
        infoPanel.innerHTML = `<h2>ข้อมูลตัวละคร</h2><p>คุณยังไม่มีตัวละครในห้องนี้</p><a href="PlayerCharecter.html"><button>ไปหน้าสร้างตัวละคร</button></a>`;
        // ไม่ต้อง return เพราะยังต้องฟังสัญญาณอื่น ๆ เช่น story
    }
    console.log(`ผู้เล่น ${currentCharacterName || '(ยังไม่มีตัวละคร)'} อยู่ในห้อง: ${roomId}`);

    // [FIXED] 3. lắng nghe ข้อมูลตัวละคร "ภายในห้องนี้เท่านั้น"
    if (currentCharacterName) {
        const playerRef = db.ref(`rooms/${roomId}/players/${currentCharacterName}`);
        playerRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const characterData = snapshot.val();
                displayCharacter(characterData);
                displayInventory(characterData);
                displayQuest(characterData);
                displayEnemy(characterData);
            } else {
                showCustomAlert(`ตัวละคร "${currentCharacterName}" ถูกลบออกจากระบบ`, 'error');
                localStorage.removeItem('character');
                location.reload();
            }
        });
    }

    // [FIXED] 4. lắng nghe เนื้อเรื่อง "ภายในห้องนี้เท่านั้น"
    const storyRef = db.ref(`rooms/${roomId}/story`);
    storyRef.on('value', (snapshot) => {
        displayStory(snapshot.val());
    });

    // [FIXED] 5. โหลดรายชื่อผู้เล่นทั้งหมด "ภายในห้องนี้เท่านั้น" สำหรับ Dropdown
    const allPlayersInRoomRef = db.ref(`rooms/${roomId}/players`);
    allPlayersInRoomRef.on('value', (snapshot) => {
        const players = snapshot.val();
        const select = document.getElementById("characterSelect");
        if (!select) return;

        select.innerHTML = "";
        if (!players) {
            select.innerHTML = "<option>ยังไม่มีตัวละครอื่นในห้อง</option>";
            return;
        }

        for (let name in players) {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        }
        
        if (currentCharacterName) {
            select.value = currentCharacterName;
        }
    });
});