import type { ReactNode } from "react";

export function Content({ children }: { children: ReactNode }) {
  return <div className="max-w-6xl mx-auto">{children}</div>;
}
