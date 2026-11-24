/* Cấu hình Firebase cho trang "Kế hoạch nhà mình".
   Lấy ở Firebase console → Project settings → General → Your apps → Web app → SDK setup and configuration → Config.
   Các giá trị này được phép công khai (Firebase thiết kế như vậy); dữ liệu được bảo vệ bằng Firestore rules
   và đăng nhập Google, xem README.md. */
window.FIREBASE_CONFIG = {
  apiKey: "DIEN_API_KEY",
  authDomain: "DIEN_PROJECT_ID.firebaseapp.com",
  projectId: "DIEN_PROJECT_ID",
  storageBucket: "DIEN_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "DIEN_SENDER_ID",
  appId: "DIEN_APP_ID"
};
