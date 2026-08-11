const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value?: string | null) => !!value && UUID_RE.test(value);

/** Column to filter on when a route param may be either a slug or a UUID. */
export const idColumn = (param?: string | null): 'id' | 'slug' => (isUuid(param) ? 'id' : 'slug');

/** Preferred URL segment for a record: its slug when available, otherwise its UUID. */
export const recordPath = (record?: { slug?: string | null; id?: string } | null) =>
  record?.slug || record?.id || '';
