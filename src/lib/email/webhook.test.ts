import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyResendWebhook } from "./webhook";

const secretBytes = Buffer.from("cle-de-test-webhook-32-octets!!!");
const secret = `whsec_${secretBytes.toString("base64")}`;
const sign = (id: string, ts: string, body: string) =>
  `v1,${createHmac("sha256", secretBytes).update(`${id}.${ts}.${body}`).digest("base64")}`;

describe("webhook Resend", () => {
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "abc" } });
  const ts = "1790000000";
  it("accepte une signature valide", () => {
    expect(verifyResendWebhook(body, { id: "msg_1", timestamp: ts, signature: sign("msg_1", ts, body) }, secret, 1790000000_000)).toBe(true);
  });
  it("refuse un corps modifié, un secret différent ou un message trop vieux", () => {
    const sig = sign("msg_1", ts, body);
    expect(verifyResendWebhook(body + " ", { id: "msg_1", timestamp: ts, signature: sig }, secret, 1790000000_000)).toBe(false);
    expect(verifyResendWebhook(body, { id: "msg_1", timestamp: ts, signature: sig }, `whsec_${Buffer.from("autre").toString("base64")}`, 1790000000_000)).toBe(false);
    expect(verifyResendWebhook(body, { id: "msg_1", timestamp: ts, signature: sig }, secret, 1790001000_000)).toBe(false);
  });
});
