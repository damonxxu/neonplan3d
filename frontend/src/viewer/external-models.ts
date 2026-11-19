import { Color } from "three";
import type { GeoBuffer } from "./geo.ts";
import type { MeshData } from "./external-glb.ts";
import registry from "./external-models.json" with { type: "json" };

interface Asset { file: string; paints?: Record<string, string>; widthFraction?: number; heightFraction?: number }
const assets: Record<string, Asset> = registry;
const ready = new Map<string, MeshData>();
const requests = new Map<string, Promise<void>>();

/** Existing furniture remains visible while the GLB loads or when a file cannot be read. */
export function requestMesh(type: string): Promise<void> | undefined {
  const asset = assets[type];
  if (!Object.prototype.hasOwnProperty.call(assets, type) || ready.has(type)) return;
  let request = requests.get(type);
  if (!request) {
    const decoder = new URL("./neonplan3d-glb.js", import.meta.url).href;
    const url = new URL("./models/" + asset.file, import.meta.url);
    request = Promise.all([import(decoder) as Promise<typeof import("./external-glb.ts")>, fetch(url)]).then(async ([module, response]) => {
      if (!response.ok) throw new Error(`GLB download returned ${response.status}`);
      ready.set(type, await module.decodeGLB(await response.arrayBuffer(), asset.paints));
    }).finally(() => requests.delete(type));
    requests.set(type, request);
  }
  return request;
}

export function drawExternalModel(type: string, buf: GeoBuffer, tf: (x: number, z: number) => [number, number], w: number, d: number, h: number, base: number, mirrored: boolean): boolean {
  const mesh = ready.get(type);
  if (!mesh) return false;
  // A mesh without mirrors occupies only the body portion of the pack footprint.
  w *= assets[type].widthFraction ?? 1;
  h *= assets[type].heightFraction ?? 1;
  const points = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const colors = [new Color(), new Color(), new Color()];
  for (let i = 0; i < mesh.positions.length; i += 9) {
    for (let k = 0; k < 3; k++) {
      const j = i + 3 * (mirrored && k ? 3 - k : k);
      const [x, z] = tf(mesh.positions[j] * w, mesh.positions[j + 2] * d);
      points[k][0] = x;
      points[k][1] = base + mesh.positions[j + 1] * h;
      points[k][2] = z;
      colors[k].fromArray(mesh.colors, j);
    }
    buf.tri(points[0], points[1], points[2], colors[0], colors[1], colors[2]);
  }
  return true;
}
