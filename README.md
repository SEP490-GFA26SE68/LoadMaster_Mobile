# LoadMaster Mobile

App di động của LoadMaster — hệ thống lập kế hoạch và tối ưu chất xếp hàng hoá 3D cho doanh nghiệp vận tải. App phục vụ tài xế
(điện thoại) và nhân viên kho (máy tính bảng) đầy đủ; điều phối viên và quản lý công ty theo dõi chuyến, giám sát và duyệt khi rời
bàn làm việc. Việc bàn giấy (lập chuyến, nhập file, quản trị) nằm ở bản web.

React Native + Expo SDK 57 · TypeScript · Expo Router · TanStack Query.

## Trạng thái

Bản nền (09/10/2026):

- Đăng nhập, phiên, phân quyền theo tám vai trò; màn Tài khoản; chuyển ngôn ngữ vi / en.
- Tài xế: danh sách "Chuyến của tôi" (chỉ đọc).
- Dữ liệu: **kho mẫu trong máy**, cùng logic và seed với bản web. App chưa nối backend; lớp dữ liệu đã tách sẵn để nối từng
  chức năng một.
- Đã build file APK và chạy trên máy ảo Android 16 (đăng nhập, chuyến của tài xế, tài khoản). Chưa chạy trên điện thoại thật và iOS.

Kiểm thử: 31 test (Jest), lint và kiểm kiểu sạch, `expo-doctor` 21 / 21.

## Chạy

Cần Node 22 và pnpm 11.

```bash
pnpm install
pnpm start        # dev server; bấm "a" để mở trên máy ảo Android
pnpm web          # xem thử trên trình duyệt (chỉ để dev)
pnpm check        # lint + kiểm kiểu + test
```

Đăng nhập bằng một tài khoản trong danh sách "Tài khoản dùng thử" ở màn đăng nhập.

Xuất file APK để cài lên điện thoại: xem mục "Xuất file APK" trong [AGENTS.md](AGENTS.md).

## Nguồn dữ liệu

Chép `.env.example` thành `.env` khi cần đổi. Mặc định mọi chức năng dùng kho mẫu:

| Biến | Nghĩa |
|---|---|
| `EXPO_PUBLIC_DATA_SOURCE` | `mock` (mặc định) hoặc `http` cho mọi chức năng |
| `EXPO_PUBLIC_HTTP_FEATURES` | Các chức năng đã nối backend khi mặc định là `mock`, ví dụ `auth,driver` |
| `EXPO_PUBLIC_API_URL` | Địa chỉ backend |

## Logic dùng chung với bản web

Phần tính toán nghiệp vụ được chép từ repo web bằng script, không viết lại:

```bash
pnpm sync:web          # chép lại (cần repo web nằm cạnh: ../LoadMaster)
pnpm sync:web:check    # bản web đã đổi so với bản đang có chưa
```

Luật viết code của repo: [AGENTS.md](AGENTS.md).
