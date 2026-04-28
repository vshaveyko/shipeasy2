"use client";

import { useCallback, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action-result";

interface UseActionOptions {
  /** Toast shown while the action runs. Defaults to "Saving…" */
  loading?: string;
  /** Toast shown on success. Defaults to "Done" */
  success?: string;
  /** Called after a successful action (result.ok === true) */
  onSuccess?: (result: ActionResult & { ok: true }) => void;
}

/**
 * Wraps a server action that returns ActionResult with loading/success/error
 * toasts and a `pending` flag. Pass the returned `execute` wherever you'd
 * normally call the action directly.
 */
export function useAction<T extends FormData | void>(
  action: (input: T) => Promise<ActionResult>,
  options: UseActionOptions = {},
) {
  const [pending, startTransition] = useTransition();
  const { loading = "Saving…", success = "Done", onSuccess } = options;

  const execute = useCallback(
    (input: T) => {
      startTransition(() => {
        toast.promise(
          action(input).then((result) => {
            if (!result.ok) throw new Error(result.error);
            onSuccess?.(result);
            return result.message ?? success;
          }),
          {
            loading,
            success: (msg) => msg as string,
            error: (err: Error) => err.message,
          },
        );
      });
    },
    [action, loading, success, onSuccess],
  );

  return { execute, pending };
}
