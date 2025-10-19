// =================================================================================
// D&D Stat Assignment - Real-time Version with Firebase
// =================================================================================

let characterData = null;
let newPointsAvailable = 0;
let baseInvested = {};
const statsToAssign = {};
const statOrder = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

// --- Utility & Calculation Functions (ส่วนนี้เหมือนเดิม) ---
// ... (โค้ด calculateHP และ calculateTotalStat เหมือนเดิม) ...

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
    const stats = charData.stats;
    const permanentLevel = charData.level || 1;
    const tempLevel = charData.tempLevel || 0;
    const totalLevel = permanentLevel + tempLevel;

    // ใช้ค่าที่กำลังแก้ไขในหน้า UI เพื่อคำนวณผลลัพธ์ที่จะเกิดขึ้น
    const currentInvestedValue = statsToAssign[statKey] !== undefined ? statsToAssign[statKey] : (stats.investedStats?.[statKey] || 0);

    const baseStat = (stats.baseRaceStats?.[statKey] || 0) +
                     (stats.baseClassStats?.[statKey] || 0) +
                     (currentInvestedValue) + // ใช้ค่าที่กำลังแก้ไข
                     (stats.tempStats?.[statKey] || 0);

    if (baseStat === 0) return 0;
    const levelBonus = baseStat * (totalLevel - 1) * 0.2;
    return Math.floor(baseStat + levelBonus);
}


// --- Core Functions (แก้ไขให้ใช้ Firebase) ---

function loadCharacterData() {
    // ⭐️ [FIXED] 1. ดึง roomId และ currentUserUid
    const roomId = sessionStorage.getItem('roomId');
    const currentUserUid = localStorage.getItem("currentUserUid"); // ⭐️ ดึง UID แทน "character"

    if (!roomId || !currentUserUid) {
        showCustomAlert("ไม่พบข้อมูลห้องหรือผู้ใช้!", 'error');
        window.location.replace('lobby.html');
        return;
    }

    // ⭐️ [FIXED] 2. ดึงข้อมูลจาก path ที่ถูกต้อง /playersByUid/{uid}
    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}`);
    playerRef.get().then((snapshot) => {
        if (snapshot.exists()) {
            characterData = snapshot.val();
            
            baseInvested = JSON.parse(JSON.stringify(characterData.stats.investedStats || {}));
            Object.assign(statsToAssign, characterData.stats.investedStats || {});
            newPointsAvailable = characterData.freeStatPoints || 0;
            
            renderStatAssignment();
            updatePointsUI();
            updateStatsSummary();
        } else {
            // หากไม่พบตัวละคร ให้ส่งผู้ใช้ไปสร้างตัวละคร
            showCustomAlert("ไม่พบข้อมูลตัวละครในฐานข้อมูล! กรุณาสร้างตัวละครใหม่", 'error');
            window.location.replace('PlayerCharecter.html'); 
        }
    });
}

function renderStatAssignment() {
    const panel = document.getElementById('statPanel');
    panel.innerHTML = `<div style="display: grid; grid-template-columns: 60px 1fr 100px 100px; gap: 15px; font-weight: bold; color: #aaa; text-align: center; padding: 0 15px;"><div>สถานะ</div><div>แต้มที่ลง</div><div>โบนัส</div><div>รวม</div></div>`;
    
    statOrder.forEach(stat => {
        statsToAssign[stat] = statsToAssign[stat] || 0;
        const raceVal = characterData.stats.baseRaceStats[stat] || 0;
        const classVal = characterData.stats.baseClassStats[stat] || 0;
        const raceClassTotal = raceVal + classVal;
        
        const div = document.createElement('div');
        div.className = 'stat-line';
        div.innerHTML = `
            <div class="stat-label">${stat}</div>
            <div class="points-control">
                <button class="btn-adjust" data-stat="${stat}" onclick="adjustStat(this, -1)">-</button>
                <div class="stat-value" id="assign-${stat}">${statsToAssign[stat]}</div>
                <button class="btn-adjust" data-stat="${stat}" onclick="adjustStat(this, 1)">+</button>
            </div>
            <div class="stat-bonus">${raceClassTotal}</div>
            <div class="stat-total" id="total-${stat}">${calculateTotalStat(characterData, stat)}</div>
        `;
        panel.appendChild(div);
    });
    updateStatsSummary();
}

function updatePointsUI() {
    const baseSpent = Object.values(baseInvested).reduce((a, b) => a + b, 0);
    const currentSpent = Object.values(statsToAssign).reduce((a, b) => a + b, 0);
    const newPointsUsed = currentSpent - baseSpent;
    document.getElementById('remainingPointsUI').textContent = newPointsAvailable - newPointsUsed;
}

function adjustStat(button, amount) {
    const stat = button.dataset.stat;
    const baseSpent = Object.values(baseInvested).reduce((a, b) => a + b, 0);
    const currentSpent = Object.values(statsToAssign).reduce((a, b) => a + b, 0);
    const newPointsUsed = currentSpent - baseSpent;

    if (amount > 0 && newPointsUsed >= newPointsAvailable) {
        showCustomAlert("แต้มไม่พอ!", 'warning');
        return;
    }
    if (amount < 0 && statsToAssign[stat] <= (baseInvested[stat] || 0)) {
        return; // ไม่ให้ลดต่ำกว่าแต้มเดิม
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

function finalizeStats() {
    // ⭐️ [FIXED] 1. ดึง roomId และ currentUserUid
    const roomId = sessionStorage.getItem('roomId');
    const currentUserUid = localStorage.getItem("currentUserUid"); // ⭐️ ดึง UID แทน "character"
    if (!roomId || !currentUserUid) return;

    const baseSpent = Object.values(baseInvested).reduce((a, b) => a + b, 0);
    const currentSpent = Object.values(statsToAssign).reduce((a, b) => a + b, 0);
    const newPointsUsed = currentSpent - baseSpent;

    const updates = {
        'stats/investedStats': statsToAssign,
        'freeStatPoints': newPointsAvailable - newPointsUsed
    };

    // ⭐️ [FIXED] 2. อัปเดตข้อมูลไปยัง path ที่ถูกต้อง /playersByUid/{uid}
    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${currentUserUid}`);

    playerRef.update(updates).then(() => {
        showCustomAlert("บันทึกสถานะเรียบร้อยแล้ว! กำลังกลับไปที่แดชบอร์ด...", 'success');
        setTimeout(() => { window.location.href = "player-dashboard.html"; }, 1500);
    }).catch((error) => {
        showCustomAlert("เกิดข้อผิดพลาดในการบันทึก: " + error.message, 'error');
    });
}

// --- Initializer ---
window.onload = loadCharacterData;