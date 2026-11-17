import { describe, expect, it } from 'vitest';

import { angleToFront, beltPose, beltStep, frontIndex } from './belt-geometry';

const RADII = { rx: 400, ry: 150 };

describe('beltPose', () => {
  it('puts slot 0 at the front, centred, sharp and on top when the belt is at rest', () => {
    const pose = beltPose(0, 0, 5, RADII);
    expect(pose.x).toBeCloseTo(0);
    expect(pose.y).toBeCloseTo(150);
    expect(pose.depth).toBeCloseTo(1);
    expect(pose.scale).toBeCloseTo(1);
    expect(pose.blur).toBeCloseTo(0);
    expect(pose.zIndex).toBe(100);
  });

  it('pushes the slot facing away to the back: small, blurred, faded and underneath', () => {
    const pose = beltPose(Math.PI, 0, 5, RADII);
    expect(pose.y).toBeCloseTo(-150);
    expect(pose.scale).toBeCloseTo(0.5);
    expect(pose.blur).toBeCloseTo(3);
    expect(pose.opacity).toBeCloseTo(0.45);
    expect(pose.zIndex).toBe(0);
  });

  it('spreads slots evenly around the ellipse', () => {
    const left = beltPose(0, 1, 4, RADII);
    const right = beltPose(0, 3, 4, RADII);
    expect(left.x).toBeCloseTo(400);
    expect(right.x).toBeCloseTo(-400);
  });
});

describe('frontIndex', () => {
  it('finds the slot nearest the front', () => {
    expect(frontIndex(0, 5)).toBe(0);
    expect(frontIndex(-beltStep(5) * 2, 5)).toBe(2);
    expect(frontIndex(-beltStep(5) * 2 + 0.2, 5)).toBe(2);
  });
});

describe('angleToFront', () => {
  it('brings the requested slot to the front', () => {
    const target = angleToFront(0.7, 3, 5);
    expect(frontIndex(target, 5)).toBe(3);
    expect(beltPose(target, 3, 5, RADII).depth).toBeCloseTo(1);
  });

  it('never turns more than half a revolution', () => {
    for (const current of [0, 2.5, -9, 40]) {
      for (let index = 0; index < 5; index += 1) {
        expect(Math.abs(angleToFront(current, index, 5) - current)).toBeLessThanOrEqual(Math.PI);
      }
    }
  });
});
