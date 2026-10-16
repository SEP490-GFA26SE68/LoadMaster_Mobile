/**
 * Chuông và màn Thông báo của tài xế (`features/driver/NotificationsScreen.tsx`): sự kiện về chuyến của chính mình, xác nhận tay của
 * mình bị từ chối, trả lời yêu cầu hỗ trợ. Câu theo bản web (nhánh `notifications`); `params` là nhãn của chi tiết đi kèm (nhãn tham số
 * nhật ký của web).
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
  manualRejected: 'Điều phối viên từ chối xác nhận tay của bạn — kiểm lại kiện',
  ticketReplied: 'Bộ phận hỗ trợ đã trả lời yêu cầu của bạn',
  params: {
    reason: 'Lý do',
    loaded: 'Đã lên xe',
    returned: 'Hoàn trả',
    packageInstanceId: 'Kiện',
    count: 'Số kiện',
    lateStops: 'Điểm trễ hạn dự kiến',
  },
  detail: '{label}: {value}',
} as const
