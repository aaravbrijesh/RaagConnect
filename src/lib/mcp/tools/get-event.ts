import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_event",
  title: "Get event details",
  description: "Get full details for one RaagConnect event by its id, including performing artist and schedule.",
  inputSchema: { event_id: z.string().describe("The event id (uuid).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", event_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!event) return { content: [{ type: "text", text: "Event not found" }], isError: true };

    const { data: schedule } = await supabase
      .from("event_schedule")
      .select("*")
      .eq("event_id", event_id);

    const result = { ...event, schedule: schedule ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: { event: result },
    };
  },
});
