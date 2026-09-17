import { DashboardSkeleton } from "@/components/admin/TableSkeleton";

/**
 * Shown the instant the Dashboard is opened, until its figures arrive.
 *
 * It has more to work out than the other tabs — every candidate is counted
 * several times over, against the period and against each other — so it is the
 * one most worth answering straight away.
 */
export default function Loading() {
  return <DashboardSkeleton />;
}
