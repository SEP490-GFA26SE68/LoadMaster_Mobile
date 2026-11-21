/** Chữ của màn Chuyến đang mở (tài xế xin nhận chuyến). */
export const openTrips = {
  title: 'Chuyến đang mở',
  loading: 'Đang tải danh sách chuyến mở…',
  stopCount: '{count} điểm giao',
  originWarehouse: 'Kho xuất phát: {warehouse}',
  departureTime: 'Khởi hành: {time}',
  departureNotSet: 'Chưa có giờ xuất phát',
  empty: {
    title: 'Không có chuyến mở',
    description: 'Hiện chưa có chuyến nào cần tài xế nhận.',
  },
  status: {
    pending: 'Đang chờ duyệt',
    rejected: 'Đã bị từ chối',
  },
  actions: {
    claim: 'Xin nhận chuyến',
    cancel: 'Rút phiếu',
  },
  rejectReason: 'Lý do: {reason}',
} as const
