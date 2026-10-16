/** Kiểu điều khiển của viewer 3D, không gắn đơn vị (LM-062: tách khỏi `types/load-plan` mm cũ). */

export type CameraPreset = 'truoc' | 'cua-sau' | 'ben-hong' | 'tren' | 'goc-cheo' | 'gam-xe'

export type ColorMode = 'diem-giao' | 'kien-goc' | 'khoi-luong'

export type PlaybackSpeed = 1 | 2 | 4

/** Kiểu bề mặt vẽ cho kiện; kết quả Spec không có trường này nên `adaptResult` dùng một kiểu trung tính. */
export type Packaging = 'carton' | 'pallet' | 'crate'
