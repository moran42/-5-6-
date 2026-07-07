const TripStorage = (function () {
  let kakaoExtra = [];
  let naverExtra = [];

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function applyRemote(data) {
    if (data.days && Array.isArray(data.days) && data.days.length) {
      DAYS = data.days;
    }
    if (Array.isArray(data.kakaoExtra)) kakaoExtra = data.kakaoExtra;
    if (Array.isArray(data.naverExtra)) naverExtra = data.naverExtra;
  }

  function getState() {
    return {
      days: DAYS,
      kakaoExtra: deepClone(kakaoExtra),
      naverExtra: deepClone(naverExtra),
    };
  }

  function persist() {
    if (typeof TripSync !== "undefined" && TripSync.isEnabled()) {
      TripSync.push(getState());
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

  function getKakaoExtra() {
    return kakaoExtra;
  }

  function getNaverExtra() {
    return naverExtra;
  }

  function getKakaoPlaces() {
    const seen = new Set();
    const merged = [];
    [...KAKAO_JEJU_PLACES, ...kakaoExtra].forEach((p) => {
      if (seen.has(p.name)) return;
      seen.add(p.name);
      merged.push(p);
    });
    return merged;
  }

  function getNaverPlaces() {
    const seen = new Set();
    const merged = [];
    [...NAVER_SAVED_PLACES, ...naverExtra].forEach((p) => {
      if (seen.has(p.name)) return;
      seen.add(p.name);
      merged.push(p);
    });
    return merged;
  }

  function addKakaoPlace(name, area) {
    if (
      kakaoExtra.some((p) => p.name === name) ||
      KAKAO_JEJU_PLACES.some((p) => p.name === name)
    ) {
      return false;
    }
    kakaoExtra.push({ name, area: area || "제주", source: "kakao" });
    persist();
    return true;
  }

  function addNaverPlace(name, folder) {
    if (
      naverExtra.some((p) => p.name === name) ||
      NAVER_SAVED_PLACES.some((p) => p.name === name)
    ) {
      return false;
    }
    naverExtra.push({ name, folder: folder || "놀거리" });
    persist();
    return true;
  }

  function addPlacesFromText(text, source) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let added = 0;
    lines.forEach((line) => {
      const parts = line.split(",").map((s) => s.trim());
      const name = parts[0];
      if (!name) return;
      if (source === "kakao") {
        if (addKakaoPlace(name, parts[1] || "제주")) added += 1;
      } else if (addNaverPlace(name, parts[1] || "놀거리")) {
        added += 1;
      }
    });
    return added;
  }

  return {
    applyRemote,
    getState,
    saveDays,
    resetDays,
    resetDay,
    getKakaoPlaces,
    getNaverPlaces,
    getKakaoExtra,
    getNaverExtra,
    addKakaoPlace,
    addNaverPlace,
    addPlacesFromText,
    deepClone,
  };
})();
