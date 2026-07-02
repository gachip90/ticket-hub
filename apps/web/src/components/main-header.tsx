"use client";

import { Avatar, Button, Dropdown, Input, type MenuProps } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Logo } from "./logo";
import {
  clearAuthSession,
  getStoredAuthUser,
  subscribeAuthStore,
} from "../lib/api";
import type { AuthUser } from "../lib/api";

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
    {
      key: "logout",
      icon: <LogoutIcon />,
      label: "Đăng xuất",
    },
  ];

  function xuLyMenuClick({ key }: { key: string }) {
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
                    className="bg-slate-950 text-sm font-bold text-white"
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
