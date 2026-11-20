import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, copyFileSync, mkdtempSync, writeFileSync, mkdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {listNativeAssets, stageNativeAssets, originalGifForPng, mislabeledJpegSource} from './stage-native-assets.mjs';

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
    const source = originalGifForPng[name] ?? mislabeledJpegSource[name] ?? name;
    assert.ok(existsSync(join(root, 'public/assets', source)), 'missing original asset: ' + source);
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

test('GIF-only native mobs convert to stable PNG first frames during staging', () => {
  const realRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const tmp = mkdtempSync(join(tmpdir(), 'codewash-gif-art-'));
  try {
    const from = join(realRoot, 'public/assets/mobs/hostile/ghast.gif');
    const into = join(tmp, 'public/assets/mobs/hostile/ghast.gif');
    const cat = join(tmp, 'ow/src/engine/NativeArtCatalog.ow');
    const java = join(tmp, 'ow/scripts/GifFirstFrame.java');
    mkdirSync(dirname(into), {recursive: true});
    mkdirSync(dirname(cat), {recursive: true});
    mkdirSync(dirname(java), {recursive: true});
    copyFileSync(from, into);
    copyFileSync(join(realRoot, 'ow/scripts/GifFirstFrame.java'), java);
    writeFileSync(cat, 'return: "assets/native/mobs/hostile/ghast.png"\\n');
    const staged = stageNativeAssets(tmp);
    assert.deepEqual(staged, ['mobs/hostile/ghast.png']);
    const png = readFileSync(join(tmp, 'ow/assets/native/mobs/hostile/ghast.png'));
    assert.deepEqual([...png.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
    assert.ok(png.length > 250, 'decoded portrait must not be empty');
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
});

test('GIF transcode allowlist cannot be extended by an arbitrary catalogue path', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'codewash-unsafe-gif-'));
  try {
    const cat = join(tmp, 'ow/src/engine/NativeArtCatalog.ow');
    mkdirSync(dirname(cat), {recursive: true});
    writeFileSync(cat, 'return: "assets/native/mobs/hostile/unknown.png"\\n');
    assert.throws(() => stageNativeAssets(tmp), /Original artwork is missing/);
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
});

test('original browser-sniffed JPEG backgrounds are staged with honest extensions', () => {
  const realRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const tmp = mkdtempSync(join(tmpdir(), 'codewash-jpeg-art-'));
  try {
    const catalog = join(tmp, 'ow/src/engine/NativeArtCatalog.ow');
    mkdirSync(dirname(catalog), {recursive: true});
    writeFileSync(catalog, 'return: "assets/native/themes/spy.jpg"\\n');
    const original = join(realRoot, 'public/assets/themes/spy.png');
    const into = join(tmp, 'public/assets/themes/spy.png');
    mkdirSync(dirname(into), {recursive: true});
    copyFileSync(original, into);
    const staged = stageNativeAssets(tmp);
    assert.deepEqual(staged, ['themes/spy.jpg']);
    const jpg = readFileSync(join(tmp, 'ow/assets/native/themes/spy.jpg'));
    assert.deepEqual([...jpg.subarray(0, 3)], [255, 216, 255]);
  } finally {
    rmSync(tmp, {recursive: true, force: true});
  }
});
