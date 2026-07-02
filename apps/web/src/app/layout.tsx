import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "../style/globals.css";
import { Providers } from "./providers";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Vé Concert",
  description: "Nền tảng đặt vé concert với luồng thanh toán giả lập",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
