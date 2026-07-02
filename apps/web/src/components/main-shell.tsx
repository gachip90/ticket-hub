import type { ReactNode } from "react";

type MainShellProps = {
  children: ReactNode;
};

export function MainShell({ children }: MainShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_center,_rgba(37,99,235,0.10),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef3fb_100%)]">
      {children}
    </div>
  );
}
