import { notFound } from "next/navigation";

/** Any other address on workroute.team: the portal's own "not found", not the hiring site's. */
export default function TeamUnknownPage() {
  notFound();
}
