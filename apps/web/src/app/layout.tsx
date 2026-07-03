import type { Metadata } from "next";
import "../style/globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Ticket Hub",
  description: "Ticket Hub - nền tảng đặt vé concert với luồng thanh toán giả lập",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
