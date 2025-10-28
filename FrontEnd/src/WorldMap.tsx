// src/WorldMap.tsx - Renamed from App.tsx
import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type React from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

/** --- Rozměry a rámeček obdélníku --- */
const BASE_W = 1000;
const BASE_H = 500;
const FRAME = 10;
const FRAME_COLOR = "#5b8cff";

/** Projekce: Natural Earth 1 (lepší fit do oválu, méně "uřezávání") */
const PROJECTION = "geoNaturalEarth1" as const;

/** Data: Natural Earth (TopoJSON) - vyšší rozlišení pro malé ostrovy */
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";

/** --- Typy --- */
type RSMGeography = {
  rsmKey: string;
  properties?: { name?: string; [k: string]: unknown };
  [k: string]: unknown;
};
type GeographiesArgs = { geographies: RSMGeography[] };

/** Zkrácené názvy z datasetu → „plné" názvy + fix pro REST Countries */
function normalizeCountryName(raw: string): string {
  const map: Record<string, string> = {
    "Bosnia and Herz.": "Bosnia and Herzegovina",
    Congo: "Republic of the Congo",
    "Dem. Rep. Congo": "DR Congo",
    "Central African Rep.": "Central African Republic",
    "Eq. Guinea": "Equatorial Guinea",
    "Côte d'Ivoire": "Ivory Coast",
    "S. Sudan": "South Sudan",
    "Czech Rep.": "Czechia",
    "Wallis and Futuna Is.": "Wallis and Futuna",
    "Cook Is.": "Cook Islands",
    "Fr. Polynesia": "French Polynesia",
    "Northern Cyprus": "Northern Cyprus",
    "N. Cyprus": "Northern Cyprus",
  };
  return map[raw] ?? raw;
}

/** Kvůli nesouladu názvů mezi mapou a REST Countries */
const restAliases: Record<string, string> = {
  "United States of America": "United States",
  "Cabo Verde": "Cape Verde",
  "Wallis and Futuna Is.": "Wallis and Futuna",
  "Cook Is.": "Cook Islands",
  "Fr. Polynesia": "French Polynesia",
};

/** Ostrovní státy (info only – nemění klikatelnost) */
const islandCountries = new Set([
  "Iceland", "Ireland", "United Kingdom", "Malta", "Cyprus", 
  "Madagascar", "Sri Lanka", "Maldives", "Seychelles", "Mauritius",
  "Indonesia", "Philippines", "Malaysia", "Singapore", "Brunei",
  "Japan", "Taiwan", "New Zealand", "Australia", "Papua New Guinea",
  "Fiji", "Samoa", "Tonga", "Vanuatu", "Solomon Islands",
  "Palau", "Micronesia", "Marshall Islands", "Kiribati", "Nauru", "Tuvalu",
  "Cuba", "Jamaica", "Haiti", "Dominican Republic", "Trinidad and Tobago",
  "Barbados", "Saint Lucia", "Grenada", "Saint Vincent and the Grenadines",
  "Antigua and Barbuda", "Dominica", "Saint Kitts and Nevis", "Bahamas",
  "Cape Verde", "São Tomé and Príncipe", "Comoros", "Bahrain"
]);

/** Malé ostrovy/území (neklikatelné, jen pro zobrazení) */
const nonClickableTerritories = new Set([
  // Francouzské území
  "French Guiana", "Guadeloupe", "Martinique", "Réunion", "Mayotte", 
  "New Caledonia", "St. Pierre and Miquelon", "Saint Barthélemy", "Saint Martin",
  
  // Britské území  
  "Falkland Islands", "British Virgin Islands", "Cayman Islands",
  "Turks and Caicos Islands", "Bermuda", "Gibraltar", "Anguilla",
  "Montserrat", "British Indian Ocean Territory", 
  "South Georgia and South Sandwich Islands", "Pitcairn Islands", "Saint Helena",
  
  // Nizozemské území
  "Aruba", "Curaçao", "Sint Maarten", "Caribbean Netherlands",
  
  // Americké území
  "Puerto Rico", "U.S. Virgin Islands", "Guam", 
  "Northern Mariana Islands", "American Samoa",
  
  // Dánské území
  "Faroe Islands",
  
  // Ostatní malé ostrovy
  "Norfolk Island", "Christmas Island", "Cocos Islands",
  "Azores", "Madeira", "Canary Islands", "Svalbard", "Jan Mayen", "Åland"
]);
const normalizeApos = (s: string) => s.replace(/\u2019/g, "'");

/** odebrání diakritiky (fallback) */
const stripDiacritics = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function WorldMap() {
  const navigate = useNavigate();
  /** --- Dynamické rozměry podle okna --- */
  const [dimensions, setDimensions] = useState({ width: BASE_W, height: BASE_H });

  useEffect(() => {
    const updateDimensions = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight; // full viewport (navbar may be hidden on /map)

      // Use up to 95% of viewport for width, 90% for height for breathing room
      const maxW = vw * 0.95;
      const maxH = vh * 0.90;

      const aspectRatio = BASE_W / BASE_H; // keep 2:1-ish aspect

      let width = maxW;
      let height = width / aspectRatio;

      if (height > maxH) {
        height = maxH;
        width = height * aspectRatio;
      }

      setDimensions({ width, height });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const OUTER_W = dimensions.width;
  const OUTER_H = dimensions.height;
  const INNER_W = OUTER_W - FRAME * 2;
  const INNER_H = OUTER_H - FRAME * 2;

  /** --- Řízený pan & zoom --- */
  const [pos, setPos] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [0, 0],
    zoom: 1,
  });

  /** Hover/Select pro HUD */
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  /** Capitals: název → [hlavní města] */
  const [capitals, setCapitals] = useState<Record<string, string[]>>({});
  const [loadingCaps, setLoadingCaps] = useState<boolean>(true);

  /** Zabrání scrollu stránky při kolečku nad mapou */
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, []);

  /** Načtení hlavních měst 1× po startu */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingCaps(true);
        const res = await fetch("https://restcountries.com/v3.1/all?fields=name,capital");
        const data = (await res.json()) as Array<{ name: { common: string }; capital?: string[] }>;
        const m: Record<string, string[]> = {};
        for (const c of data) {
          const key = normalizeApos(c.name.common);
          m[key] = c.capital && c.capital.length > 0 ? c.capital : [];
        }
        m["Northern Cyprus"] = ["Nicosia (North)"];
        if (alive) setCapitals(m);
      } catch (e) {
        console.error("Failed to load capitals", e);
      } finally {
        if (alive) setLoadingCaps(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function isClickableCountry(countryNameRaw: string): boolean {
    const name = normalizeCountryName(countryNameRaw);
    return !nonClickableTerritories.has(name);
  }

  function getCapitalsFor(countryNameRaw: string): string[] | null {
    const name = normalizeCountryName(countryNameRaw);
    const nameStd = normalizeApos(name);

    if (capitals[nameStd]?.length) return capitals[nameStd];

    const alias = restAliases[nameStd];
    if (alias && capitals[alias]?.length) return capitals[alias];

    const target = stripDiacritics(nameStd);
    for (const k of Object.keys(capitals)) {
      if (stripDiacritics(k) === target && capitals[k].length) return capitals[k];
    }
    return null;
  }

  /** HUD – ukazuje název + hlavní město(a) */
  const hudText = useMemo(() => {
    const name = selected ?? hovered;
    if (name) {
      const displayName = normalizeCountryName(name);
      const caps = getCapitalsFor(name);
      if (caps && caps.length > 0) {
        const label = caps.length > 1 ? "Capitals" : "Capital";
        return `${displayName} — ${label}: ${caps.join(", ")}`;
      }
      if (loadingCaps) return `${displayName} — Loading capital…`;
      return `${displayName} — Capital: unknown`;
    }
    return "Drag = posun mapy, Wheel = plynulý zoom";
  }, [hovered, selected, loadingCaps, capitals]);

  /** Fit scale pro NaturalEarth1 */
  const FIT_SCALE = Math.max(1, Math.round(INNER_W * 0.32));

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
      {/* Back button to main menu */}
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
      {/* HUD vlevo nahoře */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 12,
          padding: "8px 12px",
          background: "rgba(0,0,0,0.45)",
          borderRadius: 8,
          fontSize: Math.min(14, OUTER_W / 50),
          pointerEvents: "none",
          zIndex: 3,
          minWidth: Math.min(260, OUTER_W * 0.4),
          maxWidth: "90vw",
          wordBreak: "break-word",
        }}
      >
        {hudText}
      </div>

      {/* --- Rounded rectangle frame + clip --- */}
      <div
        ref={wrapperRef}
        style={{
          width: OUTER_W,
          height: OUTER_H,
          border: `${FRAME}px solid ${FRAME_COLOR}`,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          background: "linear-gradient(180deg, #0f2a4a 0%, #0b1c34 60%, #081226 100%)",
          display: "grid",
          placeItems: "center",
          touchAction: "none",
        }}
        aria-label="World map in rounded rectangle (pan & zoom)"
      >
        <ComposableMap
          projection={PROJECTION}
          projectionConfig={{ scale: FIT_SCALE, center: [0, 15] }}
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
              {({ geographies }: GeographiesArgs) =>
                geographies.map((geo: RSMGeography) => {
                  const nameRaw = (geo.properties?.name as string) ?? "Unknown";
                  const name = normalizeCountryName(nameRaw);
                  const isClickable = isClickableCountry(name);

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
                          fill: isClickable ? "#e0d8c2" : "#f0f0f0",
                          stroke: "#d0cfc8",
                          strokeWidth: 0.3,
                          strokeLinejoin: "round",
                          strokeLinecap: "round",
                          outline: "none",
                          transition: "fill 120ms ease-out, stroke 120ms ease-out",
                          cursor: isClickable ? "pointer" : "default",
                          pointerEvents: "visibleFill",
                        },
                        hover: isClickable
                          ? {
                              fill: "#60a5fa",
                              outline: "none",
                              cursor: "pointer",
                              pointerEvents: "visibleFill",
                            }
                          : {},
                        pressed: isClickable
                          ? {
                              fill: "#f59e0b",
                              outline: "none",
                              cursor: "pointer",
                              pointerEvents: "visibleFill",
                            }
                          : {},
                      }}
                      onMouseEnter={isClickable ? () => setHovered(name) : undefined}
                      onMouseLeave={isClickable ? () => setHovered(null) : undefined}
                      onClick={isClickable ? () => setSelected(name) : undefined}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </div>
  );
}
