/**
 * Màn lỗi chung — hiện thay cho nhóm route khi một màn ném lỗi lúc vẽ (`features/errors/RouteErrorScreen`) — và màn không tìm thấy của
 * địa chỉ không khớp route nào (`app/+not-found.tsx`). Nút thử lại dùng `common.retry`; câu của lỗi có mã lấy qua `dataErrorMessage`.
 */
export const errors = {
  home: 'Về màn chính',
  crash: {
    title: 'Không hiện được màn này',
  },
  notFound: {
    title: 'Không có màn này',
    description: 'Địa chỉ vừa mở không khớp màn nào của app. Liên kết có thể đã cũ hoặc bị gõ sai.',
  },
} as const
