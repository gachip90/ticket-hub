'use client';

import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';

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
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
