import { ARENA_HALF_W, ARENA_HALF_H } from '@ben10/shared';

export function circlesOverlap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const radSum = r1 + r2;
  return distSq <= radSum * radSum;
}

export function distanceSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

export function clampToArena(x: number, y: number, radius: number): { x: number; y: number } {
  return {
    x: Math.max(-ARENA_HALF_W + radius, Math.min(ARENA_HALF_W - radius, x)),
    y: Math.max(-ARENA_HALF_H + radius, Math.min(ARENA_HALF_H - radius, y)),
  };
}

export function isInArena(x: number, y: number): boolean {
  return Math.abs(x) <= ARENA_HALF_W && Math.abs(y) <= ARENA_HALF_H;
}
