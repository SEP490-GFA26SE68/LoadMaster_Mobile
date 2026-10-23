/**
 * Token giao diện của app, lấy đúng giá trị của bản web (V2.3 "Cyan kính", `src/index.css` của web). Mọi màu, khoảng cách, bo góc
 * trong component lấy từ đây — không viết mã màu trong component.
 */

const cyan = {
  50: '#e7fcfd',
  100: '#cbf7f9',
  200: '#9bedf2',
  300: '#5cdbe6',
  400: '#00c3d4',
  500: '#00a9bb',
  600: '#008a9d',
  700: '#006f81',
  800: '#005464',
  900: '#063a48',
  950: '#02222d',
} as const

const neutral = {
  0: '#ffffff',
  25: '#f8fcfd',
  50: '#f2f8f9',
  100: '#e7eff1',
  200: '#d9e4e7',
  300: '#c6d4d8',
  400: '#9badb3',
  500: '#70848b',
  600: '#52676f',
  700: '#394d54',
  800: '#213239',
  900: '#0e1c21',
} as const

const amber = { 50: '#fff6e1', 200: '#fbd98f', 500: '#faab35', 700: '#9d580c' } as const
const azure = { 50: '#ecf3ff', 200: '#c2d6fa', 500: '#3a78e6', 700: '#1d4fae' } as const
const green = { 50: '#e5faeb', 200: '#b2ebc3', 500: '#36ac62', 700: '#156f41' } as const
const red = { 50: '#ffefed', 200: '#f8c3be', 500: '#db4241', 700: '#b02a2d' } as const

export const palette = { cyan, neutral, amber, azure, green, red } as const

export const colors = {
  /** Nền thẻ, hộp thoại */
  bg: neutral[0],
  surface: neutral[25],
  /** Nền vùng làm việc dưới dải trời */
  app: neutral[50],
  border: neutral[200],
  lineSoft: neutral[100],
  /** Viền ô nhập */
  lineStrong: '#8398a0',

  text: neutral[900],
  text2: neutral[700],
  text3: neutral[600],
  textDisabled: neutral[400],

  /** Chữ và đường: liên kết, ô đang chọn. Không tô nền nút bằng màu này. */
  primary: cyan[700],
  primaryBg: cyan[50],
  /** Nền nút chính (web dùng gradient 2ED6E4 → cyan-400; app dùng màu đặc) */
  primaryFill: cyan[400],
  primaryFillPressed: cyan[500],
  primaryFillBorder: '#00b5c6',
  onPrimary: cyan[950],

  success: green[700],
  warning: amber[700],
  danger: red[700],
  dangerPressed: '#8e2224',

  /** Dải trời đầu màn: nền tối, điều khiển nền đặc (không kính) */
  sky: cyan[950],
  skyEnd: '#053341',
  skyText: neutral[0],
  skyText2: 'rgba(231, 252, 253, 0.72)',
  skySolid: cyan[900],
  skySolidPressed: cyan[800],
  skySolidBorder: cyan[600],
  /** Vòng focus trên nền tối */
  skyFocus: cyan[300],
  /** Ô chưa tới của dải tiến độ theo điểm trong dải trời (web: `bg-white/20`) */
  skyTrack: 'rgba(255, 255, 255, 0.2)',

  focus: cyan[500],

  /** Kiện "Hiện tại" — kiện đang xếp — trên nền tối (web: `--highlight`). Chữ đặt lên màu này phải tối: trắng chỉ 1,5:1. */
  highlight: '#f7cf40',

  /** Lớp phủ dưới tờ trượt từ đáy */
  scrim: 'rgba(2, 34, 45, 0.5)',
} as const

/**
 * Sáu tông của chip trạng thái và khung nhấn (nền, chữ, viền). Không có tím: "đang chạy" dùng xanh lam (azure). Màu định danh điểm giao
 * không nằm ở đây: `@/lib/stops` (chép từ web).
 */
export const badgeTones = {
  neutral: { bg: neutral[100], fg: neutral[700], border: neutral[200] },
  cyan: { bg: cyan[50], fg: cyan[800], border: cyan[200] },
  success: { bg: green[50], fg: green[700], border: green[200] },
  warning: { bg: amber[50], fg: amber[700], border: amber[200] },
  danger: { bg: red[50], fg: red[700], border: red[200] },
  azure: { bg: azure[50], fg: azure[700], border: azure[200] },
} as const

export type BadgeTone = keyof typeof badgeTones

/** Khoảng cách: bội số của 4. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const

export const radius = { sm: 6, md: 10, lg: 14, xl: 18, pill: 999 } as const

/** Vùng chạm tối thiểu của mọi điều khiển. */
export const TOUCH = 56

/** Bề rộng tối đa của cột nội dung trên máy tính bảng. */
export const CONTENT_MAX_WIDTH = 720

/**
 * Thang chữ. Chữ nội dung tối thiểu 16; `meta` 14 chỉ cho chip, nhãn tab và mốc thời gian. Ba độ đậm: 400, 500, 600 (tiêu đề được 700).
 */
export const type = {
  display: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  meta: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
} as const

export type TextVariant = keyof typeof type

export const shadow = {
  card: { shadowColor: cyan[950], shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
} as const
