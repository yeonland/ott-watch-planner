// TMDB 키를 브라우저에 노출하지 않으려고 Vercel 서버리스 함수가 대신 호출한다
// shortcut: 제목+연도로 검색해 첫 결과를 쓴다, 다른 작품이 잡히면 data.js에 TMDB id를 넣는 방식으로 바꾼다
module.exports = async (req, res) => {
  const { type, query, year } = req.query;
  if (!['movie', 'tv'].includes(type) || typeof query !== 'string' || !query || query.length > 100 || (year && !/^\d{4}$/.test(year))) {
    return res.status(400).json({ error: 'invalid params' });
  }
  const token = process.env.TMDB_API_KEY;
  if (!token) {
    return res.status(503).json({ error: 'TMDB_API_KEY not set' });
  }

  const params = new URLSearchParams({ query, language: 'ko-KR' });
  if (year) params.set(type === 'movie' ? 'year' : 'first_air_date_year', year);

  try {
    const response = await fetch(`https://api.themoviedb.org/3/search/${type}?${params}`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
    });
    if (!response.ok) {
      return res.status(502).json({ error: `TMDB ${response.status}` });
    }
    const first = (await response.json()).results?.[0];
    // TMDB 호출량을 줄이려고 CDN에 하루 캐시한다
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({
      tmdbId: first?.id ?? null,
      posterUrl: first?.poster_path ? `https://image.tmdb.org/t/p/w342${first.poster_path}` : null,
      overview: first?.overview || null,
    });
  } catch {
    return res.status(502).json({ error: 'TMDB request failed' });
  }
};
