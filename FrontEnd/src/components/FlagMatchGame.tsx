import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import {
  buildRestLookup,
  isClickableCountry,
  normalizeApos,
  normalizeCountryName,
  stripDiacritics,
} from "../utils/countries";

const PROJECTION = "geoNaturalEarth1" as const;
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

const FRAME = 10;
const BASE_W = 1000;
const BASE_H = 500;

type RSMGeography = {
  rsmKey: string;
  properties?: { name?: string; [k: string]: unknown };
  [k: string]: unknown;
};
type GeographiesArgs = { geographies: RSMGeography[] };

type CountryInfo = { name: string; cca2: string; flag: string };

export default function FlagMatchGame() {
  const navigate = useNavigate();

  // Layout sizing
  const [dimensions, setDimensions] = useState({ width: BASE_W, height: BASE_H });
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxW = vw * 0.95;
      const maxH = vh * 0.9;
      const ar = BASE_W / BASE_H;
      let width = maxW;
      let height = width / ar;
      if (height > maxH) {
        height = maxH;
        width = height * ar;
      }
      setDimensions({ width, height });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const OUTER_W = dimensions.width;
  const OUTER_H = dimensions.height;
  const INNER_W = OUTER_W - FRAME * 2;
  const INNER_H = OUTER_H - FRAME * 2;

  const [pos, setPos] = useState<{ coordinates: [number, number]; zoom: number }>(
    { coordinates: [0, 0], zoom: 1 }
  );

  // Selection state
  const [correctSet, setCorrectSet] = useState<Set<string>>(new Set());

  // REST Countries lookup for flags and codes
  const [restLookup, setRestLookup] = useState<Record<string, CountryInfo>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");

  // Playable target list and current target
  const [targets, setTargets] = useState<CountryInfo[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const currentTarget = targets[currentIdx];

  // Game score
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<"" | "correct" | "wrong">("");
  const [lastClicked, setLastClicked] = useState<null | { name: string; status: "correct" | "wrong" }>(null);
  const [showNamePanel, setShowNamePanel] = useState<boolean>(false);

  // Cache for preloaded flag images
  const preloadedFlagsRef = useRef<Set<string>>(new Set());
  const preloadImage = (url: string) => {
    if (!url) return;
    const set = preloadedFlagsRef.current;
    if (set.has(url)) return;
    const img = new Image();
    img.src = url;
    set.add(url);
  };

  // Timers for feedback to avoid queuing multiple timeouts during rapid clicks
  const correctTimerRef = useRef<number | null>(null);
  const wrongTimerRef = useRef<number | null>(null);

  // prevent page scroll on wheel over map
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, []);

  // Load REST Countries once
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError("");
        const res = await fetch(
          "https://restcountries.com/v3.1/all?fields=name,cca2,flags"
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Array<{
          name: { common: string };
          cca2: string;
          flags: { svg?: string; png?: string };
        }>;
        const lookup = buildRestLookup(data);
        if (!alive) return;
        setRestLookup(lookup);
      } catch (e: any) {
        if (!alive) return;
        setLoadError(e?.message || "Failed to load countries");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Build targets after we have both lookup and geographies list (deferred until we render geographies)
  const geosRef = useRef<RSMGeography[] | null>(null);

  const FIT_SCALE = Math.max(1, Math.round(INNER_W * 0.32));

  // Background prefetch: once we have both geographies and REST lookup, prefetch a larger set of flags
  const didBgPrefetch = useRef(false);
  useEffect(() => {
    if (didBgPrefetch.current) return;
    const geos = geosRef.current;
    if (!geos || geos.length === 0) return;
    if (!restLookup || Object.keys(restLookup).length === 0) return;

    // Build playable list once and prefetch a reasonable amount (e.g., 60)
    const playable: CountryInfo[] = [];
    for (const geo of geos) {
      const nameRaw = (geo.properties?.name as string) ?? "Unknown";
      if (!isClickableCountry(nameRaw)) continue;
      const norm = normalizeCountryName(nameRaw);
      const key1 = normalizeApos(norm);
      const key2 = stripDiacritics(key1);
      const info = restLookup[key1] || restLookup[key2];
      if (info && info.flag) playable.push(info);
    }
    const unique = Array.from(new Map(playable.map((c) => [c.cca2, c])).values());
    const batch = unique.slice(0, Math.min(60, unique.length));
    batch.forEach((c) => preloadImage(c.flag));
    didBgPrefetch.current = true;
  }, [restLookup]);

  // Clear any scheduled timers when unmounting
  useEffect(() => {
    return () => {
      if (correctTimerRef.current) window.clearTimeout(correctTimerRef.current);
      if (wrongTimerRef.current) window.clearTimeout(wrongTimerRef.current);
    };
  }, []);

  function startNewGame() {
    const geos = geosRef.current || [];
    const playable: CountryInfo[] = [];
    for (const geo of geos) {
      const nameRaw = (geo.properties?.name as string) ?? "Unknown";
      if (!isClickableCountry(nameRaw)) continue;
      const norm = normalizeCountryName(nameRaw);
      const key1 = normalizeApos(norm);
      const key2 = stripDiacritics(key1);
      const info = restLookup[key1] || restLookup[key2];
      if (info && info.flag) playable.push(info);
    }

    // Deduplicate by cca2
    const unique = Array.from(new Map(playable.map((c) => [c.cca2, c])).values());
    // Shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    // Limit to a reasonable round length
    const round = unique.slice(0, Math.min(25, unique.length));
    // Preload flags for this round immediately
    round.forEach((c) => preloadImage(c.flag));
    setTargets(round);
    setCurrentIdx(0);
    setScore(0);
    setCorrectSet(new Set());
    setFeedback("");
    setLastClicked(null);
  }

  function onCountryClick(nameRaw: string) {
    if (!currentTarget) return;
    // Clear previously scheduled timeouts so rapid clicks don't queue
    if (correctTimerRef.current) {
      window.clearTimeout(correctTimerRef.current);
      correctTimerRef.current = null;
    }
    if (wrongTimerRef.current) {
      window.clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = null;
    }

    const norm = normalizeCountryName(nameRaw);
    const k1 = normalizeApos(norm);
    const k2 = stripDiacritics(k1);
    const clicked = restLookup[k1] || restLookup[k2];
    if (clicked && clicked.cca2 === currentTarget.cca2) {
      // Correct: immediately update states and keep highlighted until next click
      setScore((s) => s + 1);
      setCorrectSet((s) => new Set([...s, norm]));
      setLastClicked({ name: norm, status: "correct" });
      setFeedback("correct");
      correctTimerRef.current = window.setTimeout(() => {
        setCurrentIdx((i) => i + 1);
        setFeedback("");
        correctTimerRef.current = null;
      }, 350);
    } else {
      // Wrong: stays highlighted until next click
      setLastClicked({ name: norm, status: "wrong" });
      setFeedback("wrong");
    }
  }

  const gameOver = currentIdx >= targets.length && targets.length > 0;

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: "#0b1020",
        color: "#fff",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        position: "relative",
        overscrollBehavior: "none",
      }}
    >
      <button
        onClick={() => navigate("/")}
        aria-label="Back to main menu"
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 4,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          cursor: "pointer",
          backdropFilter: "blur(6px)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>←</span>
        <span style={{ fontWeight: 600 }}>Back</span>
      </button>

      {/* Top center panel */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 4,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.25)",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
          maxWidth: "92vw",
        }}
      >
        {loading ? (
          <span>Loading flags…</span>
        ) : loadError ? (
          <span>Error: {loadError}</span>
        ) : gameOver ? (
          <>
            <strong>Round finished</strong>
            <span style={{ opacity: 0.8 }}>Score: {score}/{targets.length}</span>
            <button
              onClick={startNewGame}
              style={{ marginLeft: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.08)", color: "#fff" }}
            >
              Play again
            </button>
          </>
        ) : !currentTarget ? (
          <button
            onClick={startNewGame}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.08)", color: "#fff" }}
          >
            Start round
          </button>
        ) : (
          <>
            <img
              src={currentTarget.flag}
              alt={`Flag to match`}
              loading="eager"
              decoding="async"
              style={{
                width: "clamp(48px, 12vw, 80px)",
                height: "auto",
                aspectRatio: "4 / 3",
                objectFit: "cover",
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", minWidth: 140 }}>
              <strong style={{ fontSize: "clamp(12px, 2.8vw, 16px)" }}>Find this flag on the map</strong>
              <span style={{ opacity: 0.8, fontSize: "clamp(10px, 2.4vw, 13px)" }}>Tap the matching country</span>
            </div>
            <span style={{ marginLeft: 4, opacity: 0.8, fontSize: "clamp(11px, 2.6vw, 14px)" }}>
              {currentIdx + 1}/{targets.length}
            </span>
            <button
              onClick={() => setShowNamePanel((v) => !v)}
              title="Toggle last clicked country name"
              style={{
                marginLeft: 4,
                padding: "6px 10px",
                minWidth: 84,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                opacity: 1
              }}
            >
              {showNamePanel ? "Hide name" : "Show name"}
            </button>
          </>
        )}
      </div>

      {/* Score top-right */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 4,
          padding: "8px 12px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        Score: {score}
      </div>

      {showNamePanel && lastClicked && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "8px 12px",
            background: "rgba(0,0,0,0.5)",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.25)",
            zIndex: 4,
            maxWidth: "92vw",
            fontSize: "clamp(12px, 3vw, 16px)",
            textAlign: "center",
          }}
        >
          {normalizeCountryName(lastClicked.name)}
        </div>
      )}

      <div
        ref={wrapperRef}
        style={{
          width: OUTER_W,
          height: OUTER_H,
          border: `${FRAME}px solid #5b8cff`,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          background: "linear-gradient(180deg, #0f2a4a 0%, #0b1c34 60%, #081226 100%)",
          display: "grid",
          placeItems: "center",
          touchAction: "none",
        }}
        aria-label="Flag match game map"
      >
        <ComposableMap
          projection={PROJECTION}
          projectionConfig={{ scale: Math.max(1, Math.round(INNER_W * 0.32)), center: [0, 15] }}
          width={INNER_W}
          height={INNER_H}
          style={{ width: INNER_W, height: INNER_H, display: "block" }}
        >
          <ZoomableGroup
            center={pos.coordinates}
            zoom={pos.zoom}
            minZoom={0.9}
            maxZoom={12}
            zoomSensitivity={0.2}
            onMoveEnd={({ zoom, coordinates }: { zoom: number; coordinates: [number, number] }) =>
              setPos({ zoom, coordinates })
            }
          >
            <Geographies geography={geoUrl}>
              {({ geographies }: GeographiesArgs) => {
                // Cache for building targets when we have lookup ready
                if (!geosRef.current || geosRef.current.length === 0) {
                  geosRef.current = geographies as any;
                }
                return geographies.map((geo: RSMGeography) => {
                  const nameRaw = (geo.properties?.name as string) ?? "Unknown";
                  const norm = normalizeCountryName(nameRaw);
                  const clickable = isClickableCountry(nameRaw);

                  const isCorrect = correctSet.has(norm);
                  const defaultFill = clickable ? "#e0d8c2" : "#f0f0f0";
                  const isLastWrong = lastClicked?.name === norm && lastClicked?.status === "wrong";
                  const fill = isCorrect
                    ? "#10b981"
                    : isLastWrong
                    ? "#ef4444"
                    : defaultFill;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      vectorEffect="non-scaling-stroke"
                      fillRule="evenodd"
                      clipRule="evenodd"
                      shapeRendering="geometricPrecision"
                      style={{
                        default: {
                          fill,
                          stroke: "#d0cfc8",
                          strokeWidth: 0.3,
                          strokeLinejoin: "round",
                          strokeLinecap: "round",
                          outline: "none",
                          transition: "none",
                          cursor: clickable ? "pointer" : "default",
                          pointerEvents: "visibleFill",
                        },
                        hover: clickable
                          ? {
                              fill: isCorrect ? "#10b981" : "#c9bfa8",
                              outline: "none",
                              cursor: "pointer",
                              pointerEvents: "visibleFill",
                            }
                          : {},
                        pressed: clickable
                          ? {
                              fill: isCorrect ? "#10b981" : "#b8ad96",
                              outline: "none",
                              cursor: "pointer",
                              pointerEvents: "visibleFill",
                            }
                          : {},
                      }}
                      onClick={clickable ? () => onCountryClick(nameRaw) : undefined}
                    />
                  );
                });
              }}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </div>
  );
}
