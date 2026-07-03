"use client";

import { Button, Card, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import { getStoredAuthUser } from "../lib/api";
import { resolvePublicAssetUrl } from "../lib/assets";
import type { EventSummary } from "../lib/events";
import { dinhDangNgayGio, dinhDangTien } from "../lib/format";

type EventCardProps = {
  event: EventSummary;
};

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-slate-400"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.66667 1.66667V5M13.3333 1.66667V5M2.5 8.33333H17.5M4.16667 3.33333H15.8333C16.7538 3.33333 17.5 4.07953 17.5 5V15.8333C17.5 16.7538 16.7538 17.5 15.8333 17.5H4.16667C3.24619 17.5 2.5 16.7538 2.5 15.8333V5C2.5 4.07953 3.24619 3.33333 4.16667 3.33333Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-slate-400"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 5.83333V10L12.5 12.5M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39763 18.3333 1.66667 14.6024 1.66667 10C1.66667 5.39763 5.39763 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0 text-slate-400"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.6667 8.33333C16.6667 13.3333 10 18.3333 10 18.3333C10 18.3333 3.33333 13.3333 3.33333 8.33333C3.33333 4.65144 6.3171 1.66667 10 1.66667C13.6829 1.66667 16.6667 4.65144 16.6667 8.33333Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 10.8333C11.3807 10.8333 12.5 9.71405 12.5 8.33333C12.5 6.95262 11.3807 5.83333 10 5.83333C8.61929 5.83333 7.5 6.95262 7.5 8.33333C7.5 9.71405 8.61929 10.8333 10 10.8333Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const { ngay, gio } = dinhDangNgayGio(event.startAt);

  function handleOpenDetails() {
    const user = getStoredAuthUser();

    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/events/${event.id}/book`)}`,
      );
      return;
    }

    router.push(`/events/${event.id}/book`);
  }

  return (
    <Card
      variant="outlined"
      className="h-full overflow-hidden rounded-[28px] border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      styles={{ body: { padding: 0 } }}
      cover={
        <button
          type="button"
          onClick={handleOpenDetails}
          className="block h-56 w-full cursor-pointer overflow-hidden text-left"
        >
          <div
            className="h-full w-full bg-cover bg-center transition duration-300 hover:scale-[1.03]"
            style={{
              backgroundImage: `url(${resolvePublicAssetUrl(event.imageUrl)})`,
            }}
          />
        </button>
      }
    >
      <div className="flex min-h-107.5 flex-col gap-5 p-6">
        <div>
          <Tag className="mb-3 ml-0 mr-0 rounded-full border-0 bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600">
            {event.genreLabel}
          </Tag>

          <button
            type="button"
            onClick={handleOpenDetails}
            className="mb-3 block cursor-pointer text-left"
          >
            <Typography.Title
              level={3}
              className="mb-0 text-[24px] font-extrabold leading-8 text-slate-950 transition hover:text-blue-600"
            >
              {event.name}
            </Typography.Title>
          </button>

          <Typography.Text className="block text-lg font-extrabold text-slate-950">
            Từ {dinhDangTien(event.lowestPrice)}
          </Typography.Text>
        </div>

        <Typography.Paragraph className="mb-0 line-clamp-3 text-sm leading-6 text-slate-500">
          {event.description}
        </Typography.Paragraph>

        <div className="space-y-3 text-sm leading-6 text-slate-500">
          <div className="flex items-center gap-2">
            <CalendarIcon />
            <span>{ngay}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon />
            <span>{gio}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPinIcon />
            <span>{event.venue}</span>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-5">
          <div className="flex-1">
            <Typography.Text className="block text-sm font-semibold text-slate-900">
              {event.availableTickets}/{event.totalTickets} vé còn lại
            </Typography.Text>
            <Typography.Text className="text-xs uppercase tracking-[0.16em] text-slate-400">
              {event.ticketTypeCount} hạng vé
            </Typography.Text>
          </div>

          <Button
            type="primary"
            className="h-11 shrink-0 rounded-2xl px-5"
            onClick={handleOpenDetails}
          >
            Xem chi tiết
          </Button>
        </div>
      </div>
    </Card>
  );
}
