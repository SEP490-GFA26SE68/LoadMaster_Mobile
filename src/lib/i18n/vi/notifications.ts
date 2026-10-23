import { lookup as lookupScreen } from './lookup'
import { warehouse as warehouseScreen } from './warehouse'

/**
 * Chuông và màn Thông báo (`features/bell/`), theo vai trò người đọc: tài xế đọc sự kiện về chuyến của chính mình; nhân viên kho đọc
 * quyết định của điều phối viên với kiện mình báo thiếu và chuyến bị huỷ lúc đang xếp; cả hai đọc xác nhận tay của mình bị từ chối và
 * trả lời yêu cầu hỗ trợ của mình. Câu của tài xế (`driver`) theo nhánh `notifications` của web; `params` là nhãn tham số nhật ký của
 * web. Chuông web hiện nhãn hành động của nhật ký cho việc khác, nên câu còn lại là câu của mobile — trừ câu và nhãn chuông kho lấy thẳng
 * từ nhánh `warehouse`, `lookup` chép từ web (màn phiên xếp, màn Tra cứu kiện): web đổi câu thì chuông đổi theo, không chép tay.
 */
export const notifications = {
  label: 'Thông báo',
  /** Tên đọc của nút chuông khi có thông báo chưa đọc; bắt đầu bằng nhãn nhìn thấy. */
  labelUnread: { one: 'Thông báo, {count} chưa đọc', other: 'Thông báo, {count} chưa đọc' },
  title: 'Thông báo',
  unreadCount: { one: '{count} chưa đọc', other: '{count} chưa đọc' },
  markAllRead: 'Đánh dấu đã đọc',
  unread: 'Chưa đọc',
  empty: 'Không có thông báo nào trong {days} ngày qua.',
  /** Chân danh sách: nói rõ phạm vi, để người đọc không tưởng mất thông báo cũ hay việc chính mình làm. */
  scope: 'Sự kiện {days} ngày gần nhất, không gồm việc bạn làm.',
  dateTime: '{time} · {date}',
  target: {
    trip: 'Chuyến {id}',
    tripNamed: 'Chuyến {id} · {name}',
    ticket: 'Yêu cầu hỗ trợ {id}',
  },
  openTrip: 'Mở chuyến {id}',
  /** Câu của sự kiện về chuyến của chính tài xế (`DriverNotice`). */
  driver: {
    loadingStarted: 'Chuyến mới: kho đang soạn hàng',
    loadingRestarted: 'Kho đang soạn lại hàng cho chuyến',
    loadingCompleted: 'Xếp xong — chờ bạn xuất phát',
    replanDamaged: 'Chuyến tạm dừng: kho báo kiện hỏng, chờ điều phối lập lại phương án',
    replanShortage: 'Chuyến tạm dừng: thiếu kiện, chờ điều phối lập lại phương án',
    cancelled: 'Chuyến đã huỷ',
    assigned: 'Chuyến mới: bạn được giao chuyến này',
    unassigned: 'Bạn không còn chạy chuyến này',
    pickupApproved: 'Điều phối đã duyệt nhận hàng dọc đường — tuyến có thêm điểm nhận',
    pickupRejected: 'Yêu cầu nhận hàng dọc đường bị từ chối',
    stopsReordered: 'Điều phối đã đổi thứ tự điểm giao — xem lại tuyến',
  },
  /**
   * Câu của chuông kho (`WarehouseNotificationKind`): việc gì xảy ra, kho làm gì tiếp. `{id}` là mã kiện như ở danh sách soạn hàng; trả
   * lời yêu cầu hỗ trợ dùng câu chung `ticketReplied`.
   */
  warehouse: {
    /** Nhánh `warehouse` chép từ web chưa có câu cho quyết định "tìm tiếp". */
    shortageKept: 'Điều phối viên chọn tìm tiếp kiện {id} — tìm kiện này rồi soạn vào khu chờ',
    /** Như `warehouse.replan.SHORTAGE`, nhưng nêu kiện mình báo thiếu thay mã chuyến (dòng thông báo đã nêu chuyến). */
    shortageDropped: 'Điều phối viên đã bỏ kiện {id} khỏi chuyến — kiện đã soạn giữ ở khu chờ, làm tiếp khi phương án mới được duyệt',
    /** Câu của màn phiên xếp (`warehouse.confirms.rejected`). */
    manualRejected: warehouseScreen.confirms.rejected,
    /** Chuyến bị huỷ: câu, rồi dòng dỡ kiện đã lên xe — như màn phiên xếp (`warehouse.cancelledTitle`, `warehouse.cancelledUnload`). */
    cancelled: warehouseScreen.cancelledTitle,
    cancelledUnload: warehouseScreen.cancelledUnload,
    /** Dòng dưới câu khi chuyến bị huỷ lúc kho còn soạn hàng: chưa kiện nào lên xe. */
    nothingLoaded: 'Chưa có kiện nào lên xe, không phải dỡ.',
  },
  manualRejected: 'Điều phối viên từ chối xác nhận tay của bạn — kiểm lại kiện',
  ticketReplied: 'Bộ phận hỗ trợ đã trả lời yêu cầu của bạn',
  params: {
    reason: 'Lý do',
    loaded: 'Đã lên xe',
    returned: 'Hoàn trả',
    packageInstanceId: 'Kiện',
    /**
     * Mã in trên nhãn kiện: nhãn ô của màn Tra cứu kiện (`lookup.fields.senderCode`), không phải nhãn nhật ký của web ("Mã kiện") — câu đã
     * nêu mã kiện của danh sách soạn hàng, hai "mã kiện" khác nhau làm kho tìm nhầm kiện.
     */
    packageCode: lookupScreen.fields.senderCode,
    count: 'Số kiện',
    lateStops: 'Điểm trễ hạn dự kiến',
  },
  detail: '{label}: {value}',
} as const
