// 실행: node tests/search.test.js — 브라우저 전역 스크립트를 같은 컨텍스트에 올려 검색 규칙을 확인한다
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = vm.createContext({});
for (const file of ['js/data.js', 'js/search.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
// vm 안의 배열은 프로토타입이 달라 deepStrictEqual이 실패하므로 JSON으로 꺼낸다
const run = (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, context));
const titles = (query, filters = {}) =>
  run(`filterWorks(works, ${JSON.stringify(query)}, ${JSON.stringify({ country: "", genre: "", period: "", theme: "", ...filters })}).map((w) => w.title)`);

// 홈 주제 칩이 실제 결과로 이어지는지
for (const topic of ['조선시대', '시간여행', '신화·전설', '일본 여름', '성장']) {
  assert.ok(titles(topic).length > 0, `주제 '${topic}' 결과 없음`);
}
// 여러 단어는 모두 만족해야 한다: 일본 작품 중 여름 소재만
assert.deepStrictEqual(titles('일본 여름').sort(), ['기쿠지로의 여름', '시간을 달리는 소녀', '썸머 워즈', '이웃집 토토로'].sort());
// 제목 일부, 대소문자 무시
assert.deepStrictEqual(titles('왕이 된'), ['광해, 왕이 된 남자']);
assert.ok(titles('sf').includes('인터스텔라'));
// 빈 검색어는 전체
assert.strictEqual(titles('').length, run("works.length"));
// 검색어 + 필터 조합
assert.deepStrictEqual(titles('시간여행', { country: 'US' }), ['백 투 더 퓨처']);
assert.deepStrictEqual(titles('조선시대', { genre: '호러' }), ['킹덤']);
assert.deepStrictEqual(titles('없는작품'), []);
// id 중복과 홈 큐레이션 id 오타 방지
const ids = run("works.map((w) => w.id)");
assert.strictEqual(new Set(ids).size, ids.length, 'id 중복');
for (const id of run("homePicks")) assert.ok(ids.includes(id), `homePicks에 없는 id: ${id}`);

console.log('search tests passed');
