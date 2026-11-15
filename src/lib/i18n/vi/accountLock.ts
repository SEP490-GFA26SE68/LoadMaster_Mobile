/**
 * Màn khoá thay cả app khi đăng nhập bằng backend mà tài khoản không dùng được nghiệp vụ (`features/auth/AccountLockedScreen`): gói cước
 * của công ty hết hạn, hoặc tài khoản dùng thử bị gắn cờ vì chưa ký thoả thuận. Chữ lấy theo màn khoá của bản web; trên app chỉ đăng xuất.
 */
export const accountLock = {
  signOut: 'Đăng xuất',
  subscriptionExpired: {
    badge: 'Gói cước hết hạn',
    title: 'Gói cước của doanh nghiệp đã hết hạn',
    body: 'Doanh nghiệp của bạn chưa có gói cước đang hiệu lực trên LoadMaster. Mọi tính năng vận hành (chuyến hàng, điều phối, kho và tối ưu xếp hàng) đang tạm dừng.',
    nextBody: 'Liên hệ Quản trị công ty của doanh nghiệp để gia hạn hoặc đăng ký gói cước.',
  },
  flagged: {
    badge: 'Tài khoản bị khóa',
    title: 'Tài khoản tạm thời bị khóa do chưa hoàn tất ký thỏa thuận dịch vụ trong 72 giờ',
    body: 'Các màn nghiệp vụ đang tạm dừng.',
    nextBody: 'Quản trị công ty cần ký thỏa thuận dịch vụ trên bản web LoadMaster để mở lại tài khoản.',
  },
} as const
