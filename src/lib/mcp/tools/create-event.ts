import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_event",
  title: "Create event",
  description: "Create a new concert or event on RaagConnect owned by the signed-in user.",
  inputSchema: {
    title: z.string().describe("Event title."),
    date: z.string().describe("Event date in YYYY-MM-DD format."),
    time: z.string().describe("Event start time in HH:MM 24-hour format."),
    location_name: z.string().optional().describe("Venue or location name."),
    price: z.number().optional().describe("Ticket price."),
    notes: z.string().optional().describe("Additional details about the event."),
    artist_id: z.string().optional().describe("Id of the performing artist profile."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("events")
      .insert({
        user_id: ctx.getUserId(),
        title: input.title,
        date: input.date,
        time: input.time,
        location_name: input.location_name ?? null,
        price: input.price ?? null,
        notes: input.notes ?? null,
        artist_id: input.artist_id ?? null,
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { event: data },
    };
  },
});
