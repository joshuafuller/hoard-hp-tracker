import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";

// jsdom has no canvas backend; return null so the LiquidVessel takes its static
// fallback path quietly (instead of jsdom logging "Not implemented" for every
// getContext probe). Real WebGL is exercised in the browser, not here.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement["getContext"];
