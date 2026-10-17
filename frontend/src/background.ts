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
