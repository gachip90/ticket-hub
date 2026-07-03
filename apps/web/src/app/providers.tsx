'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { App as AntdApp, ConfigProvider } from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  type AuthExpiredEventDetail,
  subscribeExpiredSession,
} from '../lib/api';

function SessionExpiredNotifier() {
  const router = useRouter();
  const { message } = AntdApp.useApp();

  useEffect(() => {
    return subscribeExpiredSession((detail: AuthExpiredEventDetail) => {
      void message.warning(detail.message, 2.5);

      const loginHref =
        detail.redirectTo && detail.redirectTo !== '/login'
          ? `/login?redirect=${encodeURIComponent(detail.redirectTo)}`
          : '/login';

      router.push(loginHref);
    });
  }, [message, router]);

  return null;
}

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#2563eb',
            colorText: '#111827',
            colorTextSecondary: '#667085',
            colorBgLayout: '#f5f7fb',
            colorBorderSecondary: '#e5e7eb',
            borderRadius: 14,
            controlHeight: 46,
            fontFamily: 'var(--font-be-vietnam), sans-serif',
          },
          components: {
            Button: {
              fontWeight: 700,
              primaryShadow: 'none',
              defaultShadow: 'none',
              borderRadius: 14,
            },
            Card: {
              borderRadiusLG: 24,
            },
            Input: {
              borderRadius: 14,
            },
            Select: {
              borderRadius: 14,
            },
          },
        }}
      >
        <AntdApp>
          <SessionExpiredNotifier />
          {children}
        </AntdApp>
      </ConfigProvider>
    </AntdRegistry>
  );
}
