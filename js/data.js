// 작품 카탈로그: 실제 작품이며, 시대·소재 태그와 짧은 소개는 SCENE SIDE가 직접 정리했다.
// 포스터·공식 줄거리는 TMDB에서 받아온다 (media: TMDB 검색 구분, movie | tv)
const COUNTRY_LABELS = { KR: '한국', JP: '일본', US: '미국', GB: '영국' };
const TYPE_LABELS = { movie: '영화', drama: '드라마', animation: '애니메이션', series: '영상 시리즈' };

const works = [
  { id: 'work-001', title: '왕의 남자', year: 2005, type: 'movie', media: 'movie', country: 'KR', genres: ['사극', '드라마'], periods: ['조선시대'], themes: ['궁중 문화', '광대·놀이패'], synopsis: '연산군 시대, 왕을 풍자하던 광대들이 궁으로 불려 들어가며 벌어지는 이야기.' },
  { id: 'work-002', title: '광해, 왕이 된 남자', year: 2012, type: 'movie', media: 'movie', country: 'KR', genres: ['사극', '드라마'], periods: ['조선시대'], themes: ['궁중 문화', '신분 바꾸기'], synopsis: '광해군의 대역으로 궁에 들어간 천민 하선이 왕의 자리를 대신하는 이야기.' },
  { id: 'work-003', title: '사도', year: 2015, type: 'movie', media: 'movie', country: 'KR', genres: ['사극', '드라마'], periods: ['조선시대'], themes: ['궁중 문화', '가족'], synopsis: '영조와 사도세자, 비극으로 끝난 아버지와 아들의 이야기.' },
  { id: 'work-004', title: '관상', year: 2013, type: 'movie', media: 'movie', country: 'KR', genres: ['사극', '드라마'], periods: ['조선시대'], themes: ['관상·점술', '권력 다툼'], synopsis: '얼굴만 보고 사람을 읽는 관상가가 왕위를 둘러싼 권력 다툼에 휘말린다.' },
  { id: 'work-005', title: '킹덤', year: 2019, type: 'drama', media: 'tv', country: 'KR', genres: ['사극', '스릴러', '호러'], periods: ['조선시대'], themes: ['역병', '궁중 문화'], synopsis: '정체 모를 역병이 퍼진 조선, 왕세자가 백성을 지키기 위해 길을 나선다.' },
  { id: 'work-006', title: '미스터 션샤인', year: 2018, type: 'drama', media: 'tv', country: 'KR', genres: ['사극', '로맨스'], periods: ['대한제국'], themes: ['의병', '격변기'], synopsis: '구한말 조선으로 돌아온 미국 해병대 장교와 의병으로 살아가는 사대부 여인의 이야기.' },
  { id: 'work-007', title: '연모', year: 2021, type: 'drama', media: 'tv', country: 'KR', genres: ['사극', '로맨스'], periods: ['조선시대'], themes: ['궁중 문화', '신분 숨기기'], synopsis: '쌍둥이 오라비를 대신해 남장을 하고 세자가 된 여인의 궁중 로맨스.' },
  { id: 'work-008', title: '시간을 달리는 소녀', year: 2006, type: 'animation', media: 'movie', country: 'JP', genres: ['SF', '청춘'], periods: ['현대'], themes: ['시간여행', '여름', '성장'], synopsis: '시간을 되돌리는 능력을 얻은 고등학생의 한여름 이야기.' },
  { id: 'work-009', title: '너의 이름은.', year: 2016, type: 'animation', media: 'movie', country: 'JP', genres: ['로맨스', '판타지'], periods: ['현대'], themes: ['몸 바뀜', '전통 신앙', '시간여행'], synopsis: '도쿄의 소년과 시골 마을의 소녀가 꿈속에서 서로의 몸이 바뀌기 시작한다.' },
  { id: 'work-010', title: '어바웃 타임', year: 2013, type: 'movie', media: 'movie', country: 'GB', genres: ['로맨스', '드라마'], periods: ['현대'], themes: ['시간여행', '가족'], synopsis: '과거로 돌아갈 수 있는 능력을 알게 된 청년이 사랑과 가족의 의미를 배워 간다.' },
  { id: 'work-011', title: '백 투 더 퓨처', year: 1985, type: 'movie', media: 'movie', country: 'US', genres: ['SF', '코미디'], periods: ['1950년대', '1980년대'], themes: ['시간여행'], synopsis: '타임머신 자동차를 타고 30년 전으로 간 고등학생이 부모님의 만남을 지켜야 한다.' },
  { id: 'work-012', title: '인터스텔라', year: 2014, type: 'movie', media: 'movie', country: 'US', genres: ['SF', '드라마'], periods: ['근미래'], themes: ['우주', '가족'], synopsis: '황폐해진 지구를 떠나 인류가 살 곳을 찾아 우주로 나선 탐사대의 이야기.' },
  { id: 'work-013', title: '신과함께-죄와 벌', year: 2017, type: 'movie', media: 'movie', country: 'KR', genres: ['판타지', '드라마'], periods: ['현대'], themes: ['신화·전설', '저승'], synopsis: '죽은 소방관이 저승 차사들과 함께 일곱 번의 재판을 받는다.' },
  { id: 'work-014', title: '센과 치히로의 행방불명', year: 2001, type: 'animation', media: 'movie', country: 'JP', genres: ['판타지', '모험'], periods: ['현대'], themes: ['신화·전설', '성장'], synopsis: '신들의 세계에 들어간 소녀가 부모님을 구하기 위해 온천장에서 일하게 된다.' },
  { id: 'work-015', title: '모아나', year: 2016, type: 'animation', media: 'movie', country: 'US', genres: ['모험', '뮤지컬'], periods: [], themes: ['신화·전설', '바다', '성장'], synopsis: '섬을 구하기 위해 바다로 나선 소녀가 반신반인 마우이를 만난다.' },
  { id: 'work-016', title: '도깨비', year: 2016, type: 'drama', media: 'tv', country: 'KR', genres: ['판타지', '로맨스'], periods: ['현대'], themes: ['신화·전설', '저승'], synopsis: '불멸의 삶을 끝내려는 도깨비와 저승사자, 그리고 도깨비 신부의 이야기.' },
  { id: 'work-017', title: '썸머 워즈', year: 2009, type: 'animation', media: 'movie', country: 'JP', genres: ['SF', '가족'], periods: ['현대'], themes: ['여름', '가족', '가상 세계'], synopsis: '여름방학에 시골 대가족 집을 찾은 소년이 가상 세계의 위기에 휘말린다.' },
  { id: 'work-018', title: '이웃집 토토로', year: 1988, type: 'animation', media: 'movie', country: 'JP', genres: ['판타지', '가족'], periods: ['1950년대'], themes: ['여름', '시골', '요괴'], synopsis: '시골로 이사 온 자매가 숲속의 신비한 존재 토토로를 만난다.' },
  { id: 'work-019', title: '기쿠지로의 여름', year: 1999, type: 'movie', media: 'movie', country: 'JP', genres: ['드라마', '코미디'], periods: ['현대'], themes: ['여름', '여행', '성장'], synopsis: '엄마를 찾아 떠나는 소년과 무뚝뚝한 아저씨의 여름 여행.' },
  { id: 'work-020', title: '바닷마을 다이어리', year: 2015, type: 'movie', media: 'movie', country: 'JP', genres: ['드라마', '가족'], periods: ['현대'], themes: ['가족', '자매'], synopsis: '바닷가 마을에 사는 세 자매가 이복 여동생을 가족으로 맞이한다.' },
  { id: 'work-021', title: '리틀 포레스트', year: 2018, type: 'movie', media: 'movie', country: 'KR', genres: ['드라마'], periods: ['현대'], themes: ['시골', '음식', '성장'], synopsis: '도시 생활에 지친 청년이 고향으로 돌아와 사계절을 보내며 직접 음식을 지어 먹는다.' },
  { id: 'work-022', title: '우리들', year: 2016, type: 'movie', media: 'movie', country: 'KR', genres: ['드라마'], periods: ['현대'], themes: ['성장', '우정'], synopsis: '초등학생 선이 전학생 지아와 친구가 되며 겪는 관계의 기쁨과 상처.' },
  { id: 'work-023', title: '보이후드', year: 2014, type: 'movie', media: 'movie', country: 'US', genres: ['드라마'], periods: ['2000년대'], themes: ['성장', '가족'], synopsis: '한 소년이 여섯 살부터 열여덟 살이 되기까지를 12년에 걸쳐 실제로 촬영했다.' },
  { id: 'work-024', title: '응답하라 1988', year: 2015, type: 'drama', media: 'tv', country: 'KR', genres: ['드라마', '코미디'], periods: ['1980년대'], themes: ['가족', '이웃', '성장'], synopsis: '1988년 서울 쌍문동 골목, 다섯 가족과 친구들의 이야기.' },
  { id: 'work-025', title: '시그널', year: 2016, type: 'drama', media: 'tv', country: 'KR', genres: ['스릴러', '드라마'], periods: ['1980년대', '현대'], themes: ['미제 사건', '과거와의 교신'], synopsis: '과거의 형사와 무전으로 연결된 현재의 프로파일러가 미제 사건을 함께 쫓는다.' },
  { id: 'work-026', title: '귀멸의 칼날', year: 2019, type: 'animation', media: 'tv', country: 'JP', genres: ['액션', '판타지'], periods: ['다이쇼 시대'], themes: ['요괴', '가족'], synopsis: '혈귀가 된 여동생을 사람으로 되돌리기 위해 소년이 귀살대에 들어간다.' },
];

// 홈 기획전: 주제 하나로 묶은 큐레이션
const collections = [
  { id: 'joseon-palace', title: '조선의 궁궐로', description: '왕과 궁중 사람들의 이야기', workIds: ['work-001', 'work-002', 'work-003', 'work-004', 'work-007', 'work-005'] },
  { id: 'time-travel', title: '시간을 건너는 이야기', description: '과거로, 미래로, 다시 오늘로', workIds: ['work-008', 'work-010', 'work-011', 'work-009', 'work-025'] },
  { id: 'japan-summer', title: '일본 애니메이션의 여름', description: '매미 소리가 들리는 여름 방학', workIds: ['work-008', 'work-017', 'work-018', 'work-019'] },
];
