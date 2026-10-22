const state = { query: '', filters: { country: '', genre: '', period: '', theme: '' }, archiveFilter: 'all', lastHash: null };

const exploreInput = document.getElementById('explore-search');
const resultList = document.getElementById('explore-results');
const resultCount = document.getElementById('result-count');
const emptyState = document.getElementById('explore-empty');
const filterSelects = document.querySelectorAll('[data-filter]');

const findWork = (id) => works.find((work) => work.id === id);

// ---------- TMDB 포스터·줄거리 (API를 못 쓰면 null을 돌려주고 제목 플레이스홀더를 유지) ----------
const tmdbCache = new Map();

function getTmdb(work) {
  if (!tmdbCache.has(work.id)) {
    const params = new URLSearchParams({ type: work.media, query: work.title, year: work.year });
    tmdbCache.set(work.id, fetch(`/api/tmdb?${params}`)
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null));
  }
  return tmdbCache.get(work.id);
}

function fillPosters(container) {
  container.querySelectorAll('[data-poster]').forEach((poster) => {
    getTmdb(findWork(poster.dataset.poster)).then((info) => {
      if (!info?.posterUrl || poster.querySelector('img')) return;
      const img = document.createElement('img');
      img.src = info.posterUrl;
      img.alt = ''; // 제목이 글자로 함께 있어서 중복 낭독을 막는다
      img.loading = 'lazy';
      poster.append(img);
    });
  });
}

// ---------- 화면 그리기 ----------
function posterCard(work, extra = '') {
  return `
    <li>
      <a class="poster-card" href="#/work/${work.id}">
        <div class="poster" data-poster="${work.id}"><span class="poster-fallback">${work.title}</span></div>
        <h3 class="poster-title">${work.title}</h3>
        <p class="poster-meta">${work.year} · ${COUNTRY_LABELS[work.country]} · ${TYPE_LABELS[work.type]}</p>
      </a>
      ${extra}
    </li>`;
}

function renderHome() {
  const list = document.getElementById('home-picks');
  list.innerHTML = homePicks.map((id) => posterCard(findWork(id))).join('');
  fillPosters(list);
}

function renderExplore() {
  const results = filterWorks(works, state.query, state.filters);
  const active = [state.query && `'${state.query}'`, ...[...filterSelects]
    .filter((select) => select.value)
    .map((select) => `${select.dataset.label}: ${select.selectedOptions[0].textContent}`)]
    .filter(Boolean);

  resultCount.textContent = `${active.length ? `${active.join(' · ')} — ` : ''}${results.length}편`;
  resultList.innerHTML = results.map((work) => posterCard(work)).join('');
  emptyState.hidden = results.length > 0;
  fillPosters(resultList);
}

const STATUS_LABELS = { want: '보고 싶은 작품', watched: '본 작품' };

function renderDetail(id) {
  const container = document.getElementById('detail-content');
  const work = findWork(id);
  if (!work) {
    container.innerHTML = '<p class="empty-state">작품을 찾을 수 없어요. <a href="#/explore">탐색으로 가기</a></p>';
    return;
  }
  const entry = library[id];
  const tags = [...work.genres, ...work.periods, ...work.themes];

  container.innerHTML = `
    <div class="detail-hero">
      <div class="poster" data-poster="${id}"><span class="poster-fallback">${work.title}</span></div>
      <div class="detail-info">
        ${entry ? `<span class="archive-badge">보관됨 · ${STATUS_LABELS[entry.status]}</span>` : ''}
        <h1 class="page-title" tabindex="-1">${work.title}</h1>
        <p class="poster-meta">${work.year} · ${COUNTRY_LABELS[work.country]} · ${TYPE_LABELS[work.type]}</p>
        <div class="detail-actions">
          <button type="button" class="${entry ? 'button-secondary' : 'button-primary'}" data-action="save" data-id="${id}">
            ${entry ? '저장 취소' : '보관하기'}
          </button>
          <button type="button" class="button-secondary" data-action="watched" data-id="${id}">
            ${entry?.status === 'watched' ? '봤어요 취소' : '봤어요'}
          </button>
        </div>
      </div>
    </div>
    <section class="detail-section">
      <h2 class="section-title">소개</h2>
      <p class="detail-text">${work.synopsis}</p>
    </section>
    <section class="detail-section" id="detail-overview" hidden>
      <h2 class="section-title">줄거리 <span class="poster-meta">TMDB 제공</span></h2>
      <p class="detail-text"></p>
    </section>
    <section class="detail-section">
      <h2 class="section-title">태그</h2>
      <ul class="topic-list">
        ${tags.map((tag) => `<li><a class="topic-chip" href="#/explore?q=${encodeURIComponent(tag)}">${tag}</a></li>`).join('')}
      </ul>
    </section>`;

  fillPosters(container);
  getTmdb(work).then((info) => {
    const overview = container.querySelector('#detail-overview');
    if (!info?.overview || !overview) return;
    overview.querySelector('p').textContent = info.overview; // 외부 데이터라 textContent로 넣는다
    overview.hidden = false;
  });
}

function renderArchive() {
  // 데이터에서 빠진 작품의 기록은 건너뛴다
  const entries = Object.entries(library)
    .filter(([id]) => findWork(id))
    .sort(([, a], [, b]) => b.savedAt.localeCompare(a.savedAt));
  const counts = { all: entries.length, want: 0, watched: 0 };
  entries.forEach(([, entry]) => { counts[entry.status] += 1; });

  document.querySelectorAll('[data-archive-filter]').forEach((tab) => {
    const key = tab.dataset.archiveFilter;
    tab.setAttribute('aria-pressed', String(key === state.archiveFilter));
    tab.querySelector('.archive-count').textContent = counts[key];
  });

  const visible = entries.filter(([, entry]) => state.archiveFilter === 'all' || entry.status === state.archiveFilter);
  const list = document.getElementById('archive-list');
  list.innerHTML = visible.map(([id, entry]) => posterCard(findWork(id), `
    <span class="archive-badge">${STATUS_LABELS[entry.status]}</span>
    <div class="archive-actions">
      <button type="button" class="text-button" data-action="watched" data-id="${id}">${entry.status === 'watched' ? '안 봤어요' : '봤어요'}</button>
      <button type="button" class="text-button" data-action="save" data-id="${id}">저장 취소</button>
    </div>`)).join('');
  fillPosters(list);

  document.getElementById('archive-empty').hidden = entries.length > 0;
  document.getElementById('archive-filter-empty').hidden = entries.length === 0 || visible.length > 0;
}

function fillFilterOptions() {
  const unique = (pick) => [...new Set(works.flatMap(pick))].sort((a, b) => a.localeCompare(b, 'ko'));
  const options = {
    country: unique((work) => [work.country]).map((code) => [code, COUNTRY_LABELS[code]]),
    genre: unique((work) => work.genres).map((value) => [value, value]),
    period: unique((work) => work.periods).map((value) => [value, value]),
    theme: unique((work) => work.themes).map((value) => [value, value]),
  };
  filterSelects.forEach((select) => {
    select.insertAdjacentHTML('beforeend', options[select.dataset.filter]
      .map(([value, label]) => `<option value="${value}">${label}</option>`).join(''));
  });
}

function resetExplore(query = '') {
  state.query = query;
  exploreInput.value = query;
  filterSelects.forEach((select) => {
    select.value = '';
    state.filters[select.dataset.filter] = '';
  });
}

// ---------- 해시 라우팅: #/ · #/explore?q=검색어 · #/work/작품id · #/archive ----------
function parseRoute() {
  const [path, queryString = ''] = location.hash.slice(1).split('?');
  if (path === '/explore') return { view: 'explore', queryString };
  if (path === '/archive') return { view: 'archive' };
  if (path.startsWith('/work/')) return { view: 'detail', id: path.slice('/work/'.length) };
  return { view: 'home' };
}

function renderCurrent() {
  const { view, id } = parseRoute();
  if (view === 'explore') renderExplore();
  if (view === 'archive') renderArchive();
  if (view === 'detail') renderDetail(id);
}

function route() {
  const { view, queryString } = parseRoute();

  document.querySelectorAll('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
  // 상세는 하단 탭이 아니므로 어떤 메뉴도 선택하지 않는다
  document.querySelectorAll('.bottom-nav-item').forEach((item) => {
    const isCurrent = item.dataset.nav === view;
    item.classList.toggle('is-active', isCurrent);
    if (isCurrent) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  });

  if (view === 'explore') {
    const query = new URLSearchParams(queryString).get('q');
    // 주제·홈 검색으로 들어오면 새 탐색으로 시작하고, 메뉴로 들어오면 이전 조건을 유지한다
    if (query !== null) resetExplore(query);
  }
  renderCurrent();
  window.scrollTo(0, 0);
}

// ---------- 이벤트 ----------
document.getElementById('home-search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  location.hash = `#/explore?q=${encodeURIComponent(document.getElementById('home-search').value.trim())}`;
});

document.getElementById('explore-search-form').addEventListener('submit', (event) => event.preventDefault());

exploreInput.addEventListener('input', () => {
  state.query = exploreInput.value;
  renderExplore();
});

filterSelects.forEach((select) => {
  select.addEventListener('change', () => {
    state.filters[select.dataset.filter] = select.value;
    renderExplore();
  });
});

document.getElementById('reset-filters').addEventListener('click', () => {
  resetExplore();
  renderExplore();
});

document.querySelectorAll('[data-archive-filter]').forEach((tab) => {
  tab.addEventListener('click', () => {
    state.archiveFilter = tab.dataset.archiveFilter;
    renderArchive();
  });
});

// 보관하기·봤어요 버튼 (상세·보관함 공통)
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === 'save') toggleSaved(id);
  if (action === 'watched') toggleWatched(id);
  renderCurrent();
  // 다시 그리면 포커스가 사라지므로 같은 버튼(없으면 화면 제목)으로 되돌린다
  (document.querySelector(`[data-action="${action}"][data-id="${id}"]`) || document.querySelector('[data-view]:not([hidden]) h1'))?.focus();
});

// 상세에서 뒤로: 앱 안에서 왔으면 이전 화면, 주소로 바로 들어왔으면 탐색으로
document.getElementById('detail-back').addEventListener('click', () => {
  if (state.lastHash !== null) history.back();
  else location.hash = '#/explore';
});

window.addEventListener('hashchange', (event) => {
  state.lastHash = new URL(event.oldURL).hash;
  route();
});

fillFilterOptions();
renderHome();
route();
