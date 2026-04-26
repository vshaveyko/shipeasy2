"use client";

import { useId, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inviteMembersAction } from "./actions";

export function InviteButton({ disabledReason }: { disabledReason?: string }) {
  const [open, setOpen] = useState(false);

  if (disabledReason) {
    return (
      <Button size="sm" disabled title={disabledReason}>
        <Plus className="size-3" /> Invite people
      </Button>
    );
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-3" /> Invite people
      </Button>
      {open ? <InviteModal onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const titleId = useId();
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function commitDraft() {
    const next = draft.trim().toLowerCase();
    if (!next) return;
    if (emails.includes(next)) {
      setDraft("");
      return;
    }
    setEmails([...emails, next]);
    setDraft("");
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && !draft && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  }

  function onSubmit(formData: FormData) {
    const all = draft.trim() ? [...emails, draft.trim().toLowerCase()] : emails;
    if (all.length === 0) {
      setError("Add at least one email");
      return;
    }
    formData.set("emails", all.join(","));
    setError(null);
    startTransition(async () => {
      try {
        await inviteMembersAction(formData);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send invites");
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm"
    >
      <form
        action={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-[560px] max-w-[92vw] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line-2)] bg-[var(--se-bg-1)] shadow-[var(--se-shadow-pop)]"
      >
        <header className="flex items-center gap-2.5 border-b border-[var(--se-line)] px-6 py-5">
          <h3 id={titleId} className="m-0 text-[17px] font-medium">
            Invite people
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid size-7 place-items-center rounded text-[var(--se-fg-3)] hover:bg-[var(--se-bg-3)] hover:text-[var(--se-fg)]"
            aria-label="Close"
          >
            <X className="size-3.5" />
          </button>
        </header>

        <div className="flex flex-col gap-3.5 px-6 py-6">
          <div>
            <div className="t-caps dim-2 mb-1.5">Emails</div>
            <div className="flex min-h-12 flex-wrap items-start gap-1.5 rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] p-2">
              {emails.map((e, i) => (
                <span
                  key={`${e}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--se-line-2)] bg-[var(--se-bg-3)] px-2 py-0.5 text-[12px] text-[var(--se-fg-2)]"
                >
                  {e}
                  <button
                    type="button"
                    onClick={() => setEmails(emails.filter((_, j) => j !== i))}
                    className="text-[var(--se-fg-3)] hover:text-[var(--se-fg)]"
                    aria-label={`Remove ${e}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
              <input
                type="email"
                value={draft}
                onChange={(ev) => setDraft(ev.target.value)}
                onKeyDown={onKey}
                onBlur={commitDraft}
                placeholder="email@company.com"
                className="min-w-[160px] flex-1 bg-transparent px-1.5 py-1 text-[13px] outline-none placeholder:text-[var(--se-fg-4)]"
              />
            </div>
            <div className="mt-1.5 t-mono-xs dim-2">
              Press Enter or comma to add · paste a list to bulk-invite
            </div>
          </div>

          <div>
            <div className="t-caps dim-2 mb-1.5">Default role</div>
            <select
              name="role"
              defaultValue="editor"
              className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--se-line-2)] bg-[var(--se-bg-2)] px-2.5 text-[13px] outline-none focus-visible:border-ring"
            >
              <option value="admin">Admin · full access</option>
              <option value="editor">Editor · create &amp; edit</option>
              <option value="viewer">Viewer · read-only</option>
            </select>
          </div>

          {error ? (
            <div
              className="rounded-[var(--radius-md)] px-3 py-2 text-[12.5px]"
              style={{
                background: "var(--se-danger-soft)",
                color: "var(--se-danger)",
                border: "1px solid color-mix(in oklab, var(--se-danger) 30%, transparent)",
              }}
            >
              {error}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--se-line)] bg-[var(--se-bg-2)] px-6 py-3.5">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending
              ? "Sending…"
              : `Send ${emails.length + (draft.trim() ? 1 : 0) || ""} invite${
                  emails.length + (draft.trim() ? 1 : 0) === 1 ? "" : "s"
                }`}
          </Button>
        </footer>
      </form>
    </div>
  );
}
