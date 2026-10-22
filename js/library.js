// 사용자 기록: { [workId]: { status: 'want' | 'watched', savedAt: 'YYYY-MM-DD' } } — 작품 데이터와 분리해 id로 연결한다
// localStorage는 이 브라우저에만 저장되고, 막혀 있으면(사생활 보호 모드 등) 이번 방문 동안만 유지된다
const LIBRARY_KEY = 'scene-side-library';
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

// 보관하기 ↔ 저장 취소
function toggleSaved(id) {
  if (library[id]) delete library[id];
  else library[id] = { status: 'want', savedAt: today() };
  saveLibrary();
}

// 봤어요 ↔ 보고 싶은 작품으로 되돌리기 (보관하지 않은 작품도 봤어요를 누르면 보관함에 들어간다)
function toggleWatched(id) {
  const entry = library[id];
  if (entry?.status === 'watched') entry.status = 'want';
  else library[id] = { savedAt: today(), ...entry, status: 'watched' };
  saveLibrary();
}
