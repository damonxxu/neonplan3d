import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decodeGLB } from "./external-glb.ts";
import registry from "./external-models.json" with { type: "json" };

test("the parked Model 3 decodes with finite colours and fits its declared dimensions", async () => {
  const asset = registry["pack:studio.damonxxu-vehicles:model3_2022"];
  const file = new URL("../../../custom_components/neonplan3d/frontend/models/" + asset.file, import.meta.url);
  const bytes = await readFile(file);
  const { positions, colors } = await decodeGLB(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length), asset.paints);
  assert.equal(positions.length / 9, 26942);
  assert.equal(colors.length, positions.length);
  assert.ok(colors.every(Number.isFinite));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  positions.forEach((value, i) => {
    const axis = i % 3;
    min[axis] = Math.min(min[axis], value);
    max[axis] = Math.max(max[axis], value);
  });
  assert.deepEqual(min, [-0.5, 0, -0.5]);
  assert.deepEqual(max, [0.5, 1, 0.5]);
});

test("Cybertruck uses the production body mesh at the specified ride height", async () => {
  const asset = registry["pack:studio.damonxxu-vehicles:cybertruck"];
  const file = new URL("../../../custom_components/neonplan3d/frontend/models/" + asset.file, import.meta.url);
  const bytes = await readFile(file);
  const mesh = await decodeGLB(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));
  assert.equal(mesh.positions.length / 9, 72528);
  assert.ok(mesh.positions.every(Number.isFinite));
  assert.ok(mesh.colors.every(Number.isFinite));
  assert.ok(Math.abs(2.413 * asset.widthFraction - 2.0316) < 0.0001);
  assert.ok(Math.abs(1.791 * asset.heightFraction - 1.7938) < 0.0001);
});
