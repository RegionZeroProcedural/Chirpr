const test = require('node:test');
const assert = require('node:assert/strict');
const { decisionFromResults } = require('./moderation-gateway.cjs');
test('sexual content automatically receives blur warning', () => {
  assert.deepEqual(decisionFromResults([{ categories: { sexual: true } }]).status, 'sensitive');
});
test('non-graphic violence automatically receives blur warning', () => {
  const result = decisionFromResults([{ categories: { violence: true } }]);
  assert.equal(result.status, 'sensitive');
  assert.ok(result.reasons.includes('Violent imagery'));
});
test('severe sexual exploitation or graphic violence are automatically blocked', () => {
  assert.equal(decisionFromResults([{ categories: { 'sexual/minors': true } }]).status, 'rejected');
  assert.equal(decisionFromResults([{ categories: { 'violence/graphic': true } }]).status, 'rejected');
});
test('clean images can be approved by automatic classifier', () => {
  assert.equal(decisionFromResults([{ categories: { sexual: false, violence: false } }]).status, 'approved');
});
