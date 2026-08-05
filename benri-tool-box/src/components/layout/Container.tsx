import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-[var(--max-width)] px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
