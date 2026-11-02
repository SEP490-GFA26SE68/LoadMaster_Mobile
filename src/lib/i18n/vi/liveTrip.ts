/**
 * Tab Giám sát và màn giám sát một chuyến đang chạy (vị trí xe, giờ đến, sự cố cấp chuyến, nhận hàng dọc đường) của điều phối viên và
 * quản lý công ty. Câu chung với bản web lấy ở nhánh `monitoring` (chép từ web); ở đây chỉ câu mobile cần thêm.
 */
export const liveTrip = {
  title: 'Giám sát',
  /** Thẻ một chuyến của danh sách: bấm là mở màn giám sát của chuyến đó. */
  card: {
    openHint: 'Mở giám sát chuyến {id}',
    noPosition: 'Chưa có vị trí xe',
    pendingPickups: { one: '{count} yêu cầu nhận hàng chờ duyệt', other: '{count} yêu cầu nhận hàng chờ duyệt' },
  },
  /** Băng đầu danh sách của điều phối viên: số chuyến lúc này có điểm sát hạn hoặc trễ hạn dự kiến (bản web báo bằng toast). */
  etaRisk: {
    one: '{count} chuyến có điểm sát hạn hoặc trễ hạn dự kiến.',
    other: '{count} chuyến có điểm sát hạn hoặc trễ hạn dự kiến.',
  },
  /** Băng của quản lý công ty: sự cố đã chuyển lên mà chưa nhập hạn mới (bản web báo bằng toast). */
  escalated: {
    one: '{count} sự cố đã chuyển lên bạn: liên hệ khách và nhập hạn mới.',
    other: '{count} sự cố đã chuyển lên bạn: liên hệ khách và nhập hạn mới.',
  },
  escalatedOpen: 'Xem sự cố cần xử lý',
  /** Lần đọc lại theo nhịp bị lỗi trong khi màn vẫn còn dữ liệu cũ. */
  refreshFailed: 'Chưa đọc lại được giám sát: {message}',
  openDetail: 'Chi tiết chuyến',
  /** Danh sách điểm của màn một chuyến: điểm chưa có giờ đến (xe chưa có vị trí). */
  stops: { noEta: 'Chưa có giờ đến dự kiến' },
  notRunning: 'Chuyến {id} không còn đang vận chuyển: vị trí xe và giờ đến thôi cập nhật.',
  /** Người làm của việc do hệ thống tự làm, trong câu "… bởi {name}". */
  system: 'hệ thống',
  /** Tờ "Đã xử lý" của điều phối viên: ghi chú xử lý không bắt buộc. */
  resolve: {
    title: 'Đã xử lý sự cố {id}',
    description: 'Đánh dấu sự cố của chuyến {tripId} là đã xử lý. Ghi chú, nếu có, lưu cùng sự cố.',
    note: 'Ghi chú xử lý',
    noteHint: 'Không bắt buộc. Đã làm gì, đã báo ai.',
    noteTooLong: 'Ghi chú tối đa {max} ký tự.',
    cancel: 'Huỷ',
    confirm: 'Đã xử lý',
  },
  resolutionNote: 'Ghi chú xử lý: {note}',
  /** Ô ngày và ô giờ gõ tay (điện thoại không có ô ngày của trình duyệt như bản web). */
  deadline: {
    dateHint: 'Ngày dạng dd/mm/yyyy, ví dụ 24/10/2026.',
    timeHint: 'Giờ dạng HH:mm, 24 giờ, ví dụ 17:30.',
  },
} as const
