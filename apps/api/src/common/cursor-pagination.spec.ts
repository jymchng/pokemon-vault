import { describe, expect, it } from "vitest";
import {
  buildCursorPage,
  buildCursorQuery,
  CursorPaginationSchema,
  decodeCursor,
  encodeCursor,
} from "./cursor-pagination";

const A = "10000000-0000-4000-8000-00000000000a";
const B = "10000000-0000-4000-8000-00000000000b";
const C = "10000000-0000-4000-8000-00000000000c";
const D = "10000000-0000-4000-8000-00000000000d";

describe("cursor pagination (§86)", () => {
  it("encodes/decodes ids as opaque base64url cursors", () => {
    const cur = encodeCursor(A);
    expect(cur).not.toContain(A); // opaque
    expect(decodeCursor(cur)).toBe(A);
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor("!!!not-base64!!!")).toBeNull();
    expect(decodeCursor("")).toBeNull();
    // non-UUID payloads (tampered) are rejected
    expect(decodeCursor(encodeCursor("c2"))).toBeNull();
  });

  it("builds a gt-id where + limit+1 probe (hasMore without a count query)", () => {
    const q = buildCursorQuery({ cursor: encodeCursor(B), limit: 24 });
    expect(q.where).toEqual({ id: { gt: B } });
    expect(q.take).toBe(25); // limit + 1
    expect(q.orderBy).toEqual({ id: "asc" });
    expect(buildCursorQuery({ limit: 10 }).where).toEqual({});
  });

  it("returns nextCursor/hasMore correctly", () => {
    const rows = [{ id: A }, { id: B }, { id: C }, { id: D }];
    const page = buildCursorPage(rows, { limit: 3 });
    expect(page.items.map((r) => r.id)).toEqual([A, B, C]);
    expect(page.meta.hasMore).toBe(true);
    expect(decodeCursor(page.meta.nextCursor!)).toBe(C);

    const last = buildCursorPage([{ id: A }, { id: B }], { limit: 3 });
    expect(last.meta.hasMore).toBe(false);
    expect(last.meta.nextCursor).toBeNull();
  });

  it("bounds the page size (never unbounded rows)", () => {
    expect(CursorPaginationSchema.parse({}).limit).toBe(24); // default
    expect(CursorPaginationSchema.parse({ limit: "100" }).limit).toBe(100); // cap
    expect(() => CursorPaginationSchema.parse({ limit: "101" })).toThrow();
    expect(() => CursorPaginationSchema.parse({ limit: "0" })).toThrow();
  });
});
