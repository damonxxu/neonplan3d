// Static, vertex-coloured GLBs are flattened into the same floor geometry as built-in furniture.
// This decoder is a separate lazy bundle so homes without external models never load it.
import { Box3, Color, LoadingManager, Matrix3, Mesh, MeshStandardMaterial, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface MeshData {
  positions: Float32Array;
  colors: Float32Array;
}

export async function decodeGLB(bytes: ArrayBuffer, paints: Record<string, string> = {}): Promise<MeshData> {
  const manager = new LoadingManager();
  manager.setURLModifier(() => { throw new Error("Use a self-contained, untextured GLB"); });
  const { scene } = await new GLTFLoader(manager).parseAsync(bytes, "");
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene, true);
  const size = box.getSize(new Vector3()), center = box.getCenter(new Vector3());
  if (![size.x, size.y, size.z].every((n) => Number.isFinite(n) && n > 0)) throw new Error("Empty model bounds");
  const positions: number[] = [], colors: number[] = [];
  const point = new Vector3(), normal = new Vector3(), color = new Color();
  const light = new Vector3(-0.45, 0.86, 0.35).normalize();
  const highlight = new Vector3(0.4, 0.8, 0.5).normalize();
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geo = object.geometry, material = object.material;
    if (!(material instanceof MeshStandardMaterial) || material.map || "isSkinnedMesh" in object) throw new Error("Expected static PBR geometry with base colours");
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const normals = new Matrix3().getNormalMatrix(object.matrixWorld);
    const mirrored = object.matrixWorld.determinant() < 0;
    const base = paints[material.name] ? new Color(paints[material.name]) : material.color;
    const count = geo.index?.count ?? geo.attributes.position.count;
    if (count % 3 || positions.length / 9 + count / 3 > 150000) throw new Error("Unsupported triangle count");
    for (let i = 0; i < count; i++) {
      const order = mirrored && i % 3 !== 0 ? (i % 3 === 1 ? i + 1 : i - 1) : i;
      const index = geo.index ? geo.index.getX(order) : order;
      point.fromBufferAttribute(geo.attributes.position, index).applyMatrix4(object.matrixWorld);
      positions.push((point.x-center.x)/size.x, (point.y-box.min.y)/size.y, (point.z-center.z)/size.z);
      normal.fromBufferAttribute(geo.attributes.normal, index).applyNormalMatrix(normals);
      color.copy(base);
      if (geo.attributes.color) color.multiply(new Color().fromBufferAttribute(geo.attributes.color, index));
      color.multiplyScalar(0.55 + 0.7 * Math.max(0, normal.dot(light)));
      const gloss = (0.012 + 0.12 * material.metalness) * Math.max(0, normal.dot(highlight)) ** 7;
      colors.push(color.r + gloss, color.g + gloss, color.b + gloss);
    }
  });
  if (!positions.length) throw new Error("No triangles in GLB");
  return { positions: Float32Array.from(positions), colors: Float32Array.from(colors) };
}
