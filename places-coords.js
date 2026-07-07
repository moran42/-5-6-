// 제주 장소 좌표 (위도, 경도)
const PLACE_COORDS = {
  "제주공항 도착": [33.5113, 126.493],
  "제주공항 출발": [33.5113, 126.493],
  "제주OK렌터카": [33.512, 126.522],
  "제주OK렌터카 반납": [33.512, 126.522],
  "아베베 베이커리 제주": [33.5105, 126.5295],
  "제주 뜨리바다": [33.278, 126.715],
  "제주 자매국수": [33.5098, 126.5312],
  "어등포해녀촌": [33.51, 126.524],
  "함덕해수욕장": [33.5434, 126.6682],
  "델문도": [33.543, 126.652],
  "만춘서점": [33.5435, 126.661],
  "통일가든": [33.538, 126.645],
  "글로시말차": [33.536, 126.64],
  "관곶": [33.534, 126.638],
  "로미뮤직하우스": [33.535, 126.635],
  "풍림다방 커피로스터즈 송당": [33.432, 126.78],
  "세기알해변": [33.523, 126.84],
  "몰마농 그대와함께 해물라면 성산본점": [33.458, 126.928],
  "회심": [33.495, 126.532],
  "바라나시책골목": [33.537, 126.647],
  "5L2F": [33.412, 126.268],
  "시타북바 세화해변": [33.516, 126.86],
  "복자씨연탄구이": [33.46, 126.92],
  "판포포구": [33.305, 126.239],
  "코삿호다": [33.306, 126.241],
  "우무": [33.39, 126.262],
  "KT한림빌딩": [33.412, 126.265],
  "행원해변": [33.52, 126.87],
  "구씨커피로스터스": [33.518, 126.855],
  "미노아": [33.5, 126.85],
  "미영이네": [33.228, 126.253],
  "와토커피": [33.225, 126.255],
  "번네식당": [33.265, 126.315],
  "서귀포매일올레시장": [33.25, 126.562],
  "빈티지농장": [33.254, 126.512],
  "앙프르": [33.251, 126.558],
  "숙성도 제주본점": [33.505, 126.52],
  "오병장 본점": [33.492, 126.545],
  "매우릉쭈꾸미": [33.542, 126.664],
  "그옛맛": [33.493, 126.528],
  "도두슈퍼마켓": [33.502, 126.472],
  "동복리 해녀촌": [33.525, 126.855],
  "몽탄 제주점": [33.505, 126.53],
  "월정리 호랑이네": [33.556, 126.795],
  "해맞이쉼터": [33.458, 126.935],
  "목장카페 밭디": [33.455, 126.925],
  "충희요리": [33.252, 126.56],
  "섭지코지": [33.424, 126.928],
  "성산일출봉": [33.458, 126.942],
  "샤이니숲길": [33.445, 126.718],
  "길갈팜랜드": [33.298, 126.218],
  "제주목장랜드": [33.315, 126.245],
  "서우봉": [33.247, 126.559],
  "돌문화공원": [33.239, 126.691],
  "오늘도일기": [33.249, 126.561],
  "수영 후 정리": [33.4, 126.55],
};

const CATEGORY_GROUPS = {
  food: { label: "먹거리", color: "#e07b2d", types: ["먹거리"] },
  dessert: { label: "디저트·카페", color: "#a855f7", types: ["디저트", "카페"] },
  play: { label: "놀거리", color: "#3b82f6", types: ["놀거리"] },
  swim: { label: "수영", color: "#1a7fc4", types: ["수영"] },
  infra: { label: "숙소·이동", color: "#6b7280", types: ["숙소", "렌트카", "이동"] },
};

const DAY_ROUTE_COLORS = [
  "#0d8f7a", "#e07b2d", "#3b82f6", "#a855f7", "#1a7fc4", "#8b5cf6",
];

function getCategoryId(type) {
  for (const [id, g] of Object.entries(CATEGORY_GROUPS)) {
    if (g.types.includes(type)) return id;
  }
  return "play";
}

function getCoords(name) {
  if (PLACE_COORDS[name]) return PLACE_COORDS[name];
  const key = Object.keys(PLACE_COORDS).find(
    (k) => name.includes(k) || k.includes(name)
  );
  return key ? PLACE_COORDS[key] : null;
}

function getKakaoPlaceType(name) {
  const typeMap = {
    회심: "먹거리",
    오병장: "먹거리",
    번네식당: "먹거리",
    매우릉쭈꾸미: "먹거리",
    통일가든: "먹거리",
    그옛맛: "먹거리",

    글로시말차: "디저트",
    코삿호다: "디저트",
    우무: "디저트",

    와토커피: "카페",
    델문도: "카페",
    구씨커피로스터스: "카페",
    "5L2F": "카페",
    로미뮤직하우스: "카페",

    관곶: "놀거리",
    바라나시책골목: "놀거리",
    만춘서점: "놀거리",
    섭지코지: "놀거리",
    성산일출봉: "놀거리",
    샤이니숲길: "놀거리",
    길갈팜랜드: "놀거리",
    제주목장랜드: "놀거리",
    서우봉: "놀거리",
    돌문화공원: "놀거리",

    행원해변: "수영",
    판포포구: "수영",
  };
  if (typeMap[name]) return typeMap[name];
  const key = Object.keys(typeMap).find(
    (k) => name.includes(k) || k.includes(name)
  );
  return key ? typeMap[key] : "놀거리";
}

function buildAllPlaces() {
  const seen = new Set();
  const places = [];

  function add(place) {
    const coords = getCoords(place.name);
    if (!coords || seen.has(place.name)) return;
    seen.add(place.name);
    places.push({
      ...place,
      lat: coords[0],
      lng: coords[1],
      category: getCategoryId(place.type),
    });
  }

  DAYS.forEach((day) => {
    day.stops.forEach((stop) => {
      if (stop.name === "수영 후 정리") return;
      add({
        name: stop.name,
        type: stop.type,
        address: stop.address,
        dayId: day.id,
        dayLabel: day.date,
        time: stop.time,
        mapUrl: stop.mapUrl,
        highlight: stop.highlight,
        inRoute: true,
      });
    });
  });

  const kakaoList =
    typeof getKakaoPlacesList === "function"
      ? getKakaoPlacesList()
      : KAKAO_JEJU_PLACES;

  kakaoList.forEach((p) => {
    add({
      name: p.name,
      type: getKakaoPlaceType(p.name),
      address: p.area,
      dayId: null,
      inRoute: false,
      source: "kakao",
    });
  });

  const naverList =
    typeof getNaverPlacesList === "function"
      ? getNaverPlacesList()
      : NAVER_SAVED_PLACES;

  naverList
    .filter((place) => !isPlaceScheduled(place.name))
    .forEach((place) => {
      const type =
        place.folder === "디저트"
          ? "디저트"
          : place.folder === "놀거리"
            ? "놀거리"
            : "먹거리";
      add({
        name: place.name,
        type,
        address: "제주",
        dayId: null,
        inRoute: false,
        source: "naver",
      });
    });

  return places;
}

let ALL_PLACES = buildAllPlaces();

function refreshAllPlaces() {
  ALL_PLACES = buildAllPlaces();
  return ALL_PLACES;
}
