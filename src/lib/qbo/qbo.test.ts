import { describe, expect, it, vi } from "vitest";
import { QboProvider } from "./client";
import { latestPaymentDates, mapCustomer, mapInvoice, toCents } from "./mapping";
import { buildAuthorizeUrl, parseTokenResponse, refreshTokens, QboAuthError } from "./oauth";

const creds = { clientId: "cid", clientSecret: "secret", redirectUri: "http://localhost:3000/api/qbo/callback" };

describe("OAuth QuickBooks", () => {
  it("construit l'URL d'autorisation avec state et scope comptable", () => {
    const url = new URL(buildAuthorizeUrl(creds, "abc123"));
    expect(url.origin).toBe("https://appcenter.intuit.com");
    expect(url.searchParams.get("state")).toBe("abc123");
    expect(url.searchParams.get("scope")).toBe("com.intuit.quickbooks.accounting");
    expect(url.searchParams.get("redirect_uri")).toBe(creds.redirectUri);
  });

  it("calcule les dates d'expiration des jetons", () => {
    const t = parseTokenResponse({ access_token: "a", refresh_token: "r", expires_in: 3600, x_refresh_token_expires_in: 8_726_400 }, 0);
    expect(t.accessTokenExpiresAt.getTime()).toBe(3_600_000);
    expect(t.refreshTokenExpiresAt?.getTime()).toBe(8_726_400_000);
  });

  it("signale qu'il faut reconnecter quand le jeton de rafraîchissement est invalide", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }));
    const err = await refreshTokens(creds, "old", fetchImpl as unknown as typeof fetch).catch((e) => e);
    expect(err).toBeInstanceOf(QboAuthError);
    expect(err.needsReconnect).toBe(true);
  });
});

describe("mappage QuickBooks → Dûment", () => {
  it("convertit les montants en cents sans erreur d'arrondi", () => {
    expect(toCents(1250.1)).toBe(125010);
    expect(toCents(0.29)).toBe(29);
  });

  it("mappe un client et garde la première adresse courriel", () => {
    const c = mapCustomer({ Id: "7", DisplayName: "Studio Bleu", GivenName: "Marie", FamilyName: "Roy", PrimaryEmailAddr: { Address: "a@x.ca, b@x.ca" } });
    expect(c).toMatchObject({ externalId: "7", contactName: "Marie Roy", email: "a@x.ca", active: true });
  });

  it("détecte une facture payée et sa date de paiement", () => {
    const paid = latestPaymentDates([
      { Id: "p1", TxnDate: "2026-09-01", Line: [{ LinkedTxn: [{ TxnId: "130", TxnType: "Invoice" }] }] },
      { Id: "p2", TxnDate: "2026-09-20", Line: [{ LinkedTxn: [{ TxnId: "130", TxnType: "Invoice" }] }] },
    ]);
    const inv = mapInvoice({ Id: "130", TxnDate: "2026-08-01", DueDate: "2026-08-31", TotalAmt: 500, Balance: 0, CustomerRef: { value: "7" } }, paid);
    expect(inv.paidDate).toBe("2026-09-20");
    expect(inv.balanceCents).toBe(0);
  });

  it("détecte une facture annulée", () => {
    const inv = mapInvoice({ Id: "9", TxnDate: "2026-08-01", TotalAmt: 0, Balance: 0, PrivateNote: "Voided", CustomerRef: { value: "1" } });
    expect(inv.voided).toBe(true);
    expect(inv.paidDate).toBeNull();
  });

  it("utilise la date de facture si l'échéance manque", () => {
    expect(mapInvoice({ Id: "1", TxnDate: "2026-08-01", TotalAmt: 10, Balance: 10, CustomerRef: { value: "1" } }).dueDate).toBe("2026-08-01");
  });
});

describe("client API QuickBooks", () => {
  it("rafraîchit le jeton et réessaie une fois sur 401", async () => {
    const getAccessToken = vi.fn(async (force?: boolean) => (force ? "new" : "old"));
    const fetchImpl = vi.fn(async (_url: URL, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>).Authorization;
      return auth === "Bearer old"
        ? new Response("expired", { status: 401 })
        : new Response(JSON.stringify({ CompanyInfo: { CompanyName: "Sandbox Co" } }), { status: 200 });
    });
    const p = new QboProvider("123", "sandbox", { getAccessToken }, fetchImpl as unknown as typeof fetch);
    expect((await p.getCompanyInfo()).name).toBe("Sandbox Co");
    expect(getAccessToken).toHaveBeenLastCalledWith(true);
    const url = fetchImpl.mock.calls[1][0] as URL;
    expect(url.host).toBe("sandbox-quickbooks.api.intuit.com");
    expect(url.searchParams.get("minorversion")).toBe("75");
  });

  it("pagine les requêtes et fusionne factures ouvertes et modifiées", async () => {
    const queries: string[] = [];
    const fetchImpl = vi.fn(async (url: URL) => {
      const q = url.searchParams.get("query") ?? "";
      queries.push(q);
      if (q.includes("from Invoice where Balance")) {
        return Response.json({ QueryResponse: { Invoice: [{ Id: "1", TxnDate: "2026-09-01", DueDate: "2026-09-30", TotalAmt: 100, Balance: 100, CustomerRef: { value: "5" } }] } });
      }
      if (q.includes("from Invoice where MetaData")) {
        return Response.json({ QueryResponse: { Invoice: [
          { Id: "1", TxnDate: "2026-09-01", DueDate: "2026-09-30", TotalAmt: 100, Balance: 100, CustomerRef: { value: "5" } },
          { Id: "2", TxnDate: "2026-08-01", DueDate: "2026-08-31", TotalAmt: 200, Balance: 0, CustomerRef: { value: "5" } },
        ] } });
      }
      return Response.json({ QueryResponse: { Payment: [{ Id: "p", TxnDate: "2026-10-01", Line: [{ LinkedTxn: [{ TxnId: "2", TxnType: "Invoice" }] }] }] } });
    });
    const p = new QboProvider("123", "sandbox", { getAccessToken: async () => "t" }, fetchImpl as unknown as typeof fetch);
    const invoices = await p.listInvoices({ changedSince: new Date("2026-09-28T00:00:00Z") });
    expect(invoices.map((i) => i.externalId).sort()).toEqual(["1", "2"]);
    expect(invoices.find((i) => i.externalId === "2")?.paidDate).toBe("2026-10-01");
    expect(queries[1]).toContain("'2026-09-28T00:00:00Z'");
    expect(queries[0]).toContain("startposition 1 maxresults 1000");
  });
});
