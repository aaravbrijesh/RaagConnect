import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_knowledge",
  title: "Search knowledge posts",
  description: "Search RaagConnect knowledge posts about Hindustani classical music by title, content, or category.",
  inputSchema: {
    query: z.string().optional().describe("Text to search for in post titles and content."),
    category: z.string().optional().describe("Filter by category (e.g. dhrupad-dhamaar, chota-bada-khayal, kayada-rela, tabla-gat-tukda-paran, jhod-jhala, sitar-sarod-gat, history-theory, other)."),
    limit: z.number().int().optional().describe("Maximum number of posts to return (default 10, max 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 10, 1), 50);
    let builder = supabase
      .from("knowledge_posts")
      .select("id, title, content, category, created_at")
      .order("created_at", { ascending: false })
      .limit(max);
    const q = query?.trim();
    if (q) builder = builder.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
    if (category?.trim()) builder = builder.ilike("category", `%${category.trim()}%`);
    const { data, error } = await builder;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { posts: data ?? [] },
    };
  },
});
