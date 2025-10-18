// Javascript/auth.js - ระบบสมัครสมาชิกแบบใช้ Firebase Authentication

function registerUser() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // --- 1. ตรวจสอบข้อมูลเบื้องต้น ---
    if (!username || !password || !confirmPassword) {
        Swal.fire('ข้อผิดพลาด!', 'กรุณากรอกข้อมูลให้ครบทุกช่อง', 'error');
        return;
    }

    if (username.length < 3) {
        Swal.fire('ข้อผิดพลาด!', 'ชื่อผู้ใช้ต้องมีความยาวอย่างน้อย 3 ตัวอักษร', 'error');
        return;
    }

    if (password.length < 6) {
        Swal.fire('ข้อผิดพลาด!', 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'error');
        return;
    }

    if (password !== confirmPassword) {
        Swal.fire('ข้อผิดพลาด!', 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', 'error');
        return;
    }

    // --- 2. ตรวจสอบว่ามีชื่อผู้ใช้นี้อยู่แล้วหรือไม่ ---
    const email = username + "@dnd.local";
    
    // ใช้ Firebase Authentication สร้างผู้ใช้ใหม่
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // สมัครสมาชิกสำเร็จ
            const user = userCredential.user;
            console.log("สร้างผู้ใช้สำเร็จ:", user.uid);
            
            // บันทึกข้อมูลเพิ่มเติมใน Realtime Database
            const userData = {
                username: username,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };
            
            return db.ref('users/' + user.uid).set(userData);
        })
        .then(() => {
            Swal.fire({
                title: 'สมัครสมาชิกสำเร็จ!',
                text: `ยินดีต้อนรับ ${username}`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'lobby.html';
            });
        })
        .catch((error) => {
            console.error("Auth Error:", error.code, error.message);
            let errorMessage = "เกิดข้อผิดพลาดที่ไม่รู้จัก";

            // แปลข้อความ Error
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'ชื่อผู้ใช้นี้มีผู้ใช้งานแล้ว';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'ชื่อผู้ใช้มีอักขระไม่ถูกต้อง';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'รหัสผ่านไม่ปลอดภัย (ต้องมีอย่างน้อย 6 ตัวอักษร)';
                    break;
            }
            
            Swal.fire('สมัครสมาชิกไม่สำเร็จ!', errorMessage, 'error');
        });
}

function loginUser() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // --- 1. ตรวจสอบข้อมูลเบื้องต้น ---
    if (!username || !password) {
        Swal.fire('ข้อผิดพลาด!', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน', 'error');
        return;
    }

    // --- 2. ใช้ Firebase Authentication ล็อกอิน ---
    const email = username + "@dnd.local";
    
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // ล็อกอินสำเร็จ
            const user = userCredential.user;
            console.log("ล็อกอินสำเร็จ:", user.uid);

            // อัปเดตเวลาล็อกอินล่าสุดใน Database
            return db.ref('users/' + user.uid).update({
                lastLogin: new Date().toISOString()
            });
        })
        .then(() => {
            Swal.fire({
                title: 'เข้าสู่ระบบสำเร็จ!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'lobby.html';
            });
        })
        .catch((error) => {
            console.error("Auth Error:", error.code, error.message);
            let errorMessage = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";

            Swal.fire('เข้าสู่ระบบไม่สำเร็จ!', errorMessage, 'error');
        });
}

function logoutUser() {
    firebase.auth().signOut()
        .then(() => {
            console.log("ออกจากระบบสำเร็จ");
            window.location.href = 'login.html';
        })
        .catch((error) => {
            console.error("Logout Error:", error);
        });
}

// ตรวจสอบสถานะการล็อกอิน
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log("ผู้ใช้ล็อกอินอยู่:", user.uid);
        // โหลดข้อมูลผู้ใช้จาก Database
        db.ref('users/' + user.uid).once('value').then((snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                console.log("ข้อมูลผู้ใช้:", userData.username);
            }
        });
    } else {
        console.log("ไม่มีผู้ใช้ล็อกอินอยู่");
        // ถ้าอยู่ในหน้าที่ต้องล็อกอิน ให้ redirect ไป login
        if (window.location.pathname.includes('lobby.html') || 
            window.location.pathname.includes('dm-panel.html') ||
            window.location.pathname.includes('player-dashboard.html')) {
            window.location.href = 'login.html';
        }
    }
});
