// Several values in one furniture pin, as short as possible: "HW 42° · P 1.5", a washer's "Idle" or "1:07" left.

import { isActive, isUnavailable, kindOf } from "./devices.ts";
import { stateText } from "./markers.ts";
import type { Furniture, PinItem } from "./model.ts";
import type { HassEntity, HomeAssistant } from "./types.ts";

/** At most this many values stand in one pin. */
export const PIN_MAX = 3;

/** States that mean an appliance rests (English and Chinese integrations). */
const IDLE = /^(off|idle|standby|stopped|ready|none|)$|待机|空闲|关机|未启动|已停止/i;

/** "H:MM" from minutes. */
export function hm(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

/** A number without needless decimals and its unit, written short: 42.5 °C → "42.5°", 1.50 → "1.5", 0.28 kWh → "0.28kWh". */
export function compactValue(hass: HomeAssistant | undefined, st: HassEntity | undefined): string {
  if (!st || isUnavailable(st)) return "–";
  const v = Number(st.state);
  if (kindOf(st.entity_id) !== "sensor" || st.state === "" || !Number.isFinite(v)) return stateText(hass, st);
  const unit = String(st.attributes.unit_of_measurement ?? "").trim();
  const num = String(Math.round(v * 100) / 100);
  if (unit === "°C" || unit === "°F") return `${num}°`;
  return `${num}${unit}`;
}

function itemText(hass: HomeAssistant, item: PinItem): string {
  const st = hass.states[item.entity];
  let value: string;
  if (item.minutes || item.duration) {
    const h = Number(st?.state);
    const m = item.minutes ? Number(hass.states[item.minutes]?.state) : 0;
    value = Number.isFinite(h) && Number.isFinite(m) && !isUnavailable(st) ? hm(item.minutes ? h * 60 + m : h) : "–";
  } else value = compactValue(hass, st);
  const label = item.label?.trim();
  return label ? `${label} ${value}` : value;
}

/** Whether the item's appliance is at work (null: no entity tells it). */
export function pinBusy(hass: HomeAssistant, f: Pick<Furniture, "pin_busy">): boolean | null {
  const ref = f.pin_busy;
  if (!ref || ref === "none") return null;
  const st = hass.states[ref];
  if (!st || isUnavailable(st)) return null;
  // a sensor with a status text works while its text is no resting state; anything else by its on/off
  return kindOf(st.entity_id) === "sensor" ? !IDLE.test(st.state.trim()) : isActive(st);
}

/** The pin text of an item with pin items (null: it has none): "Idle" while its appliance rests. */
export function pinText(hass: HomeAssistant, f: Pick<Furniture, "pin_items" | "pin_busy">): string | null {
  const items = (f.pin_items ?? []).filter((i) => i.entity && i.entity !== "none").slice(0, PIN_MAX);
  if (!items.length) return null;
  if (pinBusy(hass, f) === false) return "Idle";
  return items.map((i) => itemText(hass, i)).join(" · ");
}
