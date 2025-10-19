function showCustomAlert(message, iconType = 'info') {
    const buttonColor = iconType === 'error' ? '#dc3545' : '#28a745'; 
    Swal.fire({
        title: iconType === 'success' ? 'สำเร็จ!' : iconType === 'error' ? 'ข้อผิดพลาด!' : '⚠️ แจ้งเตือน!',
        text: message,
        icon: iconType,
        confirmButtonText: 'ตกลง',
        confirmButtonColor: buttonColor,
    });
}

/**
 * [อัปเดต] เพิ่มค่าพลังพื้นฐาน 5 ให้ทุกเผ่า และบวกโบนัสทับเข้าไป
 */
function getRaceStatBonus(charRace) {
    const baseStats = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    const racialBonuses = {
      'มนุษย์': { STR: 2, DEX: 2, CON: 2, INT: 2, WIS: 2, CHA: 2 },
      'เอลฟ์': { DEX: 4, INT: 3 , CHA: 6 , STR: 1}, 
      'คนแคระ': { CON: 9, STR: 5 , CHA: 3 }, 
      'ฮาล์ฟลิ่ง': { DEX: 5, CHA: 6 , STR: 2 }, 
      'ไทฟลิ่ง': { DEX: 6, CHA: 5, INT: 3 , STR: 3}, 
      'แวมไพร์': { DEX: 4, CHA: 4 , STR: 2 }, 
      'เงือก': { CON: 8, WIS: 4 }, 
      'ออร์ค': { STR: 10, CON: 5 }, 
      'โนม': { INT: 7, DEX: 4 }, 
      'เอลฟ์ดำ': { DEX: 5, CHA: 5 , STR: 2}, 
      'นางฟ้า': { WIS: 8, CHA: 7 }, 
      'มาร': { STR: 10, CHA: 8 }, 
      'โกเลม': { CON: 15, STR: 5 } ,
      'อันเดด': { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0  },
      'ครึ่งมังกร': { STR: 12, CON: 8 , DEX: 4, INT: 12 , WIS: 8 , CHA: 6 },
      'มังกร': { STR: 24, CON: 16 , DEX: 2 , INT: 24 , WIS: 16 , CHA: 12 },
      'ครึ่งเทพ': { STR: 25, DEX: 10, CON: 10, INT: 25, WIS: 10, CHA: 25 },
      'พระเจ้า': { STR: 50, DEX: 50, CON: 50, INT: 50, WIS: 50, CHA: 50 }
    };
    const finalStats = { ...baseStats };
    const bonus = racialBonuses[charRace] || {};
    for (const stat in bonus) {
        finalStats[stat] += bonus[stat];
    }
    return finalStats;
}

/**
 * [อัปเดต] ปรับโครงสร้างเพื่อความชัดเจน (ผลลัพธ์เหมือนเดิม)
 */
function getClassStatBonus(charClass) {
    const classBonuses = {
      'นักรบ': { STR: 20, CON: 12 }, 
      'นักเวท': { INT: 25, WIS: 10 }, 
      'นักบวช': { WIS: 22, CHA: 8 }, 
      'โจร': { DEX: 30, CHA: 10 }, 
      'เรนเจอร์': { DEX: 15, WIS: 10, CON: 8 }, 
      'อัศวินศักดิ์สิทธิ์': { STR: 22, CHA: 15, CON: 18 }, 
      'บาร์บาเรียน': { STR: 35, CON: 15 }, 
      'พ่อค้า': { CHA: 25, INT: 10 }, 
      'แทงค์': { CON: 40, STR: 10 }, 
      'นักปราชญ์': { INT: 20, WIS: 15 }, 
      'อัศวิน': { STR: 18, CON: 15 }, 
      'เจ้าเมือง': { CHA: 50, INT: 50 },
      'นักดาบเวทย์': { STR: 12, INT: 18, DEX: 10 , CON: 8 , CHA: 5}, 
      'นักบุญหญิง': { WIS: 20, CON: 10 , CHA: 8 },
      'นักฆ่า': { DEX: 35, STR: 10  },
      'สตรีศักดิ์สิทธิ์': { WIS: 25, CHA: 15 }, 
      'ผู้กล้า': { STR: 30, CON: 20  },
      'จอมมาร': { INT: 40, CHA: 30  }, 
      'เทพเจ้า': { STR: 50, DEX: 50, CON: 50, INT: 50, WIS: 50, CHA: 50 }
    };
    const defaultStats = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    return { ...defaultStats, ...classBonuses[charClass] };
}

/**
 * [อัปเดต] เพิ่ม HP พื้นฐานของเผ่า และปรับสูตรคำนวณใหม่
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

// วางทับฟังก์ชัน createCharacter เดิมในไฟล์ charector.js

function createCharacter() {
    const roomId = sessionStorage.getItem('roomId');
    const user = firebase.auth().currentUser; // ดึงผู้ใช้ปัจจุบัน
    
    if (!roomId || !user) { // ⭐️ [FIXED]: ตรวจสอบ user ด้วย
        showCustomAlert("ไม่พบข้อมูลห้องหรือผู้ใช้! กรุณาล็อกอินและเข้าร่วมห้องใหม่อีกครั้ง", 'error');
        return;
    }
    const uid = user.uid;

    if (!roomId) {
        showCustomAlert("ไม่พบข้อมูลห้อง! กรุณากลับไปที่ Lobby แล้วเข้าร่วมห้องใหม่อีกครั้ง", 'error');
        return;
    }
    const name = document.getElementById('name').value.trim();
    const background = document.getElementById('background').value.trim();
    const age = document.getElementById('age').value.trim();
    const gender = document.getElementById('gender').value;
    const race = document.getElementById('race').value;
    const charClass = document.getElementById('class').value;
    const alignment = document.getElementById('alignment').value;

    if (name === "") {
        showCustomAlert("กรุณาระบุชื่อตัวละครก่อน!", 'warning');
        return;
    }
    const ageValue = parseInt(age);
    if (isNaN(ageValue) || ageValue <= 0) {
        showCustomAlert("กรุณาระบุอายุที่เป็นตัวเลขและมากกว่า 0!", 'error');
        return;
    }
    // --- ส่วนที่แก้ไข ---
    if (race === 'นางฟ้า' && gender !== 'หญิง') {
        showCustomAlert("เผ่าพันธุ์ 'นางฟ้า' สามารถเลือกได้เฉพาะเพศ 'หญิง' เท่านั้น!", 'error');
        return;
    }
    if (race === 'โกเลม' && (charClass === 'นักเวท' || charClass === 'นักบวช' || charClass === 'นักปราชญ์')) {
        showCustomAlert("โกเลมไม่สามารถใช้อาชีพสายเวทย์ได้!", 'error');
        return;
    }
    if ((charClass === 'นักบุญหญิง' || charClass === 'สตรีศักดิ์สิทธิ์') && gender !== 'หญิง') {
        showCustomAlert("อาชีพนี้สามารถเลือกได้เฉพาะเพศ 'หญิง' เท่านั้น!", 'error');
        return;
    }
    if (race === "มาร" && (charClass === "นักบวช" || charClass === "นักบุญหญิง" || charClass === "สตรีศักดิ์สิทธิ์" || charClass === "ผู้กล้า" || charClass === "อัศวินศักดิ์สิทธิ์")) {
        showCustomAlert("เผ่าพันธุ์ 'มาร' ไม่สามารถเลือกอาชีพที่เกี่ยวกับความดีงามได้!", 'error');
        return;
    }
    if (race === "แวมไพร์" && (charClass === "นักบวช" || charClass === "นักบุญหญิง" || charClass === "สตรีศักดิ์สิทธิ์" || charClass === "อัศวินศักดิ์สิทธิ์")) {
        showCustomAlert("เผ่าพันธุ์ 'แวมไพร์' ไม่สามารถเลือกอาชีพที่เกี่ยวกับ 'พลังศักดิ์สิทธิ์' ได้!", 'error');
        return;
    }
    if (race === "ออร์ค" && (charClass === "นักบุญหญิง" || charClass === "สตรีศักดิ์สิทธิ์" || charClass === "อัศวินศักดิ์สิทธิ์" || charClass === "นักดาบเวทย์" || charClass === "โจร" || charClass === "เรนเจอร์")) {
        showCustomAlert("เผ่าพันธุ์ 'ออร์ค' ไม่เหมาะกับอาชีพสายเวทย์หรือความเร็ว!", 'error');
        return;
    }
    // --- สิ้นสุดส่วนที่แก้ไข ---


    // ... โค้ดส่วนที่เหลือของฟังก์ชันเหมือนเดิม ...
    const baseRaceStats = getRaceStatBonus(race);
    const baseClassStats = getClassStatBonus(charClass);
    
    const investedStats = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    const tempStats = { STR: 0, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 };
    
    const initialCon = (baseRaceStats.CON || 0) + (baseClassStats.CON || 0);
    const hp = calculateHP(race, charClass, initialCon);

    const characterData = {
        name, gender, age, race, class: charClass, background, alignment,
        level: 1, freeStatPoints: 10,
        stats: { baseRaceStats, baseClassStats, investedStats, tempStats },
        hp, inventory: [], quest: null, enemy: null
    };

    const playerRef = db.ref(`rooms/${roomId}/playersByUid/${uid}`);
    
    playerRef.get().then((snapshot) => {
        if (snapshot.exists()) {
             showCustomAlert(`คุณมีตัวละครอยู่ในห้องนี้แล้ว (${snapshot.val().name})`, 'error');
             // อาจจะ redirect ไป dashboard เลย หรือให้ผู้ใช้ลบตัวละครเก่าก่อน
             setTimeout(() => { window.location.href = "player-dashboard.html"; }, 1000);
             return;
        } else {
            playerRef.set(characterData).then(() => {
                showCustomAlert("สร้างตัวละครสำเร็จ! กำลังไปหน้า Skill Point", 'success');
                setTimeout(() => {
                    // ⭐️ เปลี่ยนไปหน้า Skill Point เลย เพราะตอนนี้เรามีตัวละครแล้ว
                    window.location.href = "stat-assignment.html"; 
                }, 1000);
            }).catch((error) => {
                showCustomAlert("ไม่สามารถสร้างตัวละครได้: " + error.message, 'error');
            });
        }
    });
}
