import { FocusPageClient } from "@/components/focus-page";
import focusStations from "@/data/focus-stations.json";
import type { FocusStation } from "@/lib/focus";

// The curated instrumental section, at /focus. The catalog is baked in at
// build time, so the station list is part of the page payload — no client
// fetch before first paint.
export default function Page() {
  return <FocusPageClient initialStations={focusStations as FocusStation[]} />;
}
