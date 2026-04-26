"use client";

import type { ComponentProps, MouseEvent } from "react";
import { signOut } from "next-auth/react";

import { cn } from "@/lib/utils";
import { useShipEasyI18n } from "@shipeasy/react";

export function SignOutButton({ className, onClick, ...props }: ComponentProps<"div">) {
  const { t } = useShipEasyI18n();
  return (
    <div
      {...props}
      className={cn("w-full cursor-default text-left", className)}
      onClick={(e: MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
        if (!e.defaultPrevented) void signOut({ callbackUrl: "/" });
      }}
    >
      {t("components.dashboard.sign_out")}
    </div>
  );
}
