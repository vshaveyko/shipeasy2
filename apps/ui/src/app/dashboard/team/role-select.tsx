"use client";

import { useTransition } from "react";
import { updateMemberRoleAction } from "./actions";

export function RoleSelect({
  id,
  role,
  disabled,
}: {
  id: string;
  role: "admin" | "editor" | "viewer";
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("role", next);
    startTransition(() => {
      void updateMemberRoleAction(fd);
    });
  }

  return (
    <select
      defaultValue={role}
      onChange={onChange}
      disabled={disabled || isPending}
      className="h-[30px] w-full rounded-[var(--radius-sm)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] pl-2.5 pr-6 text-[12px] outline-none focus-visible:border-ring disabled:opacity-70"
    >
      <option value="admin">Admin</option>
      <option value="editor">Editor</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}
