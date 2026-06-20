import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";

// jsdom has no canvas backend; return null so the LiquidVessel takes its static
// fallback path quietly (instead of jsdom logging "Not implemented" for every
// getContext probe). Real WebGL is exercised in the browser, not here.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement["getContext"];

// jsdom lacks PointerEvent, so fireEvent.pointer* would drop clientX/clientY and
// pointer-capture calls would throw. Polyfill a minimal version (extends
// MouseEvent so coordinates carry) and no-op the capture API.
if (typeof window.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}
for (const m of ["setPointerCapture", "releasePointerCapture", "hasPointerCapture"] as const) {
  if (!(m in Element.prototype)) {
    (Element.prototype as unknown as Record<string, unknown>)[m] = () => {};
  }
}
