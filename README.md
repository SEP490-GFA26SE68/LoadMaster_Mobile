# LoadMaster Mobile

App di động của LoadMaster — hệ thống lập kế hoạch và tối ưu chất xếp hàng hoá 3D cho doanh nghiệp vận tải. App phục vụ tài xế và
nhân viên kho đầy đủ; điều phối viên và quản lý công ty theo dõi chuyến, giám sát và duyệt khi rời bàn làm việc. Việc bàn giấy (lập
chuyến, nhập file, in nhãn, quản trị) nằm ở bản web. App thiết kế cho **điện thoại** trước: chưa có bố cục riêng cho máy tính bảng
(máy tính bảng dùng cùng bố cục, nội dung căn giữa).

React Native + Expo SDK 57 · TypeScript · Expo Router · TanStack Query.

## Trạng thái

23/10/2026:

- Đăng nhập, phiên, phân quyền theo tám vai trò; màn Tài khoản; chuyển ngôn ngữ vi / en. Đăng nhập bằng form email và mật khẩu ngay
  trong app, trên kho mẫu hoặc trên Keycloak của backend (password grant); khi dùng backend có thêm Đặt lại mật khẩu qua mã gửi tới
  email (ba bước, ngay trong màn đăng nhập). Màn lỗi chung khi một màn hỏng lúc vẽ, và màn "Không có màn này" cho địa chỉ lạ.
- Tài xế, đủ luồng trên kho mẫu: "Chuyến của tôi"; màn một chuyến — xuất phát, đã đến điểm, đối chiếu kiện khi dỡ (quét QR, gõ mã,
  xác nhận tay), báo sự cố theo kiện, sự cố trên đường, hoàn tất điểm, tổng kết; gửi vị trí GPS; thông báo.
- Nhân viên kho, đủ luồng trên kho mẫu: tab **Kho** — chuyến theo nhóm (đang xếp, chờ soạn, xếp xong — chờ xuất phát, chờ điều phối
  tối ưu lại); phiên một chuyến — soạn hàng (đối chiếu từng kiện, báo thiếu), xếp theo thứ tự của phương án (thẻ chỉ dẫn, sơ đồ thùng
  2D nhìn từ trên, hướng đặt, báo kiện hỏng), xếp xong và số seal; tab **Tra cứu kiện** (quét hoặc gõ mã, báo đã tìm thấy kiện);
  chuông và màn thông báo. Chưa có: khung 3D (bước xếp dùng sơ đồ 2D), nối backend cho kho.
- Điều phối viên và quản lý công ty, trên kho mẫu: tab **Chuyến hàng** (danh sách theo ngày, tab trạng thái, tìm bỏ dấu; chi tiết
  chuyến chỉ đọc, điều phối viên duyệt xác nhận tay và quyết kiện báo thiếu); tab **Giám sát** (chuyến đang chạy, vị trí và giờ đến
  bằng chữ, sự cố cấp chuyến, tìm tuyến khác, duyệt / từ chối nhận hàng dọc đường; quản lý gia hạn sự cố đã chuyển lên); tab **Tổng
  quan** của quản lý (số liệu theo kỳ, đội xe, chuyến gần đây); chuông của hai vai trò. Tài xế tạo được yêu cầu nhận hàng dọc đường
  (tờ "Thêm" ở màn điểm giao). Chưa có: bản đồ, khung 3D, nối backend cho các màn này.
- Nối backend: đăng nhập (Keycloak + `GET /api/users/me`); tài xế chạy trọn trên máy chủ như bản web — "Chuyến của tôi" đủ bốn
  nhóm, "Xuất phát" ngay ở thẻ chuyến (kho chưa xếp xong thì nút mờ kèm lý do), "Đã đến điểm n", dỡ bằng quét QR hoặc gõ mã (mã QR, mã
  vạch, mã kho, mã bên gửi khi duy nhất), xác nhận tay chờ điều phối viên duyệt, báo sự cố theo kiện, sự cố trên đường, nhận kiện ở điểm
  nhận dọc đường, hoàn tất điểm, vị trí GPS. Giờ đến và tiến độ từng kiện đọc lại từ máy chủ, nên mở lại app vẫn đúng. Máy chủ chưa có:
  thông báo, yêu cầu nhận hàng của tài xế, xác nhận tay ở điểm nhận, số liệu tổng kết chuyến — app ẩn phần đó.
- Ngày 16/10 đã chạy bản debug trên máy ảo Android 16: với kho mẫu — đăng nhập tài xế, xuất phát, đã đến điểm, dỡ kiện bằng gõ mã; với
  backend — bản đăng nhập qua trình duyệt cũ (đã thay bằng form trong app ngày 04/11, chưa chạy lại trên máy). **Chưa** chạy với backend
  thật (đăng nhập trọn vòng, các endpoint của tài xế), chưa kiểm camera QR, GPS thật, điện thoại thật và iOS; hai màn lỗi và toàn bộ
  màn kho thêm sau ngày đó chưa chạy trên máy.

Kiểm thử: 462 test (Jest, 62 suite), lint và kiểm kiểu sạch; đóng gói Android (`expo export`) chạy được.

## Chạy

Cần Node 22 và pnpm 11.

```bash
pnpm install
pnpm start        # dev server cho development build; bấm "a" để mở trên máy ảo Android
pnpm start:go     # dev server cho Expo Go (quét mã QR bằng app Expo Go)
pnpm android      # build bản debug và cài lên máy Android (JDK 17 + Android SDK, xem AGENTS.md)
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
| `EXPO_PUBLIC_HTTP_FEATURES` | Các chức năng đã nối backend khi mặc định là `mock`: `auth`, `driver`, `warehouse`, `monitoring`, `fleet` |
| `EXPO_PUBLIC_API_URL` | Địa chỉ backend |
| `EXPO_PUBLIC_KEYCLOAK_URL`, `_REALM`, `_CLIENT_ID` | Keycloak của backend; bắt buộc khi `auth` dùng backend |
| `EXPO_PUBLIC_GOONG_MAPTILES_KEY` | Khoá map tiles Goong (cùng loại với web). Trống: bản đồ nền trống, vẫn vẽ tuyến |

## Chạy với backend

Cần backend và Keycloak của repo backend chạy trên máy tính (cổng 8080 và 8180).

1. **Client Keycloak cho app** (realm `loadmaster`, client `loadmaster-mobile`): công khai, bật **Direct access grants** (app gửi email
   và mật khẩu từ form của nó tới endpoint token; không cần redirect URI), và mapper audience `loadmaster-api` (loại Audience, thêm vào
   access token) như client `loadmaster-web` — thiếu mapper này backend trả 401 và app báo "Máy chủ không nhận phiên vừa đăng nhập".
   App xin `scope=openid`: không dùng 30 phút (`refresh_expires_in` của realm) là phải đăng nhập lại.
2. **`.env`** (chép từ `.env.example`):

   ```bash
   EXPO_PUBLIC_HTTP_FEATURES=auth,driver,warehouse,monitoring,fleet
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

4. **Chạy bản debug:** `pnpm android` (`expo run:android`; JDK 17 + Android SDK, xem AGENTS.md). Bản release chặn `http://`.

Đăng nhập bằng tài khoản của realm. Tài khoản vai trò `DRIVER` vào màn tài xế và thấy các chuyến được gán cho mình: Đang vận chuyển,
Đang xếp hàng (xuất phát ở thẻ khi kho đã xếp xong) và đã giao gần đây; màn chỉ mở chuyến có trong danh sách của chính tài xế. Chỉ
`auth` (bỏ `driver`): đăng nhập bằng backend, dữ liệu vẫn là kho mẫu của tài khoản dùng thử cùng vai trò.

## Logic dùng chung với bản web

Phần tính toán nghiệp vụ được chép từ repo web bằng script, không viết lại:

```bash
pnpm sync:web          # chép lại (cần repo web nằm cạnh: ../LoadMaster)
pnpm sync:web:check    # bản web đã đổi so với bản đang có chưa
```

Luật viết code của repo: [AGENTS.md](AGENTS.md).
