import { it, expect, vi } from "vitest";
import { selectObservation } from "../src/application/select-observation";
it("skips nearer missing and stale measurements deterministically", async () => {
  const value = await selectObservation(
    [
      { id: "B", distance: 2 },
      { id: "A", distance: 1 },
      { id: "C", distance: 3 },
    ],
    async (s) =>
      s.id === "A"
        ? { status: "unavailable", id: "A" }
        : s.id === "B"
          ? { status: "stale", id: "B" }
          : { status: "available", id: "C" },
  );
  expect(value?.id).toBe("C");
});
it("breaks distance ties by stable station ID irrespective of provider order", async () => {
  const r = await selectObservation(
    [
      { id: "B", distance: 1 },
      { id: "A", distance: 1 },
    ],
    async (s) => ({ status: "available", id: s.id }),
  );
  expect(r?.id).toBe("A");
});
it("bounds radius and request count and isolates station outages", async () => {
  const load = vi.fn(async () => {
    throw Error("offline");
  });
  expect(
    await selectObservation(
      Array.from({ length: 20 }, (_, i) => ({
        id: String(i),
        distance: i * 3,
      })),
      load,
    ),
  ).toBeNull();
  expect(load).toHaveBeenCalledTimes(5);
});
