import type { ReactNode } from "react";

type MainPageFrameProps = {
  header: ReactNode;
  children: ReactNode;
};

export function MainPageFrame({ header, children }: MainPageFrameProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {header}
      <main className="flex-1 px-4 pb-10 pt-24 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
