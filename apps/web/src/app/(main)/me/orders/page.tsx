"use client";

import {
  Alert,
  Button,
  Card,
  Empty,
  Result,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MainHeader } from "../../../../components/main-header";
import { MainPageFrame } from "../../../../components/main-page-frame";
import { apiGet, getStoredAuthUser } from "../../../../lib/api";
import { dinhDangNgayGioDayDu, dinhDangTien } from "../../../../lib/format";
import type { UserOrder } from "../../../../lib/orders";

const SKELETON_PARAGRAPH_12_ROWS = {
  rows: 12,
  width: Array.from({ length: 12 }, () => "100%"),
};

const SKELETON_PARAGRAPH_8_ROWS = {
  rows: 8,
  width: Array.from({ length: 8 }, () => "100%"),
};

function paymentStatusColor(
  status: NonNullable<UserOrder["payment"]>["status"],
) {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "FAILED":
      return "error";
    case "TIMEOUT":
      return "warning";
    case "PENDING":
      return "processing";
    default:
      return "default";
  }
}

function paymentStatusLabel(
  status: NonNullable<UserOrder["payment"]>["status"],
) {
  switch (status) {
    case "SUCCESS":
      return "Thành công";
    case "FAILED":
      return "Thất bại";
    case "TIMEOUT":
      return "Hết thời gian";
    case "PENDING":
      return "Đang chờ";
    default:
      return status;
  }
}

export default function OrdersPage() {
  const router = useRouter();
  const [currentUser] = useState(() => getStoredAuthUser());
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [isLoading, setIsLoading] = useState(() => !!currentUser);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) {
      router.replace(`/login?redirect=${encodeURIComponent("/me/orders")}`);
      return;
    }

    let isCancelled = false;

    async function loadOrders() {
      try {
        const nextOrders = await apiGet<UserOrder[]>("/api/me/orders", {
          withAuth: true,
        });

        if (isCancelled) {
          return;
        }

        setOrders(nextOrders);
        setError("");
      } catch (loadError) {
        if (isCancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải lịch sử đặt vé.",
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isCancelled = true;
    };
  }, [currentUser, router]);

  if (isLoading) {
    return (
      <MainPageFrame header={<MainHeader />}>
        <Card className="rounded-[32px] border-slate-200">
          <Skeleton
            active
            title={false}
            paragraph={SKELETON_PARAGRAPH_12_ROWS}
          />
        </Card>
      </MainPageFrame>
    );
  }

  if (!currentUser) {
    return (
      <MainPageFrame header={<MainHeader />}>
        <Card className="rounded-[32px] border-slate-200">
          <Skeleton
            active
            title={false}
            paragraph={SKELETON_PARAGRAPH_8_ROWS}
          />
        </Card>
      </MainPageFrame>
    );
  }

  if (error) {
    return (
      <MainPageFrame header={<MainHeader />}>
        <Result
          status="warning"
          title="Chưa thể tải lịch sử đặt vé"
          subTitle={error}
          extra={
            <Space>
              <Button onClick={() => window.location.reload()}>Thử lại</Button>
              <Button type="primary" onClick={() => router.push("/")}>
                Về trang sự kiện
              </Button>
            </Space>
          }
        />
      </MainPageFrame>
    );
  }

  return (
    <MainPageFrame header={<MainHeader />}>
      <div className="space-y-6">
        <div className="rounded-[32px] border border-slate-200 bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <Typography.Title
            level={1}
            className="mb-2 text-[32px] font-extrabold text-slate-950"
          >
            Lịch sử đặt vé
          </Typography.Title>
          <Typography.Paragraph className="mb-0 max-w-3xl text-sm leading-7 text-slate-500">
            Theo dõi các đơn đã thanh toán và trạng thái giao dịch
          </Typography.Paragraph>
        </div>

        {orders.length ? (
          <div className="grid gap-5">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="rounded-[28px] border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <Typography.Text className="block text-lg font-extrabold text-slate-950">
                      {order.code}
                    </Typography.Text>
                    <Typography.Text className="text-sm text-slate-500">
                      {order.event.name}
                    </Typography.Text>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Tag color="green">{dinhDangTien(order.totalAmount)}</Tag>
                    {order.payment ? (
                      <Tag color={paymentStatusColor(order.payment.status)}>
                        {paymentStatusLabel(order.payment.status)}
                      </Tag>
                    ) : (
                      <Tag>Chưa tạo thanh toán</Tag>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <div className="space-y-2 text-sm text-slate-500">
                    <p>Tạo lúc: {dinhDangNgayGioDayDu(order.createdAt)}</p>
                    <p>
                      Sự kiện: {dinhDangNgayGioDayDu(order.event.startAt)} ·{" "}
                      {order.event.venue}
                    </p>
                    <p>
                      Người nhận vé:{" "}
                      {order.reservation.recipientName ?? currentUser.name}
                    </p>
                    <p>
                      Email nhận vé:{" "}
                      {order.reservation.recipientEmail ?? currentUser.email}
                    </p>
                    {order.reservation.recipientPhone ? (
                      <p>Số điện thoại: {order.reservation.recipientPhone}</p>
                    ) : null}
                  </div>

                  <div className="rounded-[24px] bg-slate-50/80 p-4">
                    <Typography.Text className="block text-sm font-bold text-slate-950">
                      Chi tiết vé
                    </Typography.Text>
                    <div className="mt-3 space-y-2 text-sm text-slate-500">
                      {order.reservation.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <span>
                            {item.ticketTypeName} x{item.quantity}
                          </span>
                          <span className="font-semibold text-slate-700">
                            {dinhDangTien(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {order.payment ? (
                  <Alert
                    className="mt-5 rounded-[20px]"
                    type={
                      order.payment.status === "SUCCESS"
                        ? "success"
                        : order.payment.status === "FAILED"
                          ? "error"
                          : order.payment.status === "TIMEOUT"
                            ? "warning"
                            : "info"
                    }
                    showIcon
                    message={`Thanh toán sandbox: ${paymentStatusLabel(order.payment.status)}`}
                    description={`Mã giao dịch ${order.payment.id} · Tạo lúc ${dinhDangNgayGioDayDu(order.payment.createdAt)}`}
                  />
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-4xl border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <Empty
              description="Bạn chưa có đơn đặt vé nào"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => router.push("/")}>
                Khám phá sự kiện
              </Button>
            </Empty>
          </Card>
        )}
      </div>
    </MainPageFrame>
  );
}
