"use client";

import { Alert, Button, Card, Form, Input, Modal, Tag, Typography } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainHeader } from "../../../../../../components/main-header";
import { MainPageFrame } from "../../../../../../components/main-page-frame";
import { apiGet, apiPost, getStoredAuthUser } from "../../../../../../lib/api";
import type {
  EventDetail,
  EventInventoryResponse,
  EventTicketType,
} from "../../../../../../lib/events";
import {
  dinhDangNgayGioDayDu,
  dinhDangTien,
} from "../../../../../../lib/format";
import { mergeInventoryIntoEvent } from "../../../../../../lib/inventory";
import { subscribeEventInventoryStream } from "../../../../../../lib/inventory-stream";
import type { ReservationDetail } from "../../../../../../lib/reservations";

type RecipientFormValues = {
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
};

function SeatMapIllustration() {
  const blocks = [
    { label: "VIP Left", color: "bg-rose-400/85 text-white" },
    { label: "VIP Center", color: "bg-rose-300/90 text-slate-950" },
    { label: "VIP Right", color: "bg-rose-400/85 text-white" },
    { label: "Standard A", color: "bg-emerald-400/80 text-slate-950" },
    { label: "Standard B", color: "bg-emerald-300/80 text-slate-950" },
    { label: "Economy Left", color: "bg-sky-300/75 text-slate-950" },
    { label: "Economy Right", color: "bg-sky-400/70 text-slate-950" },
  ];

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-[#0f172a] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.20)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.10),_transparent_42%)]" />
      <div className="relative">
        <div className="mx-auto mb-8 w-[78%] max-w-[460px] rounded-[28px] bg-amber-50 px-6 py-5 text-center shadow-[0_20px_50px_rgba(15,23,42,0.22)]">
          <p className="text-[12px] font-bold uppercase tracking-[0.4em] text-amber-600">
            Stage
          </p>
          <p className="mt-2 text-[34px] font-extrabold tracking-[0.08em] text-amber-950">
            SEAT MAP
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {blocks.slice(0, 3).map((block) => (
            <div
              key={block.label}
              className={`rounded-[24px] px-4 py-7 text-center text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ${block.color}`}
            >
              {block.label}
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {blocks.slice(3, 5).map((block) => (
            <div
              key={block.label}
              className={`rounded-[28px] px-4 py-10 text-center text-base font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] ${block.color}`}
            >
              {block.label}
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {blocks.slice(5).map((block) => (
            <div
              key={block.label}
              className={`rounded-[30px] px-4 py-12 text-center text-base font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] ${block.color}`}
            >
              {block.label}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 px-5 py-5 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
            Sơ đồ khu vực chỗ ngồi
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            Minh họa này giúp người dùng hình dung bố cục sân khấu và các vùng
            vé
          </p>
        </div>
      </div>
    </div>
  );
}

function Counter({
  value,
  onDecrease,
  onIncrease,
  disabled,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2">
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled || value === 0}
        className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-45"
      >
        -
      </button>
      <span className="min-w-6 text-center text-base font-extrabold text-slate-950">
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-lg font-bold text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-45"
      >
        +
      </button>
    </div>
  );
}

export default function EventTicketSelectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [recipientForm] = Form.useForm<RecipientFormValues>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<
    string | null
  >(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recipientError, setRecipientError] = useState("");
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  useEffect(() => {
    const user = getStoredAuthUser();

    if (!user) {
      router.replace(
        `/login?redirect=${encodeURIComponent(`/events/${params.id}/book/select`)}`,
      );
      return;
    }

    recipientForm.setFieldsValue({
      recipientName: user.name,
      recipientEmail: user.email,
      recipientPhone: "",
    });

    async function loadEvent() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiGet<EventDetail>(`/api/events/${params.id}`);
        setEvent(response);

        const firstAvailableTicketType = response.ticketTypes.find(
          (ticketType) => ticketType.availableQuantity > 0,
        );

        setSelectedTicketTypeId(firstAvailableTicketType?.id ?? null);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải dữ liệu đặt vé.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadEvent();
  }, [params.id, recipientForm, router]);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    let isCancelled = false;

    async function syncInventory() {
      try {
        const inventory = await apiGet<EventInventoryResponse>(
          `/api/events/${params.id}/inventory`,
        );

        if (isCancelled) {
          return;
        }

        setEvent((currentEvent) => {
          if (!currentEvent) {
            return currentEvent;
          }

          return mergeInventoryIntoEvent(currentEvent, inventory);
        });
      } catch {
        // Keep the last good snapshot if polling fails.
      }
    }

    const timer = window.setInterval(() => {
      void syncInventory();
    }, 5000);

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [params.id]);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    return subscribeEventInventoryStream({
      eventId: params.id,
      onInventory: (inventory) => {
        setEvent((currentEvent) => {
          if (!currentEvent) {
            return currentEvent;
          }

          return mergeInventoryIntoEvent(currentEvent, inventory);
        });
      },
      onConnectionChange: setIsRealtimeConnected,
    });
  }, [params.id]);

  const selectedTicketType =
    event?.ticketTypes.find(
      (ticketType) => ticketType.id === selectedTicketTypeId,
    ) ?? null;
  const totalAmount = selectedTicketType
    ? selectedTicketType.price * quantity
    : 0;

  function handleIncrease(ticketType: EventTicketType) {
    if (ticketType.availableQuantity <= 0) {
      return;
    }

    if (selectedTicketTypeId !== ticketType.id) {
      setSelectedTicketTypeId(ticketType.id);
      setQuantity(1);
      return;
    }

    setQuantity((currentQuantity) =>
      Math.min(currentQuantity + 1, Math.min(ticketType.availableQuantity, 10)),
    );
  }

  function handleDecrease(ticketType: EventTicketType) {
    if (selectedTicketTypeId !== ticketType.id) {
      return;
    }

    setQuantity((currentQuantity) => {
      const nextQuantity = Math.max(currentQuantity - 1, 0);

      if (nextQuantity === 0) {
        setSelectedTicketTypeId(null);
        return 1;
      }

      return nextQuantity;
    });
  }

  function handleBackClick() {
    setIsLeaveModalOpen(true);
  }

  function handleConfirmLeave() {
    if (!event) {
      router.push("/");
      return;
    }

    router.push(`/events/${event.id}/book`);
  }

  function handleOpenRecipientModal() {
    if (!selectedTicketType || !event) {
      setError("Bạn cần chọn một hạng vé trước khi tiếp tục.");
      return;
    }

    setRecipientError("");

    const user = getStoredAuthUser();

    if (user) {
      recipientForm.setFieldsValue({
        recipientName:
          recipientForm.getFieldValue("recipientName") || user.name,
        recipientEmail:
          recipientForm.getFieldValue("recipientEmail") || user.email,
        recipientPhone: recipientForm.getFieldValue("recipientPhone") || "",
      });
    }

    setIsRecipientModalOpen(true);
  }

  async function handleReserveTickets(values: RecipientFormValues) {
    if (!selectedTicketType || !event) {
      setError("Bạn cần chọn một hạng vé trước khi tiếp tục.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setRecipientError("");

    try {
      const reservation = await apiPost<ReservationDetail>(
        "/api/reservations/hold",
        {
          eventId: event.id,
          ticketTypeId: selectedTicketType.id,
          quantity,
          recipientName: values.recipientName.trim(),
          recipientEmail: values.recipientEmail.trim().toLowerCase(),
          recipientPhone: values.recipientPhone.trim(),
        },
        { withAuth: true },
      );

      setIsRecipientModalOpen(false);
      router.push(`/checkout/${reservation.id}`);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Không thể giữ vé vào lúc này.";
      setError(message);
      setRecipientError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <MainPageFrame header={<MainHeader />}>
      <Modal
        open={isRecipientModalOpen}
        forceRender
        onCancel={() => {
          if (!isSubmitting) {
            setIsRecipientModalOpen(false);
            setRecipientError("");
          }
        }}
        footer={null}
        centered
        width={640}
      >
        <div className="px-2 py-2">
          <Typography.Title
            level={3}
            className="mb-2 text-center text-[28px] font-extrabold"
          >
            Thông tin nhận vé
          </Typography.Title>
          <Typography.Paragraph className="mb-6 text-center text-base text-slate-500">
            Điền thông tin người đại diện nhận vé
          </Typography.Paragraph>

          {recipientError ? (
            <Alert
              type="error"
              showIcon
              title="Chưa thể tiếp tục"
              description={recipientError}
              className="mb-5 rounded-[22px]"
            />
          ) : null}

          <Form<RecipientFormValues>
            form={recipientForm}
            layout="vertical"
            onFinish={(values) => void handleReserveTickets(values)}
            disabled={isSubmitting}
            requiredMark
            className="[&_.ant-form-item-label>label]:text-sm [&_.ant-form-item-label>label]:font-bold [&_.ant-form-item]:mb-4"
          >
            <Form.Item
              label="Họ và tên"
              name="recipientName"
              rules={[
                { required: true, message: "Vui lòng nhập họ và tên." },
                { max: 100, message: "Họ và tên tối đa 100 ký tự." },
              ]}
            >
              <Input
                size="large"
                placeholder="Nguyễn Văn A"
                className="rounded-[18px] px-4"
              />
            </Form.Item>

            <Form.Item
              label="Email"
              name="recipientEmail"
              rules={[
                { required: true, message: "Vui lòng nhập email." },
                { type: "email", message: "Email không hợp lệ." },
              ]}
            >
              <Input
                size="large"
                placeholder="example@email.com"
                className="rounded-[18px] px-4"
              />
            </Form.Item>

            <Form.Item
              label="Số điện thoại"
              name="recipientPhone"
              rules={[
                { required: true, message: "Vui lòng nhập số điện thoại." },
                {
                  pattern: /^[0-9+\-\s()]{8,20}$/,
                  message: "Số điện thoại không hợp lệ.",
                },
              ]}
            >
              <Input
                size="large"
                placeholder="0901234567"
                className="rounded-[18px] px-4"
              />
            </Form.Item>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                size="large"
                className="h-12 rounded-2xl border-slate-200"
                onClick={() => {
                  setIsRecipientModalOpen(false);
                  setRecipientError("");
                }}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                className="h-12 rounded-2xl"
                loading={isSubmitting}
              >
                Tiếp tục thanh toán
              </Button>
            </div>
          </Form>
        </div>
      </Modal>

      <Modal
        open={isLeaveModalOpen}
        onCancel={() => setIsLeaveModalOpen(false)}
        footer={null}
        centered
        width={640}
      >
        <div className="px-2 py-2">
          <Typography.Title
            level={3}
            className="mb-3 text-[28px] font-extrabold"
          >
            Rời phiên chọn vé
          </Typography.Title>
          <Typography.Paragraph className="mb-6 text-base leading-7 text-slate-500">
            Bạn đang rời phiên chọn vé hiện tại. Khi quay lại, lượt chọn vé này
            sẽ không còn được giữ và bạn sẽ cần xếp hàng lại từ đầu.
          </Typography.Paragraph>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              size="large"
              className="h-12 rounded-2xl border-slate-200"
              onClick={() => setIsLeaveModalOpen(false)}
            >
              Tiếp tục chọn vé
            </Button>
            <Button
              type="primary"
              size="large"
              danger
              className="h-12 rounded-2xl border-0 bg-pink-500 shadow-none hover:!bg-pink-600"
              onClick={handleConfirmLeave}
            >
              Rời phiên chọn vé
            </Button>
          </div>
        </div>
      </Modal>

      {isLoading ? (
        <Card className="rounded-[32px] border-slate-200">
          <div className="grid gap-6 xl:grid-cols-[minmax(520px,0.92fr)_minmax(640px,1.08fr)]">
            <div className="h-[760px] animate-pulse rounded-[36px] bg-slate-200/70" />
            <div className="h-[760px] animate-pulse rounded-[36px] bg-slate-200/70" />
          </div>
        </Card>
      ) : error && !event ? (
        <Alert
          type="error"
          showIcon
          title="Không thể mở trang chọn vé"
          description={error}
          className="rounded-[28px]"
        />
      ) : event ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(520px,0.92fr)_minmax(640px,1.08fr)]">
          <SeatMapIllustration />

          <div className="overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.10)]">
            <div className="border-b border-slate-100 bg-[linear-gradient(90deg,rgba(14,165,233,0.10),rgba(59,130,246,0.02),rgba(244,114,182,0.08))] px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="text"
                  className="h-10 rounded-full px-3 text-slate-500"
                  onClick={handleBackClick}
                >
                  {"<- Quay lại"}
                </Button>
                <Tag
                  className={`m-0 rounded-full border-0 px-4 py-2 text-sm font-bold ${
                    isRealtimeConnected
                      ? "bg-sky-50 text-sky-600"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {isRealtimeConnected
                    ? "Đang đồng bộ realtime"
                    : "Đang dùng polling dự phòng"}
                </Tag>
              </div>

              <div className="mt-5">
                <Typography.Title
                  level={3}
                  className="mb-2 text-[28px] font-extrabold text-slate-950"
                >
                  {event.name}
                </Typography.Title>
                <Typography.Paragraph className="mb-0 text-sm leading-7 text-slate-500">
                  {dinhDangNgayGioDayDu(event.startAt)} · {event.venue}
                </Typography.Paragraph>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 min-[1800px]:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-w-0">
                {error ? (
                  <Alert
                    type="error"
                    showIcon
                    title="Chưa thể giữ vé"
                    description={error}
                    className="mb-5 rounded-[22px]"
                  />
                ) : null}

                <div className="space-y-4">
                  {event.ticketTypes.map((ticketType) => {
                    const isSelected = selectedTicketTypeId === ticketType.id;
                    const displayedQuantity = isSelected ? quantity : 0;
                    const isSoldOut = ticketType.availableQuantity <= 0;

                    return (
                      <div
                        key={ticketType.id}
                        className={`rounded-[26px] border px-5 py-5 transition ${
                          isSelected
                            ? "border-blue-200 bg-blue-50/70"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-5">
                          <div className="min-w-0">
                            <Typography.Text className="block text-[21px] font-extrabold text-slate-950">
                              {ticketType.name}
                            </Typography.Text>
                            <p className="mt-2 text-sm leading-7 text-slate-500">
                              Mỗi lượt giữ vé hỗ trợ một hạng vé, tối đa 10 vé
                            </p>
                          </div>

                          <div className="flex w-full min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between xl:w-auto xl:flex-none xl:justify-end">
                            {isSoldOut ? (
                              <Tag className="m-0 shrink-0 rounded-full border-0 bg-slate-100 px-3 py-1 text-sm font-bold text-slate-500">
                                Hết vé
                              </Tag>
                            ) : (
                              <Typography.Text className="shrink-0 whitespace-nowrap text-lg font-extrabold text-slate-950">
                                {dinhDangTien(ticketType.price)}
                              </Typography.Text>
                            )}

                            <Counter
                              value={displayedQuantity}
                              onDecrease={() => handleDecrease(ticketType)}
                              onIncrease={() => handleIncrease(ticketType)}
                              disabled={isSubmitting || isSoldOut}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="rounded-[28px] bg-slate-50/90 px-4 py-4 min-[1800px]:self-start">
                <Typography.Text className="text-sm font-semibold text-slate-500">
                  Vé đã chọn
                </Typography.Text>

                {selectedTicketType ? (
                  <div className="mt-5 rounded-3xl bg-white px-5 py-5 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
                    <Typography.Text className="block text-base font-extrabold text-slate-950">
                      {selectedTicketType.name}
                    </Typography.Text>
                    <Typography.Text className="mt-1 block text-sm text-slate-500">
                      {quantity} x {dinhDangTien(selectedTicketType.price)}
                    </Typography.Text>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-sm font-semibold text-slate-500">
                        Tạm tính
                      </span>
                      <span className="text-lg font-extrabold text-slate-950">
                        {dinhDangTien(totalAmount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-45 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm leading-7 text-slate-400">
                    Bạn chưa chọn vé nào.
                  </div>
                )}

                <Button
                  type="primary"
                  size="large"
                  block
                  className="mt-6 h-12 rounded-2xl"
                  loading={isSubmitting}
                  disabled={!selectedTicketType || quantity <= 0}
                  onClick={handleOpenRecipientModal}
                >
                  Tiếp tục
                </Button>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
    </MainPageFrame>
  );
}
