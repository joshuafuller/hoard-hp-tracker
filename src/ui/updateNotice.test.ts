import { describe, expect, it } from "vitest";
import { updateNotice } from "./updateNotice";

describe("updateNotice", () => {
  it("announces the new version when the stored version differs (an auto-update applied)", () => {
    expect(updateNotice("1.0.0", "1.1.0")).toBe("Updated to v1.1.0");
  });

  it("is silent on first install — no stored version", () => {
    expect(updateNotice(null, "1.0.0")).toBeNull();
  });

  it("is silent on a plain reload — same version", () => {
    expect(updateNotice("1.0.0", "1.0.0")).toBeNull();
  });
});
