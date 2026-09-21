import test from 'node:test';
import assert from 'node:assert/strict';
import { cyclePosition, prioritizeReview, reconcileOrder } from '../../src/playback-progress.ts';

test('resume advances after the first and subsequent completed cycles', () => {
  assert.equal(cyclePosition(10, 10), 10);
  assert.equal(cyclePosition(11, 10), 1);
  assert.equal(cyclePosition(23, 10), 3);
  assert.equal(cyclePosition(20, 10) % 10, 0);
});
test('invalid stored cursors and empty playlists are safe', () => {
  for (const value of [NaN, Infinity, -1, 1.5]) assert.equal(cyclePosition(value, 10), 0);
  assert.equal(cyclePosition(2, 0), 0);
});
test('random review prefers unseen unmastered words without dropping any words', () => {
  const items = [{ id: 'mastered', status: 'Mastered' }, { id: 'new' }, { id: 'recent' }, { id: 'older' }];
  assert.deepEqual(prioritizeReview(items, ['recent', 'older']).map(x => x.id), ['new', 'mastered', 'older', 'recent']);
  assert.equal(items[0].id, 'mastered');
});

test('late vocabulary hydration appends words without changing the saved order', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  assert.deepEqual(reconcileOrder(items, ['c', 'a', 'b']).map(x => x.id), ['c', 'a', 'b', 'd']);
  assert.deepEqual(reconcileOrder(items, ['missing', 'b', 'b']).map(x => x.id), ['b', 'a', 'c', 'd']);
});

test('each random cycle defers the previous last word and retains all IDs', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.notEqual(prioritizeReview(items, ['a'])[0].id, 'a');
  assert.equal(new Set(prioritizeReview(items, ['a']).map(x => x.id)).size, 3);
  assert.deepEqual(prioritizeReview([{ id: 'only' }], ['only']), [{ id: 'only' }]);
});
