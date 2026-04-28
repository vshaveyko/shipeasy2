"use client";

import { useCallback, type FormEvent } from "react";
import { useAction } from "@/hooks/use-action";
import type { ActionResult } from "@/lib/action-result";

interface ActionFormProps extends Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "action" | "onSubmit"
> {
  action: (formData: FormData) => Promise<ActionResult>;
  loading?: string;
  success?: string;
  onSuccess?: () => void;
}

export function ActionForm({
  action,
  loading,
  success,
  onSuccess,
  children,
  ...props
}: ActionFormProps) {
  const { execute, pending } = useAction(action, { loading, success, onSuccess });

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      execute(new FormData(e.currentTarget));
    },
    [execute],
  );

  return (
    <form {...props} onSubmit={handleSubmit} data-pending={pending || undefined}>
      {children}
    </form>
  );
}
