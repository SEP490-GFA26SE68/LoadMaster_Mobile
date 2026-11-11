/**
 * Câu của các màn điều phối viên và quản lý công ty khi đọc máy chủ (chuyến hàng, tổng quan) mà nhánh chép từ web (`trips`, `manager`)
 * chưa có: phần máy chủ trả khác kho mẫu.
 */
export const officeServer = {
  trips: {
    /** Chuyến của máy chủ chưa có giờ xuất phát nên chưa có ngày chạy: nhãn ngày của thẻ và tên nhóm cuối danh sách. */
    noDeparture: 'Chưa có giờ xuất phát',
    noVehicle: 'Chưa gán xe',
    /** Dòng dưới tên chuyến ở Chi tiết chuyến: giờ xuất phát theo giờ Việt Nam. */
    departure: 'Xuất phát {time} {date}',
    cancelled: 'Chuyến đã huỷ. Lý do: {reason}',
    /** Một điểm của danh sách điểm giao: giờ đến kế hoạch của máy chủ (không phải kết quả mock) và giờ xe đã đến. */
    plannedArrival: 'Dự kiến đến {time} {date}',
    actualArrival: 'Đã đến {time} {date}',
    stop: 'Điểm {number} / {total}: {name}',
  },
  overview: {
    /** Trạng thái xe chỉ máy chủ có (như `fleet.status.RETIRED` của web). */
    retired: 'Ngừng sử dụng',
  },
} as const
