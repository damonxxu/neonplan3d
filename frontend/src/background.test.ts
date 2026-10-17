import assert from "node:assert/strict";
import { test } from "node:test";
import { BACKDROP_DEFAULT, backdropStyle, readBackdrop, stageBackground } from "./background.ts";

test("an own background: nothing keeps the sky, a path becomes a covering picture, CSS stays as it is", () => {
  assert.equal(stageBackground(undefined), null);
  assert.equal(stageBackground(""), null);
  assert.equal(stageBackground("   "), null);
  assert.equal(stageBackground("/local/lake.jpg"), 'url("/local/lake.jpg") center / cover no-repeat');
  assert.equal(stageBackground("https://example.com/sky.png"), 'url("https://example.com/sky.png") center / cover no-repeat');
  assert.equal(stageBackground("#1c2333"), "#1c2333");
  assert.equal(stageBackground("linear-gradient(#0b1020, #2b3a55)"), "linear-gradient(#0b1020, #2b3a55)");
});

test("an own background cannot break out of the style attribute", () => {
  assert.equal(stageBackground("red; display: none"), null);
  assert.equal(stageBackground("red} .x {color: red"), null);
  assert.equal(stageBackground("<script>"), null);
});

test("a backdrop: nothing or rubbish gives the defaults, numbers stay in their range", () => {
  assert.deepEqual(readBackdrop(null), BACKDROP_DEFAULT);
  assert.deepEqual(readBackdrop("x"), BACKDROP_DEFAULT);
  const b = readBackdrop({ mode: "color", color: "#ABCDEF", color2: "red", blur: 99, dim: -1, saturate: "1", vignette: false });
  assert.equal(b.mode, "color");
  assert.equal(b.color, "#ABCDEF");
  assert.equal(b.color2, BACKDROP_DEFAULT.color2);
  assert.equal(b.blur, 40);
  assert.equal(b.dim, 0);
  assert.equal(b.saturate, BACKDROP_DEFAULT.saturate);
  assert.equal(b.vignette, false);
});

test("a backdrop picture is a plain path or address, nothing that leaves url() or the style", () => {
  assert.equal(readBackdrop({ image: " /local/lake.jpg " }).image, "/local/lake.jpg");
  assert.equal(readBackdrop({ image: "/api/image/serve/abc123/original" }).image, "/api/image/serve/abc123/original");
  assert.equal(readBackdrop({ image: "https://example.com/a.png" }).image, "https://example.com/a.png");
  for (const bad of ['/a.jpg");x', "/a b.jpg", "/a.jpg;color:red", "javascript:alert(1)", "lake.jpg", "/a.jpg)"]) {
    assert.equal(readBackdrop({ image: bad }).image, "", bad);
  }
});

test("a backdrop's layer: colour plain or as gradient, picture blurred and reaching past the edges", () => {
  assert.equal(backdropStyle({ ...BACKDROP_DEFAULT, mode: "color", gradient: false }), "background:#1c2333");
  assert.equal(backdropStyle({ ...BACKDROP_DEFAULT, mode: "color" }), "background:radial-gradient(ellipse at 50% 35%, #1c2333, #0a0f1a 72%)");
  assert.equal(backdropStyle({ ...BACKDROP_DEFAULT, mode: "image" }), null);
  assert.equal(
    backdropStyle({ ...BACKDROP_DEFAULT, image: "/local/lake.jpg" }),
    'inset:-32px;background:url("/local/lake.jpg") center / cover no-repeat;filter:blur(16px) brightness(0.6) saturate(0.75)',
  );
});
