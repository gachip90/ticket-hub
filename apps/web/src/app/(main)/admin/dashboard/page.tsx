"use client";

import {
  Alert,
  Button,
  Card,
  Empty,
  Result,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MainHeader } from "../../../../components/main-header";
import { MainPageFrame } from "../../../../components/main-page-frame";
import { apiGet, getStoredAuthUser } from "../../../../lib/api";
import type {
  AdminHeldReservation,
  AdminInventoryItem,
  AdminOrder,
  AdminStatsResponse,
} from "../../../../lib/admin";
import type { EventInventoryResponse } from "../../../../lib/events";
import {
  dinhDangDemNguoc,
  dinhDangNgayGioDayDu,
  dinhDangTien,
} from "../../../../lib/format";
import { subscribeAllInventoryStream } from "../../../../lib/inventory-stream";

type DashboardState = {
  stats: AdminStatsResponse | null;
  heldReservations: AdminHeldReservation[];
  orders: AdminOrder[];
};

function reservationStatusColor(status: AdminHeldReservation["status"]) {
  switch (status) {
    case "HELD":
      return "processing";
    case "PAID":
      return "success";
    case "EXPIRED":
      return "error";
    case "CANCELLED":
      return "default";
    default:
      return "default";
  }
}

function paymentStatusColor(
  status: NonNullable<AdminOrder["payment"]>["status"],
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

function hienThiTrangThaiDatCho(
  reservation: Pick<AdminHeldReservation, "status" | "isExpired">,
) {
  if (reservation.isExpired) {
    return "Đã quá hạn, chờ release";
  }

  switch (reservation.status) {
    case "HELD":
      return "Đang giữ";
    case "PAID":
      return "Đã thanh toán";
    case "EXPIRED":
      return "Hết hạn";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return reservation.status;
  }
}

function hienThiTrangThaiThanhToan(
  status: NonNullable<AdminOrder["payment"]>["status"],
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

function applyInventorySnapshot(
  stats: AdminStatsResponse,
  inventory: EventInventoryResponse,
) {
  const inventoryByTicketTypeId = new Map(
    inventory.ticketTypes.map((ticketType) => [
      ticketType.ticketTypeId,
      ticketType,
    ]),
  );

  const nextInventory = stats.inventory.map((item) => {
    const snapshot = inventoryByTicketTypeId.get(item.ticketTypeId);

    if (!snapshot) {
      return item;
    }

    return {
      ...item,
      totalQuantity: snapshot.totalQuantity,
      availableQuantity: snapshot.availableQuantity,
      heldQuantity: snapshot.heldQuantity,
      soldQuantity: snapshot.soldQuantity,
    };
  });

  const totals = nextInventory.reduce(
    (aggregate, item) => ({
      totalSoldTickets: aggregate.totalSoldTickets + item.soldQuantity,
      totalHeldTickets: aggregate.totalHeldTickets + item.heldQuantity,
      totalAvailableTickets:
        aggregate.totalAvailableTickets + item.availableQuantity,
      totalInventoryTickets:
        aggregate.totalInventoryTickets + item.totalQuantity,
    }),
    {
      totalSoldTickets: 0,
      totalHeldTickets: 0,
      totalAvailableTickets: 0,
      totalInventoryTickets: 0,
    },
  );

  return {
    ...stats,
    ...totals,
    inventory: nextInventory,
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser] = useState(() => getStoredAuthUser());
  const [state, setState] = useState<DashboardState>({
    stats: null,
    heldReservations: [],
    orders: [],
  });
  const [isLoading, setIsLoading] = useState(
    () => currentUser?.role === "ADMIN",
  );
  const [error, setError] = useState("");
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      setNow(Date.now());
    }, 0);

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearTimeout(syncTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      router.replace(
        `/login?redirect=${encodeURIComponent("/admin/dashboard")}`,
      );
      return;
    }

    if (currentUser.role !== "ADMIN") {
      return;
    }

    let isCancelled = false;

    async function loadDashboard() {
      try {
        const [statsResult, heldReservationsResult, ordersResult] =
          await Promise.allSettled([
            apiGet<AdminStatsResponse>("/api/admin/stats", { withAuth: true }),
            apiGet<AdminHeldReservation[]>("/api/admin/reservations/held", {
              withAuth: true,
            }),
            apiGet<AdminOrder[]>("/api/admin/orders", { withAuth: true }),
          ]);

        if (isCancelled) {
          return;
        }

        let nextError = "";

        setState((currentState) => {
          const errors: string[] = [];

          if (statsResult.status === "rejected") {
            errors.push(
              statsResult.reason instanceof Error
                ? statsResult.reason.message
                : "Không thể tải số liệu tổng quan.",
            );
          }

          if (heldReservationsResult.status === "rejected") {
            errors.push(
              heldReservationsResult.reason instanceof Error
                ? heldReservationsResult.reason.message
                : "Không thể tải danh sách giữ vé.",
            );
          }

          if (ordersResult.status === "rejected") {
            errors.push(
              ordersResult.reason instanceof Error
                ? ordersResult.reason.message
                : "Không thể tải đơn hàng gần đây.",
            );
          }

          nextError = errors.join(" ");

          return {
            stats:
              statsResult.status === "fulfilled"
                ? statsResult.value
                : currentState.stats,
            heldReservations:
              heldReservationsResult.status === "fulfilled"
                ? heldReservationsResult.value
                : currentState.heldReservations,
            orders:
              ordersResult.status === "fulfilled"
                ? ordersResult.value
                : currentState.orders,
          };
        });

        setError(nextError);
      } catch (loadError) {
        if (isCancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Không thể tải trang quản trị.",
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 15000);

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [currentUser, router]);

  useEffect(() => {
    return subscribeAllInventoryStream({
      onInventory: (inventory) => {
        setState((currentState) => ({
          ...currentState,
          stats: currentState.stats
            ? applyInventorySnapshot(currentState.stats, inventory)
            : currentState.stats,
        }));
      },
      onConnectionChange: setIsRealtimeConnected,
    });
  }, []);

  const inventoryByEvent = useMemo(() => {
    const groups = new Map<
      string,
      {
        eventId: string;
        eventName: string;
        startAt: string;
        venue: string;
        ticketTypes: AdminInventoryItem[];
      }
    >();

    for (const item of state.stats?.inventory ?? []) {
      const currentGroup = groups.get(item.eventId);

      if (currentGroup) {
        currentGroup.ticketTypes.push(item);
        continue;
      }

      groups.set(item.eventId, {
        eventId: item.eventId,
        eventName: item.eventName,
        startAt: item.startAt,
        venue: item.venue,
        ticketTypes: [item],
      });
    }

    return Array.from(groups.values());
  }, [state.stats]);

  const recentOrders = state.orders.length
    ? state.orders
    : (state.stats?.recentOrders ?? []);

  if (isLoading) {
    return (
      <MainPageFrame header={<MainHeader />}>
        <Card className="rounded-[32px] border-slate-200">
          <Skeleton active paragraph={{ rows: 16 }} />
        </Card>
      </MainPageFrame>
    );
  }

  if (!currentUser) {
    return (
      <MainPageFrame header={<MainHeader />}>
        <Card className="rounded-[32px] border-slate-200">
          <Skeleton active paragraph={{ rows: 10 }} />
        </Card>
      </MainPageFrame>
    );
  }

  if (currentUser.role !== "ADMIN") {
    return (
      <MainPageFrame header={<MainHeader />}>
        <Result
          status="403"
          title="Cần quyền quản trị"
          subTitle="Bạn không có quyền truy cập trang quản trị."
          extra={
            <Button type="primary" onClick={() => router.push("/")}>
              Về trang sự kiện
            </Button>
          }
        />
      </MainPageFrame>
    );
  }

  if (error && !state.stats) {
    return (
      <MainPageFrame header={<MainHeader />}>
        <Result
          status="warning"
          title="Chưa thể mở trang quản trị"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => router.push("/")}>
              Về trang sự kiện
            </Button>
          }
        />
      </MainPageFrame>
    );
  }

  const stats = state.stats;

  return (
    <MainPageFrame header={<MainHeader />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-4xl border border-slate-200 bg-white/90 px-6 py-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Typography.Title
              level={1}
              className="mb-2 text-[34px] font-extrabold text-slate-950"
            >
              Bảng điều khiển quản trị
            </Typography.Title>
            <Typography.Paragraph className="mb-0 max-w-3xl text-sm leading-7 text-slate-500">
              Theo dõi tồn kho, lượt giữ vé và các đơn thanh toán
            </Typography.Paragraph>
          </div>

          <Space size={12} wrap>
            <Tag
              className={`m-0 rounded-full border-0 px-4 py-2 text-sm font-bold ${
                isRealtimeConnected
                  ? "bg-sky-50 text-sky-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {isRealtimeConnected
                ? "Đang kết nối realtime"
                : "Đang dùng polling dự phòng"}
            </Tag>
            <Button onClick={() => window.location.reload()}>Làm mới</Button>
          </Space>
        </div>

        {error ? (
          <Alert
            type="warning"
            showIcon
            title="Dữ liệu có thể chưa phải bản mới nhất"
            description={error}
            className="rounded-[24px]"
          />
        ) : null}

        {stats ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-[28px] border-slate-200">
              <Statistic title="Vé đã bán" value={stats.totalSoldTickets} />
            </Card>
            <Card className="rounded-[28px] border-slate-200">
              <Statistic title="Vé đang giữ" value={stats.totalHeldTickets} />
            </Card>
            <Card className="rounded-[28px] border-slate-200">
              <Statistic
                title="Vé còn lại"
                value={stats.totalAvailableTickets}
              />
            </Card>
            <Card className="rounded-[28px] border-slate-200">
              <Statistic
                title="Doanh thu"
                value={dinhDangTien(stats.totalRevenue)}
              />
            </Card>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.78fr)]">
          <Card className="rounded-[32px] border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Typography.Title
                  level={3}
                  className="mb-1 text-[24px] font-extrabold text-slate-950"
                >
                  Tồn kho theo hạng vé
                </Typography.Title>
                <Typography.Paragraph className="mb-0 text-sm text-slate-500">
                  Tổng sức chứa: {stats?.totalInventoryTickets ?? 0} vé
                </Typography.Paragraph>
              </div>
            </div>

            <div className="space-y-5">
              {inventoryByEvent.map((group) => (
                <div
                  key={group.eventId}
                  className="rounded-[26px] border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="mb-4 flex flex-col gap-1">
                    <Typography.Text className="text-base font-extrabold text-slate-950">
                      {group.eventName}
                    </Typography.Text>
                    <Typography.Text className="text-sm text-slate-500">
                      {dinhDangNgayGioDayDu(group.startAt)} · {group.venue}
                    </Typography.Text>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 min-[1480px]:grid-cols-3">
                    {group.ticketTypes.map((ticketType) => (
                      <div
                        key={ticketType.ticketTypeId}
                        className="rounded-[22px] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Typography.Text className="block text-base font-extrabold text-slate-950">
                              {ticketType.ticketTypeName}
                            </Typography.Text>
                            <Typography.Text className="text-sm text-slate-500">
                              {dinhDangTien(ticketType.price)}
                            </Typography.Text>
                          </div>
                          <Tag color="blue">{ticketType.totalQuantity}</Tag>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-2xl bg-emerald-50 px-2 py-3">
                            <p className="text-[11px] font-bold leading-tight text-emerald-600">
                              Còn vé
                            </p>
                            <p className="mt-1 text-lg font-extrabold text-emerald-700">
                              {ticketType.availableQuantity}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-amber-50 px-2 py-3">
                            <p className="text-[11px] font-bold leading-tight text-amber-600">
                              Đang giữ
                            </p>
                            <p className="mt-1 text-lg font-extrabold text-amber-700">
                              {ticketType.heldQuantity}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-sky-50 px-2 py-3">
                            <p className="text-[11px] font-bold leading-tight text-sky-600">
                              Đã bán
                            </p>
                            <p className="mt-1 text-lg font-extrabold text-sky-700">
                              {ticketType.soldQuantity}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {!inventoryByEvent.length ? (
                <Empty description="Chưa có dữ liệu tồn kho" />
              ) : null}
            </div>
          </Card>

          <Space direction="vertical" size={24} className="w-full">
            <Card className="rounded-[32px] border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <Typography.Title
                    level={3}
                    className="mb-1 text-[24px] font-extrabold text-slate-950"
                  >
                    Danh sách giữ vé
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0 text-sm text-slate-500">
                    Tự làm mới mỗi 15 giây
                  </Typography.Paragraph>
                </div>
                <Tag color="gold">{state.heldReservations.length}</Tag>
              </div>

              <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                {state.heldReservations.map((reservation) => {
                  const remainingMs =
                    new Date(reservation.expiresAt).getTime() - now;

                  return (
                    <div
                      key={reservation.id}
                      className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Typography.Text className="block text-base font-extrabold text-slate-950">
                            {reservation.user.name} ·{" "}
                            {reservation.totalQuantity} vé
                          </Typography.Text>
                          <Typography.Text className="text-sm text-slate-500">
                            {reservation.event.name}
                          </Typography.Text>
                        </div>
                        <Tag
                          color={
                            reservation.isExpired
                              ? "warning"
                              : reservationStatusColor(reservation.status)
                          }
                        >
                          {hienThiTrangThaiDatCho(reservation)}
                        </Tag>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-500">
                        <p>Email: {reservation.user.email}</p>
                        <p>
                          Tổng tiền: {dinhDangTien(reservation.totalAmount)}
                        </p>
                        <p>
                          Tạo lúc: {dinhDangNgayGioDayDu(reservation.createdAt)}
                        </p>
                        <p>
                          Hết hạn: {dinhDangNgayGioDayDu(reservation.expiresAt)}
                        </p>
                        <p>
                          Còn lại:{" "}
                          {remainingMs > 0
                            ? dinhDangDemNguoc(remainingMs)
                            : "00:00"}
                        </p>
                        <p>
                          Hạng vé:{" "}
                          {reservation.items
                            .map(
                              (item) =>
                                `${item.ticketTypeName} x${item.quantity}`,
                            )
                            .join(", ")}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {!state.heldReservations.length ? (
                  <Empty description="Hiện chưa có lượt giữ vé nào" />
                ) : null}
              </div>
            </Card>

            <Card className="rounded-[32px] border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <Typography.Title
                    level={3}
                    className="mb-1 text-[24px] font-extrabold text-slate-950"
                  >
                    Đơn hàng gần đây
                  </Typography.Title>
                  <Typography.Paragraph className="mb-0 text-sm text-slate-500">
                    Theo dõi hoạt động checkout sandbox mới nhất
                  </Typography.Paragraph>
                </div>
                <Tag color="blue">{recentOrders.length}</Tag>
              </div>

              <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-[24px] border border-slate-200 bg-white px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Typography.Text className="block text-base font-extrabold text-slate-950">
                          {order.code}
                        </Typography.Text>
                        <Typography.Text className="text-sm text-slate-500">
                          {order.user.name} · {order.event.name}
                        </Typography.Text>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Tag color="green">
                          {dinhDangTien(order.totalAmount)}
                        </Tag>
                        {order.payment ? (
                          <Tag color={paymentStatusColor(order.payment.status)}>
                            {hienThiTrangThaiThanhToan(order.payment.status)}
                          </Tag>
                        ) : (
                          <Tag>Chưa tạo thanh toán</Tag>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-slate-500">
                      <p>Người mua: {order.user.email}</p>
                      <p>Tạo lúc: {dinhDangNgayGioDayDu(order.createdAt)}</p>
                      <p>
                        Sự kiện: {dinhDangNgayGioDayDu(order.event.startAt)} ·{" "}
                        {order.event.venue}
                      </p>
                      <p>
                        Hạng vé:{" "}
                        {order.reservation.items
                          .map(
                            (item) =>
                              `${item.ticketTypeName} x${item.quantity}`,
                          )
                          .join(", ")}
                      </p>
                      <p>
                        Người nhận vé:{" "}
                        {order.reservation.recipientName ?? order.user.name}
                        {" · "}
                        {order.reservation.recipientEmail ?? order.user.email}
                      </p>
                    </div>
                  </div>
                ))}

                {!recentOrders.length ? (
                  <Empty description="Chưa có đơn hàng gần đây" />
                ) : null}
              </div>
            </Card>
          </Space>
        </div>
      </div>
    </MainPageFrame>
  );
}
