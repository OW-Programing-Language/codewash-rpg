import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('the GUI splash waits until the first presented OpenGL frame', () => {
  const launcher = readFileSync(resolve(root,
    'ow/native-launcher/src/main/java/org/oreostudios/codewash/NativeLauncher.java'), 'utf8');
  const entry = readFileSync(resolve(root, 'ow/src/engine/battle_gpu.ow'), 'utf8');
  assert.ok(launcher.includes('CODEWASH_NATIVE_READY'));
  const present = entry.indexOf('call: assert(preview.present() == 1');
  const ready = entry.indexOf('print: "CODEWASH_NATIVE_READY"');
  assert.ok(present > 0);
  assert.ok(ready > present, 'ready must be printed after first present');
  assert.ok(launcher.includes('firstFrameReady'));
});

test('Windows native launcher records failures and never closes silently', () => {
  const launcher = readFileSync(resolve(root,
    'ow/native-launcher/src/main/java/org/oreostudios/codewash/NativeLauncher.java'), 'utf8');
  assert.ok(launcher.includes('System.getenv("LOCALAPPDATA")'));
  assert.ok(launcher.includes('latest.log'));
  assert.ok(launcher.includes('showError(problem)'));
  assert.ok(launcher.includes('JOptionPane.ERROR_MESSAGE'));
  assert.ok(launcher.includes('javaw.exe'));
  assert.ok(launcher.includes('falling back to java.exe'));
});
