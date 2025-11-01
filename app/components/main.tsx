import type { ReactNode } from "react";

export function Main({ children }: { children: ReactNode }) {
  return <main className="container mx-auto px-4 py-8">{children}</main>;
}
