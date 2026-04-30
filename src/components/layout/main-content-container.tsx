import type { ReactNode } from "react";

export function MainContentContainer({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="min-w-0 flex-1 flex justify-center" tabIndex={-1}>
      <div className="w-full max-w-[1680px]">
        {children}
      </div>
    </main>
  );
}
