import assert from "node:assert/strict";
import { test } from "node:test";
import { stageBackground } from "./background.ts";

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
