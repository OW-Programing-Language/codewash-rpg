import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, mkdtempSync, writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {listNativeAssets, stageNativeAssets} from './stage-native-assets.mjs';

test('native art catalogue references original files with safe sandbox-relative paths', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const catalog = readFileSync(join(root, 'ow/src/engine/NativeArtCatalog.ow'), 'utf8');
  const names = listNativeAssets(catalog);
  assert.ok(names.length >= 20);
  assert.ok(names.includes('skills/math_icon.png'));
  assert.ok(names.includes('mobs/hostile/creeper.png'));
  assert.ok(names.includes('items/egg.png'));
  assert.ok(names.includes('themes/minecraft.png'));
  assert.ok(names.includes('themes/minecraft_logo.png'));
  assert.equal(new Set(names).size, names.length);
  for (const name of names) {
    assert.ok(existsSync(join(root, 'public/assets', name)), 'missing original asset: ' + name);
  }
});

test('catalogue staging rejects traversal and unapproved file types', () => {
  assert.throws(() => listNativeAssets('return: "assets/native/../private.png"'), /outside approved catalogue/);
  assert.throws(() => listNativeAssets('return: "assets/native/items/sound.wav"'), /outside approved catalogue/);
  assert.throws(() => listNativeAssets('return: "assets/native/themes/minecraft.webp"'), /outside approved catalogue/);
  assert.throws(() => listNativeAssets('return: ""'), /Missing native asset/);
});

test('copy original art into sandbox without changing source files', () => {
  const root = mkdtempSync(join(tmpdir(), 'codewash-art-'));
  try {
    const catalog = 'return: "assets/native/skills/test.png"\n';
    const src = join(root, 'public/assets/skills/test.png');
    const cat = join(root, 'ow/src/engine/NativeArtCatalog.ow');
    mkdirSync(dirname(src), {recursive: true});
    mkdirSync(dirname(cat), {recursive: true});
    writeFileSync(src, 'safe-content');
    writeFileSync(cat, catalog);
    const staged = stageNativeAssets(root);
    assert.deepEqual(staged, ['skills/test.png']);
    assert.equal(readFileSync(join(root, 'ow/assets/native/skills/test.png'), 'utf8'), 'safe-content');
    assert.equal(readFileSync(src, 'utf8'), 'safe-content');
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
