// 사용자 기록: { [workId]: { status, savedAt, watchedAt? } } — 작품 데이터와 분리해 id로 연결한다
// status: want(보고 싶어요) | watching(시청 중) | watched(감상 완료), 날짜는 'YYYY-MM-DD'
// localStorage는 이 브라우저에만 저장되고, 막혀 있으면(사생활 보호 모드 등) 이번 방문 동안만 유지된다
const LIBRARY_KEY = 'scene-side-library';
const STATUSES = ['want', 'watching', 'watched'];
let library = loadLibrary();

function loadLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem(LIBRARY_KEY));
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

function saveLibrary() {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch {
    // 저장이 막힌 환경: 메모리의 기록은 유지되므로 화면은 계속 동작한다
  }
}

// 사용자 기기 기준 날짜 (sv-SE 형식이 YYYY-MM-DD)
function today() {
  return new Date().toLocaleDateString('sv-SE');
}

// 보관하기 ↔ 보관 취소 (책갈피 버튼)
function toggleSaved(id) {
  if (library[id]) delete library[id];
  else library[id] = { status: 'want', savedAt: today() };
  saveLibrary();
}

// 감상 상태 변경 (보관하지 않은 작품이면 그 상태로 보관함에 들어간다)
// watchedAt은 월간 통계용: 감상 완료로 바꾼 날을 기록하고, 다른 상태로 되돌리면 지운다
function setStatus(id, status) {
  if (!STATUSES.includes(status)) return;
  const entry = { savedAt: today(), ...library[id], status };
  if (status !== 'watched') delete entry.watchedAt;
  else if (library[id]?.status !== 'watched') entry.watchedAt = today();
  library[id] = entry;
  saveLibrary();
}

// 별점: 감상 완료한 작품에만 1~5점, 같은 점수를 다시 누르면 지운다
function setRating(id, rating) {
  const entry = library[id];
  if (entry?.status !== 'watched' || !Number.isInteger(rating) || rating < 1 || rating > 5) return;
  if (entry.rating === rating) delete entry.rating;
  else entry.rating = rating;
  saveLibrary();
}

function clearLibrary() {
  library = {};
  saveLibrary();
}

// 월간 통계: 실제로 기록한 값만 센다 (month: 'YYYY-MM')
function monthlyStats(month, catalog) {
  const entries = Object.entries(library);
  const watchedEntries = entries
    .filter(([id, entry]) => entry.status === 'watched' && entry.watchedAt?.startsWith(month) && catalog.some((work) => work.id === id));
  const watched = watchedEntries.map(([id]) => catalog.find((work) => work.id === id));
  const ratings = watchedEntries.map(([, entry]) => entry.rating).filter(Number.isInteger);
  // 가장 많이 나온 값, 같으면 가나다순 첫 번째. 기록이 없으면 null
  const top = (values) => {
    const counts = {};
    values.forEach((value) => { counts[value] = (counts[value] || 0) + 1; });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b, 'ko'))[0] ?? null;
  };
  return {
    watched: watched.length,
    saved: entries.filter(([, entry]) => entry.savedAt?.startsWith(month)).length,
    topGenre: top(watched.flatMap((work) => work.genres)),
    topCountry: top(watched.map((work) => work.country)),
    // 별점을 남긴 작품만 평균 낸다 (소수점 첫째 자리)
    averageRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
  };
}
