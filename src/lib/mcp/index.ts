import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEvents from "./tools/list-events";
import getEvent from "./tools/get-event";
import createEvent from "./tools/create-event";
import listArtists from "./tools/list-artists";
import listClasses from "./tools/list-classes";
import myBookings from "./tools/my-bookings";
import searchKnowledge from "./tools/search-knowledge";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "raagconnect",
  title: "RaagConnect",
  version: "0.1.0",
  instructions:
    "Tools for RaagConnect, a platform for Hindustani classical music concerts, artists, and classes. Use `list_events` and `get_event` for concerts, `create_event` to add one, `list_artists` and `list_classes` for discovery, `my_bookings` for the signed-in user's bookings, and `search_knowledge` for music knowledge posts.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listEvents, getEvent, createEvent, listArtists, listClasses, myBookings, searchKnowledge],
});
