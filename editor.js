(function () {
  let editMode = false;
  let onChange = null;

  const TYPE_OPTIONS = STOP_TYPES.map(
    (t) => `<option value="${t}">${t}</option>`
  ).join("");

  function setOnChange(fn) {
    onChange = fn;
  }

  function notifyChange() {
    if (onChange) onChange();
  }

  function emptyStop() {
    return {
      time: "12:00",
      name: "새 장소",
      type: "놀거리",
      note: "",
      source: null,
    };
  }

  function renderStopBlock(stop, index, total) {
    const typeOpts = STOP_TYPES.map(
      (t) =>
        `<option value="${t}"${stop.type === t ? " selected" : ""}>${t}</option>`
    ).join("");

    return `
      <div class="edit-block" data-index="${index}">
        <div class="edit-block-header">
          <span class="edit-block-num">${index + 1}</span>
          <div class="edit-block-actions">
            <button type="button" class="btn-icon" data-action="up" title="위로" ${index === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="btn-icon" data-action="down" title="아래로" ${index === total - 1 ? "disabled" : ""}>↓</button>
            <button type="button" class="btn-icon btn-danger" data-action="delete" title="삭제">×</button>
          </div>
        </div>
        <div class="edit-block-fields">
          <label class="edit-field">
            <span>시간</span>
            <input type="time" class="edit-time" value="${stop.time || "12:00"}" />
          </label>
          <label class="edit-field edit-field-wide">
            <span>장소</span>
            <input type="text" class="edit-name" value="${escapeHtml(stop.name || "")}" placeholder="장소 이름" />
          </label>
          <label class="edit-field">
            <span>유형</span>
            <select class="edit-type">${typeOpts}</select>
          </label>
          <label class="edit-field edit-field-full">
            <span>메모</span>
            <input type="text" class="edit-note" value="${escapeHtml(stop.note || "")}" placeholder="라스트오더, 휴무일 등" />
          </label>
        </div>
        <button type="button" class="btn-insert" data-action="insert-below">+ 이 아래에 장소 추가</button>
      </div>
    `;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function readBlocksFromDOM(container, day) {
    const blocks = container.querySelectorAll(".edit-block");
    const stops = [];
    blocks.forEach((block, i) => {
      const time = block.querySelector(".edit-time").value;
      const name = block.querySelector(".edit-name").value.trim();
      const type = block.querySelector(".edit-type").value;
      const note = block.querySelector(".edit-note").value.trim();
      if (!name) return;
      const prev = day.stops[i] || {};
      const stop = {
        ...prev,
        time,
        name,
        type,
        source: prev.source ?? null,
      };
      if (note) stop.note = note;
      else delete stop.note;
      stops.push(stop);
    });
    return stops;
  }

  function saveCurrentDay(dayId, container) {
    const day = DAYS.find((d) => d.id === dayId);
    if (!day) return;
    day.stops = readBlocksFromDOM(container, day);
    TripStorage.saveDays(DAYS);
    refreshAllPlaces();
    notifyChange();
  }

  function renderEditor(dayId, container) {
    const day = DAYS.find((d) => d.id === dayId);
    if (!day) return;

    const blocks = day.stops
      .map((stop, i) => renderStopBlock(stop, i, day.stops.length))
      .join("");

    container.innerHTML = `
      <div class="edit-toolbar">
        <button type="button" class="btn-secondary" id="btn-add-stop-top">+ 맨 위에 추가</button>
        <button type="button" class="btn-secondary" id="btn-save-stops">저장</button>
        <button type="button" class="btn-ghost" id="btn-reset-day">이 날 초기화</button>
      </div>
      <div class="edit-blocks-scroll">${blocks}</div>
    `;

    bindEditorEvents(dayId, container);
  }

  function bindEditorEvents(dayId, container) {
    const scroll = container.querySelector(".edit-blocks-scroll");

    container.querySelector("#btn-add-stop-top").addEventListener("click", () => {
      const day = DAYS.find((d) => d.id === dayId);
      day.stops.unshift(emptyStop());
      renderEditor(dayId, container);
      saveCurrentDay(dayId, container);
    });

    container.querySelector("#btn-save-stops").addEventListener("click", () => {
      saveCurrentDay(dayId, container);
      showToast("일정이 저장되었어요 · 메이트에게도 반영됩니다");
    });

    container.querySelector("#btn-reset-day").addEventListener("click", () => {
      if (!confirm("이 날 일정을 기본값으로 되돌릴까요?")) return;
      TripStorage.resetDay(dayId);
      refreshAllPlaces();
      renderEditor(dayId, container);
      notifyChange();
      showToast("기본 일정으로 복원했어요 · 메이트에게도 반영됩니다");
    });

    scroll.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const block = btn.closest(".edit-block");
      const index = parseInt(block.dataset.index, 10);
      const day = DAYS.find((d) => d.id === dayId);
      const action = btn.dataset.action;

      if (action === "delete") {
        day.stops.splice(index, 1);
      } else if (action === "up" && index > 0) {
        [day.stops[index - 1], day.stops[index]] = [
          day.stops[index],
          day.stops[index - 1],
        ];
      } else if (action === "down" && index < day.stops.length - 1) {
        [day.stops[index], day.stops[index + 1]] = [
          day.stops[index + 1],
          day.stops[index],
        ];
      } else if (action === "insert-below") {
        day.stops.splice(index + 1, 0, emptyStop());
      }

      renderEditor(dayId, container);
      saveCurrentDay(dayId, container);
    });

    scroll.addEventListener("change", () => {
      saveCurrentDay(dayId, container);
    });

    scroll.addEventListener(
      "input",
      debounce(() => {
        saveCurrentDay(dayId, container);
      }, 400)
    );
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  function showToast(msg) {
    let el = document.getElementById("trip-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "trip-toast";
      el.className = "trip-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function toggleEditMode(enabled) {
    editMode = enabled;
    return editMode;
  }

  function isEditMode() {
    return editMode;
  }

  window.TripEditor = {
    renderEditor,
    setOnChange,
    toggleEditMode,
    isEditMode,
    showToast,
  };
})();
