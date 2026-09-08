import { redirect } from "next/navigation";

/**
 * Settings has no landing page of its own — it opens on the first section.
 *
 * A screen whose only content is three links to its own tabs makes everybody
 * click twice to reach the thing they came for.
 */
export default function AdminSettingsIndex() {
  redirect("/admin/settings/verification");
}
