import { FocusPageClient } from "@/components/focus-page";
import focusStations from "@/data/focus-stations.json";
import type { FocusStation } from "@/lib/focus";

// Focus is the front door: the app greets you ready to work. The curated
// catalog is baked in at build time, so the station list is part of the
// static HTML — no client fetch before first paint.
export default function Page() {
  return <FocusPageClient initialStations={focusStations as FocusStation[]} />;
}
