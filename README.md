# LoadMaster Mobile

App di động của LoadMaster — hệ thống lập kế hoạch và tối ưu chất xếp hàng hoá 3D cho doanh nghiệp vận tải. App phục vụ tài xế và
nhân viên kho đầy đủ; điều phối viên và quản lý công ty theo dõi chuyến, giám sát và duyệt khi rời bàn làm việc. Việc bàn giấy (lập
chuyến, nhập file, in nhãn, quản trị) nằm ở bản web. App thiết kế cho **điện thoại** trước: chưa có bố cục riêng cho máy tính bảng
(máy tính bảng dùng cùng bố cục, nội dung căn giữa).

React Native + Expo SDK 57 · TypeScript · Expo Router · TanStack Query.

## Trạng thái

23/10/2026:

- Đăng nhập, phiên, phân quyền theo tám vai trò; màn Tài khoản; chuyển ngôn ngữ vi / en. Đăng nhập bằng kho mẫu hoặc bằng Keycloak
  của backend. Màn lỗi chung khi một màn hỏng lúc vẽ, và màn "Không có màn này" cho địa chỉ lạ.
- Tài xế, đủ luồng trên kho mẫu: "Chuyến của tôi"; màn một chuyến — xuất phát, đã đến điểm, đối chiếu kiện khi dỡ (quét QR, gõ mã,
  xác nhận tay), báo sự cố theo kiện, sự cố trên đường, hoàn tất điểm, tổng kết; gửi vị trí GPS; thông báo.
- Nhân viên kho, đủ luồng trên kho mẫu: tab **Kho** — chuyến theo nhóm (đang xếp, chờ soạn, xếp xong — chờ xuất phát, chờ điều phối
  tối ưu lại); phiên một chuyến — soạn hàng (đối chiếu từng kiện, báo thiếu), xếp theo thứ tự của phương án (thẻ chỉ dẫn, sơ đồ thùng
  2D nhìn từ trên, hướng đặt, báo kiện hỏng), xếp xong và số seal; tab **Tra cứu kiện** (quét hoặc gõ mã, báo đã tìm thấy kiện);
  chuông và màn thông báo. Chưa có: khung 3D (bước xếp dùng sơ đồ 2D), nối backend cho kho; xác nhận tay chờ điều phối viên duyệt ở
  bản web.
- Nối backend: đăng nhập (Keycloak + `GET /api/users/me`) và năm endpoint của tài xế (danh sách chuyến, điểm hiện tại, dỡ kiện, hoàn
  tất điểm, vị trí). Việc backend chưa có (xuất phát, đã đến, xác nhận tay, sự cố, thông báo) thì app ẩn nút khi chạy với backend.
- Ngày 16/10 đã chạy bản debug trên máy ảo Android 16: với kho mẫu — đăng nhập tài xế, xuất phát, đã đến điểm, dỡ kiện bằng gõ mã; với
  backend — nút Đăng nhập mở trang Keycloak trong trình duyệt đúng tham số (PKCE `S256`, `loadmaster://auth`). **Chưa** chạy với backend
  thật (đăng nhập trọn vòng, năm endpoint của tài xế), chưa kiểm camera QR, GPS thật, điện thoại thật và iOS; hai màn lỗi và toàn bộ
  màn kho thêm sau ngày đó chưa chạy trên máy.

Kiểm thử: 264 test (Jest, 37 suite), lint và kiểm kiểu sạch; đóng gói Android (`expo export`) chạy được.

## Chạy

Cần Node 22 và pnpm 11.

```bash
pnpm install
pnpm start        # dev server; bấm "a" để mở trên máy ảo Android
pnpm web          # xem thử trên trình duyệt (chỉ để dev)
pnpm check        # dấu file chép từ web + lint + kiểm kiểu + test
```

Với kho mẫu: đăng nhập bằng một tài khoản trong danh sách "Tài khoản dùng thử" ở màn đăng nhập — tài xế `taixe@loadmaster.vn`,
nhân viên kho `kho@loadmaster.vn`.

Xuất file APK để cài lên điện thoại: xem mục "Xuất file APK" trong [AGENTS.md](AGENTS.md).

## Nguồn dữ liệu

Chép `.env.example` thành `.env` khi cần đổi. Mặc định mọi chức năng dùng kho mẫu:

| Biến | Nghĩa |
|---|---|
| `EXPO_PUBLIC_DATA_SOURCE` | `mock` (mặc định) hoặc `http` cho mọi chức năng |
| `EXPO_PUBLIC_HTTP_FEATURES` | Các chức năng đã nối backend khi mặc định là `mock`: `auth`, `driver` (`warehouse`, `packages` chưa nối — chọn chúng là lỗi `HTTP_NOT_WIRED`) |
| `EXPO_PUBLIC_API_URL` | Địa chỉ backend |
| `EXPO_PUBLIC_KEYCLOAK_URL`, `_REALM`, `_CLIENT_ID` | Keycloak của backend; bắt buộc khi `auth` dùng backend |

## Chạy với backend

Cần backend và Keycloak của repo backend chạy trên máy tính (cổng 8080 và 8180).

1. **Client Keycloak cho app** (realm `loadmaster`): công khai, Standard flow, PKCE `S256`, Valid redirect URIs `loadmaster://*`,
   client scope `offline_access` dạng optional (để phiên sống qua ca làm; thiếu thì không dùng 30 phút là phải đăng nhập lại), và mapper
   audience `loadmaster-api` (loại Audience, thêm vào access token) như client `loadmaster-web` — thiếu mapper này backend trả 401 và app
   báo "Máy chủ không nhận phiên vừa đăng nhập". Cách nhanh để chạy thử: thêm `loadmaster://*` vào Valid redirect URIs của
   `loadmaster-web` (đã có mapper) và dùng client đó.
2. **`.env`** (chép từ `.env.example`):

   ```bash
   EXPO_PUBLIC_HTTP_FEATURES=auth,driver
   EXPO_PUBLIC_API_URL=http://localhost:8080
   EXPO_PUBLIC_KEYCLOAK_URL=http://localhost:8180
   EXPO_PUBLIC_KEYCLOAK_REALM=loadmaster
   EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=loadmaster-mobile   # hoặc loadmaster-web
   ```

3. **Điện thoại gọi qua `localhost` của máy tính.** Backend chỉ nhận token do `http://localhost:8180/realms/loadmaster` cấp, nên app
   cũng phải gọi Keycloak đúng địa chỉ đó. Cắm cáp (bật gỡ lỗi USB) hoặc dùng máy ảo, rồi chạy (lại mỗi lần cắm lại máy):

   ```bash
   adb reverse tcp:8180 tcp:8180
   adb reverse tcp:8080 tcp:8080
   ```

4. **Chạy bản debug:** `pnpm exec expo run:android` (JDK 17 + Android SDK, xem AGENTS.md; lệnh có thể đổi script trong `package.json`
   — đừng commit phần đó). Bản release chặn `http://`. Expo Go trả phiên về `exp://…/--/auth`: muốn dùng Expo Go thì thêm redirect
   `exp://*` vào client.

Đăng nhập bằng tài khoản của realm. Tài khoản vai trò `DRIVER` vào màn tài xế và thấy chuyến **Đang vận chuyển** của xe mình được gán
(backend tìm chuyến theo tài xế của xe). Nhánh `develop` của backend hiện đã bỏ `GET /api/driver/trips` (từ 19/10): tới khi endpoint này
có lại, màn tài xế báo lỗi khi chạy với backend. Chỉ `auth` (bỏ `driver`): đăng nhập bằng backend, dữ liệu vẫn là kho mẫu của tài khoản
dùng thử cùng vai trò.

## Logic dùng chung với bản web

Phần tính toán nghiệp vụ được chép từ repo web bằng script, không viết lại:

```bash
pnpm sync:web          # chép lại (cần repo web nằm cạnh: ../LoadMaster)
pnpm sync:web:check    # bản web đã đổi so với bản đang có chưa
```

Luật viết code của repo: [AGENTS.md](AGENTS.md).
