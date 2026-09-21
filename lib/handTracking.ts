import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type CalibratedHole = {
  id: number;
  x: number;
  y: number;
};

export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

export type FingerName = "index" | "middle" | "ring";

type FingerSegment = {
  finger: FingerName;
  startIndex: number;
  endIndex: number;
};

const FINGER_PAD_SEGMENTS: ReadonlyArray<FingerSegment> = [
  { finger: "index", startIndex: 7, endIndex: 8 },
  { finger: "middle", startIndex: 11, endIndex: 12 },
  { finger: "ring", startIndex: 15, endIndex: 16 },
];

export type CoveredFingerBinding = FingerSegment & {
  holeId: number;
  handLabel: string;
  coveredDistance: number;
};

export type HandAnchor = {
  handLabel: string;
  x: number;
  y: number;
};

export type FingerBinding = CoveredFingerBinding & {
  restingDistance: number;
};

export type HandCalibration = {
  bindings: FingerBinding[];
  anchors: HandAnchor[];
  createdAt: number;
};

function pointToSegmentDistance(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  const dx = endX - startX;
  const dy = endY - startY;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(pointX - startX, pointY - startY);

  const projection = Math.max(0, Math.min(1, ((pointX - startX) * dx + (pointY - startY) * dy) / lengthSquared));
  const closestX = startX + projection * dx;
  const closestY = startY + projection * dy;
  return Math.hypot(pointX - closestX, pointY - closestY);
}

export function detectHoleCoverage(
  hands: NormalizedLandmark[][],
  holes: CalibratedHole[],
  width: number,
  height: number,
  tolerancePixels = 26,
) {
  return holes.map((hole) => {
    const holeX = hole.x * width;
    const holeY = hole.y * height;

    return hands.some((landmarks) => FINGER_PAD_SEGMENTS.some(({ startIndex, endIndex }) => {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      if (!start || !end) return false;

      return pointToSegmentDistance(
        holeX,
        holeY,
        (1 - start.x) * width,
        start.y * height,
        (1 - end.x) * width,
        end.y * height,
      ) <= tolerancePixels;
    }));
  });
}

function normalizedSegmentDistance(
  hole: CalibratedHole,
  landmarks: NormalizedLandmark[],
  startIndex: number,
  endIndex: number,
  width: number,
  height: number,
) {
  const start = landmarks[startIndex];
  const end = landmarks[endIndex];
  if (!start || !end) return Number.POSITIVE_INFINITY;
  const scale = Math.max(1, Math.min(width, height));
  return pointToSegmentDistance(
    hole.x * width,
    hole.y * height,
    (1 - start.x) * width,
    start.y * height,
    (1 - end.x) * width,
    end.y * height,
  ) / scale;
}

export function buildCoveredFingerMapForHand(
  hands: NormalizedLandmark[][],
  handLabels: string[],
  requestedHand: "left" | "right",
  holes: CalibratedHole[],
  width: number,
  height: number,
): CoveredFingerBinding[] | null {
  let requestedIndex = handLabels.findIndex((label) => label.toLowerCase() === requestedHand);
  if (requestedIndex === -1 && hands.length === 1) requestedIndex = 0;
  const requestedLandmarks = hands[requestedIndex];
  if (!requestedLandmarks || holes.length !== 3) return null;

  const candidates = FINGER_PAD_SEGMENTS.map((segment) => ({
    ...segment,
    handLabel: handLabels[requestedIndex] ?? requestedHand,
    landmarks: requestedLandmarks,
    key: `${handLabels[requestedIndex] ?? requestedHand}-${segment.finger}`,
  }));

  const pairs = holes.flatMap((hole) => candidates.map((candidate) => ({
    hole,
    candidate,
    distance: normalizedSegmentDistance(
      hole,
      candidate.landmarks,
      candidate.startIndex,
      candidate.endIndex,
      width,
      height,
    ),
  }))).sort((a, b) => a.distance - b.distance);

  const usedHoles = new Set<number>();
  const usedFingers = new Set<string>();
  const bindings: CoveredFingerBinding[] = [];

  for (const pair of pairs) {
    if (usedHoles.has(pair.hole.id) || usedFingers.has(pair.candidate.key)) continue;
    usedHoles.add(pair.hole.id);
    usedFingers.add(pair.candidate.key);
    bindings.push({
      holeId: pair.hole.id,
      handLabel: pair.candidate.handLabel,
      finger: pair.candidate.finger,
      startIndex: pair.candidate.startIndex,
      endIndex: pair.candidate.endIndex,
      coveredDistance: pair.distance,
    });
    if (bindings.length === holes.length) break;
  }

  if (bindings.length !== holes.length || bindings.some((binding) => binding.coveredDistance > 0.08)) return null;
  return bindings.sort((a, b) => a.holeId - b.holeId);
}

export function addRestingFingerPoseForHand(
  coveredBindings: CoveredFingerBinding[],
  hands: NormalizedLandmark[][],
  handLabels: string[],
  holes: CalibratedHole[],
  width: number,
  height: number,
): FingerBinding[] | null {
  const bindings = coveredBindings.map((binding) => {
    let handIndex = handLabels.indexOf(binding.handLabel);
    if (handIndex === -1 && hands.length === 1) handIndex = 0;
    const landmarks = hands[handIndex];
    const hole = holes.find((item) => item.id === binding.holeId);
    if (!landmarks || !hole) return null;
    return {
      ...binding,
      restingDistance: normalizedSegmentDistance(
        hole,
        landmarks,
        binding.startIndex,
        binding.endIndex,
        width,
        height,
      ),
    };
  });

  if (bindings.some((binding) => !binding)) return null;
  return bindings as FingerBinding[];
}

export function detectMappedCoverage(
  hands: NormalizedLandmark[][],
  handLabels: string[],
  holes: CalibratedHole[],
  calibration: HandCalibration,
  width: number,
  height: number,
  distanceScale = 1,
) {
  return holes.map((hole) => {
    const binding = calibration.bindings.find((item) => item.holeId === hole.id);
    if (!binding) return false;
    let handIndex = handLabels.indexOf(binding.handLabel);
    if (handIndex === -1 && hands.length === 1) handIndex = 0;
    const landmarks = hands[handIndex];
    if (!landmarks) return false;

    const currentDistance = normalizedSegmentDistance(
      hole,
      landmarks,
      binding.startIndex,
      binding.endIndex,
      width,
      height,
    );
    const coveredDistance = binding.coveredDistance * distanceScale;
    const restingDistance = binding.restingDistance * distanceScale;
    const separation = Math.max(restingDistance - coveredDistance, 0.012 * distanceScale);
    const coveredThreshold = coveredDistance + separation * 0.42;
    return currentDistance <= coveredThreshold;
  });
}

export function smoothCoverage(history: boolean[][], frameCount = 5) {
  const recentFrames = history.slice(-frameCount);
  const threshold = Math.ceil(recentFrames.length * 0.6);
  return Array.from({ length: 6 }, (_, index) => (
    recentFrames.reduce((count, frame) => count + (frame[index] ? 1 : 0), 0) >= threshold
  ));
}
