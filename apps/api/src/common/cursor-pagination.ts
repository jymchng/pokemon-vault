import { z } from "zod";

/**
 * Cursor pagination (§86): stable, efficient pagination for high-volume
 * endpoints. The cursor is the base64 of the last row's id; the next page
 * resumes with rows AFTER that id (seamless even as new rows are inserted).
 *
 * Response envelope:
 *   { data: [...], meta: { nextCursor: string|null, hasMore: boolean } }
 *
 * - cursor   = base64(id of the last item on the previous page)
 * - limit    = page size (bounded, never unbounded rows)
 * - Ordering is always by id (UUIDv4 sorts chronologically) so the cursor is
 *   stable; server-side filters/sorts stay composable.
 */

export interface CursorPaginationInput {
  cursor?: string | null;
  limit: number;
}

export interface CursorPageMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export const CursorPaginationSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(24),
});

/** Encode an id into an opaque, URL-safe cursor. */
export function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

/** Decode a cursor back to an id; returns null when invalid. */
export function decodeCursor(cursor: string | undefined | null): string | null {
  if (!cursor) return null;
  try {
    const id = Buffer.from(cursor, "base64url").toString("utf8");
    // Catalog rows use UUID ids — reject anything that is not UUID-shaped so
    // a tampered/garbage cursor can never produce a surprising filter.
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ? id
      : null;
  } catch {
    return null;
  }
}

/**
 * Build the Prisma where-clause for a cursor page and compute the meta.
 * `fetchLimit = limit + 1` detects hasMore without a second count query.
 */
export function buildCursorQuery(
  input: CursorPaginationInput,
  idColumn: string = "id",
): { where: Record<string, unknown>; take: number; orderBy: Record<string, "asc"> } {
  const cursorId = decodeCursor(input.cursor);
  return {
    where: cursorId ? { [idColumn]: { gt: cursorId } } : {},
    take: input.limit + 1, // +1 probe for hasMore
    orderBy: { [idColumn]: "asc" },
  };
}

/** Given fetched rows (limit+1), return the page + nextCursor/hasMore. */
export function buildCursorPage<T extends { id: string }>(
  rows: T[],
  input: CursorPaginationInput,
): { items: T[]; meta: CursorPageMeta } {
  const hasMore = rows.length > input.limit;
  const items = hasMore ? rows.slice(0, input.limit) : rows;
  const last = items[items.length - 1];
  return {
    items,
    meta: { nextCursor: last && hasMore ? encodeCursor(last.id) : null, hasMore },
  };
}
