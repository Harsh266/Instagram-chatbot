import { createLucideIcon } from "lucide-react";

/** Generic Instagram-style glyph (lucide no longer ships brand icons). */
export const InstagramGlyph = createLucideIcon("instagram-glyph", [
  ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5", key: "frame" }],
  ["circle", { cx: "12", cy: "12", r: "4", key: "lens" }],
  ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5", key: "dot" }],
]);
