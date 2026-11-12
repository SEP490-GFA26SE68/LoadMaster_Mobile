/** Màn đăng nhập, đặt lại mật khẩu (khi đăng nhập dùng backend) và danh sách tài khoản dùng thử (chỉ hiện khi app chạy trên dữ liệu mẫu). */
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
    forgot: 'Quên mật khẩu?',
    /** Lối mở bước đặt lại mật khẩu khi máy chủ báo tài khoản đang dùng mật khẩu tạm. */
    setNewPassword: 'Đặt mật khẩu mới',
    resetDone: 'Đã đặt mật khẩu mới. Đăng nhập bằng mật khẩu vừa đặt.',
    /** Vừa đặt lại mật khẩu xong mà máy chủ vẫn đòi đặt mật khẩu mới: không mời người dùng làm lại vòng đó. */
    resetNotApplied: 'Máy chủ vẫn đòi đặt mật khẩu mới dù bạn vừa đặt xong. Báo cho quản trị công ty để kiểm tra tài khoản.',
  },
  /** Đặt lại mật khẩu qua mã gửi tới email: ba bước email → mã → mật khẩu mới. */
  forgot: {
    title: 'Đặt lại mật khẩu',
    step: 'Bước {step} / 3',
    emailIntro: 'Nhập email đăng nhập. LoadMaster gửi mã xác nhận 6 số tới email này.',
    sendCode: 'Gửi mã',
    backToSignIn: 'Về đăng nhập',
    codeIntro: 'Nếu {email} có tài khoản, mã xác nhận 6 số đã được gửi tới email đó. Mã chỉ dùng được trong vài phút.',
    code: 'Mã xác nhận',
    codeInvalid: 'Mã gồm đúng 6 chữ số',
    verify: 'Xác nhận mã',
    resend: 'Gửi lại mã',
    resent: 'Đã gửi mã mới tới {email}.',
    /** Máy chủ chỉ gửi mã mới sau 60 giây kể từ lần gửi trước: nút Gửi lại mã mờ kèm câu này. */
    resendIn: { one: 'Gửi lại mã được sau {count} giây.', other: 'Gửi lại mã được sau {count} giây.' },
    changeEmail: 'Đổi email',
    passwordIntro: 'Đặt mật khẩu mới cho {email}.',
    newPassword: 'Mật khẩu mới',
    newPasswordHint: 'Ít nhất 8 ký tự.',
    confirm: 'Nhập lại mật khẩu mới',
    passwordTooShort: 'Mật khẩu cần ít nhất 8 ký tự',
    confirmRequired: 'Nhập lại mật khẩu mới',
    confirmMismatch: 'Hai mật khẩu chưa giống nhau',
    submit: 'Đặt mật khẩu',
  },
  /** Kho khoá của máy từ chối đọc / cất phiên (`features/auth/session-store.ts`). */
  sessionStore: {
    unreadable: 'Không đọc được phiên đăng nhập đã lưu trên máy này. Hãy đăng nhập lại.',
    notSavedTitle: 'Chưa lưu được phiên đăng nhập',
    notSaved: 'Máy không cho lưu phiên đăng nhập. Bạn vẫn làm việc được, nhưng mở lại app sẽ phải đăng nhập lại.',
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
