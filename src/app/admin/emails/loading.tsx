import { TableSkeleton } from "@/components/admin/TableSkeleton";

/** Shown the instant the tab is pressed, until the chosen email is rendered. */
export default function Loading() {
  return <TableSkeleton title="Email templates" rows={5} />;
}
