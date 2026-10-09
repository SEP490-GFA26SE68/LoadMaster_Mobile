/** Màn của tài xế. `myTrips`: danh sách "Chuyến của tôi", nhóm theo `MY_TRIP_GROUPS` (logic chép từ web: `features/driver/my-trips.ts`). */
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
    currentStop: 'Đang tới điểm {number}',
    completedAt: 'Giao xong {time} {date}',
    issues: { one: '{count} sự cố giao', other: '{count} sự cố giao' },
  },
} as const
