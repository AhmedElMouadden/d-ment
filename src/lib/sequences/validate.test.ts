import { describe, expect, it } from "vitest";
import { DEFAULT_STEPS, validateSteps } from "./validate";

describe("validation de la séquence", () => {
  it("accepte la séquence par défaut", () => expect(validateSteps(DEFAULT_STEPS)).toBeNull());
  it("refuse les doublons, les délais hors bornes, trop d'étapes, zéro étape", () => {
    expect(validateSteps([...DEFAULT_STEPS, { ...DEFAULT_STEPS[0], id: null }])).toBe("duplicate");
    expect(validateSteps([{ ...DEFAULT_STEPS[0], offsetDays: 400 }])).toBe("range");
    expect(validateSteps(Array.from({ length: 11 }, (_, i) => ({ ...DEFAULT_STEPS[0], offsetDays: i })))).toBe("tooMany");
    expect(validateSteps([])).toBe("empty");
  });
});
