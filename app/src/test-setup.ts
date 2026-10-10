import "@testing-library/jest-dom/vitest";

// jsdom kennt einige Layout-Funktionen nicht, die der Editor (ProseMirror) beim Auswaehlen nutzt.
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
Range.prototype.getBoundingClientRect = () => ({ ...emptyRect, toJSON: () => emptyRect }) as DOMRect;
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
document.elementFromPoint ??= () => null;
