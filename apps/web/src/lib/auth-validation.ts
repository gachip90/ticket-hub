export const passwordRules = [
  { required: true, message: 'Vui lòng nhập mật khẩu.' },
  { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự.' },
  {
    pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/,
    message: 'Mật khẩu phải gồm chữ, số và ký tự đặc biệt.',
  },
];
