const MapImport = (function () {
  function getKakaoFolderId() {
    return TRIP.mapImport?.kakao?.folderId || "10903649";
  }

  function getKakaoFolderUrl() {
    return (
      TRIP.mapImport?.kakao?.folderUrl ||
      `https://map.kakao.com/?map_type=TYPE_MAP&folderid=${getKakaoFolderId()}&target=other&page=bookmark`
    );
  }

  function getNaverFolders() {
    return TRIP.mapImport?.naver || [];
  }

  function getNaverApiUrl(shareId) {
    return `https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/${shareId}/bookmarks?start=0&limit=5000&sort=lastUseTime`;
  }

  function getNaverImportPageUrl() {
    const first = getNaverFolders()[0];
    if (!first?.shareId) return "https://pages.map.naver.com/save-pages/";
    return `https://pages.map.naver.com/save-pages/shared/folder/${first.shareId}`;
  }

  function parseKakaoPayload(data) {
    const list = data.favoriteList || data.places || data.result || data;
    if (!Array.isArray(list)) return [];
    return list
      .map((p) => {
        const name = p.display1 || p.placeName || p.title || p.name || "";
        const addr =
          (p.address && (p.address.region || p.address.name)) ||
          p.region ||
          "제주";
        return { name: String(name).trim(), area: addr, source: "kakao" };
      })
      .filter((p) => p.name);
  }

  function parseNaverPayload(data, folderLabel) {
    const list = data.bookmarkList || [];
    if (!Array.isArray(list)) return [];
    return list
      .map((p) => {
        const name = p.name || p.displayName || "";
        return {
          name: String(name).trim(),
          folder: folderLabel || "먹거리",
          source: "naver",
        };
      })
      .filter((p) => p.name);
  }

  function getBookmarkletHref() {
    const folderId = getKakaoFolderId();
    const code = `
      (async function () {
        try {
          var id = "${folderId}";
          var res = await fetch(
            "https://map.kakao.com/favorite/list.json?folderIds%5B%5D=" + id,
            { credentials: "include" }
          );
          var data = await res.json();
          var list = data.favoriteList || data.places || data.result || [];
          var places = list
            .map(function (p) {
              var name = p.display1 || p.placeName || p.title || p.name || "";
              var addr = (p.address && (p.address.region || p.address.name)) || "";
              return { name: String(name).trim(), area: addr || "제주", source: "kakao" };
            })
            .filter(function (p) { return p.name; });
          if (window.opener) {
            window.opener.postMessage(
              { type: "jeju-map-import", source: "kakao", places: places },
              "*"
            );
            alert(places.length + "곳을 제주 앱으로 보냈어요. 앱 탭으로 돌아가세요.");
          } else {
            prompt("아래 JSON을 복사해 앱에 붙여넣으세요", JSON.stringify(places));
          }
        } catch (e) {
          alert("가져오기 실패\\n카카오맵에 로그인한 뒤, 공유 폴더 페이지에서 다시 실행해주세요.");
        }
      })();
    `;
    return "javascript:" + encodeURIComponent(code.trim());
  }

  function getNaverBookmarkletHref() {
    const folders = getNaverFolders()
      .filter((f) => f.shareId)
      .map((f) => ({ shareId: f.shareId, label: f.label }));
    const foldersJson = JSON.stringify(folders);
    const code = `
      (async function () {
        try {
          var folders = ${foldersJson};
          var all = [];
          for (var i = 0; i < folders.length; i++) {
            var f = folders[i];
            var res = await fetch(
              "https://pages.map.naver.com/save-pages/api/maps-bookmark/v3/shares/" +
                f.shareId +
                "/bookmarks?start=0&limit=5000&sort=lastUseTime",
              { credentials: "include" }
            );
            if (!res.ok) throw new Error("folder " + f.label);
            var data = await res.json();
            var list = data.bookmarkList || [];
            list.forEach(function (p) {
              var name = p.name || p.displayName || "";
              if (!name) return;
              all.push({ name: String(name).trim(), folder: f.label, source: "naver" });
            });
          }
          if (window.opener) {
            window.opener.postMessage(
              { type: "jeju-map-import", source: "naver", places: all },
              "*"
            );
            alert(all.length + "곳을 제주 앱으로 보냈어요. 앱 탭으로 돌아가세요.");
          } else {
            prompt("아래 JSON을 복사해 앱에 붙여넣으세요", JSON.stringify(all));
          }
        } catch (e) {
          alert("가져오기 실패\\n네이버 저장 페이지(pages.map.naver.com)에서 다시 실행해주세요.");
        }
      })();
    `;
    return "javascript:" + encodeURIComponent(code.trim());
  }

  function openKakaoFolder() {
    window.open(getKakaoFolderUrl(), "kakaoMapFolder", "width=960,height=720");
  }

  function openNaverImportPage() {
    window.open(getNaverImportPageUrl(), "naverMapImport", "width=960,height=720");
  }

  function openNaverLinks() {
    getNaverFolders().forEach((item) => {
      window.open(item.url, "_blank", "noopener");
    });
  }

  function initListener(onImported) {
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || data.type !== "jeju-map-import") return;

      if (data.source === "kakao" && Array.isArray(data.places)) {
        const added = TripStorage.importKakaoPlaces(data.places);
        if (typeof onImported === "function") onImported(added, "kakao");
      }

      if (data.source === "naver" && Array.isArray(data.places)) {
        const added = TripStorage.importNaverPlaces(data.places);
        if (typeof onImported === "function") onImported(added, "naver");
      }
    });
  }

  function importKakaoJsonText(text) {
    try {
      const parsed = JSON.parse(text);
      const places = parseKakaoPayload(parsed);
      if (!places.length) return 0;
      return TripStorage.importKakaoPlaces(places);
    } catch (_) {
      return -1;
    }
  }

  return {
    getBookmarkletHref,
    getNaverBookmarkletHref,
    openKakaoFolder,
    openNaverImportPage,
    openNaverLinks,
    initListener,
    importKakaoJsonText,
    getNaverApiUrl,
    parseNaverPayload,
  };
})();
