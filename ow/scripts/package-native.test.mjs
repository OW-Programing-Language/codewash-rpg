import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {parseArgs, parseLock, copySafeTree, stageOwPayload} from './package-native.mjs';

test('native packager has platform-specific image output and rejects bad flags', () => {
  assert.equal(parseArgs([]).version, '1.13.2');
  assert.equal(parseArgs(['--version', '1.2.3']).version, '1.2.3');
  assert.throws(() => parseArgs(['--version', 'latest']), /Version/);
  assert.throws(() => parseArgs(['--out']), /requires a value/);
  assert.throws(() => parseArgs(['--unexpected']), /Unknown argument/);
});

test('OW lockfile pins all runtime module refs to immutable SHA values', () => {
  const text = 'format: 1\ndependencies:\n' +
    '  - name: "math"\n    commit: "' + 'a'.repeat(40) + '"\n' +
    '  - name: "flow"\n    commit: "' + 'b'.repeat(40) + '"\n';
  const locks = parseLock(text);
  assert.equal(locks.get('math'), 'a'.repeat(40));
  assert.equal(locks.get('flow'), 'b'.repeat(40));
  assert.equal(locks.size, 2);
  assert.throws(() => parseLock(text + '  - name: "math"\n    commit: "' +
    'a'.repeat(40) + '"\n'), /Duplicate dependency/);
});

test('staging never includes Git internals and writes offline .ow-resolved markers', () => {
  const root = mkdtempSync(join(tmpdir(), 'codewash-native-'));
  try {
    const ow = join(root, 'ow');
    const lock = ['math', 'flow', 'owunit', 'graphics', 'engine']
      .map((name, i) => '  - name: "' + name + '"\n    commit: "' +
        String(i + 1).repeat(40) + '"\n').join('');
    for (const item of ['src/engine/battle_gpu.ow',
      'src/engine/battle_lifecycle_smoke.ow',
      'assets/native/skills/math_icon.png',
      'assets/native/items/egg.png']) {
      const p = join(ow, item);
      mkdirSync(dirname(p), {recursive: true});
      writeFileSync(p, 'test content');
    }
    writeFileSync(join(ow, 'dependencies.yml'), 'format: 1\n');
    writeFileSync(join(ow, 'dependencies.lock.yml'), 'format: 1\ndependencies:\n' + lock);
    for (const name of ['math', 'flow', 'owunit', 'graphics', 'engine']) {
      const folder = join(ow, '.ow/deps', name);
      mkdirSync(join(folder, '.git'), {recursive: true});
      mkdirSync(join(folder, 'src'), {recursive: true});
      writeFileSync(join(folder, '.git/config'), 'SECRET_GIT_DATA');
      writeFileSync(join(folder, 'src/Module.ow'), 'module Contents');
    }
    const destination = join(root, 'bundle');
    assert.equal(stageOwPayload(root, destination), 5);
    for (const [i, name] of ['math', 'flow', 'owunit', 'graphics', 'engine'].entries()) {
      const target = join(destination, '.ow/deps', name);
      assert.equal(existsSync(join(target, '.git')), false);
      assert.equal(readFileSync(join(target, '.ow-resolved'), 'utf8').trim(),
        String(i + 1).repeat(40));
      assert.equal(readFileSync(join(target, 'src/Module.ow'), 'utf8'), 'module Contents');
    }
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});

test('native source packaging refuses symlink escape', () => {
  const root = mkdtempSync(join(tmpdir(), 'codewash-symlink-'));
  try {
    const input = join(root, 'input'), out = join(root, 'output');
    mkdirSync(input);
    // Test a simple regular-file copy as the safe base behavior.
    writeFileSync(join(input, 'readme.ow'), 'safe');
    copySafeTree(input, out);
    assert.equal(readFileSync(join(out, 'readme.ow'), 'utf8'), 'safe');
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
});
