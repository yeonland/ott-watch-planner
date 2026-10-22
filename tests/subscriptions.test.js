// 실행: node tests/subscriptions.test.js — 구독 입력 검사, 합계, 다음 결제일 계산을 확인한다
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'subscriptions.js'), 'utf8');
const data = {};
const context = vm.createContext({ localStorage: { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } }, Date });
vm.runInContext(source, context);
// vm 안의 객체는 프로토타입이 달라 JSON으로 꺼내 비교한다
const run = (code) => JSON.parse(vm.runInContext(`JSON.stringify(${code}) ?? "null"`, context));

// 다음 결제일: 오늘 포함, 지났으면 다음 달, 없는 날짜는 그 달 마지막 날
assert.strictEqual(run('nextBillingDate(25, "2026-10-22")'), '2026-10-25');
assert.strictEqual(run('nextBillingDate(22, "2026-10-22")'), '2026-10-22');
assert.strictEqual(run('nextBillingDate(5, "2026-10-22")'), '2026-11-05');
assert.strictEqual(run('nextBillingDate(31, "2026-11-10")'), '2026-11-30');
assert.strictEqual(run('nextBillingDate(31, "2027-01-31")'), '2027-01-31');
assert.strictEqual(run('nextBillingDate(30, "2027-01-31")'), '2027-02-28');
assert.strictEqual(run('nextBillingDate(29, "2028-02-01")'), '2028-02-29', '윤년');
assert.strictEqual(run('nextBillingDate(10, "2026-12-20")'), '2027-01-10', '연도 넘김');

// 입력 검사: 잘못된 값은 저장하지 않는다
assert.strictEqual(run('addSubscription("넷플릭스", 17000, 25)'), true);
assert.strictEqual(run('addSubscription("티빙", 13900, 5)'), true);
for (const bad of ['"없는서비스", 1000, 1', '"웨이브", -1, 1', '"웨이브", 1.5, 1', '"웨이브", 2000000, 1', '"웨이브", 1000, 0', '"웨이브", 1000, 32', '"웨이브", NaN, 1']) {
  assert.strictEqual(run(`addSubscription(${bad})`), false, bad);
}
assert.strictEqual(run('subscriptions.length'), 2);
assert.strictEqual(run('monthlyTotal(subscriptions)'), 30900);
assert.deepStrictEqual(run('[nextPayment(subscriptions, "2026-10-22").name, nextPayment(subscriptions, "2026-10-22").date]'), ['넷플릭스', '2026-10-25']);
assert.strictEqual(run('nextPayment([], "2026-10-22")'), null);

// 새로고침 후 다시 읽고, 손상된 항목은 버린다
data['scene-side-subscriptions'] = JSON.stringify([...JSON.parse(data['scene-side-subscriptions']), { name: '넷플릭스', price: '비쌈', billingDay: 1 }]);
assert.strictEqual(run('loadSubscriptions().length'), 2);
vm.runInContext('removeSubscription(subscriptions[0].id)', context);
assert.deepStrictEqual(run('subscriptions.map((s) => s.name)'), ['티빙']);

console.log('subscriptions tests passed');
