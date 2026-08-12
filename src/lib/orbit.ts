export function getSegmentFillLength(length: number, gap: number, progress: number): number {
  const drawableLength = Math.max(0, length - gap);
  return drawableLength * Math.min(1, Math.max(0, progress));
}

export function getOrbitPoint(
  progress: number,
  radius: number,
  centerX: number,
  centerY: number,
): { x: number; y: number } {
  const normalizedProgress = Math.min(1, Math.max(0, progress));
  const angle = normalizedProgress * Math.PI * 2;
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}
