// Javascript/player-dashboard-script.js

// =================================================================================
// D&D Player Dashboard - Real-time Version with Firebase
// =================================================================================

let previousPlayerState = null; // สำหรับเปรียบเทียบค่าเก่า-ใหม่ เพื่อทำไฮไลท์

// =================================================================================
// ส่วนที่ 1: Utility Functions 
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

/**
 * [แก้ไข] นำฟังก์ชัน calculateHP ที่ถูกต้องจาก charector.js มาใช้
 */
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
        'มังกร': 40 ,
        'ครึ่งเทพ': 30,
        'พระเจ้า': 100
    };
    const classBaseHP = {
      'บาร์บาเรียน': 16,
      'แทงค์': 25, 

      'นักรบ': 12, 
      'นักดาบเวทย์': 10 ,

      'อัศวิน': 13, 
      'อัศวินศักดิ์สิทธิ์': 14,
      'ผู้กล้า': 18,

      'นักเวท': 4, 
      'นักบวช': 8,
      'นักบุญหญิง': 9,
      'สตรีศักดิ์สิทธิ์': 10,

      'โจร': 8, 
      'นักฆ่า': 11,
      'เรนเจอร์': 10,

      'พ่อค้า': 6, 
      'นักปราชญ์': 4, 
      'เจ้าเมือง': 15,

      'จอมมาร': 22,

      'เทพเจ้า': 50
    };
    const conModifier = Math.floor((finalCon - 10) / 2);
    const raceHP = racialBaseHP[charRace] || 8; // เผ่าที่ไม่ระบุได้ 8
    const classHP = classBaseHP[charClass] || 6; // อาชีพที่ไม่ระบุได้ 6
    
    // สูตรใหม่: HP เผ่า + HP คลาส + โบนัส CON
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
// ส่วนที่ 2: ฟังก์ชันแสดงผล (Display Functions)
// =================================================================================

function displayCharacter(character) {
    const infoPanel = document.getElementById("characterInfoPanel");
    
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
        // ใช้ calculateHP ที่ถูกต้องแล้ว
        MaxHP: calculateHP(character.race, character.class, calculateTotalStat(character, 'CON')), 
        STR: calculateTotalStat(character, 'STR'),
        DEX: calculateTotalStat(character, 'DEX'),
        CON: calculateTotalStat(character, 'CON'),
        INT: calculateTotalStat(character, 'INT'),
        WIS: calculateTotalStat(character, 'WIS'),
        CHA: calculateTotalStat(character, 'CHA'),
    };
    
    // Logic การอัปเดตค่า Stat พร้อมไฮไลท์
    const updateSpanContent = (id, value, isHP = false) => {
        const span = document.getElementById(id);
        if (!span) return;
        
        const statKey = id.toUpperCase();
        const oldValue = previousPlayerState?.[statKey] ?? value;
        const newValue = value;

        if (!previousPlayerState || previousPlayerState.name !== character.name || oldValue === newValue) {
            if (isHP) {
                span.innerHTML = `${newValue} / ${currentStats.MaxHP}`;
            } else if (id === 'level') {
                let levelDisplay = `${currentStats.Level}`;
                if (currentStats.TempLevel !== 0) {
                    const totalLevel = currentStats.Level + currentStats.TempLevel;
                    levelDisplay += ` <span style="color: ${currentStats.TempLevel > 0 ? buffColor : debuffColor}; ${shadowStyle}">(${totalLevel}) ${currentStats.TempLevel > 0 ? '⏫' : '⏬'}</span>`;
                }
                span.innerHTML = levelDisplay;
            } else {
                span.textContent = newValue;
            }
        } else {
            // แสดงการเปลี่ยนแปลง: Old Value -> New Value
            let indicator = newValue > oldValue ? '⏫' : (newValue < oldValue ? '⏬' : '');
            let color = newValue > oldValue ? buffColor : debuffColor;
            
            if (isHP) {
                 span.innerHTML = `${oldValue} -> <span style="color:${color}; ${shadowStyle}">${newValue} ${indicator}</span> / ${currentStats.MaxHP}`;
            } else {
                span.innerHTML = `${oldValue} -> <span style="color:${color}; ${shadowStyle}">${newValue} ${indicator}</span>`;
            }
        }
    };

    updateSpanContent('level', currentStats.Level);
    updateSpanContent('hp', currentStats.HP, true);
    document.getElementById("hp").textContent = `${currentStats.HP} / ${currentStats.MaxHP}`; // Fallback for initial load
    updateSpanContent('str', currentStats.STR);
    updateSpanContent('dex', currentStats.DEX);
    updateSpanContent('con', currentStats.CON);
    updateSpanContent('int', currentStats.INT);
    updateSpanContent('wis', currentStats.WIS);
    updateSpanContent('cha', currentStats.CHA);
    

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
        document.getElementById("enemyStr").textContent = "-";
        document.getElementById("enemyDex").textContent = "-";
        document.getElementById("enemyCon").textContent = "-";
        document.getElementById("enemyInt").textContent = "-";
        document.getElementById("enemyWis").textContent = "-";
        document.getElementById("enemyCha").textContent = "-";
    }
}

function displayStory(storyData) {
    document.getElementById("story").textContent = storyData || "ยังไม่มีเนื้อเรื่อง";
}

// =================================================================================
// ส่วนที่ 3: Event Handlers - ฟังก์ชันที่ทำงานเมื่อมีการกระทำ
// =================================================================================

async function playerRollDice() {
    const roomId = sessionStorage.getItem('roomId');
    // ⭐️ [FIXED]: ดึง UID ของผู้ใช้ปัจจุบัน
    const currentUserUid = localStorage.getItem('currentUserUid'); 
    
    if (!roomId || !currentUserUid) {
        showCustomAlert("ไม่พบข้อมูลห้องหรือผู้ใช้! กรุณาล็อกอินและเข้าร่วมห้องใหม่อีกครั้ง", 'error');
        return;
    }

    // ⭐️ [FIXED]: ดึงชื่อตัวละครจาก Firebase โดยใช้ UID
    const playerSnapshot = await db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}/name`).get(); 
    const name = playerSnapshot.val();

    if (!name) {
        showCustomAlert("ไม่พบตัวละครของคุณ! ไม่สามารถทอยเต๋าได้", 'error');
        return;
    }

    const diceType = parseInt(document.getElementById("diceType").value);
    const diceCount = parseInt(document.getElementById("diceCount").value);
    const rollButton = event.target; // ต้องมั่นใจว่า event.target ถูกส่งมา

    if (isNaN(diceType) || isNaN(diceCount) || diceCount <= 0) return;

    // ต้องมีฟังก์ชัน showDiceRollAnimation จาก dice-roller.js
    const { results } = await showDiceRollAnimation(
        diceCount, diceType, 'player-dice-animation-area', 'dice-result', rollButton
    );

    const playerLog = {
        name: name, // ใช้ชื่อตัวละครที่ดึงมา
        dice: diceType,
        count: diceCount,
        result: results,
        timestamp: new Date().toISOString()
    };
    
    // บันทึก Log การทอยลง Firebase ในห้องที่ถูกต้อง
    db.ref(`rooms/${roomId}/diceLogs`).push(playerLog);
}

// =================================================================================
// ส่วนที่ 4: การเริ่มต้นและ lắng nghe ข้อมูล (Real-time Core)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. ดึง roomId และ currentUserUid จาก Storage
    const roomId = sessionStorage.getItem('roomId');
    const currentUserUid = localStorage.getItem('currentUserUid');

    // 2. ตรวจสอบว่ามีข้อมูลครบถ้วนหรือไม่
    if (!roomId || !currentUserUid) {
        alert("ไม่พบข้อมูลห้องหรือผู้ใช้! กำลังกลับไปที่ Lobby...");
        window.location.replace('lobby.html');
        return;
    }
    
    // ⭐️ [FIXED]: ใช้เส้นทางที่ถูกต้องตาม UID
    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}`); 
    console.log(`ผู้ใช้ UID: ${currentUserUid} อยู่ในห้อง: ${roomId}`);

    // 3. lắng nghe ข้อมูลตัวละครของผู้ใช้ปัจจุบัน
    playerRef.on('value', (snapshot) => {
        const infoPanel = document.getElementById("characterInfoPanel");

        if (snapshot.exists()) {
            const characterData = snapshot.val();
            // ถ้ามีตัวละคร: แสดงข้อมูล
            displayCharacter(characterData);
            displayInventory(characterData);
            displayQuest(characterData);
            displayEnemy(characterData);
            console.log(`โหลดตัวละคร ${characterData.name} สำเร็จ`);
            
        } else {
            // ถ้าไม่มีตัวละคร: แสดงปุ่มสร้างตัวละคร
            infoPanel.innerHTML = `
                <h2>ข้อมูลตัวละคร</h2>
                <p style="text-align: center;">คุณยังไม่มีตัวละครในห้องนี้</p>
                <a href="PlayerCharecter.html">
                    <button style="width: 100%; margin-top: 20px;">สร้างตัวละคร</button>
                </a>
            `;
            console.log(`ผู้ใช้ UID: ${currentUserUid} ยังไม่มีตัวละคร`);
        }
    });

    // 4. lắng nghe เนื้อเรื่อง "ภายในห้องนี้เท่านั้น"
    const storyRef = db.ref(`rooms/${roomId}/story`);
    storyRef.on('value', (snapshot) => {
        displayStory(snapshot.val());
    });
});
