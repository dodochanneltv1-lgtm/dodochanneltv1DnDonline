// =================================================================================
// D&D Stat Assignment - Real-time Version with Firebase
// =================================================================================

let characterData = null;
let newPointsAvailable = 0;
let baseInvested = {};
const statsToAssign = {};
const statOrder = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

// --- Utility & Calculation Functions ---
function showCustomAlert(message, iconType = 'info') {
    Swal.fire({ title: 'แจ้งเตือน!', text: message, icon: iconType });
}

function calculateHP(charRace, charClass, finalCon) {
    const racialBaseHP = { 'มนุษย์': 10, 'เอลฟ์': 8, 'คนแคระ': 12, 'ฮาล์ฟลิ่ง': 8, 'ไทฟลิ่ง': 9, 'แวมไพร์': 9, 'เงือก': 10, 'ออร์ค': 14, 'โนม': 7, 'เอลฟ์ดำ': 8, 'นางฟ้า': 6, 'มาร': 11, 'โกเลม': 18, 'อันเดด': 25, 'ครึ่งมังกร': 20, 'มังกร': 40, 'ครึ่งเทพ': 30, 'พระเจ้า': 100 };
    const classBaseHP = { 'บาร์บาเรียน': 16, 'แทงค์': 25, 'นักรบ': 12, 'นักดาบเวทย์': 10, 'อัศวิน': 13, 'อัศวินศักดิ์สิทธิ์': 14, 'ผู้กล้า': 18, 'นักเวท': 4, 'นักบวช': 8, 'นักบุญหญิง': 9, 'สตรีศักดิ์สิทธิ์': 10, 'โจร': 8, 'นักฆ่า': 11, 'เรนเจอร์': 10, 'พ่อค้า': 6, 'นักปราชญ์': 4, 'เจ้าเมือง': 15, 'จอมมาร': 22, 'เทพเจ้า': 50 };
    const conModifier = Math.floor((finalCon - 10) / 2);
    const raceHP = racialBaseHP[charRace] || 8;
    const classHP = classBaseHP[charClass] || 6;
    return raceHP + classHP + conModifier;
}

function calculateTotalStat(charData, statKey) {
    if (!charData || !charData.stats) return 0;
    const { stats, level = 1, tempLevel = 0 } = charData;
    const totalLevel = level + tempLevel;
    
    // ✅ [แก้ไข/ยืนยัน] ใช้ statKey ตัวพิมพ์ใหญ่ในการดึงข้อมูลจาก stats ทุกส่วน
    const upperStatKey = statKey.toUpperCase(); 

    // ใช้ upperStatKey ในการตรวจสอบ investedStats ที่มีการปรับชั่วคราวบนหน้าจอ (statsToAssign)
    // และใช้ในการอ่านค่าจาก Firebase (stats.investedStats)
    const currentInvestedValue = statsToAssign[upperStatKey] !== undefined ? statsToAssign[upperStatKey] : (stats.investedStats?.[upperStatKey] || 0);

    const baseStat = (stats.baseRaceStats?.[upperStatKey] || 0) +
                     (stats.baseClassStats?.[upperStatKey] || 0) +
                     currentInvestedValue +
                     (stats.tempStats?.[upperStatKey] || 0);

    // *หมายเหตุ: โค้ดนี้ไม่ได้รวมโบนัสอุปกรณ์ ซึ่งปกติจะทำใน player-dashboard-script.js
    // แต่สำหรับการคำนวณแต้มในหน้านี้ ถือว่า base calculation ถูกต้องแล้ว

    if (baseStat === 0) return 0;
    const levelBonus = baseStat * (totalLevel - 1) * 0.2;
    return Math.floor(baseStat + levelBonus);
}

// --- Core Functions ---
function loadCharacterData(uid) {
    const roomId = sessionStorage.getItem('roomId');
    if (!roomId) {
        showCustomAlert("ไม่พบข้อมูลห้อง!", 'error');
        window.location.replace('lobby.html');
        return;
    }

    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`);
    playerRef.get().then((snapshot) => {
        if (snapshot.exists()) {
            characterData = snapshot.val();
            
            // ✅ [ยืนยัน] ใช้ Stat Key ตัวพิมพ์ใหญ่สำหรับโครงสร้างข้อมูล
            baseInvested = JSON.parse(JSON.stringify(characterData.stats.investedStats || {}));
            Object.assign(statsToAssign, characterData.stats.investedStats || {});
            
            newPointsAvailable = characterData.freeStatPoints || 0;
            renderStatAssignment();
        } else {
            showCustomAlert("ไม่พบข้อมูลตัวละคร! กรุณาสร้างตัวละครใหม่", 'error');
            window.location.replace('PlayerCharecter.html');
        }
    });
}

function renderStatAssignment() {
    const panel = document.getElementById('statPanel');
    panel.innerHTML = `<div style="display: grid; grid-template-columns: 60px 1fr 100px 100px; gap: 15px; font-weight: bold; color: #aaa; text-align: center; padding: 0 15px;"><div>สถานะ</div><div>แต้มที่ลง</div><div>โบนัส</div><div>รวม</div></div>`;
    
    statOrder.forEach(stat => {
        // ✅ ใช้ stat Key ตัวพิมพ์ใหญ่ในการจัดการ Object
        statsToAssign[stat] = statsToAssign[stat] || 0;
        const raceVal = characterData.stats.baseRaceStats[stat] || 0;
        const classVal = characterData.stats.baseClassStats[stat] || 0;
        const raceClassTotal = raceVal + classVal;
        
        const div = document.createElement('div');
        div.className = 'stat-line';
        div.innerHTML = `
            <div class="stat-label">${stat}</div>
            <div class="points-control">
                <button class="btn-adjust" onclick="adjustStat('${stat}', -1)">-</button>
                <div class="stat-value" id="assign-${stat}">${statsToAssign[stat]}</div>
                <button class="btn-adjust" onclick="adjustStat('${stat}', 1)">+</button>
            </div>
            <div class="stat-bonus">${raceClassTotal}</div>
            <div class="stat-total" id="total-${stat}">${calculateTotalStat(characterData, stat)}</div>
        `;
        panel.appendChild(div);
    });
    updatePointsUI();
    updateStatsSummary();
}

function updatePointsUI() {
    const baseSpent = Object.values(baseInvested).reduce((a, b) => a + b, 0);
    const currentSpent = Object.values(statsToAssign).reduce((a, b) => a + b, 0);
    const newPointsUsed = currentSpent - baseSpent;
    document.getElementById('remainingPointsUI').textContent = newPointsAvailable - newPointsUsed;
}

function adjustStat(stat, amount) {
    const baseSpent = Object.values(baseInvested).reduce((a, b) => a + b, 0);
    const currentSpent = Object.values(statsToAssign).reduce((a, b) => a + b, 0);
    const newPointsUsed = currentSpent - baseSpent;

    if (amount > 0 && newPointsUsed >= newPointsAvailable) {
        showCustomAlert("แต้มไม่พอ!", 'warning');
        return;
    }
    // ✅ ใช้ baseInvested[stat] ซึ่งเป็นตัวพิมพ์ใหญ่
    if (amount < 0 && statsToAssign[stat] <= (baseInvested[stat] || 0)) {
        return;
    }

    statsToAssign[stat] += amount;
    
    document.getElementById(`assign-${stat}`).textContent = statsToAssign[stat];
    updatePointsUI();
    updateStatsSummary();
}

function updateStatsSummary() {
    const summaryDiv = document.getElementById('baseStatsSummary');
    let summaryHTML = '';
    
    statOrder.forEach(stat => {
        const finalValue = calculateTotalStat(characterData, stat);
        summaryHTML += `<p><strong>${stat}:</strong> ${finalValue}</p>`;
    });

    const finalCon = calculateTotalStat(characterData, 'CON');
    const newMaxHp = calculateHP(characterData.race, characterData.class, finalCon);
    summaryHTML += `<p style="margin-top:15px; font-size: 1.2em; color: #ffc107;"><strong>พลังชีวิตสูงสุด (Max HP):</strong> ${newMaxHp}</p>`;
    summaryDiv.innerHTML = summaryHTML;
}

async function finalizeStats() {
    const uid = firebase.auth().currentUser?.uid;
    const roomId = sessionStorage.getItem('roomId');
    if (!uid || !roomId) return;

    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`);

    const snapshot = await playerRef.get();
    if (!snapshot.exists()) return;
    const currentData = snapshot.val();

    // ✅ [แก้ไข] เพื่อให้ calculateTotalStat อ่านค่า Stat ที่ถูกบันทึกใน investedStats เดิมได้ถูกต้อง
    // เนื่องจาก calculateTotalStat ไม่ได้รวม investedStats ชั่วคราว (statsToAssign) เข้ามาใน oldCon
    // แต่ใช้ baseInvested (ซึ่งเป็น investedStats เดิม) เพื่อคำนวณ oldMaxHp อย่างแม่นยำ 
    let oldDataForCalc = JSON.parse(JSON.stringify(currentData));
    oldDataForCalc.stats.investedStats = baseInvested; // ให้แน่ใจว่าใช้ investedStats ที่ถูกบันทึกไว้ล่าสุด
    const oldCon = calculateTotalStat(oldDataForCalc, 'CON');
    const oldMaxHp = calculateHP(currentData.race, currentData.class, oldCon);
    const isHpFull = currentData.hp >= oldMaxHp;

    const baseSpent = Object.values(baseInvested).reduce((a, b) => a + b, 0);
    const currentSpent = Object.values(statsToAssign).reduce((a, b) => a + b, 0);
    const newPointsUsed = currentSpent - baseSpent;

    const updates = {
        'stats/investedStats': statsToAssign,
        'freeStatPoints': newPointsAvailable - newPointsUsed
    };

    // คำนวณ HP ใหม่
    let tempData = JSON.parse(JSON.stringify(currentData));
    tempData.stats.investedStats = statsToAssign; // ใส่ Stat ที่เพิ่งปรับ
    // ต้องอัปเดต investedStats ใน tempData ก่อนเรียก calculateTotalStat
    
    const newCon = calculateTotalStat(tempData, 'CON');
    const newMaxHp = calculateHP(tempData.race, tempData.class, newCon);

    updates['maxHp'] = newMaxHp;
    if (isHpFull) {
        updates['hp'] = newMaxHp; // ถ้าเลือดเต็มอยู่แล้ว ก็ให้เต็มเหมือนเดิม
    } else {
        // หาก HP เปลี่ยนไป (CON เพิ่ม/ลด) 
        const hpDifference = newMaxHp - oldMaxHp;
        // หาก Max HP เพิ่มขึ้น, HP ปัจจุบันก็เพิ่มขึ้นตามผลต่าง (หรือคงเดิมถ้าผลต่างติดลบ)
        // แต่ต้องไม่เกิน Max HP ใหม่
        updates['hp'] = Math.min(newMaxHp, currentData.hp + (hpDifference > 0 ? hpDifference : 0));
    }

    playerRef.update(updates).then(() => {
        showCustomAlert("บันทึกสถานะเรียบร้อยแล้ว! กำลังกลับไปที่แดชบอร์ด...", 'success');
        setTimeout(() => { window.location.href = "player-dashboard.html"; }, 1500);
    }).catch((error) => {
        showCustomAlert("เกิดข้อผิดพลาดในการบันทึก: " + error.message, 'error');
    });
}


// --- Initializer ---
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        loadCharacterData(user.uid);
    } else {
        window.location.replace('login.html');
    }
});