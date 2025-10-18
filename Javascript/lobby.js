// Javascript/lobby.js

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        console.log("ผู้ใช้ล็อกอินอยู่:", user.uid);
        
        // โหลดข้อมูลผู้ใช้จาก Database
        db.ref('users/' + user.uid).once('value').then((snapshot) => {
            const userData = snapshot.val();
            if (userData) {
                document.getElementById('userEmail').textContent = userData.username;
            }
        });
        
        loadPublicRooms(); // เริ่มโหลดรายชื่อห้อง
    } else {
        console.log("ไม่มีผู้ใช้ล็อกอินอยู่");
        window.location.replace('login.html');
    }
});

// 2. ฟังก์ชันสร้างห้อง
function createRoom() {
    const roomName = document.getElementById('roomName').value.trim();
    const roomPassword = document.getElementById('roomPassword').value;
    const dmPassword = document.getElementById('dmPassword').value.trim();
    const user = firebase.auth().currentUser;

    if (!user) {
        Swal.fire('ข้อผิดพลาด', 'กรุณาล็อกอินก่อนสร้างห้อง', 'error');
        return;
    }

    if (!roomName) {
        Swal.fire('ข้อผิดพลาด', 'กรุณากรอกชื่อห้อง', 'error');
        return;
    }
    
    if (!dmPassword) {
        Swal.fire('ข้อผิดพลาด', 'กรุณากำหนดรหัสผ่านสำหรับ DM Panel', 'error');
        return;
    }

    // โหลดข้อมูล username จาก Database
    db.ref('users/' + user.uid).once('value').then((snapshot) => {
        const userData = snapshot.val();
        const username = userData ? userData.username : 'Unknown';

        // สร้าง ID ห้องแบบสุ่ม 6 หลัก
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        const roomData = {
            name: roomName,
            dmUid: user.uid,
            dmUsername: username, // ใช้ username จาก Database
            dmPassword: dmPassword,
            createdAt: new Date().toISOString()
        };
        
        if (roomPassword) {
            roomData.password = roomPassword;
        }

        return db.ref('rooms/' + roomId).set(roomData);
    }).then(() => {
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        sessionStorage.setItem('roomId', roomId);
        Swal.fire('สร้างห้องสำเร็จ', `ID ห้องของคุณคือ: ${roomId}`, 'success');
        window.location.href = 'dm-panel.html';
    }).catch(error => {
        Swal.fire('ผิดพลาด', `ไม่สามารถสร้างห้องได้: ${error.message}`, 'error');
    });
}

// ⭐️ [NEW] ฟังก์ชันเลือกบทบาทเมื่อกดเข้าร่วม
function joinRoomSelection() {
    const roomId = document.getElementById('roomIdInput').value.trim();
    if (!roomId) {
        Swal.fire('ข้อผิดพลาด', 'กรุณากรอก ID ห้อง', 'error');
        return;
    }

    db.ref(`rooms/${roomId}`).get().then(snapshot => {
        if (!snapshot.exists()) {
            Swal.fire('ผิดพลาด', `ไม่พบห้อง ID: ${roomId}`, 'error');
            return;
        }
        
        const roomData = snapshot.val();
        
        // 1. ตรวจสอบรหัสผ่านเข้าห้อง (ถ้ามี)
        if (roomData.password) {
            Swal.fire({
                title: 'ใส่รหัสผ่านห้อง',
                input: 'password',
                inputPlaceholder: 'กรอกรหัสผ่านเข้าห้อง',
                showCancelButton: true,
                confirmButtonText: 'ยืนยัน',
            }).then((result) => {
                if (result.isConfirmed) {
                    if (result.value !== roomData.password) {
                        Swal.fire('ผิดพลาด', 'รหัสผ่านห้องไม่ถูกต้อง!', 'error');
                    } else {
                        // ถ้าใส่รหัสผ่านห้องถูกต้อง ให้เข้าสู่โหมดเลือกบทบาท
                        promptRoleSelection(roomId, roomData);
                    }
                }
            });
        } else {
             // ถ้าไม่มีรหัสผ่านห้อง ให้เข้าสู่โหมดเลือกบทบาททันที
            promptRoleSelection(roomId, roomData);
        }
    });
}

function promptRoleSelection(roomId, roomData) {
    Swal.fire({
        title: 'เลือกบทบาท',
        text: `คุณต้องการเข้าห้อง ${roomData.name} เป็นอะไร?`,
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '🛡️ ผู้เล่น',
        denyButtonText: '🧙‍♂️ DM Panel',
        cancelButtonText: 'ยกเลิก',
    }).then((result) => {
        if (result.isConfirmed) {
            // เลือกเป็น ผู้เล่น
            sessionStorage.setItem('roomId', roomId);
            window.location.href = 'player-dashboard.html';
        } else if (result.isDenied) {
            // เลือกเป็น DM Panel - ต้องยืนยันรหัส DM
            promptDmConfirmation(roomId, roomData);
        }
    });
}
function promptDmConfirmation(roomId, roomData) {
    Swal.fire({
        title: 'ยืนยันสิทธิ์ DM',
        text: 'กรุณาใส่รหัสผ่าน DM Panel',
        input: 'password',
        inputPlaceholder: 'รหัส DM Panel',
        showCancelButton: true,
        confirmButtonText: 'เข้าสู่ DM Panel',
    }).then((result) => {
        if (result.isConfirmed) {
            if (result.value === roomData.dmPassword) {
                // ยืนยัน DM สำเร็จ
                sessionStorage.setItem('roomId', roomId);
                Swal.fire('สำเร็จ', 'เข้าสู่ DM Panel', 'success');
                window.location.href = 'dm-panel.html';
            } else {
                Swal.fire('ผิดพลาด', 'รหัสผ่าน DM ไม่ถูกต้อง!', 'error');
            }
        }
    });
}


function loadPublicRooms() {
    const roomsRef = db.ref('rooms');
    const roomsList = document.getElementById('publicRoomsList');

    roomsRef.on('value', (snapshot) => {
        roomsList.innerHTML = ''; // เคลียร์รายการเก่า
        const rooms = snapshot.val();

        if (!rooms) {
            roomsList.innerHTML = '<li>ยังไม่มีห้องใดถูกสร้าง</li>';
            return;
        }

        let hasAnyRoom = false; // เปลี่ยนชื่อตัวแปรเป็น 'hasAnyRoom'
        for (const roomId in rooms) {
            const roomData = rooms[roomId];
            
            // ⭐️ [FIXED]: ลบเงื่อนไข if (!roomData.password) ออก เพื่อแสดงห้องทั้งหมด
            hasAnyRoom = true;
            const isLocked = roomData.password ? ' (🔒 มีรหัส)' : ' (🔓 สาธารณะ)';
            
            const li = document.createElement('li');
            // ⭐️ [MODIFIED]: แสดงสถานะรหัสล็อก
            li.innerHTML = `<strong>${roomData.name}</strong> ${isLocked} (DM: ${roomData.dmEmail}) <br> <small>ID: ${roomId}</small>`; 
            li.onclick = () => {
                document.getElementById('roomIdInput').value = roomId;
                joinRoomSelection(); 
            };
            roomsList.appendChild(li);
        }
         
        if (!hasAnyRoom) {
            roomsList.innerHTML = '<li>ยังไม่มีห้องใดถูกสร้าง</li>';
        }
    });
}
