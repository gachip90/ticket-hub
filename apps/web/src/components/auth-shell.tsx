import { Card, Typography } from "antd";
import type { ReactNode } from "react";
import { Logo } from "./logo";

type AuthShellProps = {
  title: string;
  description: string;
  imageUrl: string;
  children: ReactNode;
};

export function AuthShell({
  title,
  description,
  imageUrl,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef3fb_100%)] p-4 sm:p-6">
      <section className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-[1800px] overflow-hidden rounded-4xl border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.10)] lg:grid-cols-[minmax(520px,0.72fr)_minmax(960px,1.28fr)] lg:gap-4">
        <div className="grid grid-rows-[auto_1fr] px-8 py-8 sm:px-12 lg:px-16 lg:py-12">
          <div className="mx-auto w-full max-w-110 py-5">
            <Logo />
          </div>

          <div className="flex items-center justify-center py-10 lg:py-0">
            <div className="w-full max-w-110">
              <Typography.Title
                level={1}
                className="mb-2 text-[40px] font-extrabold tracking-tight text-slate-950"
              >
                {title}
              </Typography.Title>
              <Typography.Paragraph className="mb-8 text-base leading-7 text-slate-500">
                {description}
              </Typography.Paragraph>
              {children}
            </div>
          </div>
        </div>

        <div className="relative hidden min-h-[calc(100vh-48px)] bg-white p-3 lg:block">
          <Card
            variant="borderless"
            className="relative h-full overflow-hidden rounded-[28px] bg-slate-100"
            styles={{ body: { padding: 0, height: "100%" } }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(15,23,42,0.48))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.70),transparent_32%)]" />
          </Card>
        </div>
      </section>
    </main>
  );
}
