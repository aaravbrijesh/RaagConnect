import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_classes",
  title: "List classes",
  description: "List RaagConnect music classes, optionally filtered by title, genre, or skill level.",
  inputSchema: {
    search: z.string().optional().describe("Filter by text in the class title."),
    genre: z.string().optional().describe("Filter by genre."),
    skill_level: z.string().optional().describe("Filter by skill level, e.g. beginner or advanced."),
    limit: z.number().int().optional().describe("Maximum number of classes to return (default 20, max 100)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, genre, skill_level, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    let query = supabase
      .from("classes")
      .select("id, title, genre, skill_level, class_mode, class_type, price, location_name, schedule_details, description")
      .order("title", { ascending: true })
      .limit(max);
    if (search?.trim()) query = query.ilike("title", `%${search.trim()}%`);
    if (genre?.trim()) query = query.ilike("genre", `%${genre.trim()}%`);
    if (skill_level?.trim()) query = query.ilike("skill_level", `%${skill_level.trim()}%`);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { classes: data ?? [] },
    };
  },
});
