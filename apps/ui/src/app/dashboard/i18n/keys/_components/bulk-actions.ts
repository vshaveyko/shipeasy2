import type { ComponentType } from "react";

/**
 * Generic contract for a "bulk action" — something the user can run over a
 * multi-selection of rows. The keys table is the first caller; future tables
 * (gates list, experiments list, events list, …) should reuse this shape.
 *
 * Keep the signatures dumb: the caller owns the selection state and the action
 * implementation. This module only defines *what shape* an action is so the
 * shared `BulkActionsBar` can render it.
 */
export interface BulkAction<T = unknown> {
  /** Stable identifier — unique per caller. Used as React key. */
  id: string;
  /** Visible label on the action button. */
  label: string;
  /** Optional Lucide-style icon component. */
  icon?: ComponentType<{ className?: string }>;
  /** Button variant. `destructive` tints it red. */
  variant?: "default" | "outline" | "destructive";
  /**
   * If present, the bar shows a `window.confirm` with the returned message
   * before invoking `run`. Return falsy to skip confirmation.
   */
  confirm?: (items: T[]) => string | null | undefined;
  /** The actual work — receives the full list of selected items. */
  run: (items: T[]) => Promise<void> | void;
  /**
   * Optionally disable/hide the action for the current selection (e.g. "only
   * delete rows the user owns"). Default: always enabled.
   */
  enabled?: (items: T[]) => boolean;
}
