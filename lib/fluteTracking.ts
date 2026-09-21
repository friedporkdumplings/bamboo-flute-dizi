import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { CalibratedHole, HandAnchor } from "@/lib/handTracking";

export type FluteGeometry = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
};

export type TrackedFluteLayout = {
  geometry: FluteGeometry;
  holes: CalibratedHole[];
  scale: number;
};

function palmCenter(landmarks: NormalizedLandmark[]) {
  const indices = [0, 5, 9, 13, 17];
  const points = indices.map((index) => landmarks[index]).filter(Boolean);
  if (points.length !== indices.length) return null;
  return {
    x: points.reduce((sum, point) => sum + (1 - point.x), 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
}

export function captureHandAnchor(
  hands: NormalizedLandmark[][],
  handLabels: string[],
  requestedHand: "left" | "right",
): HandAnchor | null {
  let handIndex = handLabels.findIndex((label) => label.toLowerCase() === requestedHand);
  if (handIndex === -1 && hands.length === 1) handIndex = 0;
  const landmarks = hands[handIndex];
  if (!landmarks) return null;
  const center = palmCenter(landmarks);
  if (!center) return null;
  return { handLabel: handLabels[handIndex] ?? requestedHand, ...center };
}

function currentAnchor(
  hands: NormalizedLandmark[][],
  handLabels: string[],
  reference: HandAnchor,
) {
  const index = handLabels.indexOf(reference.handLabel);
  const center = index >= 0 ? palmCenter(hands[index]) : null;
  return center ? { ...reference, ...center } : null;
}

export function trackFluteLayout(
  holes: CalibratedHole[],
  geometry: FluteGeometry,
  referenceAnchors: HandAnchor[],
  hands: NormalizedLandmark[][],
  handLabels: string[],
): TrackedFluteLayout | null {
  const references = referenceAnchors
    .map((reference) => ({ reference, current: currentAnchor(hands, handLabels, reference) }))
    .filter((pair): pair is { reference: HandAnchor; current: HandAnchor } => Boolean(pair.current));

  if (references.length < 2) return null;

  let scale = 1;
  let rotation = 0;
  const first = references[0];
  const second = references[1];
  const referenceDx = second.reference.x - first.reference.x;
  const referenceDy = second.reference.y - first.reference.y;
  const currentDx = second.current.x - first.current.x;
  const currentDy = second.current.y - first.current.y;
  const referenceDistance = Math.hypot(referenceDx, referenceDy);
  const currentDistance = Math.hypot(currentDx, currentDy);
  if (referenceDistance <= 0.001 || currentDistance <= 0.001) return null;
  const rawScale = currentDistance / referenceDistance;
  if (rawScale < 0.55 || rawScale > 1.75) return null;
  scale = Math.min(1.55, Math.max(0.65, rawScale));
  const rawRotation = Math.atan2(currentDy, currentDx) - Math.atan2(referenceDy, referenceDx);
  rotation = Math.atan2(Math.sin(rawRotation), Math.cos(rawRotation));
  if (Math.abs(rotation) > Math.PI / 3) return null;
  const referenceCenter = {
    handLabel: "center",
    x: (first.reference.x + second.reference.x) / 2,
    y: (first.reference.y + second.reference.y) / 2,
  };
  const currentCenter = {
    handLabel: "center",
    x: (first.current.x + second.current.x) / 2,
    y: (first.current.y + second.current.y) / 2,
  };

  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const transformPoint = (point: { x: number; y: number }) => {
    const localX = (point.x - referenceCenter.x) * scale;
    const localY = (point.y - referenceCenter.y) * scale;
    return {
      x: currentCenter.x + localX * cosine - localY * sine,
      y: currentCenter.y + localX * sine + localY * cosine,
    };
  };

  const start = transformPoint({ x: geometry.startX, y: geometry.startY });
  const end = transformPoint({ x: geometry.endX, y: geometry.endY });
  return {
    holes: holes.map((hole) => ({ ...hole, ...transformPoint(hole) })),
    geometry: {
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      thickness: geometry.thickness * scale,
    },
    scale,
  };
}
