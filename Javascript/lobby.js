// Javascript/lobby.js - แก้ไขปัญหาการเลือกบทบาท DM/Player

// ตรวจสอบสถานะการล็อกอินของผู้ใช้เมื่อหน้าเว็บโหลด
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        // ✨ [ปรับปรุง] ใช้ username จาก path 'users' ที่เราเคยกำหนดไว้
        db.ref('users/' + user.uid).once('value').then((snapshot) => {
            const userData = snapshot.val();
            if (userData && userData.username) {
                document.getElementById('userEmail').textContent = userData.username;
            } else {
                // กรณีไม่พบข้อมูล ให้ใช้ชื่อจากอีเมลแทน
                document.getElementById('userEmail').textContent = user.email.split('@')[0];
            }
        });
        
        loadPublicRooms(); // เริ่มโหลดรายชื่อห้อง
    } else {
        window.location.replace('login.html');
    }
});

// --------------------------------------------------------------------------------

// ✨ [ปรับปรุง] แก้ไขฟังก์ชัน createRoom ทั้งหมดโดยใช้ async/await และเพิ่ม Loading
async function createRoom() {
    const roomName = document.getElementById('roomName').value.trim();
    const roomPassword = document.getElementById('roomPassword').value;
    const dmPassword = document.getElementById('dmPassword').value.trim();
    const user = firebase.auth().currentUser;

    if (!user) {
        return Swal.fire('ข้อผิดพลาด', 'กรุณาล็อกอินก่อนสร้างห้อง', 'error');
    }
    if (!roomName || !dmPassword) {
        return Swal.fire('ข้อผิดพลาด', 'กรุณากรอก "ชื่อห้อง" และ "รหัสผ่าน DM Panel"', 'error');
    }

    showLoading('กำลังสร้างห้อง...');

    try {
        // สร้าง roomId เพียงครั้งเดียวตรงนี้
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();

        const userSnapshot = await db.ref('users/' + user.uid).get();
        const username = userSnapshot.val()?.username || 'Unknown DM';

        const roomData = {
            name: roomName,
            dmUid: user.uid,
            dmUsername: username,
            dmPassword: dmPassword,
            createdAt: new Date().toISOString()
        };
        
        if (roomPassword) {
            roomData.password = roomPassword;
        }

        await db.ref('rooms/' + roomId).set(roomData);
        
        hideLoading();

        sessionStorage.setItem('roomId', roomId);
        await Swal.fire('สร้างห้องสำเร็จ', `ID ห้องของคุณคือ: ${roomId}`, 'success');
        window.location.href = 'dm-panel.html';

    } catch (error) {
        hideLoading();
        Swal.fire('ผิดพลาด', `ไม่สามารถสร้างห้องได้: ${error.message}`, 'error');
    }
}

// --------------------------------------------------------------------------------

// ✨ [ปรับปรุง] แก้ไขฟังก์ชัน joinRoomSelection ทั้งหมดโดยใช้ async/await และเพิ่ม Loading
async function joinRoomSelection() {
    const roomId = document.getElementById('roomIdInput').value.trim();
    if (!roomId) {
        return Swal.fire('ข้อผิดพลาด', 'กรุณากรอก ID ห้อง', 'error');
    }

    showLoading('กำลังตรวจสอบห้อง...');

    try {
        const roomSnapshot = await db.ref(`rooms/${roomId}`).get();

        if (!roomSnapshot.exists()) {
            hideLoading();
            return Swal.fire('ผิดพลาด', `ไม่พบห้อง ID: ${roomId}`, 'error');
        }
        
        const roomData = roomSnapshot.val();
        hideLoading(); // ซ่อน Loading หลังเจอห้องแล้ว

        // 1. ตรวจสอบรหัสผ่านเข้าห้อง (ถ้ามี)
        if (roomData.password) {
            const { value: password, isConfirmed } = await Swal.fire({
                title: 'ใส่รหัสผ่านห้อง',
                input: 'password',
                inputPlaceholder: 'กรอกรหัสผ่านเข้าห้อง',
                showCancelButton: true,
                confirmButtonText: 'ยืนยัน',
            });

            if (!isConfirmed) return; // ผู้ใช้กดยกเลิก

            if (password !== roomData.password) {
                return Swal.fire('ผิดพลาด', 'รหัสผ่านห้องไม่ถูกต้อง!', 'error');
            }
        }
        
        // 2. เมื่อรหัสผ่านถูกต้อง (หรือไม่มีรหัส) ให้เลือกบทบาท
        await promptRoleSelection(roomId, roomData);

    } catch(error) {
        hideLoading();
        Swal.fire('ผิดพลาด', `เกิดข้อผิดพลาดในการเข้าร่วมห้อง: ${error.message}`, 'error');
    }
}

// --------------------------------------------------------------------------------

async function promptRoleSelection(roomId, roomData) {
  const user = firebase.auth().currentUser;
  if (!user) return Swal.fire('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้!', 'error');

  await Swal.fire({
    title: 'เลือกบทบาท',
    html: `
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
        <button id="swal-player-btn" class="swal2-confirm swal2-styled" type="button" style="/* ลบ inline style ทิ้ง ให้ใช้ CSS ใหม่แทน */">
          <span class="emoji-icon">🛡️</span> ผู้เล่น 
        </button>
        <button id="swal-dm-btn" class="swal2-deny swal2-styled" type="button" style="/* ลบ inline style ทิ้ง ให้ใช้ CSS ใหม่แทน */">
          <span class="emoji-icon">🧙‍♂️</span> DM PANEL
        </button>
        <button id="swal-cancel-btn" class="swal2-cancel swal2-styled" type="button" style="/* ลบ inline style ทิ้ง ให้ใช้ CSS ใหม่แทน */">
          <span class="emoji-icon">❌</span> ยกเลิก
        </button>
      </div>
    `,
    // ❌ ปิดปุ่มเริ่มต้นทั้งหมดของ SweetAlert2
    showConfirmButton: false,
    showCancelButton: false,
    showDenyButton: false,
    allowOutsideClick: false,
    allowEscapeKey: true,

    didOpen: (modal) => {
      modal.querySelector('#swal-player-btn').addEventListener('click', () => {
        sessionStorage.setItem('roomId', roomId);
        localStorage.setItem('currentUserUid', user.uid);
        Swal.close();
        window.location.href = 'player-dashboard.html';
      });

      modal.querySelector('#swal-dm-btn').addEventListener('click', async () => {
        Swal.close();
        await promptDmConfirmation(roomId, roomData);
      });

      modal.querySelector('#swal-cancel-btn').addEventListener('click', () => {
        Swal.close();
      });
    }
  });
}



// --------------------------------------------------------------------------------

async function promptDmConfirmation(roomId, roomData) {
    const user = firebase.auth().currentUser;

    // การตรวจสอบสิทธิ์ DM
    /*if (user.uid !== roomData.dmUid) {
        return Swal.fire('ไม่ได้รับอนุญาต', 'คุณไม่ใช่ DM ของห้องนี้', 'error');
    }*/
    
    const { value: password, isConfirmed } = await Swal.fire({
        title: 'ยืนยันสิทธิ์ DM',
        text: 'กรุณาใส่รหัสผ่าน DM Panel',
        input: 'password',
        
        
        showDenyButton: false, 
        
        showCancelButton: true,
        confirmButtonText: 'เข้าสู่ DM Panel',
        cancelButtonText: 'ยกเลิก', 
    });

    if (isConfirmed) {
        if (password === roomData.dmPassword) {
            sessionStorage.setItem('roomId', roomId);
            await Swal.fire('สำเร็จ', 'เข้าสู่ DM Panel', 'success');
            window.location.href = 'dm-panel.html';
        } else {
            Swal.fire('ผิดพลาด', 'รหัสผ่าน DM ไม่ถูกต้อง!', 'error');
        }
    }
}

// --------------------------------------------------------------------------------

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

        let hasAnyRoom = false;
        for (const roomId in rooms) {
            const roomData = rooms[roomId];
            hasAnyRoom = true;
            
            const isLocked = roomData.password ? ' (🔒 มีรหัส)' : ' (🔓 สาธารณะ)';
            const li = document.createElement('li');
            
            // 🐞 [แก้ไข] เปลี่ยนจาก dmEmail เป็น dmUsername
            li.innerHTML = `<strong>${roomData.name}</strong>${isLocked} (DM: ${roomData.dmUsername}) <br> <small>ID: ${roomId}</small>`; 
            
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