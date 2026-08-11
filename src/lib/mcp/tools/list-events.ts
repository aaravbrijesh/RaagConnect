import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_events",
  title: "List events",
  description: "List upcoming or recent RaagConnect concerts and events, optionally filtered by title or location.",
  inputSchema: {
    search: z.string().optional().describe("Filter by text in the event title."),
    upcoming_only: z.boolean().optional().describe("Only return events on or after today. Defaults to true."),
    limit: z.number().int().optional().describe("Maximum number of events to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, upcoming_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    let query = supabase
      .from("events")
      .select("id, title, date, time, location_name, price, notes, artist_id")
      .order("date", { ascending: true })
      .limit(max);
    if (upcoming_only !== false) {
      query = query.gte("date", new Date().toISOString().slice(0, 10));
    }
    if (search?.trim()) query = query.ilike("title", `%${search.trim()}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
