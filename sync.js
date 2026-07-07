const TripSync = (function () {
  let enabled = false;
  let ready = false;
  let isFirstLoad = true;
  let pendingSave = false;
  let saveTimer = null;
  let unsubscribe = null;
  const listeners = new Set();

  function isConfigured() {
    return (
      typeof FIREBASE_CONFIG !== "undefined" &&
      FIREBASE_CONFIG.apiKey &&
      !String(FIREBASE_CONFIG.apiKey).includes("YOUR_")
    );
  }

  function docRef() {
    return firebase
      .firestore()
      .collection("trips")
      .doc(FIREBASE_CONFIG.tripId || "jeju-2026");
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

  function seedIfEmpty(ref) {
    return ref.set({
      days: TripStorage.deepClone(DEFAULT_DAYS),
      kakaoExtra: [],
      naverExtra: [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }

  function applySnapshot(data, fromRemote) {
    TripStorage.applyRemote(data);
    if (typeof refreshAllPlaces === "function") refreshAllPlaces();

    if (fromRemote && !isFirstLoad && !pendingSave) {
      notify("remote-updated");
    }
    isFirstLoad = false;
    if (!ready) markReady("synced");
    else notify("synced");
  }

  function initOffline() {
    DAYS = TripStorage.deepClone(DEFAULT_DAYS);
    markReady("offline");
  }

  function initOnline() {
    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      enabled = true;
      notify("connecting");

      const ref = docRef();
      unsubscribe = ref.onSnapshot(
        (snap) => {
          if (!snap.exists) {
            seedIfEmpty(ref);
            return;
          }
          applySnapshot(snap.data(), true);
        },
        (err) => {
          console.error("Firestore sync error:", err);
          if (!ready) {
            DAYS = TripStorage.deepClone(DEFAULT_DAYS);
            markReady("offline");
          }
          notify("error", err.message);
        }
      );
    } catch (err) {
      console.error("Firebase init error:", err);
      DAYS = TripStorage.deepClone(DEFAULT_DAYS);
      notify("error", err.message);
      markReady("offline");
    }
  }

  function init() {
    if (!isConfigured()) {
      initOffline();
      return Promise.resolve("offline");
    }
    initOnline();
    return whenReady();
  }

  function push(state) {
    if (!enabled) return;

    clearTimeout(saveTimer);
    pendingSave = true;
    notify("saving");

    saveTimer = setTimeout(async () => {
      try {
        await docRef().set(
          {
            days: state.days,
            kakaoExtra: state.kakaoExtra,
            naverExtra: state.naverExtra,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Firestore save error:", err);
        notify("error", err.message);
      } finally {
        setTimeout(() => {
          pendingSave = false;
          notify("synced");
        }, 300);
      }
    }, 500);
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

  return {
    init,
    push,
    onUpdate,
    whenReady,
    isConfigured,
    isEnabled: () => enabled,
  };
})();
