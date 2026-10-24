import assert from "node:assert/strict";
import { test } from "node:test";
import { deviceName, deviceValues } from "./detail.ts";
import type { HomeAssistant } from "./types.ts";

function hass(): HomeAssistant {
  const st = (entity_id: string, state: string, friendly_name: string, unit?: string) => ({ entity_id, state, attributes: { friendly_name, unit_of_measurement: unit } });
  return {
    states: {
      "sensor.meter_month": st("sensor.meter_month", "196.28", "Meter Month", "kWh"),
      "sensor.meter_balance": st("sensor.meter_balance", "53.77", "Meter Balance", "CNY"),
      "sensor.meter_reading": st("sensor.meter_reading", "unknown", "Meter Reading"),
      "sensor.meter_rssi": st("sensor.meter_rssi", "-60", "Meter Signal", "dBm"),
      "sensor.other": st("sensor.other", "1", "Other"),
    },
    entities: {
      "sensor.meter_balance": { entity_id: "sensor.meter_balance", device_id: "d1" },
      "sensor.meter_month": { entity_id: "sensor.meter_month", device_id: "d1" },
      "sensor.meter_reading": { entity_id: "sensor.meter_reading", device_id: "d1" },
      "sensor.meter_rssi": { entity_id: "sensor.meter_rssi", device_id: "d1", entity_category: "diagnostic" },
      "sensor.other": { entity_id: "sensor.other", device_id: "d2" },
    },
    devices: { d1: { id: "d1", name: "Grid", name_by_user: "Meter" } },
  } as unknown as HomeAssistant;
}

test("the card lists the device's values, the tapped one first, without the device name in front", () => {
  const h = hass();
  assert.equal(deviceName(h, "sensor.meter_month"), "Meter");
  const rows = deviceValues(h, "sensor.meter_month");
  assert.deepEqual(
    rows.map((r) => r.entity),
    ["sensor.meter_month", "sensor.meter_balance"],
  );
  assert.deepEqual(
    rows.map((r) => r.name),
    ["Month", "Balance"],
  );
  assert.match(rows[0].text, /196/);
});

test("an entity without a device shows only itself", () => {
  const h = hass();
  assert.equal(deviceName(h, "sensor.nowhere"), null);
  h.states["sensor.nowhere"] = { entity_id: "sensor.nowhere", state: "3", attributes: { friendly_name: "Nowhere" } } as never;
  assert.deepEqual(
    deviceValues(h, "sensor.nowhere").map((r) => r.name),
    ["Nowhere"],
  );
});
