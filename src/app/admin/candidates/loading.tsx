import { TableSkeleton } from "@/components/admin/TableSkeleton";

/**
 * Shown the instant this tab is pressed, until its rows arrive.
 *
 * The heading is the real one, so the first thing that happens after a press is
 * the page saying where you have landed.
 */
export default function Loading() {
  return <TableSkeleton title="Candidates" />;
}
