const state = { query: '', filters: { country: '', genre: '', period: '', theme: '' }, archiveFilter: 'all', lastHash: null, collectionIndex: 0 };

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
// 포스터 위 찜(보관) 버튼: 링크 안에 버튼을 넣을 수 없어 li 안에서 포스터 위로 겹쳐 둔다
function saveToggle(work) {
  const saved = Boolean(library[work.id]);
  return `
    <button type="button" class="save-toggle" data-action="save" data-id="${work.id}"
      aria-pressed="${saved}" aria-label="${work.title} 보관하기">
      <i class="${saved ? 'fas' : 'far'} fa-bookmark" aria-hidden="true"></i>
    </button>`;
}

function posterCard(work) {
  return `
    <li class="poster-item">
      ${saveToggle(work)}
      <a class="poster-card" href="#/work/${work.id}">
        <div class="poster" data-poster="${work.id}"><span class="poster-fallback">${work.title}</span></div>
        <h3 class="poster-title">${work.title}</h3>
        <p class="poster-meta">${work.year} · ${COUNTRY_LABELS[work.country]} · ${TYPE_LABELS[work.type]}</p>
      </a>
    </li>`;
}

// 오늘의 작품: 날짜마다 카탈로그를 한 편씩 돌아가며 소개한다 (같은 날에는 누구에게나 같은 작품)
function todayPick() {
  const dayNumber = Math.floor(Date.parse(today()) / 86400000);
  return works[dayNumber % works.length];
}

function renderHome() {
  const work = todayPick();
  const pick = document.getElementById('today-pick');
  pick.innerHTML = `
    <div class="poster-item today-pick-poster">
      ${saveToggle(work)}
      <a href="#/work/${work.id}" tabindex="-1" aria-hidden="true">
        <div class="poster" data-poster="${work.id}"><span class="poster-fallback">${work.title}</span></div>
      </a>
    </div>
    <div>
      <h3 class="today-pick-title"><a href="#/work/${work.id}">${work.title}</a></h3>
      <p class="poster-meta">${work.year} · ${COUNTRY_LABELS[work.country]} · ${TYPE_LABELS[work.type]}</p>
      <p class="today-pick-text">${work.synopsis}</p>
    </div>`;
  fillPosters(pick);

  renderCollection();
}

// 기획전: 화살표로 하나씩 넘긴다 (끝에서 넘기면 처음으로)
function renderCollection() {
  const collection = collections[state.collectionIndex];
  const position = `${state.collectionIndex + 1} / ${collections.length}`;
  document.getElementById('collection-title').textContent = collection.title;
  document.getElementById('collection-text').textContent = collection.description;
  document.getElementById('collection-index').textContent = position;
  const list = document.getElementById('collection-works');
  list.innerHTML = collection.workIds.map((id) => posterCard(findWork(id))).join('');
  list.scrollLeft = 0;
  fillPosters(list);
}

function moveCollection(step) {
  state.collectionIndex = (state.collectionIndex + step + collections.length) % collections.length;
  renderCollection();
  // 화면 읽기 프로그램에 바뀐 기획전을 알린다
  const collection = collections[state.collectionIndex];
  document.getElementById('collection-live').textContent = `기획전 ${state.collectionIndex + 1} / ${collections.length}: ${collection.title}`;
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

const STATUS_LABELS = { want: '보고 싶어요', watching: '시청 중', watched: '감상 완료' };

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
          <!-- 토글 버튼: 읽어 주는 이름은 고정하고 눌림 여부는 aria-pressed로 알린다 -->
          <button type="button" class="${entry ? 'button-archive' : 'button-primary'}" data-action="save" data-id="${id}"
            aria-pressed="${Boolean(entry)}" aria-label="보관하기" title="${entry ? '다시 누르면 보관을 취소해요' : '보관함에 담아요'}">
            <i class="${entry ? 'fas' : 'far'} fa-bookmark" aria-hidden="true"></i> ${entry ? '보관됨' : '보관하기'}
          </button>
        </div>
        <div class="status-group" role="group" aria-label="감상 상태">
          ${STATUSES.map((status) => `
            <button type="button" class="status-button" data-action="status" data-status="${status}" data-id="${id}"
              aria-pressed="${entry?.status === status}">${STATUS_LABELS[status]}</button>`).join('')}
        </div>
        ${entry?.status === 'watched' ? `
          <div class="rating-group" role="group" aria-label="별점">
            ${[1, 2, 3, 4, 5].map((score) => `
              <button type="button" class="rating-star" data-action="rating" data-rating="${score}" data-id="${id}"
                aria-pressed="${entry.rating === score}" aria-label="${score}점">
                <i class="${score <= (entry.rating || 0) ? 'fas' : 'far'} fa-star" aria-hidden="true"></i>
              </button>`).join('')}
            <span class="poster-meta">${entry.rating ? `${entry.rating}점` : '별점을 남겨 보세요'}</span>
          </div>` : ''}
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

// 보관함 전용 카드: 포스터를 필름 한 컷처럼 감싼다 (탐색 결과에는 쓰지 않는다)
function filmFrame(work, entry, frameNumber) {
  return `
    <li class="film-frame">
      <a class="poster-card" href="#/work/${work.id}">
        <div class="film-strip">
          <div class="poster" data-poster="${work.id}"><span class="poster-fallback">${work.title}</span></div>
          <span class="frame-number" aria-hidden="true">FRAME ${frameNumber}</span>
        </div>
        <h3 class="poster-title">${work.title}</h3>
        <p class="poster-meta">${work.year} · ${COUNTRY_LABELS[work.country]} · ${TYPE_LABELS[work.type]}</p>
      </a>
      <span class="archive-badge">${STATUS_LABELS[entry.status]}</span>
      <div class="archive-actions">
        <label class="visually-hidden" for="status-${work.id}">${work.title} 감상 상태</label>
        <select id="status-${work.id}" class="status-select" data-status-for="${work.id}">
          ${STATUSES.map((status) => `<option value="${status}"${status === entry.status ? ' selected' : ''}>${STATUS_LABELS[status]}</option>`).join('')}
        </select>
        <button type="button" class="text-button" data-action="save" data-id="${work.id}">보관 취소</button>
      </div>
    </li>`;
}

function renderArchive() {
  // 데이터에서 빠진 작품의 기록은 건너뛴다
  // savedAt은 날짜까지만 있어서, 같은 날은 나중에 보관한 것(객체에 뒤에 추가된 키)이 앞에 오도록 뒤집은 뒤 안정 정렬한다
  const entries = Object.entries(library)
    .reverse()
    .filter(([id, entry]) => findWork(id) && STATUSES.includes(entry.status))
    .sort(([, a], [, b]) => b.savedAt.localeCompare(a.savedAt));
  const counts = { all: entries.length, want: 0, watching: 0, watched: 0 };
  entries.forEach(([, entry]) => { counts[entry.status] += 1; });

  document.querySelectorAll('[data-archive-filter]').forEach((tab) => {
    const key = tab.dataset.archiveFilter;
    tab.setAttribute('aria-pressed', String(key === state.archiveFilter));
    tab.querySelector('.archive-count').textContent = counts[key];
  });

  // 프레임 번호는 보관한 순서(가장 먼저 보관한 작품이 001)라 분류 탭을 바꿔도 같은 번호가 유지된다
  const frameNumbers = new Map(entries.map(([id], index) => [id, String(entries.length - index).padStart(3, '0')]));
  const visible = entries.filter(([, entry]) => state.archiveFilter === 'all' || entry.status === state.archiveFilter);
  const list = document.getElementById('archive-list');
  list.innerHTML = visible.map(([id, entry]) => filmFrame(findWork(id), entry, frameNumbers.get(id))).join('');
  fillPosters(list);

  document.getElementById('archive-empty').hidden = entries.length > 0;
  document.getElementById('archive-filter-empty').hidden = entries.length === 0 || visible.length > 0;
}

const formatWon = (value) => `${value.toLocaleString('ko-KR')}원`;

function monthLabel(month) {
  const [year, monthNumber] = month.split('-');
  return `${year}년 ${Number(monthNumber)}월`;
}

function renderMy() {
  const month = today().slice(0, 7);
  const stats = monthlyStats(month, works);
  document.getElementById('stats-month').textContent = monthLabel(month);
  document.getElementById('stats-watched').textContent = stats.watched;
  document.getElementById('stats-rating').textContent = stats.averageRating ?? '-';
  document.getElementById('stats-detail').textContent = [
    `새로 보관 ${stats.saved}편`,
    stats.topGenre && `많이 본 장르 ${stats.topGenre}`,
    stats.topCountry && `많이 본 국가 ${COUNTRY_LABELS[stats.topCountry]}`,
  ].filter(Boolean).join(' · ');
  document.getElementById('stats-empty').hidden = stats.watched > 0;
  document.getElementById('share-report').disabled = stats.watched === 0;
  document.getElementById('share-status').textContent = stats.watched === 0 ? '감상 완료 기록이 생기면 공유할 수 있어요.' : '';
  renderSubscriptions();
  document.getElementById('clear-confirm').hidden = true;
  document.getElementById('clear-library').hidden = false;
}

function renderSubscriptions() {
  const hasAny = subscriptions.length > 0;
  const next = nextPayment(subscriptions, today());
  document.getElementById('ott-total').textContent = hasAny ? formatWon(monthlyTotal(subscriptions)) : '직접 등록 후 표시';
  if (next) {
    const [, month, day] = next.date.split('-').map(Number);
    const daysLeft = Math.round((Date.parse(next.date) - Date.parse(today())) / 86400000);
    document.getElementById('ott-next').textContent = `${month}월 ${day}일 ${next.name} (${daysLeft === 0 ? '오늘' : `D-${daysLeft}`})`;
  } else {
    document.getElementById('ott-next').textContent = '-';
  }
  document.getElementById('ott-empty').hidden = hasAny;
  document.getElementById('ott-list').innerHTML = subscriptions.map((item) => `
    <li class="ott-item">
      <span class="ott-name">${item.name}</span>
      <span class="poster-meta">매달 ${item.billingDay}일 · ${formatWon(item.price)}</span>
      <button type="button" class="text-button" data-action="remove-ott" data-id="${item.id}" aria-label="${item.name} 구독 삭제">삭제</button>
    </li>`).join('');
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
  if (path === '/my') return { view: 'my' };
  if (path.startsWith('/work/')) return { view: 'detail', id: path.slice('/work/'.length) };
  return { view: 'home' };
}

function renderCurrent() {
  const { view, id } = parseRoute();
  if (view === 'home') renderHome();
  if (view === 'explore') renderExplore();
  if (view === 'archive') renderArchive();
  if (view === 'detail') renderDetail(id);
  if (view === 'my') renderMy();
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
  const { action, id, status, rating } = button.dataset;
  if (action === 'save') toggleSaved(id);
  if (action === 'status') setStatus(id, status);
  if (action === 'rating') setRating(id, Number(rating));
  if (action === 'remove-ott') removeSubscription(id);
  renderCurrent();
  // 다시 그리면 포커스가 사라지므로 같은 버튼(없으면 화면 제목)으로 되돌린다
  const sameButton = `[data-action="${action}"][data-id="${id}"]${status ? `[data-status="${status}"]` : ''}${rating ? `[data-rating="${rating}"]` : ''}`;
  (document.querySelector(sameButton) || document.querySelector('[data-view]:not([hidden]) h1'))?.focus();
});

// 보관함 카드의 상태 선택
document.addEventListener('change', (event) => {
  const id = event.target.dataset.statusFor;
  if (!id) return;
  setStatus(id, event.target.value);
  renderArchive();
  document.getElementById(`status-${id}`)?.focus();
});

document.getElementById('collection-prev').addEventListener('click', () => moveCollection(-1));
document.getElementById('collection-next').addEventListener('click', () => moveCollection(1));

// OTT 등록: 입력값을 검사해 잘못되면 저장하지 않고 이유를 알린다
const ottForm = document.getElementById('ott-form');
ottForm.service.innerHTML = OTT_SERVICES.map((name) => `<option value="${name}">${name}</option>`).join('');
ottForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const error = document.getElementById('ott-error');
  const price = Number(ottForm.price.value);
  const day = Number(ottForm.day.value);
  const message = ottForm.price.value === '' || !Number.isInteger(price) || price < 0 || price > 1000000
    ? '월 결제액을 0~1,000,000원 사이의 정수로 입력해 주세요.'
    : ottForm.day.value === '' || !Number.isInteger(day) || day < 1 || day > 31
      ? '결제일을 1~31 사이로 입력해 주세요.'
      : '';
  error.textContent = message;
  error.hidden = !message;
  if (message || !addSubscription(ottForm.service.value, price, day)) return;
  ottForm.reset();
  renderSubscriptions();
  ottForm.service.focus();
});

// 월간 리포트 공유: 숫자 요약만 공유하고 작품 제목·구독 정보는 넣지 않는다
document.getElementById('share-report').addEventListener('click', async () => {
  const month = today().slice(0, 7);
  const stats = monthlyStats(month, works);
  const text = [`SCENE SIDE ${monthLabel(month)} 리포트`, `감상 완료 ${stats.watched}편`,
    stats.averageRating && `평균 별점 ${stats.averageRating}`, stats.topGenre && `많이 본 장르 ${stats.topGenre}`]
    .filter(Boolean).join(' · ');
  const status = document.getElementById('share-status');
  try {
    if (navigator.share) {
      await navigator.share({ title: 'SCENE SIDE 월간 리포트', text });
      status.textContent = '공유했어요.';
    } else {
      await navigator.clipboard.writeText(text);
      status.textContent = '리포트 문구를 복사했어요. 원하는 곳에 붙여 넣으세요.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') status.textContent = `공유할 수 없는 환경이에요. 이 문구를 직접 복사해 주세요: ${text}`;
  }
});

// 보관함 비우기: 되돌릴 수 없어서 한 번 더 확인한다
document.getElementById('clear-library').addEventListener('click', () => {
  document.getElementById('clear-library').hidden = true;
  document.getElementById('clear-confirm').hidden = false;
  document.getElementById('clear-done').hidden = true;
  document.getElementById('clear-cancel').focus();
});
document.getElementById('clear-cancel').addEventListener('click', () => {
  renderMy();
  document.getElementById('clear-library').focus();
});
document.getElementById('clear-yes').addEventListener('click', () => {
  clearLibrary();
  renderMy();
  document.getElementById('clear-done').hidden = false;
  document.getElementById('clear-library').focus();
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
