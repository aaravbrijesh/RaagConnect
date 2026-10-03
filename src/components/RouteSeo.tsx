import { useLocation } from "react-router-dom";
import Seo from "./Seo";

const PAGES: Record<string, { title: string; description: string; noindex?: boolean }> = {
  "/": {
    title: "Raag Connect — Indian Classical Music Events, Artists & Classes",
    description: "Discover Hindustani classical concerts, artists and music teachers near you. Book events, find classes and identify raags with AI.",
  },
  "/events": {
    title: "Upcoming Indian Classical Concerts — Raag Connect",
    description: "Browse current, upcoming and past Hindustani classical music concerts and book tickets.",
  },
  "/classes": {
    title: "Indian Classical Music Teachers & Classes — Raag Connect",
    description: "Find vocal, tabla, sitar, bansuri and other Indian classical music classes — online or in person.",
  },
  "/knowledge": {
    title: "Indian Classical Music Knowledge — Raag Connect",
    description: "Learn about raags, forms, instruments and history from the Raag Connect community.",
  },
  "/raag-detector": {
    title: "AI Raag Detector — Identify a Raag from a Song | Raag Connect",
    description: "Hum or upload a song and let AI identify the raag, explaining the notes that gave it away.",
  },
  "/about": {
    title: "About Raag Connect",
    description: "Raag Connect brings together listeners, artists, organizers and teachers of Indian classical music.",
  },
  "/login": { title: "Sign In — Raag Connect", description: "Sign in to your Raag Connect account." },
  "/register": { title: "Create an Account — Raag Connect", description: "Join Raag Connect to book concerts and classes." },
};

/** Default per-route metadata; detail pages render their own <Seo> which overrides this. */
export default function RouteSeo() {
  const { pathname } = useLocation();
  const page = PAGES[pathname];
  if (page) return <Seo {...page} path={pathname} />;
  // Detail pages render their own <Seo>; don't render a fallback that would override it.
  if (/^\/(events|classes|artists)\/[^/]+/.test(pathname)) return null;
  return (
    <Seo
      title="Raag Connect"
      description="Indian classical music concerts, artists and classes."
      path={pathname}
      noindex={/^\/(settings|admin|payment-|select-role|verify-email|create-|events\/create|classes\/create|raag-detector\/history|\.lovable)/.test(pathname)}
    />
  );
}
