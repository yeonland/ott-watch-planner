// OTT 구독: 사용자가 직접 입력한 서비스·월 결제액·매달 결제일만 저장한다 (계정 연결·해지 기능 없음)
// shortcut: 월 결제만 지원한다, 연간 결제가 필요해지면 결제 주기 필드를 추가한다
const OTT_SERVICES = ['넷플릭스', '티빙', '웨이브', '디즈니+', '쿠팡플레이', '왓챠', '애플TV+', '유튜브 프리미엄', '기타'];
const SUBSCRIPTIONS_KEY = 'scene-side-subscriptions';
let subscriptions = loadSubscriptions();

function isValidSubscription(item) {
  return Boolean(item) && OTT_SERVICES.includes(item.name)
    && Number.isInteger(item.price) && item.price >= 0 && item.price <= 1000000
    && Number.isInteger(item.billingDay) && item.billingDay >= 1 && item.billingDay <= 31;
}

function loadSubscriptions() {
  try {
    const saved = JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY));
    return Array.isArray(saved) ? saved.filter(isValidSubscription) : [];
  } catch {
    return [];
  }
}

function saveSubscriptions() {
  try {
    localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
  } catch {
    // 저장이 막힌 환경: 이번 방문 동안만 유지된다
  }
}

// 잘못된 값이면 저장하지 않고 false를 돌려준다
function addSubscription(name, price, billingDay) {
  const item = { id: `ott-${Date.now()}-${subscriptions.length}`, name, price, billingDay };
  if (!isValidSubscription(item)) return false;
  subscriptions.push(item);
  saveSubscriptions();
  return true;
}

function removeSubscription(id) {
  subscriptions = subscriptions.filter((item) => item.id !== id);
  saveSubscriptions();
}

function monthlyTotal(list) {
  return list.reduce((sum, item) => sum + item.price, 0);
}

// 오늘(포함) 이후 가장 가까운 결제일. 결제일이 그 달에 없으면(예: 2월 31일) 그 달 마지막 날로 본다
function nextBillingDate(billingDay, todayText) {
  const [year, month, day] = todayText.split('-').map(Number);
  const dayIn = (y, m) => Math.min(billingDay, new Date(y, m, 0).getDate()); // m은 1~12, new Date(y, m, 0)은 m월 마지막 날
  let [y, m] = [year, month];
  if (dayIn(y, m) < day) [y, m] = m === 12 ? [y + 1, 1] : [y, m + 1];
  return `${y}-${String(m).padStart(2, '0')}-${String(dayIn(y, m)).padStart(2, '0')}`;
}

function nextPayment(list, todayText) {
  return list
    .map((item) => ({ ...item, date: nextBillingDate(item.billingDay, todayText) }))
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}
