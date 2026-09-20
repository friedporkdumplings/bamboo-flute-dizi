"use client";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  ChevronDown,
  CircleAlert,
  Crosshair,
  FileMusic,
  Maximize2,
  MoreHorizontal,
  Pause,
  Play,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { HandLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { fingeringMap, type Fingering, type NoteKey, type NoteRegister } from "@/lib/fingeringMap";
import {
  addRestingFingerPose,
  buildCoveredFingerMap,
  detectHoleCoverage,
  detectMappedCoverage,
  HAND_CONNECTIONS,
  smoothCoverage,
  type CoveredFingerBinding,
  type HandCalibration,
} from "@/lib/handTracking";
import { parseNumberedNotes } from "@/lib/noteParser";
import SheetViewer from "@/app/components/SheetViewer";

type SongNote = {
  id: string;
  pitch: string;
  register: NoteRegister;
  key: NoteKey;
};

function songNote(id: string, pitch: string, register: NoteRegister = "middle"): SongNote {
  return { id, pitch, register, key: `${register}-${pitch}` as NoteKey };
}

const DEFAULT_SONG: SongNote[] = [
  songNote("note-1", "5"),
  songNote("note-2", "3"),
  songNote("note-3", "1", "high"),
  songNote("note-4", "5"),
  songNote("note-5", "2"),
  songNote("note-6", "1", "high"),
  songNote("note-7", "6"),
  songNote("note-8", "5"),
  songNote("note-9", "3", "high"),
  songNote("note-10", "3"),
  songNote("note-11", "5"),
  songNote("note-12", "6"),
  songNote("note-13", "5"),
  songNote("note-14", "3"),
  songNote("note-15", "2"),
];

const DEMO_DETECTED: Fingering[] = [
  [true, true, true, true, true, true],
  [true, false, false, false, false, false],
  [true, true, true, false, false, false],
  [true, true, true, true, true, false],
];
const OPEN_FINGERING: Fingering = [false, false, false, false, false, false];

type CameraStatus = "idle" | "requesting" | "live" | "denied" | "error";
type TrackingStatus = "idle" | "loading" | "running" | "no-hands" | "error";
type HandSetupPhase = "idle" | "covered" | "resting";

type HolePosition = {
  id: number;
  x: number;
  y: number;
};

const DEFAULT_HOLE_POSITIONS: HolePosition[] = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  x: 0.3 + index * 0.08,
  y: 0.52,
}));

const CALIBRATION_STORAGE_KEY = "bamboo-flute-calibration-v1";
const HAND_CALIBRATION_STORAGE_KEY = "bamboo-hand-calibration-v1";

type LatestHandFrame = {
  hands: NormalizedLandmark[][];
  handLabels: string[];
  width: number;
  height: number;
};

function clamp(value: number, min = 0.04, max = 0.96) {
  return Math.min(max, Math.max(min, value));
}

function isHandCalibration(value: unknown): value is HandCalibration {
  if (!value || typeof value !== "object" || !("bindings" in value)) return false;
  const bindings = (value as { bindings?: unknown }).bindings;
  return Array.isArray(bindings)
    && bindings.length === 6
    && bindings.every((binding) => {
      if (!binding || typeof binding !== "object") return false;
      const candidate = binding as Partial<HandCalibration["bindings"][number]>;
      return Number.isInteger(candidate.holeId)
        && typeof candidate.handLabel === "string"
        && ["index", "middle", "ring"].includes(candidate.finger ?? "")
        && Number.isFinite(candidate.coveredDistance)
        && Number.isFinite(candidate.restingDistance);
    });
}

function runWithoutMediaPipeStartupNoise<T>(callback: () => T) {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const isDelegateStartupMessage = args.some(
      (argument) => typeof argument === "string" && argument.includes("Created TensorFlow Lite XNNPACK delegate"),
    );
    if (!isDelegateStartupMessage) originalConsoleError(...args);
  };
  try {
    return callback();
  } finally {
    console.error = originalConsoleError;
  }
}

async function runAsyncWithoutMediaPipeStartupNoise<T>(callback: () => Promise<T>) {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const isDelegateStartupMessage = args.some(
      (argument) => String(argument).includes("Created TensorFlow Lite XNNPACK delegate"),
    );
    if (!isDelegateStartupMessage) originalConsoleError(...args);
  };
  try {
    return await callback();
  } finally {
    console.error = originalConsoleError;
  }
}

function drawHandLandmarks(canvas: HTMLCanvasElement, hands: NormalizedLandmark[][], visible: boolean) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);

  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, width, height);
  if (!visible) return;

  for (const landmarks of hands) {
    context.lineWidth = 2;
    context.strokeStyle = "rgba(224, 245, 230, .72)";
    for (const [startIndex, endIndex] of HAND_CONNECTIONS) {
      const start = landmarks[startIndex];
      const end = landmarks[endIndex];
      if (!start || !end) continue;
      context.beginPath();
      context.moveTo((1 - start.x) * width, start.y * height);
      context.lineTo((1 - end.x) * width, end.y * height);
      context.stroke();
    }

    landmarks.forEach((landmark, index) => {
      const isFingerPad = [4, 8, 12, 16, 20].includes(index);
      context.beginPath();
      context.arc((1 - landmark.x) * width, landmark.y * height, isFingerPad ? 5 : 3, 0, Math.PI * 2);
      context.fillStyle = isFingerPad ? "#f2c678" : "#d9efdf";
      context.fill();
      context.lineWidth = 1;
      context.strokeStyle = "rgba(34, 65, 48, .75)";
      context.stroke();
    });
  }
}

function HoleRow({ holes, tone = "target" }: { holes: Fingering; tone?: "target" | "detected" }) {
  return (
    <div className="hole-row" aria-label={holes.map((hole) => (hole ? "covered" : "open")).join(", ")}>
      {holes.map((covered, index) => (
        <span
          className={`hole ${covered ? "is-covered" : "is-open"} ${tone === "detected" ? "is-detected" : ""}`}
          key={index}
        >
          <span className="sr-only">Hole {index + 1}: {covered ? "covered" : "open"}</span>
        </span>
      ))}
    </div>
  );
}

function getFeedback(target: Fingering, detected: Fingering) {
  const mismatch = target.findIndex((value, index) => value !== detected[index]);
  if (mismatch === -1) return { correct: true, text: "Beautiful — that’s correct" };
  return {
    correct: false,
    text: target[mismatch] ? `Cover hole ${mismatch + 1}` : `Open hole ${mismatch + 1}`,
  };
}

function NoteGlyph({ note, large = false }: { note: SongNote; large?: boolean }) {
  const label = fingeringMap[note.key].chineseLabel;
  return (
    <span className={`note-glyph ${large ? "is-large" : ""}`} aria-label={label}>
      {note.register === "high" && <i className="octave-dot above">•</i>}
      <b>{note.pitch}</b>
      {note.register === "low" && <i className="octave-dot below">•</i>}
    </span>
  );
}

export default function Home() {
  const [song, setSong] = useState<SongNote[]>(DEFAULT_SONG);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [calibrating, setCalibrating] = useState(false);
  const [hasCalibration, setHasCalibration] = useState(false);
  const [holePositions, setHolePositions] = useState<HolePosition[]>(DEFAULT_HOLE_POSITIONS);
  const [draggingHole, setDraggingHole] = useState<number | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");
  const [detectedHoles, setDetectedHoles] = useState<Fingering>([false, false, false, false, false, false]);
  const [debugMode, setDebugMode] = useState(true);
  const [handCalibration, setHandCalibration] = useState<HandCalibration | null>(null);
  const [handSetupPhase, setHandSetupPhase] = useState<HandSetupPhase>("idle");
  const [handSetupError, setHandSetupError] = useState("");
  const [sheetOpen, setSheetOpen] = useState(true);
  const [manualNotesOpen, setManualNotesOpen] = useState(false);
  const [manualNoteText, setManualNoteText] = useState("");
  const [manualNoteError, setManualNoteError] = useState("");
  const [isCustomSong, setIsCustomSong] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const trackingFrameRef = useRef<number | null>(null);
  const trackingActiveRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const coverageHistoryRef = useRef<boolean[][]>([]);
  const holePositionsRef = useRef<HolePosition[]>(DEFAULT_HOLE_POSITIONS);
  const debugModeRef = useRef(true);
  const handCalibrationRef = useRef<HandCalibration | null>(null);
  const coveredFingerMapRef = useRef<CoveredFingerBinding[] | null>(null);
  const latestHandFrameRef = useRef<LatestHandFrame | null>(null);

  const note = song[currentIndex];
  const noteDefinition = fingeringMap[note.key];
  const target = noteDefinition.holes;
  const usingLiveDetection = cameraStatus === "live" && hasCalibration && Boolean(handCalibration) && trackingStatus !== "idle";
  const detected = usingLiveDetection
    ? detectedHoles
    : cameraStatus === "live"
      ? OPEN_FINGERING
      : DEMO_DETECTED[currentIndex % DEMO_DETECTED.length];
  const feedback = useMemo(() => getFeedback(target, detected), [target, detected]);
  const feedbackState = (() => {
    if (handSetupPhase === "covered") return { correct: false, label: "HAND SETUP · 1 OF 2", text: "Cover all six holes, then capture", hole: null };
    if (handSetupPhase === "resting") return { correct: false, label: "HAND SETUP · 2 OF 2", text: "Lift the six playing fingers slightly, then capture", hole: null };
    if (cameraStatus === "live" && hasCalibration && !handCalibration) return { correct: false, label: "HAND MAP REQUIRED", text: "Map your playing and resting finger positions", hole: null };
    if (trackingStatus === "loading") return { correct: false, label: "PREPARING TRACKER", text: "Loading the hand model…", hole: null };
    if (trackingStatus === "no-hands") return { correct: false, label: "NO HANDS DETECTED", text: "Move both hands into the camera view", hole: null };
    if (trackingStatus === "error") return { correct: false, label: "TRACKING PAUSED", text: "Hand tracking could not start", hole: null };
    return { ...feedback, label: feedback.correct ? "ON TARGET" : "SMALL ADJUSTMENT", hole: target.findIndex((value, index) => value !== detected[index]) + 1 };
  })();

  const trackerHint = (() => {
    if (calibrating) return "Drag each marker onto a flute hole";
    if (handSetupPhase === "covered") return "Cover all six holes with your normal grip";
    if (handSetupPhase === "resting") return "Lift the six playing fingers slightly";
    if (hasCalibration && !handCalibration) return "Map your fingers before starting practice";
    if (trackingStatus === "loading") return "Loading hand tracking…";
    if (trackingStatus === "no-hands") return "Move both hands into the frame";
    if (trackingStatus === "running") return "Hands found · align your fingers with the markers";
    return "Keep your flute inside the guide";
  })();

  const previous = () => setCurrentIndex((index) => Math.max(0, index - 1));
  const next = () => setCurrentIndex((index) => Math.min(song.length - 1, index + 1));

  const openManualNotes = () => {
    setManualNoteText(song.map((item) => item.pitch).join(" "));
    setManualNoteError("");
    setManualNotesOpen(true);
  };

  const useManualNotes = () => {
    const result = parseNumberedNotes(manualNoteText);
    if (result.error) {
      setManualNoteError(result.error);
      return;
    }
    const nextSong = result.notes.map((item, index) => songNote(`manual-note-${index + 1}`, item.pitch));
    setSong(nextSong);
    setCurrentIndex(0);
    setIsCustomSong(true);
    setManualNoteError("");
    setManualNotesOpen(false);
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as HolePosition[];
        if (parsed.length === 6 && parsed.every((hole) => Number.isFinite(hole.x) && Number.isFinite(hole.y))) {
          // Restore the browser-owned calibration after hydration.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setHolePositions(parsed);
          holePositionsRef.current = parsed;
          setHasCalibration(true);
        }
      } catch {
        window.localStorage.removeItem(CALIBRATION_STORAGE_KEY);
      }
    }

    const savedHandCalibration = window.localStorage.getItem(HAND_CALIBRATION_STORAGE_KEY);
    if (savedHandCalibration) {
      try {
        const parsed = JSON.parse(savedHandCalibration) as unknown;
        if (isHandCalibration(parsed)) {
          setHandCalibration(parsed);
          handCalibrationRef.current = parsed;
        } else {
          window.localStorage.removeItem(HAND_CALIBRATION_STORAGE_KEY);
        }
      } catch {
        window.localStorage.removeItem(HAND_CALIBRATION_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      trackingActiveRef.current = false;
      if (trackingFrameRef.current !== null) cancelAnimationFrame(trackingFrameRef.current);
      landmarkerRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopTracking = (dispose = false) => {
    trackingActiveRef.current = false;
    if (trackingFrameRef.current !== null) {
      cancelAnimationFrame(trackingFrameRef.current);
      trackingFrameRef.current = null;
    }
    if (dispose) {
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    }
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    coverageHistoryRef.current = [];
    latestHandFrameRef.current = null;
    lastVideoTimeRef.current = -1;
    setTrackingStatus("idle");
  };

  const initializeHandTracking = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    stopTracking(true);
    setTrackingStatus("loading");

    try {
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const landmarker = await runAsyncWithoutMediaPipeStartupNoise(async () => {
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        return HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/hand_landmarker.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      });

      landmarkerRef.current = landmarker;
      trackingActiveRef.current = true;

      const predict = () => {
        if (!trackingActiveRef.current || !landmarkerRef.current || !videoRef.current || !canvasRef.current) return;
        const liveVideo = videoRef.current;
        const liveCanvas = canvasRef.current;

        try {
          if (liveVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && liveVideo.currentTime !== lastVideoTimeRef.current) {
            const result = runWithoutMediaPipeStartupNoise(() => (
              landmarkerRef.current!.detectForVideo(liveVideo, performance.now())
            ));
            lastVideoTimeRef.current = liveVideo.currentTime;
            drawHandLandmarks(liveCanvas, result.landmarks, debugModeRef.current);

            if (result.landmarks.length === 0) {
              coverageHistoryRef.current = [];
              latestHandFrameRef.current = null;
              setDetectedHoles([false, false, false, false, false, false]);
              setTrackingStatus("no-hands");
            } else {
              const handLabels = result.handedness.map((categories, index) => (
                categories[0]?.categoryName ?? `hand-${index}`
              ));
              latestHandFrameRef.current = {
                hands: result.landmarks,
                handLabels,
                width: liveCanvas.clientWidth,
                height: liveCanvas.clientHeight,
              };
              const frame = handCalibrationRef.current
                ? detectMappedCoverage(
                    result.landmarks,
                    handLabels,
                    holePositionsRef.current,
                    handCalibrationRef.current,
                    liveCanvas.clientWidth,
                    liveCanvas.clientHeight,
                  )
                : detectHoleCoverage(
                    result.landmarks,
                    holePositionsRef.current,
                    liveCanvas.clientWidth,
                    liveCanvas.clientHeight,
                  );
              coverageHistoryRef.current = [...coverageHistoryRef.current.slice(-4), frame];
              const smoothedValues = smoothCoverage(coverageHistoryRef.current);
              const smoothed: Fingering = [
                smoothedValues[0], smoothedValues[1], smoothedValues[2],
                smoothedValues[3], smoothedValues[4], smoothedValues[5],
              ];
              setDetectedHoles((current) => current.every((value, index) => value === smoothed[index]) ? current : smoothed);
              setTrackingStatus("running");
            }
          }
          trackingFrameRef.current = requestAnimationFrame(predict);
        } catch {
          trackingActiveRef.current = false;
          setTrackingStatus("error");
        }
      };

      predict();
    } catch {
      setTrackingStatus("error");
    }
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("error");
      return;
    }

    setCameraStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus("live");
      if (!hasCalibration) {
        setCalibrating(true);
      } else {
        if (!handCalibrationRef.current) setHandSetupPhase("covered");
        void initializeHandTracking();
      }
    } catch (error) {
      const permissionDenied = error instanceof DOMException && ["NotAllowedError", "PermissionDeniedError"].includes(error.name);
      setCameraStatus(permissionDenied ? "denied" : "error");
    }
  };

  const stopCamera = () => {
    stopTracking(true);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus("idle");
    setCalibrating(false);
    setHandSetupPhase("idle");
    setHandSetupError("");
  };

  const updateHolePosition = (event: ReactPointerEvent<HTMLElement>) => {
    if (draggingHole === null || !calibrating) return;
    const stage = event.currentTarget.closest(".camera-stage");
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width);
    const y = clamp((event.clientY - rect.top) / rect.height);
    setHolePositions((positions) => {
      const nextPositions = positions.map((hole) => hole.id === draggingHole ? { ...hole, x, y } : hole);
      holePositionsRef.current = nextPositions;
      return nextPositions;
    });
  };

  const beginCalibration = () => {
    stopTracking(false);
    setHandSetupPhase("idle");
    setHandSetupError("");
    setCalibrating(true);
  };

  const confirmCalibration = () => {
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(holePositions));
    setHasCalibration(true);
    setCalibrating(false);
    setDraggingHole(null);
    window.localStorage.removeItem(HAND_CALIBRATION_STORAGE_KEY);
    setHandCalibration(null);
    handCalibrationRef.current = null;
    coveredFingerMapRef.current = null;
    setHandSetupPhase("covered");
    setHandSetupError("");
    void initializeHandTracking();
  };

  const cancelCalibration = () => {
    setCalibrating(false);
    setDraggingHole(null);
    if (!handCalibrationRef.current) setHandSetupPhase("covered");
    void initializeHandTracking();
  };

  const beginHandCalibration = () => {
    if (cameraStatus !== "live" || !hasCalibration) return;
    coveredFingerMapRef.current = null;
    setHandSetupError("");
    setHandSetupPhase("covered");
    if (trackingStatus === "idle" || trackingStatus === "error") void initializeHandTracking();
  };

  const captureCoveredPose = () => {
    const frame = latestHandFrameRef.current;
    if (!frame || frame.hands.length < 2) {
      setHandSetupError("Keep both hands fully visible, then try again.");
      return;
    }
    const bindings = buildCoveredFingerMap(
      frame.hands,
      frame.handLabels,
      holePositionsRef.current,
      frame.width,
      frame.height,
    );
    if (!bindings) {
      setHandSetupError("I could not match all six playing fingers. Center both hands over the markers.");
      return;
    }
    coveredFingerMapRef.current = bindings;
    setHandSetupError("");
    setHandSetupPhase("resting");
  };

  const captureRestingPose = () => {
    const frame = latestHandFrameRef.current;
    const coveredBindings = coveredFingerMapRef.current;
    if (!frame || frame.hands.length < 2 || !coveredBindings) {
      setHandSetupError("Keep both hands visible and repeat the covered pose first.");
      setHandSetupPhase("covered");
      return;
    }
    const calibration = addRestingFingerPose(
      coveredBindings,
      frame.hands,
      frame.handLabels,
      holePositionsRef.current,
      frame.width,
      frame.height,
    );
    if (!calibration) {
      setHandSetupError("Your hands moved out of view. Return to your normal grip and try again.");
      return;
    }
    const unclearFingers = calibration.bindings.filter(
      (binding) => binding.restingDistance - binding.coveredDistance < 0.006,
    );
    if (unclearFingers.length > 0) {
      setHandSetupError(`Lift every playing finger a little farther — ${unclearFingers.length} ${unclearFingers.length === 1 ? "finger is" : "fingers are"} still too close to a hole.`);
      return;
    }

    window.localStorage.setItem(HAND_CALIBRATION_STORAGE_KEY, JSON.stringify(calibration));
    handCalibrationRef.current = calibration;
    setHandCalibration(calibration);
    coverageHistoryRef.current = [];
    coveredFingerMapRef.current = null;
    setHandSetupError("");
    setHandSetupPhase("idle");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Bamboo home">
          <span className="brand-mark"><span /><span /><span /></span>
          <span>bamboo<span className="brand-dot">.</span></span>
        </a>
        <div className="session-title">
          <span className="eyebrow">PRACTICE SESSION</span>
          <button className="song-title">{isCustomSong ? "My Numbered Notes" : "茉莉花 · Jasmine Flower"} <ChevronDown size={15} /></button>
        </div>
        <div className="header-actions">
          <span className="mock-pill"><Sparkles size={14} /> Personal hand map</span>
          <button className="icon-button" aria-label="Settings"><Settings2 size={19} /></button>
          <button className="avatar" aria-label="Profile">ZH</button>
        </div>
      </header>

      <section className={`workspace ${sheetOpen ? "" : "sheet-collapsed"}`}>
        <div className="camera-column">
          <div className={`camera-card ${cameraStatus === "live" ? "" : "camera-off"}`}>
            <div className="camera-toolbar">
              <div className="live-label">
                <span className="live-dot" />
                {cameraStatus === "live" ? "Live camera" : "Camera setup"}
              </div>
              <div className="camera-actions">
                <span>{trackingStatus === "running" ? handCalibration ? "Finger map active" : "Mapping hands" : cameraStatus === "live" ? "Camera connected" : "Local video only"}</span>
                {cameraStatus === "live" && (
                  <button
                    className={debugMode ? "is-active" : ""}
                    aria-label={`${debugMode ? "Hide" : "Show"} hand landmarks`}
                    onClick={() => {
                      const nextMode = !debugMode;
                      debugModeRef.current = nextMode;
                      setDebugMode(nextMode);
                    }}
                  >
                    <Crosshair size={17} />
                  </button>
                )}
                {cameraStatus !== "live" && <button aria-label="More camera options"><MoreHorizontal size={20} /></button>}
                <button aria-label="Fullscreen"><Maximize2 size={17} /></button>
              </div>
            </div>

            <div className="camera-stage">
              <video
                ref={videoRef}
                className={`camera-video ${cameraStatus === "live" ? "is-live" : ""}`}
                autoPlay
                muted
                playsInline
                aria-hidden="true"
              />
              <canvas ref={canvasRef} className="tracking-canvas" aria-hidden="true" />

              {cameraStatus === "live" ? (
                <>
                  <div className="alignment-guide" aria-hidden="true">
                    <span className="alignment-line" />
                    <span className="alignment-end left" />
                    <span className="alignment-end right" />
                  </div>
                  <div className={`camera-hint ${calibrating || handSetupPhase !== "idle" ? "calibrating" : ""}`}>
                    {trackerHint}
                  </div>
                  <div className="frame-corner top-left" />
                  <div className="frame-corner top-right" />
                  <div className="frame-corner bottom-left" />
                  <div className="frame-corner bottom-right" />

                  {(calibrating || hasCalibration) && holePositions.map((hole) => (
                    <button
                      className={`calibration-marker ${calibrating ? "is-editing" : "is-saved"} ${detectedHoles[hole.id - 1] ? "is-covered" : ""}`}
                      key={hole.id}
                      style={{ left: `${hole.x * 100}%`, top: `${hole.y * 100}%` }}
                      aria-label={`Flute hole ${hole.id}${calibrating ? ", drag to reposition" : ""}`}
                      onPointerDown={(event) => {
                        if (!calibrating) return;
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setDraggingHole(hole.id);
                      }}
                      onPointerMove={updateHolePosition}
                      onPointerUp={(event) => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                        }
                        setDraggingHole(null);
                      }}
                      onPointerCancel={() => setDraggingHole(null)}
                    >
                      {hole.id}
                    </button>
                  ))}
                </>
              ) : cameraStatus === "requesting" ? (
                <div className="camera-empty">
                  <span className="camera-spinner" />
                  <strong>Starting your camera…</strong>
                  <span>Approve camera access if your browser asks.</span>
                </div>
              ) : cameraStatus === "denied" ? (
                <div className="camera-empty camera-error">
                  <CircleAlert size={30} />
                  <strong>Camera access was blocked</strong>
                  <span>Allow camera access in your browser, then try again.</span>
                  <button className="primary-button" onClick={startCamera}>Try again</button>
                </div>
              ) : cameraStatus === "error" ? (
                <div className="camera-empty camera-error">
                  <CircleAlert size={30} />
                  <strong>Camera unavailable</strong>
                  <span>Connect a camera or use a supported browser.</span>
                  <button className="primary-button" onClick={startCamera}>Try again</button>
                </div>
              ) : (
                <div className="camera-onboarding">
                  <div className="camera-orbit"><Camera size={30} /></div>
                  <span className="eyebrow">STEP 1 OF 3</span>
                  <strong>Set up your camera</strong>
                  <p>Your video stays in this browser and is never uploaded.</p>
                  <button className="primary-button" onClick={startCamera}><Camera size={17} /> Start camera</button>
                </div>
              )}
            </div>

            <div className="camera-footer">
              <button className="soft-button" onClick={cameraStatus === "live" ? stopCamera : startCamera} disabled={cameraStatus === "requesting"}>
                {cameraStatus === "live" ? <CameraOff size={17} /> : <Camera size={17} />}
                {cameraStatus === "live" ? "Camera off" : "Camera on"}
              </button>
              <button className="soft-button" onClick={beginCalibration} disabled={cameraStatus !== "live"}>
                {hasCalibration ? <RotateCcw size={16} /> : <Crosshair size={16} />}
                {hasCalibration ? "Recalibrate" : "Calibrate holes"}
              </button>
              <button className="soft-button" onClick={beginHandCalibration} disabled={cameraStatus !== "live" || !hasCalibration}>
                <Crosshair size={16} />
                {handCalibration ? "Remap fingers" : "Map fingers"}
              </button>
            </div>

            {calibrating && (
              <div className="calibration-card" role="dialog" aria-label="Flute hole calibration">
                <div>
                  <span className="step-label">STEP 2 OF 3 · HOLE MAP</span>
                  <strong>Place all six markers over the finger holes</strong>
                  <p>Drag the numbered circles. Positions scale with the camera view.</p>
                </div>
                <div className="calibration-actions">
                  {hasCalibration && <button className="cancel-button" onClick={cancelCalibration}>Cancel</button>}
                  <button onClick={confirmCalibration}><Save size={15} /> Save calibration</button>
                </div>
              </div>
            )}

            {!calibrating && handSetupPhase !== "idle" && (
              <div className="calibration-card hand-map-card" role="dialog" aria-label="Personal finger mapping">
                <div>
                  <span className="step-label">STEP 3 OF 3 · PERSONAL HAND MAP</span>
                  <strong>{handSetupPhase === "covered" ? "Cover all six holes" : "Lift the six playing fingers slightly"}</strong>
                  <p>
                    {handSetupPhase === "covered"
                      ? "Use both index, middle, and ring fingers. Keep thumbs and pinkies in their normal support positions."
                      : "Keep holding the flute normally. This raised position becomes your personal open-finger baseline."}
                  </p>
                  <div className="pose-progress" aria-label={`Hand mapping step ${handSetupPhase === "covered" ? 1 : 2} of 2`}>
                    <span className="is-complete" />
                    <span className={handSetupPhase === "resting" ? "is-complete" : ""} />
                  </div>
                  {handSetupError && <p className="calibration-error">{handSetupError}</p>}
                </div>
                <div className="calibration-actions">
                  <button
                    className="cancel-button"
                    onClick={() => {
                      coveredFingerMapRef.current = null;
                      setHandSetupError("");
                      setHandSetupPhase("idle");
                    }}
                  >
                    Cancel
                  </button>
                  <button onClick={handSetupPhase === "covered" ? captureCoveredPose : captureRestingPose}>
                    <Crosshair size={15} /> {handSetupPhase === "covered" ? "Capture covered pose" : "Capture resting pose"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={`feedback-card ${feedbackState.correct ? "correct" : "adjust"}`}>
            <div className="feedback-icon">
              {feedbackState.correct ? <Check size={20} /> : feedbackState.hole ? <span>{feedbackState.hole}</span> : <Crosshair size={19} />}
            </div>
            <div>
              <span>{feedbackState.label}</span>
              <strong>{feedbackState.text}</strong>
            </div>
            <span className="confidence">{handSetupPhase !== "idle" ? "Personal baseline" : trackingStatus === "running" ? "5-frame smoothing" : "Live landmarks"}</span>
          </div>
        </div>

        <aside className="practice-panel">
          <section className="sheet-card">
            <div className="section-heading">
              <div><span className="eyebrow">YOUR MUSIC</span><h2>{isCustomSong ? "My Numbered Notes" : "Jasmine Flower"}</h2></div>
              <button className="icon-button compact" onClick={() => setSheetOpen(false)} aria-label="Collapse sheet"><Maximize2 size={16} /></button>
            </div>
            <SheetViewer
              fallbackLabel={isCustomSong ? `Manual sequence · ${song.length} notes` : undefined}
              onEnterNotes={openManualNotes}
              demo={(
              <div className="sheet-preview" aria-label="Mock sheet music">
                <div className="sheet-meta"><span>{isCustomSong ? "我的简谱" : "茉莉花"}</span><small>{isCustomSong ? `${song.length} notes` : "Chinese folk song"}</small></div>
                <div className="notation-lines">
                  {song.slice(0, 9).map((songNoteItem, index) => (
                    <span className={index === currentIndex ? "active-note" : ""} key={songNoteItem.id}>
                      <NoteGlyph note={songNoteItem} />
                    </span>
                  ))}
                </div>
                <div className="lyric-line">{isCustomSong ? "Manual practice sequence" : "好 一 朵 美 丽 的 茉 莉 花"}</div>
                <div className="notation-lines secondary">
                  {song.slice(9, 15).map((songNoteItem, index) => (
                    <span className={index + 9 === currentIndex ? "active-note" : ""} key={songNoteItem.id}>
                      <NoteGlyph note={songNoteItem} />
                    </span>
                  ))}
                </div>
                <div className="lyric-line muted">{isCustomSong ? "Preview shows up to 15 notes" : "芬 芳 美 丽 满 枝 桠"}</div>
                <div className="page-number">1</div>
              </div>
              )}
            />
            {manualNotesOpen && (
              <div className="manual-note-editor" role="dialog" aria-modal="true" aria-label="Enter numbered notes">
                <div>
                  <span className="step-label">MANUAL NOTE ENTRY</span>
                  <strong>Type your numbered notation</strong>
                  <p>Use notes 1–7. Spaces, commas, | measure bars, and line breaks are accepted.</p>
                </div>
                <textarea
                  autoFocus
                  value={manualNoteText}
                  onChange={(event) => {
                    setManualNoteText(event.target.value);
                    setManualNoteError("");
                  }}
                  placeholder="5 3 1 | 5 2 | 1"
                  rows={5}
                />
                {manualNoteError && <p className="manual-note-error">{manualNoteError}</p>}
                <div className="manual-note-actions">
                  <button onClick={() => setManualNotesOpen(false)}>Cancel</button>
                  <button className="primary-button" onClick={useManualNotes}>Use these notes</button>
                </div>
              </div>
            )}
          </section>

          <section className="note-card">
            <div className="note-progress">
              <span className="eyebrow">CURRENT NOTE</span>
              <span>{currentIndex + 1} / {song.length}</span>
            </div>
            <div className="current-note">
              <NoteGlyph note={note} large />
              <small>{noteDefinition.chineseLabel} · {noteDefinition.breath === "gentle" ? "Gentle breath" : noteDefinition.breath === "firm" ? "Firm breath" : "Overblow"}</small>
            </div>
            <div className="progress-track"><span style={{ width: `${((currentIndex + 1) / song.length) * 100}%` }} /></div>

            <div className="fingering-block">
              <div className="fingering-label"><span>Target fingering</span><small>What to play</small></div>
              <HoleRow holes={target} />
            </div>
            <div className="fingering-block detected-block">
              <div className="fingering-label">
                <span>Your fingers</span>
                <small>{usingLiveDetection ? "Personal live map" : cameraStatus === "live" ? "Awaiting hand map" : "Demo estimate"}</small>
              </div>
              <HoleRow holes={detected} tone="detected" />
            </div>

            <div className="transport">
              <button onClick={previous} disabled={currentIndex === 0}><ArrowLeft size={18} /><span>Previous</span></button>
              <button className="play-button" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button onClick={next} disabled={currentIndex === song.length - 1}><span>Next</span><ArrowRight size={18} /></button>
            </div>
          </section>
        </aside>

        {!sheetOpen && (
          <button className="open-sheet" onClick={() => setSheetOpen(true)}><FileMusic size={18} /> Open music</button>
        )}
      </section>

      <footer className="prototype-footer">
        <span><span className="keyboard-key">←</span><span className="keyboard-key">→</span> Move through notes</span>
        <span><span className="keyboard-key">Space</span> Play or pause</span>
        <span className="milestone">Adaptive finger calibration</span>
      </footer>
    </main>
  );
}
