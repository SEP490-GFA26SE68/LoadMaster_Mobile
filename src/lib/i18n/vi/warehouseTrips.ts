/**
 * Tab Kho của nhân viên kho: danh sách chuyến cần xếp, nhóm theo giai đoạn (`WarehouseTripsScreen`). Tiêu đề màn là câu của web
 * (`warehouse.list.title`).
 */
export const warehouseTrips = {
  /** Tiêu đề một nhóm chuyến (`warehouse.list.groups`) kèm số chuyến của nhóm. */
  section: '{group} ({count})',
  /** Tên đọc của nút trên thẻ chuyến: nhiều thẻ cùng một chữ nút ("Bắt đầu soạn hàng") nên kèm mã chuyến. */
  openLabel: '{action} {tripId}',
} as const
