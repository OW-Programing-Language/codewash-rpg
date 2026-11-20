import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {pathsForOS, verifyContents} from './verify-native-image.mjs';

test('native paths are correct for Windows, Linux and macOS jpackage images', () => {
  const root = '/package-root';
  const normal = p => p.split(String.fromCharCode(92)).join('/');
  assert.match(normal(pathsForOS(root, 'win32').binary), /CodeWashRPG\.exe$/);
  assert.match(normal(pathsForOS(root, 'linux').binary), /CodeWashRPG\/bin\/CodeWashRPG$/);
  assert.match(normal(pathsForOS(root, 'darwin').binary), /CodeWashRPG\.app\/Contents\/MacOS\/CodeWashRPG$/);
  assert.match(normal(pathsForOS(root, 'darwin').app), /CodeWashRPG\.app\/Contents\/app$/);
});

test('verification catches incomplete packaged image and approves staged layout', () => {
  const out = mkdtempSync(join(tmpdir(), 'codewash-verify-'));
  try {
    const image = pathsForOS(out, 'linux');
    assert.throws(() => verifyContents(image), /Missing native launcher/);
    for (const p of [image.binary,
      join(image.app, 'native-launcher.jar'),
      join(image.app, 'OwIDE.jar'),
      join(image.app, 'ow-graphics-native.jar'),
      join(image.app, 'payload/ow/dependencies.lock.yml'),
      join(image.app, 'payload/ow/src/engine/battle_gpu.ow'),
      join(image.app, 'payload/ow/assets/native/skills/math_icon.png'),
      join(image.app, 'payload/ow/.ow/deps/graphics/.ow-resolved')]) {
      mkdirSync(dirname(p), {recursive: true});
      writeFileSync(p, 'test');
    }
    mkdirSync(join(image.app, 'lib'), {recursive: true});
    assert.equal(verifyContents(image), true);
  } finally {
    rmSync(out, {recursive: true, force: true});
  }
});
