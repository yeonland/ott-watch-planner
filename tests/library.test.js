// 실행: node tests/library.test.js — 가짜 localStorage로 보관·감상 상태 전환과 저장 실패 대응을 확인한다
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'library.js'), 'utf8');
function load(storage) {
  const context = vm.createContext({ localStorage: storage, Date });
  vm.runInContext(source, context);
  // vm 안의 객체는 프로토타입이 달라 JSON으로 꺼내 비교한다
  return { run: (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code}) ?? "null"`, context)), context };
}
const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
};

// 보관하기 → 봤어요 → 되돌리기 → 저장 취소
const storage = memoryStorage();
let lib = load(storage);
lib.run('toggleSaved("work-001")');
assert.strictEqual(lib.run('library["work-001"].status'), 'want');
lib.run('toggleWatched("work-001")');
assert.strictEqual(lib.run('library["work-001"].status'), 'watched');
const savedAt = lib.run('library["work-001"].savedAt');
assert.match(savedAt, /^\d{4}-\d{2}-\d{2}$/);
lib.run('toggleWatched("work-001")');
assert.strictEqual(lib.run('library["work-001"].status'), 'want');
assert.strictEqual(lib.run('library["work-001"].savedAt'), savedAt, '상태를 바꿔도 보관 날짜는 유지');
// 보관하지 않은 작품에 봤어요 → 보관함에 본 작품으로 들어간다
lib.run('toggleWatched("work-002")');
assert.strictEqual(lib.run('library["work-002"].status'), 'watched');
lib.run('toggleSaved("work-002")');
assert.strictEqual(lib.run('library["work-002"]'), null);

// 새로고침: 저장된 기록을 다시 읽는다
lib = load(storage);
assert.deepStrictEqual(Object.keys(lib.run('library')), ['work-001']);

// 손상된 값·배열·접근 차단에서도 빈 보관함으로 시작하고 오류를 던지지 않는다
for (const bad of ['{깨짐', '[1,2]', 'null']) {
  assert.deepStrictEqual(load(memoryStorage({ 'scene-side-library': bad })).run('library'), {});
}
const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
lib = load(blocked);
lib.run('toggleSaved("work-003")');
assert.strictEqual(lib.run('library["work-003"].status'), 'want', '저장이 막혀도 이번 방문 동안은 유지');

console.log('library tests passed');
