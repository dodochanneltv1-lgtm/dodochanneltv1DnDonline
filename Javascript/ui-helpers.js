// Javascript/ui-helpers.js - REBUILT VERSION (Final)

/**
 * แสดงหน้าต่าง Loading (เวอร์ชันมาตรฐาน)
 * @param {string} message - ข้อความที่จะแสดง
 */
function showLoading(message) {
  Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading(); 
    }
  });
}

function hideLoading() {
  Swal.close();
}