/**
 * Tab Tổng quan của quản lý công ty: số liệu chính của bảng điều khiển. Câu chung với bản web lấy ở nhánh `manager` (chép từ web); ở
 * đây chỉ câu mobile cần thêm, và nhãn trạng thái xe mà bản web để ở nhánh `fleet` (mobile chưa có).
 */
export const overview = {
  title: 'Tổng quan',
  emptyDescription: 'Chọn kỳ khác để xem số liệu của các chuyến có ngày chạy trong kỳ đó.',
  /** Ba trạng thái của xe ở thẻ đội xe (như `fleet.status` của web). */
  fleetStatus: {
    available: 'Sẵn sàng',
    in_use: 'Đang phục vụ chuyến',
    maintenance: 'Bảo dưỡng',
  },
  /** Một dòng của danh sách chuyến theo trạng thái: số chuyến và tỷ lệ trên tổng của kỳ. */
  statusRow: '{count} · {share}',
  statusRowA11y: '{status}: {count}, {share}',
} as const
