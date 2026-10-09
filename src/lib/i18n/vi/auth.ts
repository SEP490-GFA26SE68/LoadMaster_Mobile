/** Màn đăng nhập và danh sách tài khoản dùng thử (chỉ hiện khi app chạy trên dữ liệu mẫu). */
export const auth = {
  login: {
    title: 'Đăng nhập',
    subtitle: 'Lập kế hoạch và theo dõi chất xếp hàng hoá.',
    email: 'Email',
    password: 'Mật khẩu',
    submit: 'Đăng nhập',
    emailRequired: 'Nhập email',
    emailInvalid: 'Email không đúng định dạng',
    passwordRequired: 'Nhập mật khẩu',
  },
  passwordToggle: {
    show: 'Hiện mật khẩu',
    hide: 'Ẩn mật khẩu',
  },
  demo: {
    title: 'Tài khoản dùng thử',
    hint: 'Chạm một tài khoản để điền email và mật khẩu mẫu.',
    /** Nhóm tài khoản không thuộc công ty nào; các nhóm còn lại mang tên công ty trong dữ liệu. */
    platform: 'Nền tảng',
  },
} as const
