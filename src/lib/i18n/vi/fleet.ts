/** Danh sách chuyến của công ty (điều phối viên). Lập chuyến ở bản web. */
export const fleet = {
  title: 'Chuyến',
  empty: { title: 'Chưa có chuyến', description: 'Chuyến do điều phối viên lập sẽ hiện ở đây.' },
  driver: 'Tài xế {name}',
  noDriver: 'Chưa gán tài xế',
  monitor: 'Giám sát',
  openLabel: 'Giám sát {tripId}',
} as const
