# AGENTS.md — LoadMaster Mobile

Đọc file này trước khi viết bất kỳ dòng code nào trong repo.

File này là **luật sống**: khi thực tế cho thấy một luật sai hoặc thiếu, sửa luật ở đây cùng lúc với sửa code. Luật mô tả code
đang có, không ghi lịch sử thay đổi — lịch sử nằm ở `docs/progress.md`.

## 1. Sản phẩm và phạm vi

LoadMaster là hệ thống lập kế hoạch và tối ưu chất xếp hàng hoá 3D cho doanh nghiệp vận tải. Repo này là **app mobile**
(Android, iOS; điện thoại và máy tính bảng), viết bằng React Native + Expo. Bản web (repo `LoadMaster_FE`) và app dùng **chung một
backend** (Spring Boot + Keycloak, cộng một service FastAPI cho tối ưu).

App không ôm hết việc bàn giấy. Phạm vi theo vai trò (tám vai trò, mã ở `src/types/user.ts`):

| Vai trò | Trên app | Ghi chú |
|---|---|---|
| Tài xế (`driver`) | Đầy đủ | Điện thoại ngoài trời: nắng, một tay, mạng yếu |
| Nhân viên kho (`warehouse`) | Đầy đủ | Máy tính bảng tại kho: đeo găng, nhìn xa, một thao tác mỗi màn |
| Điều phối viên (`dispatcher`) | Chuyến, giám sát, duyệt, thông báo, xem 3D | Lập chuyến, nhập file, chỉnh tay phương án ở lại web |
| Quản lý công ty (`manager`) | Chuyến, giám sát, số liệu, thông báo, xem 3D | Chỉ đọc, như web |
| Quản trị công ty, ba vai trò nền tảng | Chỉ màn Tài khoản | Việc của họ ở web |

Màn nào đã có, màn nào chưa: xem `docs/progress.md`. Vai trò chưa có màn làm việc vẫn đăng nhập được và thấy màn Tài khoản kèm
một câu nói rõ (`features/auth/landing.ts`).

**Trạng thái dữ liệu:** mặc định app chạy trên **kho dữ liệu mẫu trong máy** (cùng logic và seed với bản web). Kho mẫu không thay
backend: bản web và máy khác không thấy gì trong đó. Mỗi feature nối backend riêng, khi backend có phần đó (mục 5). Đã nối được:
đăng nhập (`auth`, Keycloak của backend — mục 6) và màn tài xế (`driver`, phần backend đã có; việc backend chưa có thì màn ẩn nút).
Cách chạy với backend: README.

Luật chung, giữ từ bản web:

- Giao diện **tiếng Việt**, chuyển được sang tiếng Anh; tiếng Việt là nguồn chuẩn của từ điển.
- Đơn vị nghiệp vụ: **cm và kg**; không trộn đơn vị trong state và payload.
- Mọi kết quả đến từ mock tối ưu mang nhãn **MOCK RESULT** (không dịch). Không có chữ kiểu "AI optimized".
- **Không nút giả, không số bịa:** không hiện nút hay mục chưa có chức năng; mọi con số trên màn truy được về dữ liệu.
- Không dùng màu tím ở đâu trong app; "đang chạy" dùng xanh lam (`azure`).

## 2. Tech stack

Dùng **pnpm**. Version khoá trong lockfile; không tự nâng major, không tự nâng Expo SDK.

```
expo SDK 57 · react-native 0.86 · react 19 · typescript (strict)
expo-router                 — điều hướng theo file, route ở src/app
@tanstack/react-query       — đọc / ghi dữ liệu, cache
react-hook-form + zod v4    — mọi form
lucide-react-native         — icon, không dùng bộ khác (nét 1,5; cỡ 20 / 24)
expo-secure-store           — phiên đăng nhập, ngôn ngữ (không lưu dữ liệu nghiệp vụ)
expo-crypto                 — polyfill crypto.getRandomValues cho logic chép từ web
expo-auth-session           — đăng nhập Keycloak (PKCE); CHỈ import trong features/auth/keycloak-oauth.ts
expo-camera                 — quét mã QR trên nhãn kiện
expo-location               — vị trí xe khi tài xế bật GPS
jest-expo + @testing-library/react-native v14 — test
```

**Không dùng:** Redux, Zustand, thư viện i18n, axios (chỉ `fetch` trong `src/data/http`), moment, bộ UI kit, NativeWind / Tailwind
(giao diện viết bằng `StyleSheet` + token ở `src/theme/tokens.ts`).

### Expo đổi theo từng SDK — đừng tin trí nhớ

Expo có thay đổi phá vỡ ở mỗi bản SDK: API bạn nhớ có thể đã đổi tên, đổi chỗ hoặc bị gỡ. Trước khi viết code đụng tới API của
Expo, EAS hay React Native:

1. Đọc số major của `expo` trong `package.json`.
2. Đọc tài liệu đúng bản: `https://docs.expo.dev/versions/v<major>.0.0/`.
3. Ngoài ra, mở `https://docs.expo.dev/llms.txt` (mục lục toàn bộ tài liệu) rồi theo liên kết tới đúng trang. Không trả lời từ trí nhớ.

Khi tài liệu chưa rõ, đọc khai báo kiểu trong `node_modules/<gói>/build/*.d.ts` của đúng bản đang cài.

### Lệnh

```bash
pnpm expo install <gói>   # LUÔN dùng lệnh này để thêm gói — nó chọn bản hợp với SDK; gói dev: thêm "-- --save-dev"
pnpm start                # dev server (quét mã bằng Expo Go, hoặc bấm a / w)
pnpm web                  # xem thử trên trình duyệt — chỉ để dev, không phải sản phẩm
pnpm check                # dấu file chép từ web + lint + kiểm kiểu + test: chạy trước khi báo xong việc
pnpm sync:web             # chép lại logic từ bản web (mục 4)
pnpm dlx expo-doctor      # kiểm cấu hình và version các gói
```

- `pnpm-workspace.yaml` đặt `nodeLinker: hoisted` (thư mục `node_modules` phẳng). **Không bỏ:** với cấu trúc lồng mặc định của pnpm,
  đường dẫn file khi biên dịch phần native vượt 260 ký tự và build Android trên Windows hỏng ở bước `ninja`
  ("manifest 'build.ninja' still dirty").
- Thư mục `android/`, `ios/` không có trong repo: chúng được sinh ra khi build (Continuous Native Generation). Không tạo hay sửa
  tay — cấu hình native đặt ở `app.json` và config plugin.
- Expo Go chỉ chạy được module native nó có sẵn. Thêm thư viện có code native (bản đồ, GPS chạy nền, thông báo đẩy…) thì app cần
  **development build** (`eas build --profile development`), và phải ghi điều đó vào issue của việc thêm thư viện.
- Build và phát hành dùng EAS (`pnpm dlx eas-cli@latest <lệnh>`): build iOS không cần máy Mac.

### Xuất file APK

Hai đường, cùng ra một file cài được lên máy Android:

```bash
# 1. Trên cloud của Expo (cần tài khoản Expo; không cần Android Studio)
pnpm dlx eas-cli@latest build --platform android --profile preview     # hồ sơ "preview" ở eas.json: buildType apk

# 2. Trên máy (cần JDK 17 và Android SDK: platform 36, build-tools 36.0.0, NDK 27.1; JAVA_HOME và ANDROID_HOME đã đặt)
pnpm exec expo prebuild --platform android      # sinh thư mục android/ (không commit); lệnh này đổi script trong package.json — đừng commit phần đó
cd android && ./gradlew assembleRelease          # → android/app/build/outputs/apk/release/app-release.apk
```

- Bản build trên máy ký bằng khoá debug của mẫu dự án: cài thử được, **không** nộp lên store được. Khoá phát hành do EAS giữ.
- Thêm `-PreactNativeArchitectures=arm64-v8a` khi chỉ cần chạy trên điện thoại thật (file nhỏ hơn, build nhanh hơn); máy ảo trên
  máy tính cần thêm `x86_64`.
- JDK 24 không dùng được cho build Android; phải là JDK 17.
- Tên gói `com.loadmaster.mobile` ở `app.json` là giá trị tạm: đổi tự do trước lần đầu lên store, sau đó không đổi được.
- **Expo Go không phải cách chạy chính của dự án.** Bản Expo Go trên store không phải lúc nào cũng theo kịp SDK mới nhất, và nó
  không chạy được thư viện native ngoài bộ có sẵn. Chạy trên máy bằng bản APK ở trên hoặc development build.

## 3. Cấu trúc thư mục

```
src/
  app/                 route của Expo Router — MỎNG: mỗi file chỉ export màn lấy từ features/
    _layout.tsx        provider + hai nhóm route theo phiên (sign-in | (app))
    +native-intent.tsx địa chỉ Keycloak trả phiên về (`loadmaster://auth`) không mở màn nào
    (app)/_layout.tsx  Stack: thanh tab `(tabs)` và các màn mở chồng có lối quay lại (`trip/[tripId]`, `notifications`), sau quyền
    (app)/(tabs)/      thanh tab đáy; mỗi tab nằm sau quyền của nó
  features/<tên>/      màn, component, hook, <tên>-api.ts của một feature
    auth/              đăng nhập (kho mẫu, Keycloak), phiên, quyền, màn Tài khoản
    driver/            màn của tài xế: chuyến của tôi, một chuyến (điểm giao, dỡ, hoàn tất, sự cố, GPS), tổng kết, thông báo;
                       adapter driver-mock.ts (kho mẫu) và driver-http.ts (backend)
    notifications/     ← chép từ web: sự kiện nào báo cho ai
    viewer3d/          ← chép từ web: phần thuần (kiện theo điểm giao, thứ tự dỡ) — không có Three.js
  components/          component dùng từ hai feature trở lên: AppText, Button, IconButton, TextField, Screen, Card, Chip,
                       ChoiceGroup, Sheet, Banner, StateView, LanguageSwitch, TripStatus, StopDot
  data/                lớp dữ liệu (mục 5): config.ts, adapter.ts, mock-db.ts, http/
  theme/tokens.ts      màu, khoảng cách, bo góc, thang chữ
  lib/
    i18n/              từ điển vi/en và hạ tầng dịch
    format.ts          số, đơn vị, ngày giờ theo ngôn ngữ
    storage.ts         nơi lưu nhỏ của app (kho khoá của máy)
    mock-db/           ← chép từ web
  domain/              ← chép từ web: logic nghiệp vụ thuần (hình học, ràng buộc, tuyến, vùng, nhận dọc đường…)
  services/optimization/ ← chép từ web (trừ phần Web Worker)
  types/               ← chép từ web
  providers/           Providers.tsx: mọi provider của app
  polyfills.ts         nạp đầu tiên ở src/app/_layout.tsx
  test/                setup.ts (giả module native), render.tsx (vẽ màn trong đủ provider), native-mocks.ts (camera, vị trí,
                       router giả), driver-flow.tsx (chuyến mẫu của tài xế)
  web-mirror.json      danh sách file chép từ web và dấu nội dung của chúng
scripts/
  sync-from-web.mjs    chép logic từ bản web
  web-overrides/       file mobile viết đè lên bản web (cùng đường dẫn)
docs/                  PRD, issue, nhật ký, ảnh chụp — KHÔNG commit (mục 10)
```

Mỗi feature tự chứa màn, hook và lớp dữ liệu của nó. Chỉ đưa lên `components/`, `lib/` khi có từ hai feature trở lên dùng.
File có logic không dài quá 250 dòng; từ điển và dữ liệu phẳng được dài hơn.

## 4. Code chép từ bản web

Phần logic thuần của web được **chép nguyên văn** sang đây bằng `pnpm sync:web`, để app và web tính cùng một kết quả mà không viết
hai lần. Bản web là nguồn chuẩn.

- Danh sách file nằm ở `src/web-mirror.json`: `src/domain`, `src/types`, `src/services/optimization`, `src/lib/mock-db`, cùng các file
  lẻ khai ở `MIRRORED_FILES` của `scripts/sync-from-web.mjs` — quyền và hồ sơ backend (`features/auth/permissions.ts`,
  `backend-user.ts`), phần thuần của màn tài xế (`features/driver/`: tiến độ giao, giờ đến, hoàn tất điểm, form sự cố…), của viewer
  3D và chuông, `lib/stops.ts`, `lib/calendar-date.ts`, `lib/i18n/types.ts` và các nhánh từ điển `dataErrors`, `issues`, `language`,
  `roles`, `status`.
- **Không sửa các file đó ở mobile.** Cần đổi thì sửa ở bản web (qua quy trình của web), rồi chạy `pnpm sync:web`.
  `pnpm sync:web:verify` (nằm trong `pnpm check` và CI) đỏ khi có file trong danh sách bị sửa tay.
- Thêm một file logic thuần của web vào app: thêm đường dẫn vào `MIRRORED_FILES` của `scripts/sync-from-web.mjs`, không chép tay.
  Chỉ chép file **không import React, DOM, router hay component** của web.
- Web dùng thứ Hermes không có (`import.meta`, Web Worker, `BroadcastChannel`): file như vậy bị bỏ qua (`SKIPPED_FILES`), hoặc
  mobile viết bản riêng ở `scripts/web-overrides/<cùng đường dẫn>`.
- `pnpm sync:web:check` cho biết bản web đã đổi so với bản đang có chưa (cần repo web nằm cạnh: `../LoadMaster`, hoặc biến
  `WEB_SRC`). Sau mỗi lần chép lại: chạy `pnpm check`.
- Code của mobile **được** import từ các thư mục đó (`@/domain/...`, `@/lib/mock-db`); chiều ngược lại không bao giờ có.

Test của phần logic này chạy ở bản web. Ở đây chỉ có test chứng minh nó chạy được trong bộ công cụ của app (`data/mock-db.test.ts`).

## 5. Lớp dữ liệu: kho mẫu hôm nay, backend về sau

Đây là luật quan trọng nhất của repo: nó quyết định việc nối backend sau này chỉ là **thêm adapter**, không sửa màn.

```
màn / component  →  hook Query của feature  →  features/<tên>/<tên>-api.ts  →  adapter mock  →  src/data/mock-db.ts (kho mẫu)
                                                                             →  adapter http  →  src/data/http (backend)
```

1. **Màn chỉ gọi hook.** Hook chỉ gọi hàm của `-api.ts`. Không component nào gọi `getMockDb()`, `api()` hay `fetch`.
2. **`-api.ts` khai một hợp đồng** (`type DriverApi = { … }`) bằng kiểu của app (`src/types`, `@/lib/mock-db`), không bằng DTO của
   backend. Hai adapter cùng thoả hợp đồng đó; chọn adapter bằng `createAdapter('<feature>', { mock, http })`.
3. **Adapter `http` đổi DTO của backend sang kiểu của app** ngay tại chỗ (hàm `fromDto` trong cùng feature). Kiểu DTO không đi ra
   khỏi adapter. Mã vai trò của backend đổi qua `BACKEND_ROLE_CODES`.
4. **Nguồn theo từng feature** (`src/data/config.ts`): `EXPO_PUBLIC_DATA_SOURCE` là mặc định, `EXPO_PUBLIC_HTTP_FEATURES` liệt kê
   feature đã nối backend. Backend chưa có đủ mọi phần nên app nối dần; feature chưa có adapter `http` mà bị chọn `http` thì báo lỗi
   `HTTP_NOT_WIRED`, **không** âm thầm dùng kho mẫu. Feature mới: thêm tên vào `FEATURES`.
5. **Mọi lỗi mang mã + tham số**: `MockDbError` (kho mẫu) và `ApiError` (backend) hiện bằng cùng một hàm `dataErrorMessage(error, t)`.
   Mã nghiệp vụ trùng tên giữa hai nguồn dùng chung câu ở nhánh `dataErrors`; lỗi mạng / phiên / máy chủ ở nhánh `apiErrors`.
   Không hiện thông điệp thô của máy chủ.
6. **Chỉ `src/data/http/api-client.ts` gọi `fetch`.** Nó gắn token của phiên, giới hạn thời gian, mở phong bì
   `{ success, code, message, data, errors }` của backend và báo cho `AuthProvider` khi backend trả 401.
7. **Lọc theo công ty và kiểm quyền là việc của nguồn dữ liệu** (kho mẫu làm như server; backend làm thật). Màn không tự lọc theo
   công ty. Ẩn nút theo quyền (`useCan`) chỉ là lớp giao diện.
8. Mỗi hàm export của `-api.ts` có một dòng chú thích ghi endpoint ngay trên nó (`// GET /api/driver/trips`), đầu file có bảng
   hàm → endpoint; endpoint backend chưa có ghi "chưa có ở BE". Chú thích chỉ gồm phương thức + đường dẫn và nhãn ngắn — không chép
   luật nghiệp vụ hay nội dung tài liệu nội bộ vào code.
9. Khoá Query của một feature nằm dưới tên feature (`['driver', …]`). Khoá không cần mang người dùng: `AuthProvider` xoá sạch
   cache lúc đăng nhập và đăng xuất. Ghi dữ liệu bằng `useMutation` rồi làm mới khoá liên quan.
10. Không thêm store phía client cho dữ liệu nghiệp vụ. Không lưu dữ liệu nghiệp vụ vào `expo-secure-store`.
11. **Hợp đồng nói nguồn làm được gì** (`capabilities`, ví dụ `DriverCapabilities`). Việc nguồn chưa làm được (backend chưa có
    endpoint, vai trò chưa có quyền ở backend) thì màn **ẩn** nút — không nút giả; gọi tới vẫn là lỗi `NOT_SUPPORTED`, không âm thầm bỏ
    qua. Backend thêm endpoint: viết hàm ở adapter `http` rồi bật cờ, màn không đổi.
12. Backend chưa gắn mã vào lỗi nghiệp vụ (về tay là `SERVER_ERROR` kèm mã HTTP). Adapter `http` đổi lỗi **chưa có mã** sang mã của
    app theo từng lệnh (409 lúc dỡ = kiện đã dỡ…) bằng `uncoded(error, status)`, câu ở nhánh `backendErrors`; lỗi đã có mã đi thẳng.
    Backend gắn mã rồi thì bỏ phép đổi đó.
13. Endpoint cần mã người dùng (backend hiện nhận mã tài xế ở tham số) đọc `currentUserId()` của `src/data/http`, nối với
    `backendUserId()` của adapter đăng nhập — **không** đọc từ state React: query của màn con chạy trước effect của `AuthProvider`.
14. Điều màn cần mà backend chưa trả (kiện nào của điểm đã dỡ, chuyến vừa giao xong) thì adapter `http` giữ trong bộ nhớ của lần mở
    app, theo người đang đăng nhập — đổi người là xoá; không cất xuống máy.

Trước khi viết adapter `http` cho một feature: đọc controller và DTO thật ở repo backend (nhánh `develop`), không đoán dạng dữ
liệu. Backend lệch với hợp đồng của app thì ghi vào issue và hỏi nhóm backend, không uốn màn theo.

## 6. Đăng nhập và phân quyền

- `features/auth/auth-adapter.ts` là hợp đồng đăng nhập, hai kiểu: `password` (app có form — kho mẫu) và `redirect` (mở trang đăng
  nhập của máy chủ định danh — Keycloak của backend). Màn đăng nhập vẽ theo `kind`; phần còn lại của app chỉ biết `useAuth()`.
- Phiên cất trong kho khoá của máy (`expo-secure-store`) dưới dạng một chuỗi do adapter quyết định. Token không bao giờ nằm trong
  state của màn, log hay cache Query.
- Ma trận quyền chép từ web (`features/auth/permissions.ts`): hỏi quyền bằng `useCan()`. Tab và route làm việc nằm sau quyền
  (`Tabs.Protected` / `Stack.Protected`); backend vẫn kiểm lại ở máy chủ.
- Sau khi đăng nhập mở màn của vai trò (`landingOf`). Màn đó phải là màn vai trò mở được.
- Danh sách tài khoản dùng thử chỉ hiện khi feature `auth` chạy trên kho mẫu.
- Khoá cất phiên (`SESSION_KEY`), `backendUserId()` và mã `SIGN_IN_CANCELLED` khai ở `auth-adapter.ts`.

### Đăng nhập bằng Keycloak (`auth` dùng backend)

- `keycloak-oauth.ts` là nơi duy nhất nói chuyện với Keycloak: Authorization Code + PKCE S256, scope `openid offline_access`, luôn
  hỏi lại mật khẩu (`prompt=login`; iOS còn dùng phiên trình duyệt riêng). Keycloak trả về `loadmaster://auth` (`AUTH_REDIRECT_PATH`);
  `app/+native-intent.tsx` không để router mở màn nào cho địa chỉ đó. Mỗi lệnh tới Keycloak tối đa 15 giây.
- `keycloak-auth.ts` giữ phiên, không import thư viện Expo nào (test bằng client giả). Token chỉ nằm trong bộ nhớ; chuỗi cất là
  `{ v: 1, refreshToken, profile }`. Token còn dưới 20 giây thì làm mới; các lượt gọi cùng lúc chung một lần làm mới; refresh token mới
  được cất lại. Keycloak không nhận refresh token nữa → `UNAUTHENTICATED`, app đăng xuất; không tới được Keycloak → lỗi mạng, giữ phiên.
  Mở app lúc mất sóng thì vào bằng hồ sơ đã cất.
- Hồ sơ `GET /api/users/me` đổi sang người dùng của app bằng `backend-user.ts` (chép từ web). Vai trò app chưa biết: `ROLE_UNKNOWN`;
  tài khoản bị khoá: `ACCOUNT_SUSPENDED`; backend trả 401 cho token vừa cấp: `SIGN_IN_REJECTED` (địa chỉ Keycloak của app khác địa chỉ
  backend tin, hoặc client thiếu audience `loadmaster-api`). Bị từ chối thì phiên vừa mở ở Keycloak được đóng luôn.
- Đóng trang đăng nhập không phải lỗi: `signIn` ném `SIGN_IN_CANCELLED`, màn không báo gì.
- Đăng xuất quên phiên **ngay** (trước `await` đầu tiên, để lượt làm mới đang chạy không cất lại phiên), rồi gọi endpoint logout của
  Keycloak bằng refresh token. Không dùng endpoint thu hồi token: thu hồi refresh token cắt phiên của client đó trên mọi máy.
- `auth` dùng backend mà feature khác còn ở kho mẫu: kho mẫu mở phiên của tài khoản dùng thử **cùng vai trò** — mã, công ty, kho của
  người dùng là của tài khoản mẫu, tên và email của backend; `backendUserId()` vẫn là mã backend.

## 7. Giao diện

Token ở `src/theme/tokens.ts`, lấy đúng giá trị của bản web (V2.3 "Cyan kính"). Không viết mã màu, cỡ chữ, bo góc rời trong component.

- **Vùng chạm tối thiểu 56** (`TOUCH`) cho mọi nút, ô nhập, dòng bấm được, tab.
- **Chữ nội dung tối thiểu 16.** Cỡ 14 (`meta`) chỉ cho chip, nhãn tab, mốc thời gian. Chữ dùng `AppText` với `variant`.
- **Mỗi màn đúng một nút `primary`.** Việc khác dùng `secondary`; trên dải trời dùng `skySolid`.
- Nút chính nền đặc cyan, chữ tối (`onPrimary`). Nhấn chỉ đổi màu nền: không phóng to, không nhấc lên.
- **Dải trời** đầu màn (`Screen`): nền tối đặc, tiêu đề là header của màn và chỉ chứa chữ tiêu đề. Điều khiển trên dải trời nền
  đặc — **không kính, không blur** (chưa đo tương phản ngoài nắng). Không gradient.
- Card nền trắng, viền 1 px, bóng rất nhẹ (`shadow.card`); không nâng card khi nhấn.
- Màu luôn đi kèm chữ hoặc icon: chip trạng thái có chữ, điểm giao có số. Tám màu điểm giao chỉ dùng cho điểm giao.
- Không emoji, không viết hoa toàn bộ, không giãn chữ trang trí. Độ đậm chữ: 400, 500, 600 (tiêu đề được 700).
- **Máy tính bảng:** nội dung dừng ở `CONTENT_MAX_WIDTH`, căn giữa; lề nằm trong cột để tiêu đề và thẻ thẳng một mép.
- Luôn chừa vùng an toàn (tai thỏ, thanh điều hướng của máy) bằng `useSafeAreaInsets`.
- Hành động bị chặn vì luật hiện mờ kèm lý do ngay tại chỗ, không để bấm rồi mới báo lỗi.
- Hộp thoại là **tờ trượt từ đáy** `Sheet`: tiêu đề là header của tờ, nội dung cuộn, hàng nút ở `footer` (dính đáy, trong tầm ngón
  cái); `busy` khi đang ghi thì tờ không đóng được.
- Mọi `ScrollView` / `SectionList` chứa ô nhập **hoặc chứa một `Sheet`** đặt `keyboardShouldPersistTaps="handled"` (`Screen` đã đặt).
  Lần chạm đi theo cây React xuyên qua `Modal`: thiếu nó thì khi bàn phím đang mở, mọi nút của tờ trượt phải bấm hai lần — lần đầu
  chỉ đóng bàn phím. Jest không bắt được lỗi này, chỉ thấy trên máy.
- Icon của nút đặt bằng `icon` / `trailingIcon` của `Button` (Lucide), không đặt trong `children` — chữ của nút nằm trong một `Text`.
  Nút chỉ có icon dùng `IconButton` (56 × 56, `label` là tên đọc được).
- Màn đọc dữ liệu có đủ ba trạng thái: đang tải, lỗi kèm nút thử lại, chưa có gì (`StateView`). Danh sách kéo xuống để đọc lại.
- Chuyển động ngắn (dưới 300 ms), tôn trọng cài đặt giảm chuyển động của máy.

### Khả năng truy cập

- Mọi điều khiển có `accessibilityRole` và tên đọc được (`accessibilityLabel` khi chữ trên nút không đủ nghĩa).
- Ô nhập: tên truy cập là chữ nhãn; lỗi hiện dưới ô với `accessibilityRole="alert"`.
- Lỗi và cảnh báo vừa xuất hiện được trình đọc màn hình đọc (`accessibilityLiveRegion`).
- Mỗi màn có lối quay lại hoặc lối thoát nhìn thấy được.

## 8. Ngôn ngữ

- Chuỗi hiển thị viết qua `t()` (`useT()`), kể cả `accessibilityLabel`. Số, đơn vị, ngày giờ qua `useFormat()` — không tự nối chuỗi số.
- Từ điển ở `src/lib/i18n/vi/<nhánh>.ts` và `en/<nhánh>.ts`; `en` khai `satisfies Dictionary<…>` nên thiếu hoặc thừa key là lỗi kiểm
  kiểu. Màn mới thêm nhánh bằng file mới và một dòng ghép ở `vi.ts`, `en.ts`. Mỗi nhánh có chú thích nói nó phục vụ màn nào.
- Năm nhánh chép từ web (mục 4) không sửa ở đây.
- Câu số nhiều là object `{ one, other }` với `{count}`; hai dạng của câu tiếng Việt giống hệt nhau.
- Không dịch: **MOCK RESULT**, LoadMaster, tên riêng trong dữ liệu.
- Logic thuần trả mã, component dịch. Schema zod dùng key từ điển làm message.
- Hermes **không có** `Intl.PluralRules`, `Intl.ListFormat`, `Intl.RelativeTimeFormat`, `Intl.Segmenter` (đã đo trên máy):
  `translate.ts` tự chọn dạng số nhiều, `format.ts` tự ghép danh sách. Đừng gọi bốn thứ đó trực tiếp. `Intl.NumberFormat` (kể cả đơn
  vị, tiền) và `Intl.DateTimeFormat` dùng được.

## 9. Kiểm thử

`pnpm test` chạy Jest (`jest-expo`): `src/**/*.test.ts(x)`.

- Test qua hành vi người dùng: tìm bằng role và tên (`findByRole('button', { name })`), không bằng testID hay cấu trúc cây.
- `@testing-library/react-native` v14 **bất đồng bộ**: `await renderApp(...)`, `await fireEvent.press(...)`. Quên `await` là lỗi
  "overlapping act() calls".
- Vẽ màn bằng `renderApp` (`src/test/render.tsx`) để có đủ provider; đầu mỗi test gọi `resetMockDb()` và `clearStored()`.
- Giá trị kỳ vọng lấy từ nguồn độc lập (kho mẫu, chữ trong từ điển), không tính lại theo cách code tính.
- Mỗi adapter `http` có test với `fetch` giả: đường dẫn, phong bì, đổi DTO, mã lỗi (`driver-http.test.ts` định tuyến backend giả theo
  `"PHƯƠNG THỨC đường dẫn"`).
- Màn dùng camera, vị trí, router: `src/test/native-mocks.ts` thay module native (nối ở `setup.ts`); test điều khiển bằng
  `setCameraPermission`, `setLocation`, `emitPosition`, `failPosition`… Luồng tài xế: `src/test/driver-flow.tsx` (`renderTrip`, chuyến
  mẫu đã xếp xong `TRIP-010`, `labelsAt`, `departLoadedTrip`…) đưa chuyến tới đúng bước bằng hàm của kho; chỉ bấm qua màn đúng việc
  đang test.
- Jest bật `clearMocks`: số lần gọi của `jest.fn` về 0 trước mỗi test.
- Hạn mức: test đúng việc của issue; không viết test trùng với test đã có ở bản web cho logic chép sang.
- Jest chạy trên Node, **không phải Hermes**: nó không chứng minh được hiệu năng, `Intl` của máy, bàn phím ảo, camera, GPS. Việc như
  vậy ghi vào danh sách "chưa kiểm trên thiết bị" ở `docs/progress.md` và không được báo là đã kiểm.
- **Hermes thiếu một số hàm JavaScript mới mà Node có** — đã gặp: 31 test xanh nhưng đăng nhập hỏng trên máy vì thiếu
  `Array.prototype.toSorted`. Danh sách đã đo và các bản bù nằm ở `src/polyfills.ts`; `Object.groupBy`, `Array.fromAsync` không có
  và không được bù — đừng dùng. Việc đụng tới logic chạy lúc mở app hoặc đăng nhập phải được chạy thử trên máy (bản APK) trước khi
  báo xong.
- Lỗi không mang mã (lỗi lập trình, máy thiếu tính năng) hiện câu chung cho người dùng và được ghi vào nhật ký của máy
  (`adb logcat -s ReactNativeJS`, dòng `[LoadMaster] lỗi không có mã`).
- `pnpm web` + trình duyệt chỉ để xem bố cục nhanh; không thay cho chạy trên máy thật.

## 10. Git và bộ mặt repo

- Trước commit đầu tiên ở mỗi bản checkout: kiểm `git config user.email`. Repo ký bằng `tankhang6a6@gmail.com`.
- Commit theo Conventional Commits, tiếng Việt, chỉ nói việc đã làm và vì sao. **Không** dòng đồng tác giả, không tên công cụ,
  không "Generated with". Tên nhánh đặt theo việc.
- Nhánh: `main` (bản đã nghiệm thu, vào bằng PR), `developer` (phát triển hằng ngày), `feat/**`, `fix/**` (một việc một nhánh, gộp
  về `developer` rồi xoá). CI (`.github/workflows/ci.yml`) chạy cho cả bốn kiểu; thêm kiểu tên nhánh mới thì thêm vào trigger.
- **`docs/` nằm trong `.gitignore`**: PRD, issue, nhật ký, ảnh chụp chỉ lưu trên máy. Test và script chỉ được ghi vào `docs/`,
  không đọc từ đó. Không chép nội dung tài liệu nội bộ vào commit, PR hay chú thích trong code.
- Gốc repo chỉ giữ file cấu hình, `README.md`, `AGENTS.md`, `CLAUDE.md`. Tài liệu mới đặt trong `docs/`.
- `.env*` không commit, trừ `.env.example`. Khoá và mật khẩu không bao giờ nằm trong repo.
- Tài liệu không dẫn chứng bằng mã commit: dẫn bằng mã issue, ngày, tên file hoặc tên test.
- Mỗi việc xong: ghi kết quả vào issue của nó và thêm một mục có ngày vào `docs/progress.md`.

## 11. Làm việc tiết kiệm

- Trạng thái code hiện tại là nguồn chuẩn. Đọc đúng phần liên quan; không đọc lại cả repo.
- Không refactor ngoài phạm vi issue; không thêm abstraction hay thư viện khi chưa có nhu cầu đã chứng minh.
- Dùng lại component và hàm đã có trước khi viết mới. Trước khi viết một phép tính nghiệp vụ, tìm nó trong `src/domain` và
  `src/lib/mock-db` — phần lớn đã có ở đó.
- `pnpm check` chạy một lần cuối việc, không lặp lại sau từng thay đổi nhỏ.
