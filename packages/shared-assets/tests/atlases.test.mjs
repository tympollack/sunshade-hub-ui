import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { packSpriteSheet } from '../scripts/pack-atlases.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ATLASES_DIR = path.resolve(__dirname, '../atlases');

test('Texture Atlases Directory contains required manifests', () => {
  assert.ok(fs.existsSync(ATLASES_DIR), 'atlases directory must exist');
  const files = fs.readdirSync(ATLASES_DIR).filter((f) => f.endsWith('.atlas.json'));
  assert.ok(files.length >= 4, `Expected at least 4 atlas manifests, found ${files.length}`);

  const requiredPacks = [
    'isometric-tiles.atlas.json',
    'ui-sprites.atlas.json',
    'modular-characters.atlas.json',
    'playing-cards.atlas.json',
  ];

  for (const pack of requiredPacks) {
    assert.ok(files.includes(pack), `Missing required atlas manifest: ${pack}`);
  }
});

test('All atlas manifests parse cleanly as valid JSON with Flame-compatible schema', () => {
  const files = fs.readdirSync(ATLASES_DIR).filter((f) => f.endsWith('.atlas.json'));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(ATLASES_DIR, file), 'utf8');
    const json = JSON.parse(raw);

    assert.ok(json.meta, `${file} missing meta block`);
    assert.ok(json.meta.image.startsWith('https://cdn.sunshade.icu/assets/kenney/'), `${file} image must point to R2 CDN`);
    assert.ok(json.meta.size.w > 0 && json.meta.size.h > 0, `${file} meta.size must be positive`);
    assert.ok(json.frames && typeof json.frames === 'object', `${file} missing frames dictionary`);
    assert.ok(Object.keys(json.frames).length > 0, `${file} frames must not be empty`);
  }
});

test('Atlases compile without pixel bleeding or texture overlap', () => {
  const files = fs.readdirSync(ATLASES_DIR).filter((f) => f.endsWith('.atlas.json'));

  for (const file of files) {
    const json = JSON.parse(fs.readFileSync(path.join(ATLASES_DIR, file), 'utf8'));
    const frameEntries = Object.entries(json.frames);

    for (let i = 0; i < frameEntries.length; i++) {
      const [idA, dataA] = frameEntries[i];
      const a = dataA.frame;

      // Assert containment
      assert.ok(
        a.x + a.w <= json.meta.size.w,
        `Frame ${idA} in ${file} extends beyond sheet width: ${a.x + a.w} > ${json.meta.size.w}`
      );
      assert.ok(
        a.y + a.h <= json.meta.size.h,
        `Frame ${idA} in ${file} extends beyond sheet height: ${a.y + a.h} > ${json.meta.size.h}`
      );

      // Assert non-negative integer coordinates
      assert.ok(Number.isInteger(a.x) && a.x >= 0, `Frame ${idA} has invalid x coordinate`);
      assert.ok(Number.isInteger(a.y) && a.y >= 0, `Frame ${idA} has invalid y coordinate`);
      assert.ok(Number.isInteger(a.w) && a.w > 0, `Frame ${idA} has invalid width`);
      assert.ok(Number.isInteger(a.h) && a.h > 0, `Frame ${idA} has invalid height`);

      // Overlap check
      for (let j = i + 1; j < frameEntries.length; j++) {
        const [idB, dataB] = frameEntries[j];
        const b = dataB.frame;

        const overlapsX = a.x < b.x + b.w && a.x + a.w > b.x;
        const overlapsY = a.y < b.y + b.h && a.y + a.h > b.y;

        assert.ok(!overlapsX || !overlapsY, `Overlap collision detected between '${idA}' and '${idB}' in ${file}`);
      }
    }
  }
});

test('Isometric terrain tiles standardize to 256x128 bounding boxes and Flame anchors', () => {
  const isoJson = JSON.parse(fs.readFileSync(path.join(ATLASES_DIR, 'isometric-tiles.atlas.json'), 'utf8'));

  for (const [id, data] of Object.entries(isoJson.frames)) {
    assert.equal(data.frame.w, 256, `Isometric tile ${id} width must be 256`);
    assert.equal(data.frame.h, 128, `Isometric tile ${id} height must be 128`);
    assert.deepEqual(data.anchor, { ax: 0.5, ay: 0.75 }, `Isometric tile ${id} must have Flame anchor (0.5, 0.75)`);
  }
});

test('UI icons standardize to 64x64 or 128x128 standard grids', () => {
  const uiJson = JSON.parse(fs.readFileSync(path.join(ATLASES_DIR, 'ui-sprites.atlas.json'), 'utf8'));

  for (const [id, data] of Object.entries(uiJson.frames)) {
    const is64 = data.frame.w === 64 && data.frame.h === 64;
    const is128 = data.frame.w === 128 && data.frame.h === 128;
    assert.ok(is64 || is128, `UI icon ${id} must be 64x64 or 128x128 grid; got ${data.frame.w}x${data.frame.h}`);
    assert.deepEqual(data.anchor, { ax: 0.5, ay: 0.5 }, `UI icon ${id} must have center anchor (0.5, 0.5)`);
  }
});

test('Automated packing routine generates valid collision-free sprite sheets', () => {
  const mockSprites = [
    { id: 'sprite_a', w: 64, h: 64 },
    { id: 'sprite_b', w: 64, h: 64 },
    { id: 'sprite_c', w: 128, h: 128 },
    { id: 'sprite_d', w: 256, h: 128 },
  ];

  const packed = packSpriteSheet(mockSprites, {
    maxWidth: 512,
    padding: 2,
    packName: 'test-pack',
    imageCdnUrl: 'https://cdn.sunshade.icu/assets/kenney/test/test.png',
  });

  assert.equal(packed.meta.pack, 'test-pack');
  assert.equal(Object.keys(packed.frames).length, 4);

  // Validate no collision in packed output
  const entries = Object.entries(packed.frames);
  for (let i = 0; i < entries.length; i++) {
    const [idA, dataA] = entries[i];
    const a = dataA.frame;
    for (let j = i + 1; j < entries.length; j++) {
      const [idB, dataB] = entries[j];
      const b = dataB.frame;
      const overlapsX = a.x < b.x + b.w && a.x + a.w > b.x;
      const overlapsY = a.y < b.y + b.h && a.y + a.h > b.y;
      assert.ok(!overlapsX || !overlapsY, `Automated packing produced collision between ${idA} and ${idB}`);
    }
  }
});
