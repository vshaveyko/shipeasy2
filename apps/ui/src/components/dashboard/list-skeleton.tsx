import { Page, PageBody, PageHeader } from "@/components/dashboard/page";
import { Table, TBody, TH, THead, TR, TD } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type ListPageSkeletonProps = {
  title: string;
  description?: string;
  kicker?: boolean;
  columns?: number;
  rows?: number;
  showToolbar?: boolean;
};

/**
 * Route-level loading state for any list page.
 * Real chrome (page header text, table column count) stays visible so the page
 * doesn't shift when data lands; values shimmer.
 */
export function ListPageSkeleton({
  title,
  description,
  kicker = true,
  columns = 6,
  rows = 8,
  showToolbar = true,
}: ListPageSkeletonProps) {
  return (
    <Page className="se-skeleton-page">
      <PageHeader
        title={title}
        description={description}
        kicker={kicker ? <Skeleton className="inline-block h-3 w-[220px] align-middle" /> : null}
        actions={
          <>
            <Skeleton className="h-8 w-[96px] rounded-md" />
            <Skeleton className="h-8 w-[120px] rounded-md" />
          </>
        }
      />
      <PageBody>
        <section className="relative flex w-full overflow-hidden rounded-[var(--radius-lg)] border border-[var(--se-line)] bg-[var(--se-bg-1)]">
          <div className="flex flex-1 flex-col">
            {showToolbar ? (
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--se-line)] px-3 py-2">
                <Skeleton className="h-7 w-[220px] rounded-md" />
                <Skeleton className="h-6 w-[58px] rounded-full" />
                <Skeleton className="h-6 w-[72px] rounded-full" />
                <Skeleton className="h-6 w-[110px] rounded-full" />
                <div className="ml-auto flex items-center gap-2">
                  <Skeleton className="h-7 w-[88px] rounded-md" />
                  <Skeleton className="h-7 w-[72px] rounded-md" />
                </div>
              </div>
            ) : null}
            <div className="min-h-0 flex-1">
              <Table>
                <THead>
                  <tr>
                    {Array.from({ length: columns }).map((_, i) => (
                      <TH key={i}>
                        <Skeleton className="h-3 w-[60px]" />
                      </TH>
                    ))}
                  </tr>
                </THead>
                <TBody>
                  {Array.from({ length: rows }).map((_, r) => (
                    <TR key={r}>
                      {Array.from({ length: columns }).map((_, c) => (
                        <TD key={c}>
                          <SkRowCell col={c} columns={columns} />
                        </TD>
                      ))}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
            <div className="flex shrink-0 items-center gap-2 border-t border-[var(--se-line)] px-3 py-2">
              <Skeleton className="h-3 w-[100px]" />
              <div className="ml-auto flex gap-2">
                <Skeleton className="h-6 w-[72px] rounded-md" />
                <Skeleton className="h-6 w-[60px] rounded-md" />
              </div>
            </div>
          </div>
        </section>
      </PageBody>
    </Page>
  );
}

function SkRowCell({ col, columns }: { col: number; columns: number }) {
  // first col = icon, second = title+sub, last = avatar, otherwise mixed values
  if (col === 0) return <Skeleton className="size-3.5 rounded" />;
  if (col === 1) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-[160px]" />
          <Skeleton className="h-4 w-[42px] rounded" />
        </div>
        <Skeleton className="mt-1.5 h-2.5 w-[280px]" />
      </div>
    );
  }
  if (col === columns - 1) return <Skeleton className="size-5 rounded-md" />;
  if (col === columns - 2) return <Skeleton className="h-3 w-[90px] rounded" />;
  return <Skeleton className="h-3 w-[54px]" />;
}
