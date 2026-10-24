import assert from "node:assert/strict";
import { test } from "node:test";
import { compactValue, hm, pinBusy, pinText } from "./pins.ts";
import type { HomeAssistant } from "./types.ts";

const st = (entity_id: string, state: string, unit?: string) => ({ entity_id, state, attributes: unit ? { unit_of_measurement: unit } : {}, last_changed: "", last_updated: "" });
const hassOf = (...list: ReturnType<typeof st>[]) => ({ states: Object.fromEntries(list.map((s) => [s.entity_id, s])), language: "en" }) as unknown as HomeAssistant;

test("values are written short: degrees without the C, no needless decimals, units glued on", () => {
  const hass = hassOf();
  assert.equal(compactValue(hass, st("sensor.t", "42.50", "°C")), "42.5°");
  assert.equal(compactValue(hass, st("sensor.p", "1.5")), "1.5");
  assert.equal(compactValue(hass, st("sensor.e", "0.284", "kWh")), "0.28kWh");
  assert.equal(compactValue(hass, st("sensor.e", "unavailable", "kWh")), "–");
  assert.equal(hm(67), "1:07");
  assert.equal(hm(120), "2:00");
});

test("a pin shows its first three values with their labels", () => {
  const hass = hassOf(st("sensor.hw", "42", "°C"), st("sensor.p", "1.5"), st("sensor.ch", "46.5", "°C"), st("sensor.x", "7"));
  const f = { pin_items: [{ entity: "sensor.hw", label: "HW" }, { entity: "sensor.p", label: "P" }, { entity: "sensor.ch", label: "CH" }, { entity: "sensor.x" }] };
  assert.equal(pinText(hass, f), "HW 42° · P 1.5 · CH 46.5°");
  assert.equal(pinText(hass, { pin_items: [] }), null);
});

test("a time left from hours and minutes, or from minutes alone", () => {
  const hass = hassOf(st("sensor.h", "1"), st("sensor.m", "7"), st("sensor.t", "120", "min"));
  assert.equal(pinText(hass, { pin_items: [{ entity: "sensor.h", minutes: "sensor.m" }] }), "1:07");
  assert.equal(pinText(hass, { pin_items: [{ entity: "sensor.t", duration: true }] }), "2:00");
});

test("a resting appliance only says Idle, a working one its values", () => {
  const items = [{ entity: "sensor.m", duration: true }];
  const idle = hassOf(st("binary_sensor.run", "off"), st("sensor.phase", "待机/未启动"), st("sensor.m", "40"));
  assert.equal(pinText(idle, { pin_items: items, pin_busy: "binary_sensor.run" }), "Idle");
  assert.equal(pinText(idle, { pin_items: items, pin_busy: "sensor.phase" }), "Idle");
  const busy = hassOf(st("binary_sensor.run", "on"), st("sensor.phase", "洗涤"), st("sensor.m", "40"));
  assert.equal(pinText(busy, { pin_items: items, pin_busy: "binary_sensor.run" }), "0:40");
  assert.equal(pinBusy(busy, { pin_busy: "sensor.phase" }), true);
  assert.equal(pinBusy(busy, { pin_busy: null }), null);
});

test("while it works out its program the pin says Auto, afterwards Done, then the countdown", () => {
  const f = { pin_items: [{ entity: "sensor.left", duration: true }], pin_busy: "sensor.phase", pin_phase: "sensor.phase" };
  const at = (phase: string, left: string) => hassOf(st("sensor.phase", phase), st("sensor.left", left));
  assert.equal(pinText(at("待机状态", "120"), f), "Idle");
  assert.equal(pinText(at("自动判断负载中", "188"), f), "Auto");
  assert.equal(pinText(at("加热2", "31"), f), "0:31");
  assert.equal(pinText(at("防皱", "0"), f), "Done");
  // working without a time: it chooses itself
  assert.equal(pinText(at("洗涤", "0"), { ...f, pin_phase: null }), "Auto");
});

test("binary values are short: a problem is OK or !, the rest On or Off", () => {
  const hass = hassOf();
  const bin = (state: string, device_class?: string) => ({ entity_id: "binary_sensor.x", state, attributes: device_class ? { device_class } : {}, last_changed: "", last_updated: "" });
  assert.equal(compactValue(hass, bin("off", "problem")), "OK");
  assert.equal(compactValue(hass, bin("on", "problem")), "!");
  assert.equal(compactValue(hass, bin("on", "running")), "On");
});

test("own words for the states, and a problem still shows while it rests", () => {
  const prob = (state: string) => ({ entity_id: "binary_sensor.food", state, attributes: { device_class: "problem" }, last_changed: "", last_updated: "" });
  const f = { pin_items: [{ entity: "binary_sensor.food", label: "Food" }, { entity: "sensor.d", label: "D" }], pin_busy: "binary_sensor.feeding", pin_texts: { idle: "待机" } };
  const at = (food: string) => hassOf(st("binary_sensor.feeding", "off"), prob(food) as ReturnType<typeof st>, st("sensor.d", "30", "d"));
  assert.equal(pinText(at("off"), f), "待机");
  assert.equal(pinText(at("on"), f), "待机 · Food !");
  assert.equal(pinText(at("off"), { ...f, pin_texts: { idle: "  " } }), "Idle");
});

test("money shows with its currency sign", () => {
  const st = (state: string, unit: string) => ({ entity_id: "sensor.balance", state, attributes: { device_class: "monetary", unit_of_measurement: unit } }) as never;
  assert.equal(compactValue({ language: "zh-Hans" } as never, st("53.77", "CNY")), "¥53.77");
  assert.match(compactValue({ language: "de" } as never, st("12.4", "EUR")), /^12,40\s?€$/);
  // not a currency code: as before
  assert.equal(compactValue({ language: "en" } as never, st("3", "points")), "3points");
});
