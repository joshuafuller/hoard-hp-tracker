import { afterEach, describe, expect, it, vi } from "vitest";
import { SHARE_URL, shareHoard } from "./shareHoard";

const orig = { share: (navigator as Navigator).share, clipboard: navigator.clipboard };

afterEach(() => {
  Object.defineProperty(navigator, "share", { value: orig.share, configurable: true });
  Object.defineProperty(navigator, "clipboard", { value: orig.clipboard, configurable: true });
});

describe("shareHoard", () => {
  it("uses the native share sheet with the app title + URL when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    expect(await shareHoard()).toBe("shared");
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: SHARE_URL, title: "Hoard" }));
  });

  it("falls back to copying the link when there is no share API", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await shareHoard()).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
  });

  it("treats a cancelled share sheet as done — does NOT then copy", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("cancel"), { name: "AbortError" }));
    const writeText = vi.fn();
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    expect(await shareHoard()).toBe("shared");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("reports unavailable when neither API exists", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    expect(await shareHoard()).toBe("unavailable");
  });
});
