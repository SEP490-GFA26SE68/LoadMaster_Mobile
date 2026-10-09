/** Màn Tài khoản: thông tin người đang đăng nhập, ngôn ngữ, nguồn dữ liệu của app, đăng xuất. */
export const account = {
  title: 'Tài khoản',
  email: 'Email',
  phone: 'Số điện thoại',
  depot: 'Kho / chi nhánh',
  signOut: 'Đăng xuất',
  dataSource: {
    title: 'Nguồn dữ liệu',
    mock: 'Dữ liệu mẫu trong máy. App chưa nối máy chủ: việc làm ở đây không hiện trên bản web hay máy khác.',
    http: 'Máy chủ {url}',
    mixed: 'Máy chủ {url} cho: {features}. Phần còn lại dùng dữ liệu mẫu trong máy.',
  },
  /** Vai trò chưa có màn làm việc trên app. */
  scope: {
    webOnly: 'Vai trò của bạn làm việc trên bản web. App chỉ có phần tài khoản.',
    notYet: 'Bản này chưa có màn làm việc cho vai trò của bạn.',
  },
} as const
