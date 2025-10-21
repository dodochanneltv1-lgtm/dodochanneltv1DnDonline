/**
 * แสดงหน้าต่าง Loading ด้วยข้อความที่กำหนด
 * @param {string} message - ข้อความที่จะแสดง เช่น 'กำลังโหลด...'
 */
function showLoading(message) {
  Swal.fire({
    title: message,
    // เพิ่ม HTML ที่มี Spinner เข้าไป
    html: '<div style="display: flex; justify-content: center; align-items: center; height: 50px;"><div class="swal2-loader"></div></div>',
    // ป้องกันการปิดหน้าต่างด้วยการคลิกหรือกดปุ่ม
    allowOutsideClick: false,
    allowEscapeKey: false,
    // ไม่ต้องแสดงปุ่ม Confirm
    showConfirmButton: false,
    // เมื่อเปิดหน้าต่าง ให้แสดงไอคอน Loading ของ SweetAlert
    didOpen: () => { // <--- แก้ไขจุดนี้
      Swal.showLoading();
    }
  });
}

/**
 * ซ่อนหรือปิดหน้าต่าง Loading ที่กำลังแสดงอยู่
 */
function hideLoading() {
  Swal.close();
}