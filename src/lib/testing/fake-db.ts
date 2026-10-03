/**
 * Mini-base en mémoire qui imite l'API chaînable de supabase-js
 * (from/select/eq/in/is/upsert/update/delete). Pour les tests seulement.
 */
type Row = Record<string, unknown>;

export function createFakeDb(
  initial: Record<string, Row[]> = {},
  /** Contraintes d'unicité à imiter, ex. { reminder_items: [["invoice_id", "sequence_step_id"]] } */
  uniques: Record<string, string[][]> = {},
) {
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
      insert: (input: Row[] | Row) => {
        const inserted: Row[] = [];
        let error: { code: string; message: string } | null = null;
        for (const row of Array.isArray(input) ? input : [input]) {
          const conflict = uniques[table]?.some((keys) => rows.some((r) => keys.every((k) => r[k] != null && r[k] === row[k])));
          if (conflict) { error = { code: "23505", message: "duplicate key" }; break; }
          const full = { id: `${table}-${++seq}`, ...row };
          rows.push(full);
          inserted.push(full);
        }
        const result = { data: error ? null : inserted.map((r) => ({ ...r })), error };
        const chain = {
          select: () => chain,
          single: async () => ({ data: result.data?.[0] ?? null, error }),
          then: (resolve: (v: typeof result) => unknown) => resolve(result),
        };
        return chain;
      },
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
