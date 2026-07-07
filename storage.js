const TripStorage = (function () {
  let kakaoPlaces = null;
  let naverPlaces = null;

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function isValidDays(days) {
    if (!Array.isArray(days) || !days.length) return false;
    return days.every(
      (day) =>
        day &&
        typeof day.id === "string" &&
        Array.isArray(day.stops) &&
        day.stops.length > 0
    );
  }

  function mergePlaceList(existing, incoming, keyField) {
    const seen = new Set();
    const merged = [];
    function add(place) {
      const name = place[keyField];
      if (!name || seen.has(name)) return;
      seen.add(name);
      merged.push(place);
    }
    existing.forEach(add);
    incoming.forEach(add);
    return merged;
  }

  function applyRemote(data) {
    if (!data || typeof data !== "object") return false;
    if (data.days) {
      if (!isValidDays(data.days)) return false;
      DAYS = data.days;
    }
    if (Array.isArray(data.kakaoPlaces)) kakaoPlaces = data.kakaoPlaces;
    if (Array.isArray(data.naverPlaces)) naverPlaces = data.naverPlaces;
    return true;
  }

  function getState() {
    return {
      days: DAYS,
      kakaoPlaces: kakaoPlaces ? deepClone(kakaoPlaces) : null,
      naverPlaces: naverPlaces ? deepClone(naverPlaces) : null,
    };
  }

  function persist() {
    const state = getState();
    if (typeof TripSync !== "undefined") {
      TripSync.push(state);
    }
  }

  function saveDays(days) {
    DAYS = days;
    persist();
  }

  function resetDays() {
    DAYS = deepClone(DEFAULT_DAYS);
    persist();
    return DAYS;
  }

  function resetDay(dayId) {
    const defaultDay = DEFAULT_DAYS.find((d) => d.id === dayId);
    const day = DAYS.find((d) => d.id === dayId);
    if (defaultDay && day) {
      day.stops = deepClone(defaultDay.stops);
      persist();
    }
  }

  function getKakaoPlaces() {
    return kakaoPlaces || KAKAO_JEJU_PLACES;
  }

  function getNaverPlaces() {
    return naverPlaces || NAVER_SAVED_PLACES;
  }

  function importKakaoPlaces(places) {
    const before = new Set(getKakaoPlaces().map((p) => p.name));
    kakaoPlaces = mergePlaceList(KAKAO_JEJU_PLACES, places, "name");
    persist();
    return kakaoPlaces.filter((p) => !before.has(p.name)).length;
  }

  function importNaverPlaces(places) {
    const before = new Set(getNaverPlaces().map((p) => p.name));
    naverPlaces = mergePlaceList(NAVER_SAVED_PLACES, places, "name");
    persist();
    return naverPlaces.filter((p) => !before.has(p.name)).length;
  }

  return {
    applyRemote,
    getState,
    saveDays,
    resetDays,
    resetDay,
    getKakaoPlaces,
    getNaverPlaces,
    importKakaoPlaces,
    importNaverPlaces,
    deepClone,
  };
})();
