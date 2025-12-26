import { supabase } from "@/integrations/supabase/client";

type FetchAllEventsOptions = {
  /** When true, orders by date ascending (earliest first). Default: true */
  ascending?: boolean;
  /** Page size for range pagination. Default: 1000 */
  pageSize?: number;
};

const EVENT_SELECT_WITH_RELATIONS = "*, artists(*), event_artists(artist_id, artists(*))" as const;

export async function fetchAllEventsWithRelations(options: FetchAllEventsOptions = {}) {
  const pageSize = options.pageSize ?? 1000;
  const ascending = options.ascending ?? true;

  let from = 0;
  const all: any[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT_WITH_RELATIONS)
      .order("date", { ascending })
      .range(from, from + pageSize - 1);

    if (error) return { data: null as any[] | null, error };

    all.push(...(data ?? []));

    if (!data || data.length < pageSize) break;
    from += pageSize;
  }

  return { data: all, error: null as any };
}
