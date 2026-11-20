/**
 * Geometry of the services belt: professionals stand on an elliptical floor that turns.
 * `angle` is the belt rotation in radians; slot `index` sits at `angle + index * step`.
 * A slot whose cosine is 1 faces the visitor (front, biggest, sharpest).
 */

const TAU = Math.PI * 2;

export type BeltPose = {
  /** Horizontal offset from the belt centre, in px. */
  x: number;
  /** Vertical offset of the feet from the belt centre, in px (positive = closer). */
  y: number;
  /** 0 at the back of the belt, 1 at the front. */
  depth: number;
  scale: number;
  blur: number;
  opacity: number;
  zIndex: number;
};

export type BeltRadii = { rx: number; ry: number };

export function beltStep(count: number): number {
  return count > 0 ? TAU / count : 0;
}

export function beltPose(angle: number, index: number, count: number, radii: BeltRadii): BeltPose {
  const theta = angle + index * beltStep(count);
  const cos = Math.cos(theta);
  const depth = (cos + 1) / 2;

  return {
    x: radii.rx * Math.sin(theta),
    y: radii.ry * cos,
    depth,
    scale: 0.5 + 0.5 * depth,
    blur: (1 - depth) * 3,
    opacity: 0.45 + 0.55 * depth,
    zIndex: Math.round(depth * 100),
  };
}

/** Index of the slot closest to the front for a given rotation. */
export function frontIndex(angle: number, count: number): number {
  let best = 0;
  let bestCos = -Infinity;
  for (let i = 0; i < count; i += 1) {
    const cos = Math.cos(angle + i * beltStep(count));
    if (cos > bestCos) {
      bestCos = cos;
      best = i;
    }
  }
  return best;
}

/**
 * Rotation that brings `index` to the front while travelling the shortest way
 * from `current` (never more than half a turn).
 */
export function angleToFront(current: number, index: number, count: number): number {
  const target = -index * beltStep(count);
  const delta = ((((target - current) % TAU) + TAU * 1.5) % TAU) - Math.PI;
  return current + delta;
}

/** Size of the belt stage, in pixels. */
export type StageSize = { width: number; height: number };

/** Breakpoint (px) above which the card sits beside the professional instead of below. */
export const WIDE_STAGE = 768;

/** Belt ellipse, centre and front height for a stage size. */
export function stageGeometry({ width, height }: StageSize) {
  const rx = Math.min(width * 0.36, 440);
  const radii: BeltRadii = { rx, ry: rx * 0.3 };
  return {
    radii,
    centerX: width / 2,
    // On narrow screens the belt sits lower, closer to the title strip.
    centerY: height * (width < WIDE_STAGE ? 0.6 : 0.54),
    // Full-body portraits: the front professional takes about half the stage height.
    baseHeight: Math.min(Math.max(height * 0.52, 230), 380),
  };
}
