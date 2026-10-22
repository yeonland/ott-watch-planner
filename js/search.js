// 검색어를 띄어쓰기로 나눠, 모든 단어가 제목이나 태그 중 하나에 들어 있어야 결과에 포함한다 ("일본 여름" = 일본 작품 중 여름 소재)
function workKeywords(work) {
  return [work.title, COUNTRY_LABELS[work.country], TYPE_LABELS[work.type], ...work.genres, ...work.periods, ...work.themes]
    .map((keyword) => keyword.toLowerCase());
}

function matchesQuery(work, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const keywords = workKeywords(work);
  return words.every((word) => keywords.some((keyword) => keyword.includes(word)));
}

function filterWorks(list, query, filters) {
  return list.filter((work) =>
    matchesQuery(work, query) &&
    (!filters.country || work.country === filters.country) &&
    (!filters.genre || work.genres.includes(filters.genre)) &&
    (!filters.period || work.periods.includes(filters.period)) &&
    (!filters.theme || work.themes.includes(filters.theme)));
}
