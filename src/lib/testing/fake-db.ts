/**
 * Mini-base en mémoire qui imite l'API chaînable de supabase-js
 * (from/select/eq/in/is/upsert/update/delete). Pour les tests seulement.
 */
type Row = Record<string, unknown>;

export function createFakeDb(initial: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = structuredClone(initial);
  let seq = 0;

  function from(table: string) {
    const rows = (tables[table] ??= []);
    const filters: Array<(r: Row) => boolean> = [];
    let op: { kind: "select" } | { kind: "update"; values: Row } | { kind: "delete" } = { kind: "select" };

    const run = () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)));
      if (op.kind === "update") for (const r of matched) Object.assign(r, op.values);
      if (op.kind === "delete") for (const r of matched) rows.splice(rows.indexOf(r), 1);
      return { data: matched.map((r) => ({ ...r })), error: null };
    };

    const builder = {
      select: () => builder,
      update: (values: Row) => ((op = { kind: "update", values }), builder),
      delete: () => ((op = { kind: "delete" }), builder),
      eq: (col: string, v: unknown) => (filters.push((r) => r[col] === v), builder),
      in: (col: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[col])), builder),
      is: (col: string, v: unknown) => (filters.push((r) => (r[col] ?? null) === v), builder),
      single: async () => ({ data: run().data[0] ?? null, error: null }),
      maybeSingle: async () => ({ data: run().data[0] ?? null, error: null }),
      then: (resolve: (v: ReturnType<typeof run>) => unknown) => resolve(run()),
      upsert: async (input: Row[] | Row, opts: { onConflict: string }) => {
        const keys = opts.onConflict.split(",");
        for (const row of Array.isArray(input) ? input : [input]) {
          const existing = rows.find((r) => keys.every((k) => r[k] === row[k]));
          if (existing) Object.assign(existing, row);
          else rows.push({ id: `${table}-${++seq}`, ...row });
        }
        return { data: null, error: null };
      },
    };
    return builder;
  }

  return { from, tables };
}
