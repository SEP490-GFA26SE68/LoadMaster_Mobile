/**
 * Màn "Xe ở kho" của nhân viên kho (`features/warehouse/presence`, nguồn máy chủ) và khối xác nhận xe có ở kho xuất phát trong phiên xếp:
 * máy chủ chỉ cho tài xế xuất phát khi xe đã được kho ghi nhận có mặt ở kho xuất phát của chuyến.
 */
export const vehiclePresence = {
  title: 'Xe ở kho',
  /** Nút ở màn danh sách chuyến của kho. */
  open: 'Xe ở kho',
  openHint: 'Ghi nhận xe có mặt ở kho và xem lịch sử ghi nhận',
  loadingWarehouses: 'Đang tải kho…',
  noWarehouseTitle: 'Bạn chưa được phân công kho nào',
  noWarehouseDescription: 'Nhờ quản lý công ty phân công bạn vào một kho để ghi nhận xe.',
  warehouse: 'Kho',
  filter: { label: 'Lọc xe', all: 'Mọi xe', here: 'Đang ở kho này' },
  search: 'Tìm theo biển số hoặc tên xe',
  searchHint: 'Gõ ít nhất 2 ký tự.',
  loading: 'Đang tải danh sách xe…',
  emptyTitle: 'Không có xe nào',
  emptyHere: 'Chưa có xe nào được ghi nhận ở kho này.',
  emptySearch: 'Không có xe nào khớp "{query}".',
  emptyAll: 'Công ty chưa có xe nào.',
  /** Danh mục dừng ở 500 xe (5 trang) — tìm để thu hẹp. */
  limited: 'Đang hiện {shown} xe đầu tiên — tìm theo biển số để thu hẹp.',
  presence: {
    UNKNOWN: 'Chưa ghi nhận',
    here: 'Ở kho này',
    elsewhere: 'Ở kho {name}',
    elsewhereUnnamed: 'Ở kho khác',
    IN_TRANSIT: 'Đang trên đường',
    OTHER: 'Trạng thái khác',
  },
  state: {
    AVAILABLE: 'Sẵn sàng',
    IN_TRIP: 'Đang phục vụ chuyến',
    MAINTENANCE: 'Đang bảo dưỡng',
    RETIRED: 'Ngừng sử dụng',
    OTHER: 'Trạng thái khác',
  },
  loadingTrip: 'Đang xếp hàng cho chuyến {code}',
  transferring: 'Đang điều chuyển giữa hai kho',
  observed: 'Ghi nhận lúc {time} · {name}',
  observedNoActor: 'Ghi nhận lúc {time}',
  checkIn: 'Ghi nhận có ở kho',
  /** Lý do nút ghi nhận mờ — máy chủ cũng từ chối các trường hợp này. */
  checkInBlocked: {
    busy: 'Xe đang ở một chuyến Đang xếp hàng hoặc Đang vận chuyển — chưa ghi nhận được ở đây.',
    transferring: 'Xe đang được điều chuyển giữa hai kho — chưa ghi nhận được.',
    elsewhere: 'Xe đang được ghi nhận ở kho khác — kho đó phải ghi xe rời kho trước.',
  },
  history: 'Lịch sử',
  checkInSheet: {
    title: 'Ghi nhận xe có ở kho',
    description: 'Chỉ ghi nhận khi xe {plate} đang có mặt thật ở {warehouse}.',
    confirm: 'Ghi nhận',
    cancel: 'Huỷ',
  },
  checkedIn: 'Đã ghi nhận xe {plate} có ở {warehouse}.',
  events: {
    title: 'Lịch sử xe {plate}',
    description: 'Các lần ghi nhận ở {warehouse}, mới nhất trước.',
    loading: 'Đang tải lịch sử…',
    empty: 'Chưa có lần ghi nhận nào ở kho này.',
    CHECK_IN: 'Ghi nhận vào kho',
    CHECK_OUT: 'Rời kho',
    OTHER: 'Thay đổi khác',
    change: '{from} → {to}',
    close: 'Đóng',
  },
  /** Khối trong phiên xếp của chuyến. */
  session: {
    title: 'Xe ở kho xuất phát',
    here: 'Xe {plate} đã được ghi nhận ở {warehouse}.',
    unknown: 'Xe {plate} chưa được ghi nhận ở {warehouse}. Tài xế chỉ xuất phát được khi xe đã được xác nhận ở kho xuất phát.',
    confirm: 'Xác nhận xe có ở kho',
    confirmed: 'Đã xác nhận xe {plate} có ở {warehouse}.',
    blocked:
      'Xe {plate} đang được ghi là "{presence}", nên kho chưa xác nhận được trong phiên xếp. Báo điều phối viên kiểm tra trạng thái xe trước khi tài xế xuất phát.',
    failed: 'Chưa đọc được trạng thái xe ở kho. {reason}',
    retry: 'Thử lại',
  },
} as const
