import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_artists",
  title: "List artists",
  description: "List RaagConnect artist profiles, optionally filtered by name or genre.",
  inputSchema: {
    search: z.string().optional().describe("Filter by text in the artist name."),
    genre: z.string().optional().describe("Filter by genre."),
    limit: z.number().int().optional().describe("Maximum number of artists to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, genre, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    let query = supabase
      .from("artists")
      .select("id, name, genre, bio, location_name")
      .order("name", { ascending: true })
      .limit(max);
    if (search?.trim()) query = query.ilike("name", `%${search.trim()}%`);
    if (genre?.trim()) query = query.ilike("genre", `%${genre.trim()}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { artists: data ?? [] },
    };
  },
});
