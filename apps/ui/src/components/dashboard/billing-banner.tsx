import Link from "next/link";
import { differenceInDays, parseISO } from "date-fns";

interface Props {
  status: string;
  trialEndsAt: string | null;
}

export function BillingBanner({ status, trialEndsAt }: Props) {
  if (status === "active" || status === "none") return null;

  if (status === "trialing" && trialEndsAt) {
    const daysLeft = differenceInDays(parseISO(trialEndsAt), new Date());
    if (daysLeft > 3) return null;
    const msg =
      daysLeft <= 0
        ? "Your trial has ended."
        : daysLeft === 1
          ? "Your trial ends tomorrow."
          : `${daysLeft} days left in your trial.`;
    return (
      <Banner variant="warning">
        {msg}{" "}
        <Link href="/dashboard/billing" className="font-medium underline underline-offset-2">
          Add a payment method →
        </Link>
      </Banner>
    );
  }

  if (status === "past_due") {
    return (
      <Banner variant="error">
        Your payment is overdue.{" "}
        <Link href="/dashboard/billing" className="font-medium underline underline-offset-2">
          Update billing →
        </Link>
      </Banner>
    );
  }

  if (status === "canceled") {
    return (
      <Banner variant="warning">
        Your subscription has been canceled — you&apos;re on the Free plan.{" "}
        <Link href="/dashboard/billing" className="font-medium underline underline-offset-2">
          Resubscribe →
        </Link>
      </Banner>
    );
  }

  return null;
}

function Banner({
  variant,
  children,
}: {
  variant: "warning" | "error";
  children: React.ReactNode;
}) {
  const base = "flex items-center justify-center gap-1 px-4 py-2 text-xs";
  const styles =
    variant === "error"
      ? `${base} bg-destructive/10 text-destructive`
      : `${base} bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200`;
  return <div className={styles}>{children}</div>;
}
