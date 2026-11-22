// Light Gizmo & Directional Shading Helper
import type { Light } from './layers.ts';
export const SUN_GIZMO_RADIUS = 14;

// Calculate sun gizmo position on the perimeter of canvas
export function getSunGizmoPos(azimuthDeg: number, W: number, H: number, margin = 24) {
  const cx = W / 2;
  const cy = H / 2;
  const rad = ((azimuthDeg - 90) * Math.PI) / 180; // 0 deg = top, 90 deg = right, 180 deg = bottom, 270 deg = left

  // Elliptical perimeter to match canvas aspect ratio
  const rx = W / 2 - margin;
  const ry = H / 2 - margin;

  return {
    x: cx + rx * Math.cos(rad),
    y: cy + ry * Math.sin(rad),
    cx,
    cy
  };
}

// Draw the sun gizmo handle along canvas perimeter
export function drawLightGizmo(ctx: CanvasRenderingContext2D, light: Light, W: number, H: number) {
  ctx.save();
  const azimuth = light.azimuth ?? 45;
  const { x, y, cx, cy } = getSunGizmoPos(azimuth, W, H);

  // Dotted ray from center to sun
  ctx.strokeStyle = 'rgba(241, 196, 15, 0.25)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(x, y);
  ctx.stroke();

  // Sun circle
  ctx.setLineDash([]);
  ctx.fillStyle = '#f1c40f';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, SUN_GIZMO_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sun icon ☀
  ctx.fillStyle = '#000000';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☀', x, y);

  ctx.restore();
}

// Hit test the sun gizmo
export function hitTestLightGizmo(px: number, py: number, light: Light | null | undefined, W: number, H: number) {
  const azimuth = light?.azimuth ?? 45;
  const { x, y } = getSunGizmoPos(azimuth, W, H);
  const dist = Math.hypot(px - x, py - y);
  return dist <= SUN_GIZMO_RADIUS + 6;
}

// Compute new azimuth from pointer position
export function computeAzimuthFromPointer(px: number, py: number, W: number, H: number) {
  const cx = W / 2;
  const cy = H / 2;
  const angleRad = Math.atan2(py - cy, px - cx);
  let deg = Math.round((angleRad * 180) / Math.PI + 90);
  if (deg < 0) deg += 360;
  if (deg >= 360) deg -= 360;
  return deg;
}
