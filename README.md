# Chạy và nhà mình

Trang tĩnh (HTML + CSS + JS, không cần build), chạy trên GitHub Pages:

- `index.html`: trang chủ, có link tới các trang dưới.
- `lich-tap-chay-lai.html`: lịch tập chạy lại tuần 23–29/11/2026.
- `bai-tap-bo-tro.html`: bài tập bổ trợ (kỹ thuật chạy, sức mạnh, tạ, core, giãn cơ) và buổi mẫu.
- `dong-bo.js`: đồng bộ đánh dấu, ghi chép, mức tạ của 2 trang trên giữa các máy. Chưa đăng nhập thì chỉ lưu trên trình duyệt đang dùng (localStorage); bấm "Đăng nhập Google để lưu lên mạng" ở đầu trang (cùng tài khoản với trang Kế hoạch) thì lưu thêm lên Firestore ở `habits/lich-tap_<uid>` và `habits/bo-tro_<uid>`. Không cần sửa Rules. Nút tắt hình chuyển động và tab đang xem vẫn riêng từng máy.
- `ke-hoach-nha-minh.html`: kế hoạch chung của hai vợ chồng (tập luyện, lịch chung, việc nhà, bữa ăn, thói quen). Đăng nhập bằng Google, dữ liệu lưu trên Firebase Firestore nên hai người thấy cùng một dữ liệu.

Trang công khai: ai có link cũng mở được phần chữ cố định trong HTML (kể cả số nhịp tim trong lịch tập). Dữ liệu trong trang Kế hoạch thì chỉ 2 email được cho phép mới đọc, ghi được.

## 1. Xuất bản bằng GitHub Pages (làm một lần)

1. Tạo repo trống tên `chay` (Public) trên tài khoản `quachhieu2313`, không tick thêm README.
2. Đẩy mã lên nhánh `main`:
   ```
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch `main`, thư mục `/ (root)` → Save. Vài phút sau trang chạy tại `https://quachhieu2313.github.io/chay/`.

## 2. Tạo Firebase cho trang Kế hoạch (làm một lần, miễn phí)

1. Vào https://console.firebase.google.com → **Create a project** (tên tuỳ ý, ví dụ `ke-hoach-nha-minh`). Không cần bật Google Analytics.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** → chọn email hỗ trợ → Save.
3. **Authentication → Settings → Authorized domains → Add domain**: `quachhieu2313.github.io`.
4. **Build → Firestore Database → Create database** → chọn vùng `asia-southeast1` (Singapore) → *Start in production mode*.
5. **Firestore → Rules**: dán nội dung file `firestore.rules`, thay 2 email mẫu bằng email Google của Hiếu và của vợ → **Publish**. Chỉ sửa email trên console, không commit email thật lên GitHub.
6. **Project settings (bánh răng) → General → Your apps → biểu tượng `</>` (Web)** → đặt tên app → Register. Chép các giá trị trong `firebaseConfig` vào `firebase-config.js` (thay các chữ `DIEN_...`), rồi:
   ```
   git add firebase-config.js
   git commit -m "Điền cấu hình Firebase"
   git push
   ```
   Các giá trị này được phép công khai; dữ liệu được bảo vệ bằng rules ở bước 5.

## 3. Lần đầu dùng trang Kế hoạch

1. Hiếu mở `https://quachhieu2313.github.io/chay/ke-hoach-nha-minh.html` → **Đăng nhập bằng Google** → bấm **Tôi là Hiếu**.
2. Cuối trang bấm **Nhập từ file** → chọn `du_lieu_ban_dau.json` (nằm ở `Desktop\chay`, không có trong repo). File này là dữ liệu đang có trên bản claude.ai: lịch tập 2 người 23/11–6/12, 6 việc nhà, thực đơn tuần, nhịp tim/HRV ngày 23/11.
3. Gửi link cho vợ: cô ấy đăng nhập Google (email phải nằm trong rules) → bấm **Tôi là vợ của Hiếu**.

Email chưa có trong rules sẽ thấy thông báo "Tài khoản này chưa được cấp quyền" và không đọc được gì.

## Sao lưu

Cuối trang Kế hoạch có **Xuất ra file** (tải toàn bộ dữ liệu về máy dạng JSON) và **Nhập từ file** (ghi đè các mục cùng mã, không xoá mục khác). File `*.json` bị `.gitignore` chặn để không lỡ đẩy dữ liệu cá nhân lên GitHub.

## Giới hạn

- Gói miễn phí Firestore (Spark): 50.000 lượt đọc, 20.000 lượt ghi mỗi ngày, dư cho 2 người.
- Mỗi lần mở trang đọc toàn bộ dữ liệu; sau vài năm nếu nhiều dữ liệu thì nên xoá bớt tuần cũ.
- Trình duyệt chặn cửa sổ bật lên thì trang tự chuyển sang đăng nhập kiểu chuyển trang.
