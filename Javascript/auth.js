// Javascript/auth.js

function registerUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // --- 1. ตรวจสอบข้อมูลเบื้องต้น ---
    if (!email || !password || !confirmPassword) {
        Swal.fire('ข้อผิดพลาด!', 'กรุณากรอกข้อมูลให้ครบทุกช่อง', 'error');
        return;
    }

    if (password !== confirmPassword) {
        Swal.fire('ข้อผิดพลาด!', 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', 'error');
        return;
    }

    if (password.length < 6) {
        Swal.fire('ข้อผิดพลาด!', 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'error');
        return;
    }

    // --- 2. เรียกใช้ Firebase Authentication เพื่อสร้างผู้ใช้ใหม่ ---
    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // สมัครสมาชิกสำเร็จ
            const user = userCredential.user;
            console.log("สร้างผู้ใช้สำเร็จ:", user.uid);
            
            Swal.fire({
                title: 'สมัครสมาชิกสำเร็จ!',
                text: `ยินดีต้อนรับ ${user.email}`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                // ส่งผู้ใช้ไปหน้า login เพื่อเข้าสู่ระบบ
                window.location.href = 'login.html';
            });
        })
        .catch((error) => {
            // เกิดข้อผิดพลาด
            console.error("Auth Error:", error.code, error.message);
            let errorMessage = "เกิดข้อผิดพลาดที่ไม่รู้จัก";

            // แปลข้อความ Error ของ Firebase ให้เป็นมิตรกับผู้ใช้
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'อีเมลนี้มีผู้ใช้งานในระบบแล้ว';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'รหัสผ่านไม่ปลอดภัย (ต้องมีอย่างน้อย 6 ตัวอักษร)';
                    break;
            }
            
            Swal.fire('สมัครสมาชิกไม่สำเร็จ!', errorMessage, 'error');
        });
}

// เพิ่มฟังก์ชันนี้ต่อท้ายในไฟล์ Javascript/auth.js

function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // --- 1. ตรวจสอบข้อมูลเบื้องต้น ---
    if (!email || !password) {
        Swal.fire('ข้อผิดพลาด!', 'กรุณากรอกอีเมลและรหัสผ่าน', 'error');
        return;
    }

    // --- 2. เรียกใช้ Firebase Authentication เพื่อเข้าสู่ระบบ ---
    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // ล็อกอินสำเร็จ
            const user = userCredential.user;
            console.log("ล็อกอินสำเร็จ:", user.uid);

            Swal.fire({
                title: 'เข้าสู่ระบบสำเร็จ!',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // ⭐️ ส่งผู้ใช้ไปที่หน้า Lobby (ที่เราจะสร้างในสเต็ปถัดไป)
                window.location.href = 'lobby.html'; 
            });
        })
        .catch((error) => {
            // เกิดข้อผิดพลาด
            console.error("Auth Error:", error.code, error.message);
            let errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง"; // ข้อความเริ่มต้น

            // (Firebase จะให้ error 'auth/user-not-found' หรือ 'auth/wrong-password' 
            // แต่เพื่อความปลอดภัย เราไม่ควรบอกผู้ใช้ว่าผิดที่อีเมลหรือรหัสผ่าน)
            
            Swal.fire('เข้าสู่ระบบไม่สำเร็จ!', errorMessage, 'error');
        });
}

// เพิ่มฟังก์ชันนี้ใน Javascript/auth.js
function logoutUser() {
    firebase.auth().signOut()
        .then(() => {
            console.log("ออกจากระบบสำเร็จ");
            window.location.href = 'login.html'; // กลับไปหน้าล็อกอิน
        })
        .catch((error) => {
            console.error("Logout Error:", error);
        });
}