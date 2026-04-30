import type { ReactNode } from "react";

export function MainContentContainer({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="min-w-0 flex-1" tabIndex={-1}>
      {children}
    </main>
  );
}
