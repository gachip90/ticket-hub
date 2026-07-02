'use client';

import { Button, Card, Skeleton, Tag, Typography } from 'antd';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MainHeader } from '../../../../../components/main-header';
import { MainPageFrame } from '../../../../../components/main-page-frame';
import { apiGet, getStoredAuthUser } from '../../../../../lib/api';
import type { EventDetail } from '../../../../../lib/events';
import { dinhDangNgayGioDayDu, dinhDangTien } from '../../../../../lib/format';

export default function EventBookPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = getStoredAuthUser();

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(`/events/${params.id}/book`)}`);
      return;
    }

    async function loadEvent() {
      setIsLoading(true);
      setError('');

      try {
        const response = await apiGet<EventDetail>(`/api/events/${params.id}`);
        setEvent(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải chi tiết sự kiện.');
      } finally {
        setIsLoading(false);
      }
    }

    void loadEvent();
  }, [params.id, router]);

  return (
    <MainPageFrame header={<MainHeader />}>
      {isLoading ? (
        <Card className="rounded-[32px] border-slate-200">
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : error ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : event ? (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card
            variant="outlined"
            className="overflow-hidden rounded-[32px] border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
            styles={{ body: { padding: 0 } }}
          >
            <div
              className="h-[320px] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${event.imageUrl})` }}
            />
            <div className="space-y-5 p-7">
              <Tag className="m-0 rounded-full border-0 bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                {event.genreLabel}
              </Tag>
              <div>
                <Typography.Title
                  level={1}
                  className="mb-2 text-[34px] font-extrabold text-slate-950"
                >
                  {event.name}
                </Typography.Title>
                <Typography.Paragraph className="mb-0 text-base leading-7 text-slate-500">
                  {event.description}
                </Typography.Paragraph>
              </div>
              <div className="grid gap-3 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Thời gian diễn ra
                  </p>
                  <p>{dinhDangNgayGioDayDu(event.startAt)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Địa điểm
                  </p>
                  <p>{event.venue}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Mở bán
                  </p>
                  <p>{dinhDangNgayGioDayDu(event.salesOpenAt)}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Đóng bán
                  </p>
                  <p>{dinhDangNgayGioDayDu(event.salesCloseAt)}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-[32px] border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <Typography.Title
              level={3}
              className="mb-2 text-[28px] font-extrabold text-slate-950"
            >
              Các hạng vé
            </Typography.Title>
            <Typography.Paragraph className="mb-6 text-sm leading-6 text-slate-500">
              Sau khi chọn sự kiện, bạn có thể xem toàn bộ hạng vé khả dụng trước khi bước vào
              luồng giữ vé và thanh toán.
            </Typography.Paragraph>

            <div className="space-y-4">
              {event.ticketTypes.map((ticketType) => (
                <div
                  key={ticketType.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <Typography.Title
                        level={4}
                        className="mb-1 text-xl font-extrabold text-slate-950"
                      >
                        {ticketType.name}
                      </Typography.Title>
                      <Typography.Text className="text-sm text-slate-500">
                        {ticketType.availableQuantity}/{ticketType.totalQuantity} vé khả dụng
                      </Typography.Text>
                    </div>
                    <Typography.Text className="text-lg font-extrabold text-slate-950">
                      {dinhDangTien(ticketType.price)}
                    </Typography.Text>
                  </div>

                  <div className="grid gap-3 text-sm text-slate-500 sm:grid-cols-3">
                    <div>Còn trống: {ticketType.availableQuantity}</div>
                    <div>Đang giữ: {ticketType.heldQuantity}</div>
                    <div>Đã bán: {ticketType.soldQuantity}</div>
                  </div>
                </div>
              ))}
            </div>

            <Button type="primary" size="large" block className="mt-6 h-12 rounded-2xl">
              Tiếp tục đặt vé
            </Button>
          </Card>
        </div>
      ) : null}
    </MainPageFrame>
  );
}
