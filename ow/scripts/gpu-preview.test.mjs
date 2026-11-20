import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArgs, pinnedGraphicsSha, nativeClasspath, assertPinnedRevision} from './gpu-preview.mjs';

test('default launcher prepares a run and supports explicit build modes', () => {
  assert.equal(parseArgs([]).mode, 'run');
  assert.equal(parseArgs(['--check']).mode, 'check');
  assert.equal(parseArgs(['--prepare', '--no-build']).noBuild, true);
  assert.equal(parseArgs(['--help']).help, true);
});

test('arguments reject unknown and contradictory modes and missing paths', () => {
  assert.throws(() => parseArgs(['--check', '--run']), /Choose one mode/);
  assert.throws(() => parseArgs(['--nope']), /Unknown argument/);
  assert.throws(() => parseArgs(['--graphics-dir']), /requires a directory/);
  assert.throws(() => parseArgs(['--compiler-dir', '--check']), /requires a directory/);
});

test('graphics pin reads correct dependency rather than an unrelated SHA', () => {
  const sha = 'a'.repeat(40);
  const manifest = 'format: 1\ndependencies:\n  - name: math\n    version: ' + 'b'.repeat(40) +
    '\n  - name: graphics\n    repository: github\n    path: OW-Programing-Language/OW-Graphics\n    version: ' + sha + '\n';
  assert.equal(pinnedGraphicsSha(manifest), sha);
  assert.throws(() => pinnedGraphicsSha('dependencies: []'), /SHA-pinned/);
  assert.throws(() => assertPinnedRevision('b'.repeat(40), sha), /pins/);
  assert.doesNotThrow(() => assertPinnedRevision(sha, sha));
});

test('native classpath uses correct platform separator and external graphics SPI', () => {
  const linux = nativeClasspath('/ow-lang/target/OwIDE.jar', '/OW-Graphics', 'linux');
  assert.equal(linux, '/ow-lang/target/OwIDE.jar:/OW-Graphics/native-bridge/target/classes:/OW-Graphics/native-bridge/target/lib/*');
  const windows = nativeClasspath('C:\\ow-lang\\OwIDE.jar', 'C:\\OW-Graphics', 'win32');
  assert.ok(windows.includes(';'));
  assert.ok(windows.endsWith('*'));
});
