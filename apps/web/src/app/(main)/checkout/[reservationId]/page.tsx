"use client";

import {
  Alert,
  Button,
  Card,
  Descriptions,
  Result,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MainPageFrame } from "../../../../components/main-page-frame";
import { apiGet, apiPost, getStoredAuthUser } from "../../../../lib/api";
import {
  type ConfirmSandboxPaymentResponse,
  type CreateSandboxPaymentResponse,
  type FailSandboxPaymentResponse,
  type ReservationDetail,
  type SandboxPayment,
} from "../../../../lib/reservations";
import {
  dinhDangDemNguoc,
  dinhDangNgayGioDayDu,
  dinhDangTien,
} from "../../../../lib/format";

const SKELETON_PARAGRAPH_12_ROWS = {
  rows: 12,
  width: Array.from({ length: 12 }, () => "100%"),
};

type CheckoutStage = "idle" | "success" | "failed" | "expired";

export default function CheckoutPage() {
  const params = useParams<{ reservationId: string }>();
  const router = useRouter();
  const reservationId = params.reservationId;
  const idempotencyKeyRef = useRef<string>("");
  const [reservation, setReservation] = useState<ReservationDetail | null>(
    null,
  );
  const [payment, setPayment] = useState<SandboxPayment | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [checkoutStage, setCheckoutStage] = useState<CheckoutStage>("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isFailing, setIsFailing] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, []);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setCurrentTime(Date.now());
    }, 0);

    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      window.clearTimeout(syncTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const user = getStoredAuthUser();

    if (!user) {
      router.replace(
        `/login?redirect=${encodeURIComponent(`/checkout/${reservationId}`)}`,
      );
      return;
    }

    async function initializeCheckout() {
      setIsLoading(true);
      setError("");

      try {
        const reservationResponse = await apiGet<ReservationDetail>(
          `/api/reservations/${reservationId}`,
          { withAuth: true },
        );

        setReservation(reservationResponse);

        if (reservationResponse.status === "PAID") {
          setCheckoutStage("success");
          setPayment((currentPayment) =>
            currentPayment
              ? {
                  ...currentPayment,
                  status: "SUCCESS",
                }
              : currentPayment,
          );
          return;
        }

        if (
          reservationResponse.status === "EXPIRED" ||
          reservationResponse.status === "CANCELLED" ||
          reservationResponse.isExpired
        ) {
          setCheckoutStage("expired");
          return;
        }

        setIsCreatingPayment(true);
        const paymentResponse = await apiPost<CreateSandboxPaymentResponse>(
          "/api/payments/sandbox/create",
          { reservationId },
          { withAuth: true },
        );
        setPayment(paymentResponse.payment);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể khởi tạo trang thanh toán.",
        );
      } finally {
        setIsCreatingPayment(false);
        setIsLoading(false);
      }
    }

    void initializeCheckout();
  }, [reservationId, router]);

  const remainingMilliseconds = useMemo(() => {
    if (!reservation) {
      return 0;
    }

    return new Date(reservation.expiresAt).getTime() - currentTime;
  }, [currentTime, reservation]);

  const hasExpiredLocally =
    reservation?.status === "HELD" && remainingMilliseconds <= 0;
  const resolvedCheckoutStage: CheckoutStage =
    hasExpiredLocally && checkoutStage === "idle" ? "expired" : checkoutStage;

  async function refreshReservation() {
    setError("");

    try {
      const reservationResponse = await apiGet<ReservationDetail>(
        `/api/reservations/${reservationId}`,
        { withAuth: true },
      );

      setReservation(reservationResponse);

      if (reservationResponse.status === "PAID") {
        setCheckoutStage("success");
      } else if (
        reservationResponse.status === "EXPIRED" ||
        reservationResponse.status === "CANCELLED" ||
        reservationResponse.isExpired
      ) {
        setCheckoutStage("expired");
      } else {
        setCheckoutStage("idle");
      }
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Không thể cập nhật trạng thái đặt vé.",
      );
    }
  }

  async function confirmPayment() {
    if (!reservation) {
      return;
    }

    setIsConfirming(true);
    setError("");

    try {
      const response = await apiPost<ConfirmSandboxPaymentResponse>(
        "/api/payments/sandbox/confirm",
        {
          reservationId: reservation.id,
          idempotencyKey: idempotencyKeyRef.current,
        },
        { withAuth: true },
      );

      setPayment(response.payment);
      setOrderCode(response.order?.code ?? null);
      setReservation((currentReservation) =>
        currentReservation
          ? {
              ...currentReservation,
              status: response.reservation.status,
              expiresAt: response.reservation.expiresAt,
            }
          : currentReservation,
      );
      setCheckoutStage(
        response.reservation.status === "PAID" ? "success" : "idle",
      );
    } catch (confirmError) {
      const message =
        confirmError instanceof Error
          ? confirmError.message
          : "Không thể xác nhận thanh toán.";

      if (message.toLowerCase().includes("expired")) {
        setCheckoutStage("expired");
      }

      setError(message);
      await refreshReservation();
    } finally {
      setIsConfirming(false);
    }
  }

  async function failPayment() {
    if (!reservation) {
      return;
    }

    setIsFailing(true);
    setError("");

    try {
      const response = await apiPost<FailSandboxPaymentResponse>(
        "/api/payments/sandbox/fail",
        { reservationId: reservation.id },
        { withAuth: true },
      );

      setPayment(response.payment);
      setReservation((currentReservation) =>
        currentReservation
          ? {
              ...currentReservation,
              status: response.reservation.status,
              expiresAt: response.reservation.expiresAt,
            }
          : currentReservation,
      );
      setCheckoutStage("failed");
    } catch (failError) {
      const message =
        failError instanceof Error
          ? failError.message
          : "Không thể ghi nhận giao dịch thất bại.";

      if (message.toLowerCase().includes("expired")) {
        setCheckoutStage("expired");
      }

      setError(message);
      await refreshReservation();
    } finally {
      setIsFailing(false);
    }
  }

  const isReservationLocked =
    !reservation ||
    reservation.status !== "HELD" ||
    resolvedCheckoutStage === "expired" ||
    resolvedCheckoutStage === "success" ||
    hasExpiredLocally;

  return (
    <MainPageFrame>
      {isLoading ? (
        <Card className="rounded-4xl border-slate-200">
          <Skeleton
            active
            title={false}
            paragraph={SKELETON_PARAGRAPH_12_ROWS}
          />
        </Card>
      ) : !reservation ? (
        <Result
          status="error"
          title="Không tìm thấy phiên giữ vé"
          subTitle="Liên kết thanh toán này không hợp lệ hoặc bạn không có quyền truy cập."
          extra={
            <Button type="primary" onClick={() => router.push("/")}>
              Quay về trang sự kiện
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Space orientation="vertical" size={24} className="w-full">
            <Card className="rounded-4xl border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <Typography.Text className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Sandbox checkout
                  </Typography.Text>
                  <Typography.Title
                    level={2}
                    className="mb-2 mt-2 text-[32px] font-extrabold text-slate-950"
                  >
                    {reservation.event.name}
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0 text-sm leading-7 text-slate-500">
                    Hoàn tất thanh toán trước khi phiên giữ vé hết hạn
                  </Typography.Paragraph>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Thời gian còn lại
                  </p>
                  <p className="mt-2 text-[34px] font-extrabold tracking-[0.08em] text-slate-950">
                    {dinhDangDemNguoc(remainingMilliseconds)}
                  </p>
                  <Tag
                    color={
                      resolvedCheckoutStage === "success"
                        ? "success"
                        : hasExpiredLocally ||
                            resolvedCheckoutStage === "expired"
                          ? "error"
                          : "processing"
                    }
                    className="mt-3 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
                  >
                    {resolvedCheckoutStage === "success"
                      ? "Đã thanh toán"
                      : hasExpiredLocally || resolvedCheckoutStage === "expired"
                        ? "Hết hạn"
                        : "Đang giữ vé"}
                  </Tag>
                </div>
              </div>
            </Card>

            {error ? (
              <Alert
                type="error"
                showIcon
                title="Có lỗi xảy ra trong quá trình thanh toán"
                description={error}
                className="rounded-3xl"
              />
            ) : null}

            {resolvedCheckoutStage === "success" ? (
              <Result
                status="success"
                title="Thanh toán sandbox thành công"
                subTitle={
                  orderCode
                    ? `Mã đơn hàng của bạn là ${orderCode}. Bạn có thể tiếp tục theo dõi trạng thái trong lịch sử đơn hàng sau khi phase tiếp theo được nối.`
                    : "Đơn hàng đã được tạo và tồn kho đã chuyển từ held sang sold."
                }
                extra={[
                  <Button
                    key="reservation"
                    onClick={() => void refreshReservation()}
                  >
                    Tải lại trạng thái
                  </Button>,
                  <Button
                    key="home"
                    type="primary"
                    onClick={() => router.push("/")}
                  >
                    Về trang sự kiện
                  </Button>,
                ]}
              />
            ) : resolvedCheckoutStage === "failed" ? (
              <Result
                status="warning"
                title="Thanh toán thất bại"
                subTitle="Backend đã release reservation ngay lập tức theo flow sandbox hiện tại"
                extra={[
                  <Button
                    key="refresh"
                    onClick={() => void refreshReservation()}
                  >
                    Kiểm tra lại đơn đặt vé
                  </Button>,
                  <Button
                    key="home"
                    type="primary"
                    onClick={() => router.push("/")}
                  >
                    Về trang sự kiện
                  </Button>,
                ]}
              />
            ) : resolvedCheckoutStage === "expired" ? (
              <Result
                status="error"
                title="Phiên giữ vé đã hết hạn"
                subTitle="Phiên đặt chỗ đã hết hạn hoặc bị hủy. Vui lòng đặt lại để tiếp tục thanh toán."
                extra={[
                  <Button
                    key="refresh"
                    onClick={() => void refreshReservation()}
                  >
                    Tải lại trạng thái
                  </Button>,
                  <Button
                    key="home"
                    type="primary"
                    onClick={() => router.push("/")}
                  >
                    Về trang sự kiện
                  </Button>,
                ]}
              />
            ) : null}
          </Space>

          <Space orientation="vertical" size={24} className="w-full">
            <Card className="rounded-4xl border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <Typography.Title
                level={3}
                className="mb-5 text-[24px] font-extrabold text-slate-950"
              >
                Chi tiết đơn đặt vé
              </Typography.Title>

              <Descriptions
                column={1}
                colon={false}
                styles={{
                  label: { color: "#667085", width: "42%" },
                  content: { color: "#0f172a", fontWeight: 600 },
                }}
              >
                <Descriptions.Item label="Mã đặt chỗ">
                  {reservation.id}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color="blue">{reservation.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Địa điểm">
                  {reservation.event.venue}
                </Descriptions.Item>
                <Descriptions.Item label="Bắt đầu sự kiện">
                  {dinhDangNgayGioDayDu(reservation.event.startAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Hết hạn giữ vé">
                  {dinhDangNgayGioDayDu(reservation.expiresAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Người nhận vé">
                  {reservation.recipientName ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Email nhận vé">
                  {reservation.recipientEmail ?? "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {reservation.recipientPhone ?? "-"}
                </Descriptions.Item>
              </Descriptions>

              <div className="mt-6 space-y-3">
                {reservation.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Typography.Text className="block text-base font-extrabold text-slate-950">
                          {item.ticketTypeName}
                        </Typography.Text>
                        <Typography.Text className="text-sm text-slate-500">
                          {item.quantity} x {dinhDangTien(item.unitPrice)}
                        </Typography.Text>
                      </div>
                      <Typography.Text className="text-base font-extrabold text-slate-950">
                        {dinhDangTien(item.lineTotal)}
                      </Typography.Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-4xl border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <Typography.Title
                level={3}
                className="mb-3 text-[24px] font-extrabold text-slate-950"
              >
                Thanh toán sandbox
              </Typography.Title>
              <Typography.Paragraph className="mb-6 text-sm leading-7 text-slate-500">
                Đây là luồng thanh toán giả lập để test anti-overselling,
                timeout và idempotency
              </Typography.Paragraph>

              <div className="rounded-3xl bg-slate-950 px-5 py-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                  Tổng thanh toán
                </p>
                <p className="mt-2 text-[32px] font-extrabold">
                  {dinhDangTien(payment?.amount ?? reservation.totalAmount)}
                </p>
                <p className="mt-3 text-sm text-slate-300">
                  Provider: {payment?.provider ?? "SANDBOX"} · Status:{" "}
                  {payment?.status ??
                    (isCreatingPayment ? "PENDING" : "CHUA_KHOI_TAO")}
                </p>
              </div>

              <div className="mt-6 grid gap-3">
                <Button
                  type="primary"
                  size="large"
                  className="h-12 rounded-2xl"
                  loading={isConfirming}
                  disabled={isReservationLocked || isFailing}
                  onClick={() => void confirmPayment()}
                >
                  Xác nhận thanh toán thành công
                </Button>
                <Button
                  size="large"
                  danger
                  className="h-12 rounded-2xl"
                  loading={isFailing}
                  disabled={isReservationLocked || isConfirming}
                  onClick={() => void failPayment()}
                >
                  Mô phỏng thanh toán thất bại
                </Button>
                <Button
                  size="large"
                  className="h-12 rounded-2xl"
                  disabled={isConfirming || isFailing}
                  onClick={() => void refreshReservation()}
                >
                  Tải lại trạng thái phiên đặt chỗ
                </Button>
              </div>
            </Card>
          </Space>
        </div>
      )}
    </MainPageFrame>
  );
}
