import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "my_bookings",
  title: "My bookings",
  description: "List the signed-in user's event and class bookings on RaagConnect.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: eventBookings, error: eventError } = await supabase
      .from("bookings")
      .select("id, event_id, attendee_name, attendee_email, amount, status, payment_method, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (eventError) return { content: [{ type: "text", text: eventError.message }], isError: true };

    const { data: classBookings, error: classError } = await supabase
      .from("class_bookings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (classError) return { content: [{ type: "text", text: classError.message }], isError: true };

    const result = { event_bookings: eventBookings ?? [], class_bookings: classBookings ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
      structuredContent: result,
    };
  },
});
