(function () {
  const TYPE_LABELS = {
    이동: "이동",
    렌트카: "렌트카",
    숙소: "숙소",
    먹거리: "먹거리",
    디저트: "디저트",
    카페: "카페",
    놀거리: "놀거리",
    수영: "수영",
  };

  const SOURCE_TAGS = {
    kakao: { label: "카카오", class: "tag-kakao" },
    naver: { label: "네이버", class: "tag-naver" },
    both: { label: "카카오+네이버", class: "tag-both" },
  };

  let activeDay = DAYS[0]?.id || "day1";
  let viewMode = "timeline";
  window.activeDay = activeDay;

  function ensureActiveDay() {
    if (!DAYS.find((d) => d.id === activeDay)) {
      activeDay = DAYS[0]?.id || "day1";
      window.activeDay = activeDay;
    }
  }

  function renderSyncStatus(status, detail) {
    const el = document.getElementById("sync-status");
    const banner = document.getElementById("sync-banner");
    if (!el) return;

    const labels = {
      connecting: { text: "☁️ 연결 중…", cls: "sync-connecting" },
      synced: { text: "🟢 자동 동기화 중", cls: "sync-ok" },
      saving: { text: "💾 저장 중…", cls: "sync-saving" },
      saved: { text: "✅ 저장됨", cls: "sync-ok" },
      local: { text: "📱 이 기기에 저장됨", cls: "sync-offline" },
      "local-saved": { text: "📱 이 기기에 저장됨", cls: "sync-offline" },
      offline: { text: "📱 이 기기에 저장됨", cls: "sync-offline" },
      error: { text: "🔴 동기화 오류", cls: "sync-error" },
      "remote-updated": { text: "🟢 자동 동기화 중", cls: "sync-ok" },
    };

    const info = labels[status] || labels.synced;
    el.textContent = info.text;
    el.className = `sync-status ${info.cls}`;
    if (detail && status === "error") el.title = detail;

    if (banner) {
      if (!TripSync.isConfigured()) {
        banner.hidden = false;
        banner.textContent =
          "Supabase 미연동 — supabase-config.js에 URL·키를 넣어야 자동 동기화됩니다. 지금은 이 기기 저장 + 「공유」/「가져오기」를 쓰세요.";
      } else if (status === "error") {
        banner.hidden = false;
        banner.textContent = `동기화 오류: ${detail || "연결을 확인해주세요"} · JSON 공유는 계속 사용할 수 있어요`;
      } else {
        banner.hidden = true;
      }
    }

    if (status === "saved" && window.TripEditor) {
      TripEditor.showToast("저장됐어요");
      setTimeout(() => renderSyncStatus("synced"), 1500);
      return;
    }

    if (status === "remote-updated" && window.TripEditor) {
      TripEditor.showToast("다른 메이트가 일정을 수정했어요");
    }
  }

  function renderHero() {
    document.getElementById("hero-sub").textContent =
      `${TRIP.flight.outbound.route} ${TRIP.flight.outbound.time} · 귀국 ${TRIP.flight.inbound.time}`;

    const meta = document.getElementById("hero-meta");
    const swimCount = DAYS.filter((d) => d.swim).length;
    meta.innerHTML = [
      `🏠 ${TRIP.stay.name} (${TRIP.stay.nights}박)`,
      `🚗 ${TRIP.rental.name} ${TRIP.rental.time}`,
      `🏊 수영 ${swimCount}회`,
      "🥐 아베베 · 자매국수 필수",
    ]
      .map((t) => `<span class="meta-chip">${t}</span>`)
      .join("");
  }

  function renderMapLinks() {
    const el = document.getElementById("map-links");
    const items = [
      { ...TRIP.mapLinks.kakao, cls: "kakao" },
      { ...TRIP.mapLinks.naverFood, cls: "naver" },
      { ...TRIP.mapLinks.naverPlay, cls: "naver" },
      { ...TRIP.mapLinks.naverDessert, cls: "naver" },
    ];
    el.innerHTML = items
      .map(
        (m) =>
          `<a class="map-link ${m.cls}" href="${m.url}" target="_blank" rel="noopener">${m.label}</a>`
      )
      .join("");
  }

  function renderPlacesTotal() {
    const totalStops = DAYS.reduce((n, d) => n + d.stops.length, 0);
    const el = document.getElementById("places-total");
    if (!el) return;
    el.textContent = `(총 ${totalStops}곳)`;
  }

  function renderMapLegend() {
    const el = document.getElementById("map-legend");
    if (!el || typeof DAY_ROUTE_COLORS === "undefined") return;
    const dayLegends = DAYS.map(
      (d, i) =>
        `<span class="legend-item"><span class="legend-line" style="background:${DAY_ROUTE_COLORS[i]}"></span>${d.date}</span>`
    ).join("");
    el.innerHTML = `<span class="legend-title">동선 색상</span>${dayLegends}`;
  }

  function renderDayTabs() {
    const el = document.getElementById("day-tabs");
    el.innerHTML = DAYS.map(
      (d) => `
      <button class="day-tab${d.id === activeDay ? " active" : ""}" data-day="${d.id}" role="tab" aria-selected="${d.id === activeDay}">
        ${d.label}
        <span class="tab-date">${d.date}</span>
      </button>
    `
    ).join("");
  }

  function renderStopTags(stop) {
    const tags = [`<span class="tag tag-type">${TYPE_LABELS[stop.type] || stop.type}</span>`];
    if (stop.swim) tags.push('<span class="tag tag-swim">수영</span>');
    if (stop.highlight) tags.push('<span class="tag tag-must">필수</span>');
    if (stop.source && SOURCE_TAGS[stop.source]) {
      const s = SOURCE_TAGS[stop.source];
      tags.push(`<span class="tag ${s.class}">${s.label}</span>`);
    }
    return tags.join("");
  }

  function renderDayContent() {
    ensureActiveDay();
    const day = DAYS.find((d) => d.id === activeDay);
    const el = document.getElementById("day-content");
    if (!day || !el) return;

    const swimHtml = day.swim
      ? `<span class="swim-badge">🏊 ${day.swimSpot || "수영"}</span>`
      : "";

    if (viewMode === "edit") {
      el.innerHTML = `
        <article class="day-panel day-panel-edit">
          <div class="day-header">
            <h3>${day.date} — ${day.theme}</h3>
            <p>${day.summary}</p>
            ${swimHtml}
          </div>
          <div id="course-editor"></div>
        </article>
      `;
      if (window.TripEditor) {
        TripEditor.renderEditor(activeDay, document.getElementById("course-editor"));
      }
      return;
    }

    const stopsHtml = day.stops
      .map((stop) => {
        const nameHtml = stop.mapUrl
          ? `<a href="${stop.mapUrl}" target="_blank" rel="noopener">${stop.name}</a>`
          : stop.name;
        return `
        <li class="timeline-item">
          <span class="timeline-time">${stop.time}</span>
          <div>
            <div class="stop-name">${nameHtml}</div>
            <div class="stop-meta">${renderStopTags(stop)}</div>
            ${stop.address ? `<div class="stop-address">${stop.address}</div>` : ""}
            ${stop.note ? `<div class="stop-note">${stop.note}</div>` : ""}
          </div>
        </li>
      `;
      })
      .join("");

    el.innerHTML = `
      <article class="day-panel">
        <div class="day-header">
          <h3>${day.date} — ${day.theme}</h3>
          <p>${day.summary}</p>
          ${swimHtml}
        </div>
        <ol class="timeline">${stopsHtml}</ol>
      </article>
    `;
  }

  function getScheduledKakaoNames() {
    const names = new Set();
    const kakaoList = getKakaoPlacesList();
    DAYS.forEach((d) =>
      d.stops.forEach((s) => {
        if (s.source === "kakao" || s.source === "both") names.add(s.name);
        kakaoList.forEach((p) => {
          if (s.name.includes(p.name) || p.name.includes(s.name)) names.add(p.name);
        });
      })
    );
    kakaoList.forEach((p) => {
      DAYS.forEach((d) =>
        d.stops.forEach((s) => {
          if (s.name === p.name) names.add(p.name);
        })
      );
    });
    return names;
  }

  function renderKakaoChecklist() {
    const scheduled = getScheduledKakaoNames();
    const el = document.getElementById("kakao-checklist");
    const kakaoList = getKakaoPlacesList();
    el.innerHTML = kakaoList
      .map((p) => {
        const done = [...scheduled].some(
          (n) => n === p.name || n.includes(p.name) || p.name.includes(n)
        );
        return `
        <li class="${done ? "done" : ""}">
          <span class="check-icon ${done ? "yes" : "no"}">${done ? "✓" : "·"}</span>
          <span class="place-name">${p.name}</span>
          <span class="place-area">${p.area}</span>
        </li>
      `;
      })
      .join("");
  }

  function renderExtraList() {
    const el = document.getElementById("extra-list");
    const unassignedNaver = getUnassignedNaverPlaces();
    const unassignedKakao = getUnassignedKakaoPlaces();

    const items = [
      ...unassignedNaver.map((p) => ({
        name: p.name,
        label: `${p.folder} · 네이버`,
      })),
      ...unassignedKakao.map((p) => ({
        name: p.name,
        label: `${p.area} · 카카오`,
      })),
    ];

    if (!items.length) {
      el.innerHTML =
        '<li class="extra-empty">저장 장소가 모두 일정에 반영되었어요</li>';
      return;
    }

    el.innerHTML = items
      .map(
        (p) =>
          `<li>📍 ${p.name} <span class="place-area">${p.label} · 여유 시 방문</span></li>`
      )
      .join("");
  }

  function refreshAll() {
    ensureActiveDay();
    if (typeof refreshAllPlaces === "function") refreshAllPlaces();
    renderPlacesTotal();
    renderKakaoChecklist();
    renderExtraList();
    renderDayTabs();
    renderDayContent();
    renderMapLegend();
    if (window.TripMap) TripMap.updateMap(activeDay);
  }

  function bindTabs() {
    document.getElementById("day-tabs").addEventListener("click", (e) => {
      const btn = e.target.closest(".day-tab");
      if (!btn) return;
      activeDay = btn.dataset.day;
      window.activeDay = activeDay;
      renderDayTabs();
      renderDayContent();
      if (window.TripMap) window.TripMap.updateMap(activeDay);
    });
  }

  function bindViewToggle() {
    const btnView = document.getElementById("btn-view-timeline");
    const btnEdit = document.getElementById("btn-view-edit");

    btnView.addEventListener("click", () => {
      viewMode = "timeline";
      btnView.classList.add("active");
      btnEdit.classList.remove("active");
      renderDayContent();
    });

    btnEdit.addEventListener("click", () => {
      viewMode = "edit";
      btnEdit.classList.add("active");
      btnView.classList.remove("active");
      renderDayContent();
    });
  }

  function bindShareButtons() {
    const btnCopy = document.getElementById("btn-share-copy");
    const btnImport = document.getElementById("btn-share-import");

    if (btnCopy) {
      btnCopy.addEventListener("click", async () => {
        try {
          const result = await TripSync.copyShare();
          if (result === "clipboard" && window.TripEditor) {
            TripEditor.showToast("일정을 복사했어요 · 카톡으로 보내세요");
          } else if (window.prompt) {
            window.prompt("아래를 복사해서 메이트에게 보내세요", result);
          }
        } catch (err) {
          if (window.TripEditor) TripEditor.showToast("복사 실패");
        }
      });
    }

    if (btnImport) {
      btnImport.addEventListener("click", () => {
        const text = window.prompt("메이트가 보낸 일정 JSON을 붙여넣으세요");
        if (!text) return;
        try {
          TripSync.importJson(text);
          refreshAll();
          if (window.TripEditor) TripEditor.showToast("일정을 가져왔어요");
          renderSyncStatus(TripSync.isConfigured() ? "synced" : "local");
        } catch (err) {
          if (window.TripEditor) TripEditor.showToast("가져오기 실패 — JSON을 확인해주세요");
        }
      });
    }
  }

  function bindSyncRefresh() {
    const btn = document.getElementById("btn-sync-refresh");
    if (btn) {
      btn.addEventListener("click", async () => {
        renderSyncStatus("connecting");
        const ok = await TripSync.forcePull();
        refreshAll();
        if (window.TripEditor) {
          TripEditor.showToast(
            ok ? "최신 일정을 불러왔어요" : "동기화에 실패했어요"
          );
        }
        renderSyncStatus(ok ? "synced" : "error");
      });
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && TripSync.isEnabled()) {
        TripSync.forcePull().then((ok) => {
          if (ok) refreshAll();
        });
      }
    });
  }

  function bindRefreshPanel() {
    const panel = document.getElementById("refresh-panel");
    const btnToggle = document.getElementById("btn-toggle-refresh");
    const btnClose = document.getElementById("btn-close-refresh");
    const btnOpenKakao = document.getElementById("btn-open-kakao");
    const btnOpenNaver = document.getElementById("btn-open-naver");
    const bookmarklet = document.getElementById("kakao-bookmarklet");
    const naverBookmarklet = document.getElementById("naver-bookmarklet");

    if (bookmarklet && window.MapImport) {
      bookmarklet.href = MapImport.getBookmarkletHref();
    }

    if (naverBookmarklet && window.MapImport) {
      naverBookmarklet.href = MapImport.getNaverBookmarkletHref();
    }

    if (window.MapImport) {
      MapImport.initListener((added, source) => {
        refreshAll();
        panel.hidden = true;
        if (window.TripEditor) {
          const label = source === "naver" ? "네이버맵" : "카카오맵";
          TripEditor.showToast(
            added > 0
              ? `${label}에서 ${added}곳이 미배정에 추가됐어요`
              : "새 장소가 없거나 이미 반영됐어요"
          );
        }
      });
    }

    btnToggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
    });

    btnClose.addEventListener("click", () => {
      panel.hidden = true;
    });

    btnOpenKakao.addEventListener("click", () => {
      if (window.MapImport) MapImport.openKakaoFolder();
    });

    btnOpenNaver.addEventListener("click", () => {
      if (window.MapImport) MapImport.openNaverImportPage();
    });
  }

  function init() {
    if (window.TripMap) window.TripMap.initMap();
    renderHero();
    renderMapLinks();
    renderPlacesTotal();
    renderDayTabs();
    renderDayContent();
    renderMapLegend();
    renderKakaoChecklist();
    renderExtraList();
    bindTabs();
    bindViewToggle();
    bindSyncRefresh();
    bindShareButtons();
    bindRefreshPanel();

    if (window.TripEditor) {
      TripEditor.setOnChange(() => {
        renderPlacesTotal();
        renderKakaoChecklist();
        renderExtraList();
        if (window.TripMap) TripMap.updateMap(activeDay);
      });
    }

    if (window.TripMap) window.TripMap.updateMap(activeDay);
  }

  function boot() {
    renderSyncStatus("connecting");
    init();

    TripSync.onUpdate((status, detail) => {
      renderSyncStatus(status, detail);
      if (
        status === "synced" ||
        status === "local" ||
        status === "local-saved" ||
        status === "offline" ||
        status === "remote-updated" ||
        status === "error"
      ) {
        refreshAll();
      }
    });

    TripSync.init().then((status) => {
      refreshAll();
      renderSyncStatus(status === "synced" ? "synced" : "local");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
