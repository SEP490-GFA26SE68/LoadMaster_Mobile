/**
 * Màn chuyến của điều phối viên và quản lý công ty trên điện thoại: tab Chuyến hàng, chi tiết chuyến (đọc), duyệt xác nhận tay và
 * kiện kho báo thiếu. Câu chung với bản web lấy ở nhánh `trips` (chép từ web); ở đây chỉ câu mobile cần thêm, và nhãn mà bản web để ở
 * nhánh mobile chưa có (`requirements`, `audit`, `common.verifyContexts`, `common.packageCount`).
 */
export const companyTrips = {
  title: 'Chuyến hàng',
  /** Tab Chuyến hàng: danh sách nhóm theo ngày chạy, ô tìm và hàng tab trạng thái. */
  list: {
    loading: 'Đang tải danh sách chuyến',
    search: 'Tìm chuyến',
    emptyDescription: 'Chuyến của công ty sẽ hiện ở đây, nhóm theo ngày chạy.',
    noMatchTitle: 'Không có kết quả khớp bộ lọc',
    noMatchDescription: 'Thử từ khoá khác, hoặc xem mọi trạng thái.',
    clearFilters: 'Xoá lọc',
    openHint: 'Mở chi tiết chuyến',
  },
  /** Chi tiết chuyến: lối sang màn Giám sát, câu thay thanh tuyến khi chưa có giờ đến. */
  detail: {
    monitor: 'Giám sát chuyến',
    routeNotOptimized: 'Chưa tối ưu tuyến: chưa có thứ tự đi, giờ đến dự kiến và mức hạn của từng điểm.',
    liveEta: 'Giờ đến dự kiến theo vị trí xe nằm ở màn Giám sát chuyến.',
  },
  packageCount: { one: '{count} kiện', other: '{count} kiện' },
  /** Bước đối chiếu của một xác nhận tay (như `common.verifyContexts` của web). */
  verifyContexts: {
    STAGING: 'Soạn hàng',
    LOADING: 'Xếp hàng',
    UNLOADING: 'Dỡ hàng',
    PICKUP: 'Nhận hàng dọc đường',
  },
  /** Thẻ "Yêu cầu giao của chuyến" (như `requirements.trip` của web), chỉ đọc. */
  requirements: {
    title: 'Yêu cầu giao của chuyến',
    count: { one: '{count} yêu cầu', other: '{count} yêu cầu' },
    stop: 'Điểm {number} · {name}',
    deadline: 'Hạn {time} {date}',
    status: {
      PENDING: 'Chờ xếp chuyến',
      ASSIGNED: 'Đã vào chuyến',
      IN_TRIP: 'Đang giao',
      DELIVERED: 'Đã giao',
      PARTIAL: 'Giao thiếu',
    },
  },
  /** Mức ưu tiên của yêu cầu giao và của điểm giao (như `requirements.priority` của web). */
  priority: {
    LOW: 'Thấp',
    NORMAL: 'Bình thường',
    HIGH: 'Cao',
    URGENT: 'Khẩn',
  },
  /** Tên trường trong dòng "Đã sửa: …" của banner lỗi thời (như `audit.log.fieldNames`, `audit.log.packageFields` của web). */
  fieldNames: {
    name: 'Tên chuyến',
    vehicleId: 'Xe',
    stops: 'Điểm giao',
    packages: 'Kiện hàng',
    scheduledDate: 'Ngày chạy',
    departureAt: 'Giờ xuất phát',
    departureDepot: 'Kho xuất phát',
    driverId: 'Tài xế',
  },
  packageFields: {
    name: 'Tên kiện',
    lengthCm: 'Dài',
    widthCm: 'Rộng',
    heightCm: 'Cao',
    weightKg: 'Khối lượng',
    quantity: 'Số lượng',
    deliveryStop: 'Điểm giao',
    fragilityLevel: 'Mức dễ vỡ',
    maxTopLoadKg: 'Tải tối đa bên trên',
    priority: 'Ưu tiên',
  },
} as const
