/** Màn giám sát: đội xe đang chạy, một chuyến, sự cố và tuyến thay thế. */
export const monitoring = {
  board: {
    title: 'Giám sát',
    empty: { title: 'Không có chuyến đang chạy', description: 'Chuyến đang vận chuyển sẽ hiện ở đây.' },
    exceptions: { one: '{count} sự cố', other: '{count} sự cố' },
    open: 'Xem chuyến',
    openLabel: 'Xem chuyến {tripId}',
    location: '{lat}, {lng}',
    noLocation: 'Chưa có vị trí GPS',
  },
  trip: {
    title: 'Chuyến {tripId}',
    toBoard: 'Về bảng giám sát',
    location: 'Vị trí xe',
    stops: 'Điểm chưa xong',
    eta: 'Dự kiến {time}',
    exceptions: 'Sự cố',
    noExceptions: 'Chưa có sự cố.',
    resolve: 'Đã xử lý',
    escalate: 'Chuyển quản lý',
    note: 'Ghi chú',
    reroute: 'Tìm tuyến khác',
    confirmRoute: 'Chọn tuyến này',
    options: 'Tuyến thay thế',
    mock: 'MOCK RESULT',
    distance: '{km} km · {minutes} phút',
  },
} as const
