import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron";

describe("protection des routes cron", () => {
  it("accepte seulement le bon secret", () => {
    expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorizedCron("Bearer wrong!", "s3cret")).toBe(false);
    expect(isAuthorizedCron(null, "s3cret")).toBe(false);
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
  });
});
