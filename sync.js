const TripSync = (function () {
  const STORAGE_KEY = "jeju-trip-v1";
  const POLL_MS = 3000;

  let ready = false;
  let polling = false;
  let pollTimer = null;
  let saveTimer = null;
  let pendingSave = false;
  let queuedState = null;
  let lastKnownRemoteAt = 0;
  const listeners = new Set();

  function isConfigured() {
    return (
      typeof SUPABASE_CONFIG !== "undefined" &&
      SUPABASE_CONFIG.url &&
      SUPABASE_CONFIG.anonKey &&
      !String(SUPABASE_CONFIG.url).includes("YOUR_")
    );
  }

  function headers({ json = false } = {}) {
    const key = SUPABASE_CONFIG.anonKey;
    const h = { apikey: key };
    if (!String(key).startsWith("sb_publishable_")) {
      h.Authorization = `Bearer ${key}`;
    }
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  function notify(status, detail) {
    listeners.forEach((fn) => {
      try {
        fn(status, detail);
      } catch (_) {
        /* ignore */
      }
    });
  }

  function markReady(status) {
    if (ready) return;
    ready = true;
    notify(status);
  }

  function getLocalAt() {
    const local = loadLocal();
    return local?.updatedAt ? Number(local.updatedAt) : 0;
  }

  function wrapState(state) {
    return {
      days: state.days,
      kakaoPlaces: state.kakaoPlaces,
      naverPlaces: state.naverPlaces,
      updatedAt: Date.now(),
    };
  }

  function saveLocal(state) {
    const wrapped = wrapState(state);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapped));
    } catch (err) {
      console.warn("localStorage save failed:", err);
    }
    return wrapped;
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  async function readError(res) {
    try {
      const data = await res.json();
      return data.message || data.error || data.hint || `HTTP ${res.status}`;
    } catch (_) {
      return `HTTP ${res.status}`;
    }
  }

  function applyState(data, fromRemote) {
    const payload = {
      days: data.days,
      kakaoPlaces: data.kakaoPlaces,
      naverPlaces: data.naverPlaces,
    };
    const applied = TripStorage.applyRemote(payload);
    if (!applied) {
      notify("error", "데이터 형식이 올바르지 않아요");
      return false;
    }
    if (typeof refreshAllPlaces === "function") refreshAllPlaces();
    if (fromRemote) notify("remote-updated");
    return true;
  }

  async function pullFromCloud({ force = false } = {}) {
    if (!isConfigured()) return { ok: false, reason: "not-configured" };
    try {
      const tripId = encodeURIComponent(SUPABASE_CONFIG.tripId || "jeju-2026");
      const res = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/trip_data?trip_id=eq.${tripId}&select=payload,updated_at`,
        { headers: headers() }
      );
      if (!res.ok) throw new Error(await readError(res));

      const rows = await res.json();
      if (!rows.length) return { ok: true, changed: false, empty: true };

      const remoteAt = new Date(rows[0].updated_at).getTime();
      const payload = rows[0].payload || {};
      payload.updatedAt = remoteAt;

      const localAt = getLocalAt();
      const changed = force || remoteAt > localAt || remoteAt > lastKnownRemoteAt;

      lastKnownRemoteAt = remoteAt;

      if (changed) {
        applyState(payload, force || remoteAt > localAt);
        saveLocal(payload);
      }

      return { ok: true, changed };
    } catch (err) {
      console.error("Cloud pull error:", err);
      return { ok: false, reason: err.message || "연결 실패" };
    }
  }

  async function pushToCloud(state, immediate) {
    if (!isConfigured()) return false;

    if (!immediate) {
      queuedState = state;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const next = queuedState;
        queuedState = null;
        if (next) pushToCloud(next, true);
      }, 400);
      return true;
    }

    pendingSave = true;
    notify("saving");

    try {
      const wrapped = wrapState(state);
      const tripId = SUPABASE_CONFIG.tripId || "jeju-2026";
      const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/trip_data`, {
        method: "POST",
        headers: {
          ...headers({ json: true }),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          trip_id: tripId,
          payload: {
            days: wrapped.days,
            kakaoPlaces: wrapped.kakaoPlaces,
            naverPlaces: wrapped.naverPlaces,
          },
          updated_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error(await readError(res));

      const rows = await res.json();
      if (rows[0]?.updated_at) {
        lastKnownRemoteAt = new Date(rows[0].updated_at).getTime();
      }
      saveLocal(state);
      notify("saved");
      return true;
    } catch (err) {
      console.error("Cloud save error:", err);
      notify("error", err.message || "저장 실패");
      return false;
    } finally {
      setTimeout(() => {
        pendingSave = false;
        notify("synced");
      }, 150);
    }
  }

  function startPolling() {
    if (!isConfigured() || polling) return;
    polling = true;
    pollTimer = setInterval(async () => {
      if (document.visibilityState !== "visible" || pendingSave) return;
      const result = await pullFromCloud({ force: false });
      if (!result.ok) notify("error", result.reason);
    }, POLL_MS);
  }

  function bootstrap() {
    const local = loadLocal();
    if (local?.days && TripStorage.applyRemote(local)) {
      if (typeof refreshAllPlaces === "function") refreshAllPlaces();
    }
  }

  async function init() {
    bootstrap();

    if (!isConfigured()) {
      markReady("local");
      return "local";
    }

    notify("connecting");
    lastKnownRemoteAt = 0;
    const result = await pullFromCloud({ force: true });

    if (result.ok && result.empty) {
      await pushToCloud(TripStorage.getState(), true);
    } else if (!result.ok) {
      notify("error", result.reason);
      markReady("error");
      return "error";
    }

    startPolling();
    markReady("synced");
    return "synced";
  }

  function push(state, immediate) {
    saveLocal(state);

    if (!isConfigured()) {
      notify("local");
      return Promise.resolve(false);
    }

    return pushToCloud(state, immediate);
  }

  async function forcePull() {
    if (!isConfigured()) {
      const local = loadLocal();
      if (local) {
        applyState(local, false);
        return { ok: true };
      }
      return { ok: false, reason: "저장된 일정이 없어요" };
    }

    lastKnownRemoteAt = 0;
    const result = await pullFromCloud({ force: true });
    if (!result.ok) return result;
    notify("synced");
    return result;
  }

  function onUpdate(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function whenReady() {
    if (ready) return Promise.resolve("ready");
    return new Promise((resolve) => {
      const handler = (status) => {
        if (ready) {
          listeners.delete(handler);
          resolve(status);
        }
      };
      listeners.add(handler);
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && isConfigured()) {
      pullFromCloud({ force: false });
    }
  });

  return {
    init,
    push,
    forcePull,
    onUpdate,
    whenReady,
    isConfigured,
    isEnabled: () => isConfigured(),
    stopPolling,
  };
})();
