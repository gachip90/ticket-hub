const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function dinhDangTien(amount: number) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} VND`;
}

export function dinhDangNgayGio(value: string) {
  const date = new Date(value);

  return {
    ngay: new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      timeZone: DEFAULT_TIME_ZONE,
    }).format(date),
    gio: new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: DEFAULT_TIME_ZONE,
    }).format(date),
  };
}

export function dinhDangNgayGioDayDu(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: DEFAULT_TIME_ZONE,
  }).format(date);
}
