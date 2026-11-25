# Chạy và nhà mình

Trang tĩnh (HTML + CSS + JS, không cần build), chạy trên GitHub Pages:

- `index.html`: trang chủ, có link tới các trang dưới.
- `lich-tap-chay-lai.html`: lịch tập chạy lại tuần 23–29/11/2026.
- `bai-tap-bo-tro.html`: bài tập bổ trợ (kỹ thuật chạy, sức mạnh, tạ, core, giãn cơ) và buổi mẫu.
- `dong-bo.js`: đồng bộ đánh dấu, ghi chép, mức tạ của 2 trang trên giữa các máy. Chưa đăng nhập thì chỉ lưu trên trình duyệt đang dùng (localStorage); bấm "Đăng nhập Google để lưu lên mạng" ở đầu trang (cùng tài khoản với trang Kế hoạch) thì lưu thêm lên Firestore ở `habits/lich-tap_<uid>` và `habits/bo-tro_<uid>`. Không cần sửa Rules. Nút tắt hình chuyển động và tab đang xem vẫn riêng từng máy.
- `tap/`: **Lịch chạy cá nhân**, dùng cho nhiều người. Mỗi người điền hồ sơ (tuổi, nhịp tim nghỉ/tối đa, km mỗi tuần, kết quả gần đây, mục tiêu road hoặc trail, ngày rảnh), trang tự tạo lịch theo tuần và nhận xét sau mỗi buổi chạy.
  - `tap/lich.js`: bộ tạo lịch (không cần mạng). Vùng nhịp tim Karvonen, pace theo VDOT, chia giai đoạn nền/tăng cường/cao điểm/giảm tải, tăng khối lượng tối đa khoảng 10% mỗi tuần, tuần giảm tải mỗi 4 tuần, tối đa 2 bài nặng không liền nhau, trail tính số mét leo và chạy dài hai ngày liền.
  - `tap/app.js`: giao diện. Lịch không lưu mà tạo lại từ hồ sơ; chỉ lưu hồ sơ, ghi chép, ô đánh dấu, kiểm tra buổi sáng, giày.
    Sửa hồ sơ giữa chừng thì các tuần đã qua giữ theo hồ sơ cũ (`hs.cu`). Lịch tự giảm tuần sau khi có đau, tim cao, quá sức, bỏ nhiều buổi, sáng chưa hồi phục (người dùng bấm giữ nguyên được).
    Có: kiểm tra buổi sáng, chỉnh pace theo trời nóng, kế hoạch ngày thi, thời gian mục tiêu, vùng theo LTHR, nhật ký và ghi buổi ngoài lịch, theo dõi km giày, xuất lịch .ics, chuyển dữ liệu từ `lich-tap-chay-lai.html`, trang hướng dẫn.
  - `tap/doc-file.js`: đọc file .fit/.tcx/.gpx/.zip (Garmin Export Original) ngay trong trình duyệt; không lưu toạ độ.
  - `tap/manifest.webmanifest`, `tap/sw.js`, `tap/icon-*.png`: cài lên điện thoại như ứng dụng, mở được khi không có mạng. Đổi file của trang thì không cần đổi gì; đổi danh sách file cần lưu thì tăng `V` trong `sw.js`.
  - Dữ liệu: localStorage, và nếu đăng nhập Google thì `runners/<uid>` trên Firestore. Cần thêm khối `match /runners/{uid}` trong `firestore.rules` vào Rules trên console (không cần đổi email). Đăng xuất xoá bản trên máy; trang Dữ liệu có tải về JSON và xoá vĩnh viễn.
- `bai-tap-data.js`: thư viện bài tập dùng chung (hình động, nội dung, buổi mẫu) cho `bai-tap-bo-tro.html` và `tap/`.
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
