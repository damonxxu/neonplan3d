// The device card of a placed device: every value its Home Assistant device reports, for a pin whose
// placement asks for it (`detail`) – an electricity meter's balance, month, year and last bill at one tap.

import { isUnavailable } from "./devices.ts";
import { stateText } from "./markers.ts";
import type { HomeAssistant } from "./types.ts";

export interface DetailRow {
  entity: string;
  name: string;
  text: string;
}

/** The device's own name (as the user renamed it), or null without a device. */
export function deviceName(hass: HomeAssistant, entityId: string): string | null {
  const id = hass.entities?.[entityId]?.device_id;
  const dev = id ? hass.devices?.[id] : undefined;
  return dev?.name_by_user || dev?.name || null;
}

/**
 * The rows of the card: the entities of the tapped entity's device that report a value (hidden and
 * diagnostic ones left out), the tapped one first, each named without the device's name in front.
 */
export function deviceValues(hass: HomeAssistant, entityId: string): DetailRow[] {
  const device = hass.entities?.[entityId]?.device_id;
  const ids = device
    ? Object.values(hass.entities ?? {})
        .filter((e) => e.device_id === device && !e.hidden && e.entity_category !== "diagnostic" && e.entity_category !== "config")
        .map((e) => e.entity_id)
    : [entityId];
  const ordered = [entityId, ...ids.filter((id) => id !== entityId)];
  const prefix = deviceName(hass, entityId);
  const rows: DetailRow[] = [];
  for (const id of ordered) {
    const st = hass.states[id];
    if (!st || isUnavailable(st)) continue;
    const full = String(st.attributes.friendly_name ?? id);
    const name = prefix && full.startsWith(`${prefix} `) ? full.slice(prefix.length + 1) : full;
    rows.push({ entity: id, name, text: stateText(hass, st) });
  }
  return rows;
}
