import { TableSkeleton } from "@/components/admin/TableSkeleton";

/** Shown the instant Favorites is pressed, until the starred rows arrive. */
export default function Loading() {
  return <TableSkeleton title="Favorite candidates" rows={6} />;
}
