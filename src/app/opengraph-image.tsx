import { ImageResponse } from "next/og";

import { brand } from "@/config/brand";
import { GLOBE_LAND_DOTS } from "@/components/shared/globe-dots";

/**
 * The share card every messaging app and social platform shows when a link
 * to the site is posted (WhatsApp, iMessage, X, Slack, LinkedIn, Telegram).
 * Design approved from mockups: the platform's dotted world map with glowing
 * hub cities and connection arcs, brand mark + wordmark, gradient-keyword
 * headline, "Verified global network" badge, and capability tags.
 *
 * The map itself is pre-rendered at module scope into an SVG data URI and
 * placed as an <img> — Satori lays out a couple of thousand absolutely
 * positioned dots far more cheaply as one raster source than as DOM nodes.
 */

export const alt = `${brand.name} — Train better AI with verified human expertise`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const W = size.width;
const H = size.height;

// Hub cities (lon, lat) — a spread that reads globally: SF, São Paulo,
// London, Lagos, Nairobi, Mumbai, Singapore, Tokyo, Sydney.
const HUBS: [number, number][] = [
  [-122.42, 37.77], [-46.63, -23.55], [-0.13, 51.51], [3.38, 6.52], [36.82, -1.29],
  [72.88, 19.08], [103.82, 1.35], [139.69, 35.68], [151.21, -33.87],
];
const ARCS: [number, number][] = [[0, 2], [2, 4], [4, 5], [5, 6], [6, 7], [1, 3], [2, 3], [7, 8]];
const HUB_COLORS = ["#93b4ff", "#c4b5fd", "#5eead4", "#fbbf24"];

// Map biased right so the left text column overlays emptier space.
const project = (lon: number, lat: number): [number, number] => [
  ((lon + 180) / 360) * W * 1.28 - W * 0.1,
  ((82 - lat) / 145) * H * 1.14,
];

function buildMapSvg(): string {
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  parts.push("<defs>");
  HUB_COLORS.forEach((c, i) => {
    parts.push(
      `<radialGradient id="g${i}"><stop offset="0%" stop-color="${c}" stop-opacity=".65"/><stop offset="100%" stop-color="${c}" stop-opacity="0"/></radialGradient>`
    );
  });
  parts.push("</defs>");
  GLOBE_LAND_DOTS.forEach(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    if (x < -3 || x > W + 3 || y < -3 || y > H + 3) return;
    const v = ((i * 2654435761) % 100) / 100;
    parts.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.7 + v * 1.1).toFixed(2)}" fill="rgba(129,140,248,${(0.3 + v * 0.3).toFixed(2)})"/>`
    );
  });
  ARCS.forEach(([a, b]) => {
    const [x1, y1] = project(HUBS[a][0], HUBS[a][1]);
    const [x2, y2] = project(HUBS[b][0], HUBS[b][1]);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - Math.min(H * 0.22, Math.hypot(x2 - x1, y2 - y1) * 0.28);
    parts.push(
      `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="rgba(147,180,255,.35)" stroke-width="1.6"/>`
    );
  });
  HUBS.forEach(([lon, lat], i) => {
    const [x, y] = project(lon, lat);
    const c = HUB_COLORS[i % HUB_COLORS.length];
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="19" fill="url(#g${i % HUB_COLORS.length})"/>`);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="${c}"/>`);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.8" fill="rgba(255,255,255,.9)"/>`);
  });
  parts.push("</svg>");
  return `data:image/svg+xml;base64,${Buffer.from(parts.join("")).toString("base64")}`;
}

const MAP_SVG = buildMapSvg();

const TAGS = [
  { label: "RLHF", color: "#93b4ff" },
  { label: "Evaluations", color: "#c4b5fd" },
  { label: "Red teaming", color: "#5eead4" },
  { label: "Expert data", color: "#fbbf24" },
];

/** Best-effort bold face so the headline doesn't render at regular weight;
 *  the card still works with Satori's default font if the fetch fails. */
async function loadFont(): Promise<{ name: string; data: ArrayBuffer; weight: 800 }[]> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return [];
    const data = await fetch(url).then((r) => r.arrayBuffer());
    return [{ name: "Jakarta", data, weight: 800 }];
  } catch {
    return [];
  }
}

export default async function OpengraphImage() {
  const fonts = await loadFont();
  const heading = fonts.length ? "Jakarta" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#0c1226",
          position: "relative",
        }}
      >
        <img src={MAP_SVG} width={W} height={H} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
        {/* directional shade so the text column sits on clean dark space */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(97deg, rgba(8,12,28,.94) 0%, rgba(8,12,28,.74) 42%, rgba(8,12,28,.14) 75%, rgba(8,12,28,0) 100%)",
          }}
        />
        {/* corner vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at 78% 18%, rgba(6,10,24,0) 45%, rgba(6,10,24,.55) 100%)",
          }}
        />
        {/* brand gradient hairline */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 7,
            backgroundImage: "linear-gradient(90deg, #4d7fe8, #8f7ff0, #35c3ad)",
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 72px 52px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 58,
                height: 58,
                borderRadius: 15,
                backgroundImage: "linear-gradient(135deg, #4d7fe8, #8f7ff0)",
                boxShadow: "0 10px 28px rgba(143,127,240,.55)",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M12 2l1.9 5.7L20 9.5l-5.2 3.4L16.5 19 12 15.6 7.5 19l1.7-6.1L4 9.5l6.1-1.8z" />
              </svg>
            </div>
            <div style={{ display: "flex", marginLeft: 16, color: "white", fontSize: 38, fontWeight: 800, fontFamily: heading }}>
              {brand.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginLeft: "auto",
                border: "1px solid rgba(255,255,255,.25)",
                backgroundColor: "rgba(10,16,34,.6)",
                borderRadius: 999,
                padding: "9px 18px",
                color: "rgba(255,255,255,.88)",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  backgroundColor: "#35c3ad",
                  boxShadow: "0 0 8px #35c3ad",
                  marginRight: 9,
                }}
              />
              Verified global network
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                maxWidth: 760,
                color: "white",
                fontSize: 52,
                fontWeight: 800,
                fontFamily: heading,
                lineHeight: 1.12,
                letterSpacing: -1,
              }}
            >
              Train better AI with{" "}
              <span
                style={{
                  backgroundImage: "linear-gradient(90deg, #93b4ff, #c4b5fd)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                verified human expertise
              </span>
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 18,
                maxWidth: 660,
                color: "rgba(255,255,255,.8)",
                fontSize: 24,
                lineHeight: 1.5,
              }}
            >
              RLHF, evaluations, red teaming, and expert data from vetted specialists in 30+ countries.
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 26 }}>
              {TAGS.map((t) => (
                <div
                  key={t.label}
                  style={{
                    display: "flex",
                    border: `1px solid ${t.color}66`,
                    backgroundColor: "rgba(10,16,34,.55)",
                    borderRadius: 999,
                    padding: "7px 17px",
                    marginRight: 10,
                    color: t.color,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {t.label}
                </div>
              ))}
              <div style={{ display: "flex", marginLeft: 8, color: "rgba(255,255,255,.55)", fontSize: 18 }}>
                {brand.domain}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined }
  );
}
