"use client";

import { Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { EventCard } from "../../components/event-card";
import { MainHeader } from "../../components/main-header";
import { MainPageFrame } from "../../components/main-page-frame";
import { apiGet } from "../../lib/api";
import type { EventSummary } from "../../lib/events";

export default function HomePage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEvents() {
      setIsLoading(true);
      setError("");

      const path = submittedKeyword.trim()
        ? `/api/events/search?q=${encodeURIComponent(submittedKeyword.trim())}`
        : "/api/events";

      try {
        const response = await apiGet<EventSummary[]>(path);
        setEvents(response);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải danh sách sự kiện.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadEvents();
  }, [submittedKeyword]);

  return (
    <MainPageFrame
      header={
        <MainHeader
          showSearch
          searchValue={searchInput}
          searchPlaceholder="Tìm kiếm sự kiện..."
          onSearchChange={setSearchInput}
          onSearchSubmit={(value) => setSubmittedKeyword(value)}
        />
      }
    >
      <div className="mb-8 max-w-2xl">
        <Typography.Title
          level={1}
          className="mb-2 text-[36px] font-extrabold tracking-tight text-slate-950"
        >
          Sự kiện sắp diễn ra
        </Typography.Title>
        <Typography.Paragraph className="mb-0 text-base leading-7 text-slate-500">
          Khám phá các đêm diễn nổi bật và chọn sự kiện phù hợp
        </Typography.Paragraph>
      </div>

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white/70">
          <Spin size="large" />
        </div>
      ) : error ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {!isLoading && !error && events.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Không tìm thấy sự kiện phù hợp với từ khóa tìm kiếm.
        </div>
      ) : null}
    </MainPageFrame>
  );
}
