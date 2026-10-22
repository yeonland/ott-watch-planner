const state = { query: '', filters: { country: '', genre: '', period: '', theme: '' } };

const exploreInput = document.getElementById('explore-search');
const resultList = document.getElementById('explore-results');
const resultCount = document.getElementById('result-count');
const emptyState = document.getElementById('explore-empty');
const filterSelects = document.querySelectorAll('[data-filter]');

// ---------- TMDB 포스터 (API를 못 쓰면 null을 돌려주고 제목 플레이스홀더를 유지) ----------
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
    const work = works.find((item) => item.id === poster.dataset.poster);
    getTmdb(work).then((info) => {
      if (!info?.posterUrl || poster.querySelector('img')) return;
      const img = document.createElement('img');
      img.src = info.posterUrl;
      img.alt = ''; // 제목이 바로 아래 글자로 있어서 중복 낭독을 막는다
      img.loading = 'lazy';
      poster.append(img);
    });
  });
}

// ---------- 화면 그리기 ----------
function posterCard(work) {
  return `
    <li>
      <a class="poster-card" href="#/work/${work.id}">
        <div class="poster" data-poster="${work.id}"><span class="poster-fallback">${work.title}</span></div>
        <h3 class="poster-title">${work.title}</h3>
        <p class="poster-meta">${work.year} · ${COUNTRY_LABELS[work.country]} · ${TYPE_LABELS[work.type]}</p>
      </a>
    </li>`;
}

function renderHome() {
  const list = document.getElementById('home-picks');
  list.innerHTML = homePicks.map((id) => posterCard(works.find((work) => work.id === id))).join('');
  fillPosters(list);
}

function renderExplore() {
  const results = filterWorks(works, state.query, state.filters);
  const active = [state.query && `'${state.query}'`, ...[...filterSelects]
    .filter((select) => select.value)
    .map((select) => `${select.dataset.label}: ${select.selectedOptions[0].textContent}`)]
    .filter(Boolean);

  resultCount.textContent = `${active.length ? `${active.join(' · ')} — ` : ''}${results.length}편`;
  resultList.innerHTML = results.map(posterCard).join('');
  emptyState.hidden = results.length > 0;
  fillPosters(resultList);
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

// ---------- 해시 라우팅: #/ · #/explore?q=검색어 ----------
function route() {
  const [path, queryString] = location.hash.slice(1).split('?');
  const view = path === '/explore' ? 'explore' : 'home';

  document.querySelectorAll('[data-view]').forEach((section) => {
    section.hidden = section.dataset.view !== view;
  });
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
    renderExplore();
  }
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

window.addEventListener('hashchange', route);

fillFilterOptions();
renderHome();
route();
