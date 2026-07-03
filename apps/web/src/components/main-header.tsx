"use client";

import { Avatar, Button, Dropdown, Input, type MenuProps } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  clearAuthSession,
  getStoredAuthUser,
  subscribeAuthStore,
} from "../lib/api";
import type { AuthUser } from "../lib/api";
import { Logo } from "./logo";

type MainHeaderProps = {
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: (value: string) => void;
  showSearch?: boolean;
};

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-slate-400"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.1667 14.1667L17.5 17.5M15.8333 8.75C15.8333 12.662 12.662 15.8333 8.75 15.8333C4.838 15.8333 1.66667 12.662 1.66667 8.75C1.66667 4.838 4.838 1.66667 8.75 1.66667C12.662 1.66667 15.8333 4.838 15.8333 8.75Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-slate-500"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.5 4.16667H6.66667C5.74619 4.16667 5 4.91286 5 5.83333V14.1667C5 15.0871 5.74619 15.8333 6.66667 15.8333H7.5M11.6667 13.3333L15 10M15 10L11.6667 6.66667M15 10H8.33333"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-slate-500"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.33333 10.8333H8.33333V16.6667H3.33333V10.8333ZM11.6667 3.33333H16.6667V9.16667H11.6667V3.33333ZM11.6667 10.8333H16.6667V16.6667H11.6667V10.8333ZM3.33333 3.33333H8.33333V7.5H3.33333V3.33333Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-slate-500"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.83333 3.33333H14.1667C15.0871 3.33333 15.8333 4.07953 15.8333 5V15C15.8333 15.9205 15.0871 16.6667 14.1667 16.6667H5.83333C4.91286 16.6667 4.16667 15.9205 4.16667 15V5C4.16667 4.07953 4.91286 3.33333 5.83333 3.33333Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 7.5H12.5M7.5 10.8333H12.5M7.5 14.1667H10.8333"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function layTenGoi(user: AuthUser | null) {
  if (!user) {
    return null;
  }

  return user.name.split(" ")[0] ?? user.name;
}

function layKyTuDaiDien(user: AuthUser | null) {
  const tenGoi = layTenGoi(user)?.trim();

  if (!tenGoi) {
    return "U";
  }

  return tenGoi.charAt(0).toUpperCase();
}

export function MainHeader({
  searchValue = "",
  searchPlaceholder = "Tìm kiếm sự kiện...",
  onSearchChange,
  onSearchSubmit,
  showSearch = false,
}: MainHeaderProps) {
  const router = useRouter();
  const nguoiDung = useSyncExternalStore(
    subscribeAuthStore,
    getStoredAuthUser,
    () => null as AuthUser | null,
  );
  const tenGoi = layTenGoi(nguoiDung);
  const kyTuDaiDien = layKyTuDaiDien(nguoiDung);

  const menuItems: MenuProps["items"] = [
    ...(nguoiDung?.role === "ADMIN"
      ? [
          {
            key: "admin-dashboard",
            icon: <DashboardIcon />,
            label: <span className="pl-2">Trang quản trị</span>,
          },
        ]
      : []),
    {
      key: "order-history",
      icon: <OrdersIcon />,
      label: <span className="pl-2">Lịch sử đặt vé</span>,
    },
    {
      key: "logout",
      icon: <LogoutIcon />,
      label: <span className="pl-2">Đăng xuất</span>,
    },
  ];

  function xuLyMenuClick({ key }: { key: string }) {
    if (key === "admin-dashboard") {
      router.push("/admin/dashboard");
      return;
    }

    if (key === "order-history") {
      router.push("/me/orders");
      return;
    }

    if (key !== "logout") {
      return;
    }

    clearAuthSession();
    router.push("/login");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 shadow-[0_14px_34px_rgba(15,23,42,0.07)] backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Logo />

          {showSearch ? (
            <div className="w-full lg:max-w-[500px] lg:flex-1">
              <Input
                size="large"
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                onPressEnter={(event) =>
                  onSearchSubmit?.(event.currentTarget.value)
                }
                prefix={<SearchIcon />}
                placeholder={searchPlaceholder}
                className="rounded-2xl border-slate-200 bg-slate-50"
              />
            </div>
          ) : (
            <div className="hidden lg:block lg:flex-1" />
          )}

          <div className="flex items-center justify-end gap-3">
            {tenGoi ? (
              <Dropdown
                menu={{ items: menuItems, onClick: xuLyMenuClick }}
                trigger={["hover"]}
                placement="bottomRight"
              >
                <button
                  type="button"
                  aria-label={`Tài khoản ${tenGoi}`}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-white"
                >
                  <Avatar
                    size={34}
                    className="cursor-pointer bg-slate-950 text-sm font-bold text-white"
                  >
                    {kyTuDaiDien}
                  </Avatar>
                </button>
              </Dropdown>
            ) : (
              <>
                <Link href="/login">
                  <Button className="h-10 rounded-2xl border-slate-200 px-4">
                    Đăng nhập
                  </Button>
                </Link>
                <Link href="/register">
                  <Button type="primary" className="h-10 rounded-2xl px-4">
                    Đăng ký
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
