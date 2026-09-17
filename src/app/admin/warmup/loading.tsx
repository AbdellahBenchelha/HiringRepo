import { TableSkeleton } from "@/components/admin/TableSkeleton";

/** Shown the instant the Warm-up tab is pressed, until today's figures arrive. */
export default function Loading() {
  return <TableSkeleton title="Warm-up" rows={4} />;
}
