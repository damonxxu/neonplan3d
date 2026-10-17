/**
 * An own background behind the 3D house instead of the look's sky: a colour, a gradient, or a picture.
 * A bare path or address ("/local/lake.jpg", "https://…") becomes a picture that covers the stage;
 * anything else is taken as a CSS background as it is. Returns null when nothing (valid) is set,
 * so the look's own sky stays.
 */
export function stageBackground(value: string | null | undefined): string | null {
  const text = value?.trim();
  if (!text || /[;{}<>]/.test(text)) return null;
  const css = /^(\/|https?:\/\/)\S+$/.test(text) ? `url("${text.replace(/"/g, "%22")}") center / cover no-repeat` : text;
  // in the browser the engine itself tells whether it is a background; tests run without one
  if (typeof CSS !== "undefined" && typeof CSS.supports === "function" && !CSS.supports("background", css)) return null;
  return css;
}

/**
 * The background set up with switches instead of CSS: a colour (plain or a soft gradient) or a picture
 * that can be blurred, dimmed and faded, so the house stands out instead of the photo (frosted glass).
 */
export interface Backdrop {
  mode: "color" | "image";
  color: string;
  /** Second colour of the gradient, towards the edges; only with `gradient`. */
  color2: string;
  gradient: boolean;
  /** Picture: a path ("/local/lake.jpg", "/api/image/serve/…") or an address. */
  image: string;
  /** Blur of the picture in px (0–40). */
  blur: number;
  /** How much darker the picture gets (0–0.9). */
  dim: number;
  /** Colour of the picture (0 grey – 1 as it is – 1.5 stronger). */
  saturate: number;
  /** Darker edges, the eye goes to the house in the middle. */
  vignette: boolean;
}

export const BACKDROP_DEFAULT: Backdrop = {
  mode: "image",
  color: "#1c2333",
  color2: "#0a0f1a",
  gradient: true,
  image: "",
  blur: 16,
  dim: 0.4,
  saturate: 0.75,
  vignette: true,
};

const HEX = /^#[0-9a-f]{6}$/i;
// only plain paths and addresses: nothing that could leave url("…") or the style attribute
const PICTURE = /^(\/|https?:\/\/)[^\s"'()\\;{}<>]+$/;

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

/** Whatever was stored or written in YAML, as a safe backdrop (unknown or broken values fall back to the defaults). */
export function readBackdrop(raw: unknown): Backdrop {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = BACKDROP_DEFAULT;
  return {
    mode: r.mode === "color" ? "color" : r.mode === "image" ? "image" : d.mode,
    color: typeof r.color === "string" && HEX.test(r.color) ? r.color : d.color,
    color2: typeof r.color2 === "string" && HEX.test(r.color2) ? r.color2 : d.color2,
    gradient: typeof r.gradient === "boolean" ? r.gradient : d.gradient,
    image: typeof r.image === "string" && PICTURE.test(r.image.trim()) ? r.image.trim() : "",
    blur: clamp(r.blur, 0, 40, d.blur),
    dim: clamp(r.dim, 0, 0.9, d.dim),
    saturate: clamp(r.saturate, 0, 1.5, d.saturate),
    vignette: typeof r.vignette === "boolean" ? r.vignette : d.vignette,
  };
}

/** The layer behind the house: its CSS, or null when there is nothing to show (picture mode without a picture). */
export function backdropStyle(b: Backdrop): string | null {
  if (b.mode === "color") {
    const bg = b.gradient ? `radial-gradient(ellipse at 50% 35%, ${b.color}, ${b.color2} 72%)` : b.color;
    return `background:${bg}`;
  }
  if (!b.image) return null;
  // a blurred picture fades at its edges: the layer reaches past the stage so the fade stays out of sight
  const over = Math.round(b.blur * 2);
  const filter = `blur(${b.blur}px) brightness(${+(1 - b.dim).toFixed(2)}) saturate(${b.saturate})`;
  return `inset:-${over}px;background:url("${b.image}") center / cover no-repeat;filter:${filter}`;
}
