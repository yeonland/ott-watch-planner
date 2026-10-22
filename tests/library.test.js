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

// 보관하기 → 시청 중 → 감상 완료 → 되돌리기 → 보관 취소
const storage = memoryStorage();
let lib = load(storage);
const todayText = lib.run('today()');
assert.match(todayText, /^\d{4}-\d{2}-\d{2}$/);
lib.run('toggleSaved("work-001")');
assert.strictEqual(lib.run('library["work-001"].status'), 'want');
lib.run('setStatus("work-001", "watching")');
assert.strictEqual(lib.run('library["work-001"].status'), 'watching');
assert.strictEqual(lib.run('library["work-001"].watchedAt'), null, '감상 완료 전에는 watchedAt 없음');
lib.run('setStatus("work-001", "watched")');
assert.strictEqual(lib.run('library["work-001"].watchedAt'), todayText);
lib.run('setStatus("work-001", "want")');
assert.strictEqual(lib.run('library["work-001"].watchedAt'), null, '되돌리면 통계에서 빠진다');
assert.strictEqual(lib.run('library["work-001"].savedAt'), todayText, '상태를 바꿔도 보관 날짜는 유지');
// 잘못된 상태는 무시
lib.run('setStatus("work-001", "deleted")');
assert.strictEqual(lib.run('library["work-001"].status'), 'want');
// 보관하지 않은 작품의 상태를 고르면 보관함에 들어간다
lib.run('setStatus("work-002", "watched")');
assert.strictEqual(lib.run('library["work-002"].status'), 'watched');
lib.run('toggleSaved("work-002")');
assert.strictEqual(lib.run('library["work-002"]'), null);

// 월간 통계: 이번 달 감상 완료만 세고, 장르·국가는 가장 많이 나온 값
const catalog = [
  { id: 'a', genres: ['사극', '드라마'], country: 'KR' },
  { id: 'b', genres: ['사극'], country: 'KR' },
  { id: 'c', genres: ['SF'], country: 'JP' },
];
const month = todayText.slice(0, 7);
const statsLib = load(memoryStorage({ 'scene-side-library': JSON.stringify({
  a: { status: 'watched', savedAt: todayText, watchedAt: todayText, rating: 5 },
  b: { status: 'watched', savedAt: '2020-01-01', watchedAt: todayText, rating: 4 },
  c: { status: 'watched', savedAt: '2020-01-01', watchedAt: '2020-01-02', rating: 1 }, // 지난달 감상은 제외
  gone: { status: 'watched', savedAt: todayText, watchedAt: todayText },   // 카탈로그에서 빠진 작품은 제외
}) }));
statsLib.context.catalog = catalog;
assert.deepStrictEqual(statsLib.run(`monthlyStats("${month}", catalog)`), { watched: 2, saved: 2, topGenre: '사극', topCountry: 'KR', averageRating: 4.5 });
assert.deepStrictEqual(load(memoryStorage()).run(`monthlyStats("${month}", [])`), { watched: 0, saved: 0, topGenre: null, topCountry: null, averageRating: null });

// 별점: 감상 완료한 작품에만, 같은 점수를 다시 누르면 지운다
const ratingLib = load(memoryStorage());
ratingLib.run('toggleSaved("r1")');
ratingLib.run('setRating("r1", 4)');
assert.strictEqual(ratingLib.run('library.r1.rating'), null, '감상 완료 전에는 별점을 남길 수 없다');
ratingLib.run('setStatus("r1", "watched")');
ratingLib.run('setRating("r1", 4)');
assert.strictEqual(ratingLib.run('library.r1.rating'), 4);
ratingLib.run('setRating("r1", 6)');
ratingLib.run('setRating("r1", 2.5)');
assert.strictEqual(ratingLib.run('library.r1.rating'), 4, '범위 밖·소수 점수는 무시');
ratingLib.run('setRating("r1", 4)');
assert.strictEqual(ratingLib.run('library.r1.rating'), null);

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

// 보관함 비우기
lib = load(memoryStorage({ 'scene-side-library': '{"work-001":{"status":"want","savedAt":"2026-10-22"}}' }));
lib.run('clearLibrary()');
assert.deepStrictEqual(lib.run('library'), {});

console.log('library tests passed');
