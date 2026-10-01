import { beforeEach, describe, expect, it } from "vitest";

import { useAtsDismissals } from "./dismissals";

beforeEach(() => {
  useAtsDismissals.setState({ byResume: {} });
});

describe("ATS dismissals", () => {
  it("remembers a dismissal for the resume it was made in, and no other", () => {
    useAtsDismissals.getState().dismiss("a", "ats.columns-two:s1");

    expect(useAtsDismissals.getState().byResume["a"]).toEqual([
      "ats.columns-two:s1",
    ]);
    expect(useAtsDismissals.getState().byResume["b"]).toBeUndefined();
  });

  it("does not record the same issue twice", () => {
    const { dismiss } = useAtsDismissals.getState();

    dismiss("a", "x");
    dismiss("a", "x");

    expect(useAtsDismissals.getState().byResume["a"]).toEqual(["x"]);
  });

  it("brings everything back for one resume without touching another", () => {
    const { dismiss, restoreAll } = useAtsDismissals.getState();

    dismiss("a", "x");
    dismiss("b", "y");
    restoreAll("a");

    expect(useAtsDismissals.getState().byResume["a"]).toBeUndefined();
    expect(useAtsDismissals.getState().byResume["b"]).toEqual(["y"]);
  });
});
