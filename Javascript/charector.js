const showLoading = typeof showLoading === 'function' ? showLoading : (msg) => console.log("Loading:", msg);
const hideLoading = typeof hideLoading === 'function' ? hideLoading : () => console.log("Loading finished.");
const showCustomAlert = typeof showCustomAlert === 'function' ? showCustomAlert : (msg, type) => Swal.fire(type === 'error' ? 'Error' : 'Info', msg, type);

function initializeCharacterCreation() {
    console.log("Initializing Character Creation Section...");
    const formContainer = document.getElementById('character-creation-section');
    if (formContainer) {
       const nameInput = document.getElementById('name-create'); if(nameInput) nameInput.value = '';
       const genderSelect = document.getElementById('gender-create'); if(genderSelect) genderSelect.selectedIndex = 0;
       const ageInput = document.getElementById('age-create'); if(ageInput) ageInput.value = '';
       const raceSelect = document.getElementById('race-create'); if(raceSelect) raceSelect.selectedIndex = 0;
       const classSelect = document.getElementById('class-create'); if(classSelect) classSelect.selectedIndex = 0;
       const backgroundInput = document.getElementById('background-create'); if(backgroundInput) backgroundInput.value = '';
       const alignmentSelect = document.getElementById('alignment-create'); if(alignmentSelect) alignmentSelect.selectedIndex = 0;
       console.log("Character creation form reset.");
    } else {
        console.warn("Character creation form container not found for reset.");
    }
}

function getStatBonus(statValue) {
    const value = Number(statValue);
    const validValue = isNaN(value) ? 10 : value;
    return Math.floor((validValue - 10) / 2);
}
function getRaceStatBonus(charRace) {
    const baseStats = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    const racialBonuses = { 'มนุษย์': { STR: 2, DEX: 2, CON: 2, INT: 2, WIS: 2, CHA: 2 }, 'เอลฟ์': { DEX: 4, INT: 3, CHA: 2 }, 'คนแคระ': { CON: 5, STR: 3, WIS: 1 }, 'ฮาล์ฟลิ่ง': { DEX: 5, CHA: 3, CON: 1 }, 'ไทฟลิ่ง': { DEX: 4, CHA: 4, INT: 2 }, 'แวมไพร์': { STR: 3, DEX: 4, CHA: 3 }, 'เงือก': { CON: 5, WIS: 3, CHA: 2 }, 'ออร์ค': { STR: 6, CON: 4 }, 'โนม': { INT: 5, DEX: 3, CON: 1 }, 'เอลฟ์ดำ': { DEX: 5, CHA: 3, STR: 2 }, 'นางฟ้า': { WIS: 5, CHA: 4 }, 'มาร': { STR: 5, CHA: 5 }, 'โกเลม': { CON: 8, STR: 6 }, 'อันเดด': { CON: 5, STR: 2, CHA: 2 }, 'ครึ่งมังกร': { STR: 7, CON: 5, INT: 4 }, 'มังกร': { STR: 8, CON: 6, INT: 4, CHA: 4 }, 'ครึ่งเทพ': { STR: 8, INT: 8, CHA: 8 }, 'พระเจ้า': { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } };
    const finalStats = { ...baseStats };
    const bonus = racialBonuses[charRace] || {};
    for (const stat in bonus) { finalStats[stat.toUpperCase()] = (finalStats[stat.toUpperCase()] || 0) + bonus[stat]; }
    return finalStats;
}
function getClassStatBonus(charClass) {
    const classBonuses = { 'นักรบ': { STR: 18, CON: 12, DEX: 5 }, 'นักเวท': { INT: 20, WIS: 8, CON: 7 }, 'นักบวช': { WIS: 18, CHA: 10, CON: 7 }, 'โจร': { DEX: 20, CHA: 8, INT: 7 }, 'เรนเจอร์': { DEX: 18, WIS: 10, CON: 7 }, 'อัศวินศักดิ์สิทธิ์': { STR: 18, CHA: 12, CON: 10 }, 'บาร์บาเรียน': { STR: 22, CON: 15 }, 'พ่อค้า': { CHA: 20, INT: 15 }, 'แทงค์': { CON: 25, STR: 10 }, 'นักปราชญ์': { INT: 20, WIS: 15 }, 'อัศวิน': { STR: 18, CON: 15, DEX: 2 }, 'เจ้าเมือง': { CHA: 22, INT: 18 }, 'นักดาบเวทย์': { STR: 15, INT: 15, DEX: 5 }, 'นักบุญหญิง': { WIS: 20, CON: 10, CHA: 8 }, 'นักฆ่า': { DEX: 22, STR: 8, INT: 5 }, 'สตรีศักดิ์สิทธิ์': { WIS: 22, CHA: 15 }, 'ผู้กล้า': { STR: 20, CON: 15, CHA: 5 }, 'จอมมาร': { INT: 22, CHA: 18 }, 'เทพเจ้า': { STR: 20, DEX: 20, CON: 20, INT: 20, WIS: 20, CHA: 20 } };
    const defaultStats = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    const finalStats = { ...defaultStats };
    const bonus = classBonuses[charClass] || {};
    for (const stat in bonus) { finalStats[stat.toUpperCase()] = (finalStats[stat.toUpperCase()] || 0) + bonus[stat]; }
    return finalStats;
}
function calculateHP(charRace, charClass, finalCon) {
    const racialBaseHP = { 'มนุษย์': 10, 'เอลฟ์': 8, 'คนแคระ': 12, 'ฮาล์ฟลิ่ง': 8, 'ไทฟลิ่ง': 9, 'แวมไพร์': 9, 'เงือก': 10, 'ออร์ค': 14, 'โนม': 7, 'เอลฟ์ดำ': 8, 'นางฟ้า': 6, 'มาร': 11, 'โกเลม': 18, 'อันเดด': 25, 'ครึ่งมังกร': 20, 'มังกร': 40, 'ครึ่งเทพ': 30, 'พระเจ้า': 100 };
    const classBaseHP = { 'บาร์บาเรียน': 16, 'แทงค์': 25, 'นักรบ': 12, 'นักดาบเวทย์': 10, 'อัศวิน': 13, 'อัศวินศักดิ์สิทธิ์': 14, 'ผู้กล้า': 18, 'นักเวท': 4, 'นักบวช': 8, 'นักบุญหญิง': 9, 'สตรีศักดิ์สิทธิ์': 10, 'โจร': 8, 'นักฆ่า': 11, 'เรนเจอร์': 10, 'พ่อค้า': 6, 'นักปราชญ์': 4, 'เจ้าเมือง': 15, 'จอมมาร': 22, 'เทพเจ้า': 50 };
    const conModifier = getStatBonus(finalCon);
    const raceHP = racialBaseHP[charRace] || 8;
    const classHP = classBaseHP[charClass] || 6;
    return Math.max(1, raceHP + classHP + conModifier);
}

async function createCharacter() {
    const roomId = sessionStorage.getItem('roomId');
    const user = firebase.auth().currentUser;
    if (!roomId || !user) {
        showCustomAlert("ไม่พบข้อมูลห้องหรือผู้ใช้! กรุณาล็อกอินและเข้าร่วมห้องใหม่อีกครั้ง", 'error');
        window.location.hash = '#lobby';
        return;
    }
    const uid = user.uid;

    const nameInput = document.getElementById('name-create');
    const backgroundInput = document.getElementById('background-create');
    const ageInput = document.getElementById('age-create');
    const genderSelect = document.getElementById('gender-create');
    const raceSelect = document.getElementById('race-create');
    const classSelect = document.getElementById('class-create');
    const alignmentSelect = document.getElementById('alignment-create');

    if (!nameInput || !backgroundInput || !ageInput || !genderSelect || !raceSelect || !classSelect || !alignmentSelect ) {
         console.error("One or more form elements not found in character creation section.");
         return showCustomAlert("เกิดข้อผิดพลาด: ไม่พบองค์ประกอบฟอร์มบางส่วน", 'error');
    }

    const name = nameInput.value.trim();
    const background = backgroundInput.value.trim();
    const age = ageInput.value.trim();
    const gender = genderSelect.value;
    const race = raceSelect.value;
    const charClass = classSelect.value;
    const alignment = alignmentSelect.value;


    if (name === "") return showCustomAlert("กรุณาระบุชื่อตัวละครก่อน!", 'warning');
    const ageValue = parseInt(age);
    if (isNaN(ageValue) || ageValue <= 0) return showCustomAlert("กรุณาระบุอายุที่เป็นตัวเลขและมากกว่า 0!", 'error');

    if (race === 'นางฟ้า' && gender !== 'หญิง') { showCustomAlert("เผ่าพันธุ์ 'นางฟ้า' สามารถเลือกได้เฉพาะเพศ 'หญิง' เท่านั้น!", 'error'); return; }
    if (race === 'โกเลม' && ['นักเวท', 'นักบวช', 'นักปราชญ์'].includes(charClass)) { showCustomAlert("โกเลมไม่สามารถใช้อาชีพสายเวทย์ได้!", 'error'); return; }
    if (['นักบุญหญิง', 'สตรีศักดิ์สิทธิ์'].includes(charClass) && gender !== 'หญิง') { showCustomAlert("อาชีพนี้สามารถเลือกได้เฉพาะเพศ 'หญิง' เท่านั้น!", 'error'); return; }
    if (race === "มาร" && ["นักบวช", "นักบุญหญิง", "สตรีศักดิ์สิทธิ์", "ผู้กล้า", "อัศวินศักดิ์สิทธิ์"].includes(charClass)) { showCustomAlert("เผ่าพันธุ์ 'มาร' ไม่สามารถเลือกอาชีพที่เกี่ยวกับความดีงามได้!", 'error'); return; }
    if (race === "แวมไพร์" && ["นักบวช", "นักบุญหญิง", "สตรีศักดิ์สิทธิ์", "อัศวินศักดิ์สิทธิ์"].includes(charClass)) { showCustomAlert("เผ่าพันธุ์ 'แวมไพร์' ไม่สามารถเลือกอาชีพที่เกี่ยวกับ 'พลังศักดิ์สิทธิ์' ได้!", 'error'); return; }
    if (race === "ออร์ค" && ["นักบุญหญิง", "สตรีศักดิ์สิทธิ์", "อัศวินศักดิ์สิทธิ์", "นักดาบเวทย์", "โจร", "เรนเจอร์"].includes(charClass)) { showCustomAlert("เผ่าพันธุ์ 'ออร์ค' ไม่เหมาะกับอาชีพสายเวทย์หรือความเร็ว!", 'error'); return; }

    const baseRaceStats = getRaceStatBonus(race);
    const baseClassStats = getClassStatBonus(charClass);
    const investedStats = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    const tempStats = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    const initialCon = (baseRaceStats.CON || 0) + (baseClassStats.CON || 0);
    const maxHp = calculateHP(race, charClass, initialCon);

    const characterData = {
        name, gender, age, race, class: charClass, background, alignment,
        level: 1, freeStatPoints: 10,
        exp: 0, expToNextLevel: 300,
        stats: { baseRaceStats, baseClassStats, investedStats, tempStats },
        hp: maxHp, maxHp: maxHp,
        inventory: [], quest: null,
        equippedItems: { mainHand: null, offHand: null, head: null, chest: null, legs: null, feet: null },
        activeEffects: [],
        skillCooldowns: {},
        combatSkillUses: {}
    };

    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`);

    showLoading("กำลังสร้างตัวละคร...");

    try {
        const snapshot = await playerRef.get();
        if (snapshot.exists()) {
             hideLoading();
             showCustomAlert(`คุณมีตัวละครอยู่ในห้องนี้แล้ว (${snapshot.val().name})`, 'error');
             window.location.hash = '#player-dashboard';
        } else {
            await playerRef.set(characterData);
            hideLoading();
            showCustomAlert("สร้างตัวละครสำเร็จ! กำลังไปหน้าลงแต้มสถานะ", 'success');
            window.location.hash = "#stat-assignment";
        }
    } catch (error) {
         hideLoading();
         showCustomAlert("ไม่สามารถสร้างตัวละครได้: " + error.message, 'error');
    }
}