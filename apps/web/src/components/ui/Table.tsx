import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Table({ className, ...rest }: ComponentProps<"table">) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table className={cn("w-full border-collapse text-left text-[15px]", className)} {...rest} />
    </div>
  );
}

export function Th({ className, ...rest }: ComponentProps<"th">) {
  return <th className={cn("h-12 border-b border-line bg-surface-2/50 px-4 text-[13px] font-medium text-text-2", className)} {...rest} />;
}

export function Td({ className, ...rest }: ComponentProps<"td">) {
  return <td className={cn("h-14 border-b border-line px-4 align-middle [tr:last-child_&]:border-b-0", className)} {...rest} />;
}
