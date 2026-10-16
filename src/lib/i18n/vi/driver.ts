/**
 * Màn của tài xế: "Chuyến của tôi" (`myTrips`), màn điểm giao của một chuyến — xuất phát, đã đến, đối chiếu kiện khi dỡ / nhận, báo sự
 * cố theo kiện, hoàn tất điểm, dùng GPS của điện thoại — và tổng kết chuyến. Câu lấy theo bản web (nhánh `driver` của web) để hai bản
 * nói cùng một cách; chỗ web nói về trình duyệt thì ở đây nói về ứng dụng và máy.
 */
export const driver = {
  myTrips: {
    title: 'Chuyến của tôi',
    groups: {
      inTransit: 'Đang vận chuyển',
      loaded: 'Xếp xong — chờ xuất phát',
      preparing: 'Kho đang soạn / xếp',
      recent: 'Đã giao gần đây',
    },
    empty: {
      title: 'Chưa có chuyến nào',
      description: 'Chuyến được gán cho bạn sẽ hiện ở đây khi kho bắt đầu soạn hàng.',
    },
    stops: { one: '{count} điểm', other: '{count} điểm' },
    packages: { one: '{count} kiện', other: '{count} kiện' },
    atStop: 'Đang giao điểm {number} / {total}',
    completedAt: 'Hoàn thành lúc {time} · {date}',
    issues: { one: '{count} sự cố giao', other: '{count} sự cố giao' },
    /** Nút mở chuyến theo nhóm: xem trước khi kho đang soạn, tiếp tục khi đang giao, xem tổng kết khi đã giao. */
    open: 'Mở chuyến',
    preview: 'Xem trước',
    resume: 'Tiếp tục giao',
    viewSummary: 'Xem tổng kết',
    /** Tên đọc của nút mở chuyến: hành động kèm mã chuyến, để trình đọc màn hình phân biệt các thẻ. */
    openLabel: '{action} {tripId}',
    waitingLoading: 'Kho đang soạn / xếp — chưa xuất phát được, chỉ xem trước.',
    recheck: {
      one: 'Điều phối viên từ chối {count} xác nhận tay: mở chuyến để kiểm lại kiện.',
      other: 'Điều phối viên từ chối {count} xác nhận tay: mở chuyến để kiểm lại kiện.',
    },
    stopsLabel: 'Các điểm của chuyến {tripId}',
    /** Không chuyến nào xếp xong hay đang chạy: màn không có nút chính. */
    noReady: 'Chưa có chuyến nào xếp xong hoặc đang vận chuyển.',
  },

  /** Chuyến mở được nhưng không giao được: nói lý do, có lối về danh sách. */
  loading: 'Đang tải chuyến',
  toTrips: 'Về danh sách chuyến',
  loadErrorTitle: 'Không tải được chuyến',
  emptyTitle: 'Chưa có phương án đã duyệt',
  emptyTripDescription: 'Chuyến {tripId} chưa có phương án đã duyệt. Điều phối viên cần duyệt phương án xếp hàng của chuyến trước.',
  cancelledTitle: 'Chuyến đã huỷ',
  cancelledDescription: 'Chuyến {tripId} đã huỷ: {reason}',
  planningTitle: 'Kho chưa soạn hàng chuyến này',
  planningDescription: 'Chuyến {tripId} còn đang lập kế hoạch. Khi kho bắt đầu soạn hàng, chuyến hiện ở "Chuyến của tôi".',
  replan: {
    title: 'Chuyến tạm dừng',
    DAMAGED:
      'Kho báo một kiện của chuyến {tripId} bị hỏng lúc xếp nên chuyến quay về lập kế hoạch. Điều phối lập lại phương án rồi kho soạn lại hàng; khi đó chuyến hiện lại ở "Chuyến của tôi".',
    SHORTAGE:
      'Kho không tìm thấy một kiện của chuyến {tripId} lúc soạn hàng, điều phối đã bỏ kiện đó khỏi chuyến. Điều phối lập lại phương án rồi kho soạn lại hàng; khi đó chuyến hiện lại ở "Chuyến của tôi".',
  },
  noItems: 'Không có kiện nào của điểm giao này trên xe.',

  /** Màn điểm giao. */
  stopTitle: 'Điểm {number} / {total}',
  notice: {
    preview: 'Kho chưa xếp xong chuyến này: bạn xem trước được, chưa xuất phát được.',
    ready: 'Kho đã xếp xong. Bấm Xuất phát khi xe rời kho.',
    enRoute: 'Đang tới điểm {number}. Đến nơi thì bấm Đã đến rồi mới dỡ hàng.',
    arrived: 'Đã đến điểm {number} lúc {time}.',
    leftOut: {
      one: '{count} kiện của điểm này hỏng lúc xếp, đã bỏ lại kho: không có trên xe, không cần dỡ.',
      other: '{count} kiện của điểm này hỏng lúc xếp, đã bỏ lại kho: không có trên xe, không cần dỡ.',
    },
  },
  start: 'Xuất phát',
  arrive: 'Đã đến điểm {number}',
  complete: 'Hoàn tất điểm giao',
  callLabel: 'Gọi',
  directionsLabel: 'Chỉ đường',
  call: 'Gọi {name}',
  directions: 'Chỉ đường tới {name}',
  contact: '{name} · {phone}',
  summary: 'Cần dỡ {total} kiện · Đã dỡ {done} · Sự cố {issues}',
  progress: 'Tiến độ dỡ hàng',
  remaining: { one: 'Còn {count} kiện chưa dỡ hoặc chưa báo sự cố', other: 'Còn {count} kiện chưa dỡ hoặc chưa báo sự cố' },
  allHandled: 'Mọi kiện của điểm này đã dỡ hoặc đã báo sự cố.',
  itemsTitle: 'Kiện cần dỡ',
  /** Hộp hỏi lại trước khi hoàn tất điểm giao hoặc điểm nhận. */
  completeConfirm: {
    title: 'Hoàn tất điểm {number} — {name}?',
    description: 'Hoàn tất rồi thì không mở lại được điểm này.',
    delivered: { one: '{count} kiện đã dỡ được ghi Đã giao.', other: '{count} kiện đã dỡ được ghi Đã giao.' },
    returned: { one: '{count} kiện chưa dỡ ở lại xe, được ghi Hoàn trả:', other: '{count} kiện chưa dỡ ở lại xe, được ghi Hoàn trả:' },
    issues: { one: 'Đã báo sự cố cho {count} kiện ở điểm này.', other: 'Đã báo sự cố cho {count} kiện ở điểm này.' },
    picked: { one: '{count} kiện đã nhận lên xe, được ghi Đang vận chuyển.', other: '{count} kiện đã nhận lên xe, được ghi Đang vận chuyển.' },
    next: 'Tiếp theo: điểm {number} · {name}.',
    last: 'Đây là điểm cuối: hoàn tất là giao xong chuyến.',
    /** Nguồn dữ liệu không cho biết điểm kế tiếp trước khi hoàn tất. */
    nextUnknown: 'Hoàn tất xong, màn chuyển sang điểm kế tiếp của chuyến.',
    confirm: 'Hoàn tất',
    cancel: 'Quay lại',
  },
  /** Giờ đến và hạn giao: ở thẻ liên hệ của điểm đang giao và ở dòng từng điểm của hai danh sách điểm. */
  timing: {
    expected: 'Dự kiến đến',
    expectedShort: 'Dự kiến',
    arrived: 'Đã đến',
    deadline: 'Hạn giao',
    noDeadline: 'Không có hạn',
    dated: '{time} · {date}',
    sources: { PLAN: 'Theo kế hoạch tuyến', SIMULATED: 'Theo vị trí xe mô phỏng', GPS: 'Theo vị trí GPS của xe' },
  },
  item: {
    order: 'Dỡ thứ {order}',
    done: 'Đã dỡ',
    where: '{area}, {layer}',
    issue: 'Sự cố: {kind}',
    returned: 'Hoàn trả — kiện ở lại xe',
    area: { front: 'Sát vách trước', middle: 'Giữa xe', door: 'Gần cửa' },
    layer: { floor: 'sàn', lower: 'lớp dưới', upper: 'lớp trên' },
  },
  /** Đối chiếu kiện khi dỡ: chỉ kiện của điểm đang giao được ghi "đã dỡ". */
  scan: {
    open: 'Đối chiếu kiện dỡ',
    title: 'Đối chiếu kiện dỡ tại điểm {number}',
    description: 'Quét nhãn QR của từng kiện khi đưa xuống xe, hoặc gõ mã in trên nhãn. Điểm {number}: đã dỡ {done} / {total} kiện.',
    lastUnloaded: 'Vừa dỡ {id} · {name}.',
    wrongStop: 'Kiện {id} ({name}) thuộc điểm {stop} · {stopName}, không phải điểm này. Chưa ghi gì — để kiện lại trên xe.',
    manualRecorded: 'Đã ghi xác nhận tay {id}. Chờ điều phối viên duyệt trước khi hoàn tất điểm.',
    via: {
      QR: 'Đã dỡ · quét QR',
      CODE: 'Đã dỡ · gõ mã',
      MANUAL_PENDING: 'Đã dỡ · xác nhận tay, chờ duyệt',
      MANUAL_APPROVED: 'Đã dỡ · xác nhận tay đã duyệt',
    },
  },
  /** Xác nhận tay ở điểm giao: còn chờ điều phối viên duyệt thì chưa hoàn tất điểm; bị từ chối thì kiểm lại kiện đó. */
  confirms: {
    blocked: {
      one: 'Còn {count} xác nhận tay của điểm này chờ điều phối viên duyệt — chưa hoàn tất điểm giao được.',
      other: 'Còn {count} xác nhận tay của điểm này chờ điều phối viên duyệt — chưa hoàn tất điểm giao được.',
    },
    rejected: 'Điều phối viên từ chối xác nhận tay, kiểm lại kiện này. Lý do: {reason}',
  },
  /** "Báo sự cố" cho một kiện: loại + ghi chú, "Khác" bắt buộc ghi chú. */
  issue: {
    report: 'Báo sự cố',
    title: 'Báo sự cố tại điểm {number}',
    description: 'Ghi sự cố cho một kiện của điểm giao này. Sự cố đã ghi không xoá được. Khách từ chối thì kiện ở lại xe và thành Hoàn trả.',
    package: 'Kiện',
    kind: 'Loại sự cố',
    note: 'Ghi chú',
    noteHint: 'Bắt buộc khi chọn Khác.',
    submit: 'Ghi sự cố',
    cancel: 'Quay lại',
    refusedRecorded: 'Khách từ chối {id}: kiện ở lại xe và thành Hoàn trả khi hoàn tất điểm giao.',
    errors: {
      packageRequired: 'Chọn kiện gặp sự cố.',
      kindRequired: 'Chọn loại sự cố.',
      noteRequired: 'Chọn Khác thì cần ghi chú.',
      noteTooLong: 'Ghi chú tối đa {max} ký tự.',
    },
  },
  stopKinds: { PICKUP: 'Điểm nhận hàng', DELIVERY: 'Điểm giao hàng' },
  stopList: {
    summary: 'Các điểm của chuyến ({count})',
    label: 'Các điểm của chuyến',
    state: { done: 'Đã xong', current: 'Đang ở điểm này', waiting: 'Chưa tới' },
  },
  /** Kiện nhận dọc đường: nhận ở điểm nhận, giao ở điểm giao như kiện thường. */
  pickup: {
    banner: 'Điểm nhận hàng dọc đường: nhận {count} kiện từ {name}. Đối chiếu từng kiện lên xe rồi mới hoàn tất điểm nhận.',
    listTitle: 'Kiện nhận dọc đường',
    listHint: 'Kiện nhận không nằm trong phương án xếp hàng. Đối chiếu bằng nhãn QR như kiện thường.',
    request: 'Yêu cầu {id}',
    pick: { waiting: 'Chưa nhận', done: 'Đã nhận' },
    deliver: { waiting: 'Chưa dỡ', done: 'Đã dỡ' },
    via: {
      QR: 'quét QR',
      CODE: 'gõ mã',
      MANUAL_PENDING: 'xác nhận tay, chờ duyệt',
      MANUAL_APPROVED: 'xác nhận tay đã duyệt',
    },
    summary: 'Cần nhận {total} kiện · Đã nhận {done}',
    progress: 'Tiến độ nhận hàng',
    remaining: { one: 'Còn {count} kiện chưa đối chiếu', other: 'Còn {count} kiện chưa đối chiếu' },
    allHandled: 'Mọi kiện của điểm nhận này đã đối chiếu.',
    scanOpen: 'Đối chiếu kiện nhận',
    scanTitle: 'Đối chiếu kiện nhận tại điểm {number}',
    scanDescription: 'Quét nhãn QR của từng kiện khi đưa lên xe, hoặc gõ mã in trên nhãn. Điểm {number}: đã nhận {done} / {total} kiện.',
    lastPicked: 'Vừa nhận {id} · {name}.',
    candidate: 'Kiện nhận · yêu cầu {request}',
    complete: 'Hoàn tất điểm nhận',
    blocked: {
      one: 'Còn {count} xác nhận tay của điểm này chờ điều phối viên duyệt — chưa hoàn tất điểm nhận được.',
      other: 'Còn {count} xác nhận tay của điểm này chờ điều phối viên duyệt — chưa hoàn tất điểm nhận được.',
    },
  },
  /** Công tắc "Dùng GPS thật" khi chuyến Đang vận chuyển. */
  gps: {
    title: 'Vị trí xe',
    toggle: 'Dùng GPS thật',
    sources: { SIMULATED: 'Mô phỏng', GPS: 'GPS' },
    localOnly: 'Chưa có máy chủ vị trí: vị trí từ điện thoại chỉ lưu trong dữ liệu mẫu trên máy này.',
    requesting: 'Đang chờ quyền vị trí và tín hiệu GPS…',
    sent: 'Đã gửi vị trí lúc {time}. Gửi lại mỗi 30 giây.',
    /** Vị trí xe sau khi thôi dùng GPS — chỉ nói khi nguồn dữ liệu tự mô phỏng xe. */
    simulated: 'Vị trí xe về mô phỏng.',
    stopped: {
      user: 'Đã tắt GPS thật.',
      denied: 'Chưa được phép dùng vị trí. Cấp quyền vị trí cho LoadMaster trong Cài đặt của máy rồi bật lại.',
      servicesOff: 'Định vị của máy đang tắt. Bật định vị trong Cài đặt của máy rồi bật lại.',
      lost: 'Mất tín hiệu GPS. Bật lại khi có tín hiệu.',
      error: 'Không gửi được vị trí. {message}',
    },
    openSettings: 'Mở Cài đặt',
  },
  /** Màn tổng kết khi giao xong điểm cuối. */
  tripSummary: {
    title: 'Tổng kết chuyến',
    heading: 'Đã giao xong chuyến {tripId}',
    stops: 'Số điểm giao',
    delivered: 'Kiện đã giao',
    issues: 'Sự cố',
    time: 'Thời gian',
    timeRange: '{start} – {end} · {date}',
    noIssues: 'Không có sự cố.',
    issueWhere: '{id} · Điểm {stop}',
    wholeStop: 'Cả điểm giao · Điểm {stop}',
    stopsTitle: 'Điểm giao',
    stopLine: { one: 'Đã giao {time} · {count} kiện', other: 'Đã giao {time} · {count} kiện' },
    /** Nguồn dữ liệu không trả số liệu của chuyến đã giao: chỉ nói chuyến đã xong, không dựng số. */
    unavailable: 'Chuyến {tripId} đã giao xong. Nguồn dữ liệu đang dùng chưa có số liệu tổng kết của chuyến.',
  },
} as const
