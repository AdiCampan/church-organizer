const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

function runWithoutPassword() {
  return spawnSync('node', [path.join(__dirname, 'fix-apple-reviewer.js')], {
    env: { ...process.env, APPLE_REVIEW_PASSWORD: '' },
    encoding: 'utf8'
  });
}

function testRequiresPassword() {
  const result = runWithoutPassword();
  assert.notStrictEqual(result.status, 0, 'script should exit with error without password');
  assert.match(
    result.stderr || result.stdout,
    /APPLE_REVIEW_PASSWORD/,
    'error message should mention APPLE_REVIEW_PASSWORD'
  );
}

testRequiresPassword();
console.log('fix-apple-reviewer.test.js: all mocks passed');
