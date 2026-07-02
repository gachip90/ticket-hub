export function translateApiError(
  statusCode: number | undefined,
  message: string,
  path: string,
) {
  const normalized = message.trim().toLowerCase();

  if (path.includes('/login') && statusCode === 401) {
    return 'Email hoặc mật khẩu không đúng.';
  }

  if (path.includes('/register') && statusCode === 409) {
    return 'Email này đã được đăng ký.';
  }

  switch (statusCode) {
    case 400:
      return 'Dữ liệu gửi lên chưa hợp lệ.';
    case 401:
      return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 404:
      return 'Không tìm thấy dữ liệu yêu cầu.';
    case 409:
      return 'Dữ liệu đang xung đột với trạng thái hiện tại.';
    case 422:
      return 'Không thể xử lý yêu cầu hiện tại.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';
    default:
      break;
  }

  if (normalized.includes('request failed')) {
    return 'Yêu cầu không thành công. Vui lòng thử lại.';
  }

  return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
}
