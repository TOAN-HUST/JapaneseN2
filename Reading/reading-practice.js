/**
 * reading-practice.js
 * ─────────────────────────────────────────────────────────────
 * Engine tái sử dụng cho trang luyện đọc JLPT N2
 *
 * Cách dùng trong file HTML:
 *   1. Nhúng CSS:  <link rel="stylesheet" href="../shared/reading-practice.css">
 *   2. Đặt HTML skeleton (xem template bên dưới).
 *   3. Nhúng script này: <script src="../shared/reading-practice.js"></script>
 *   4. Gọi:  ReadingPractice.init({ data: DATA, storageKey: 'my_key', badge: 'N2 読解' });
 *
 * Mỗi phần tử trong `data` cần có:
 *   { id, dataJp, dataVn, dataAnalysis }
 *
 * HTML skeleton tối giản (copy vào trang của bạn):
 * ──────────────────────────────────────────────────
 *   <header>
 *     <div class="rp-logo">JLPT N2 <span>/ Luyện đọc</span></div>
 *   </header>
 *   <div class="rp-progress-wrap">
 *     <div class="rp-progress-meta">
 *       <span id="rp-progLabel"></span>
 *       <span id="rp-progPct"></span>
 *     </div>
 *     <div class="rp-progress-bar-bg">
 *       <div class="rp-progress-bar-fill" id="rp-progressBar" style="width:0%"></div>
 *     </div>
 *   </div>
 *   <div class="rp-card" id="rp-mainCard">
 *     <div class="rp-card-header">
 *       <span class="rp-badge" id="rp-badge">N2 読解</span>
 *       <span class="rp-passage-id" id="rp-passageId"></span>
 *     </div>
 *     <div class="rp-japanese-text" id="rp-jpText"></div>
 *     <button class="rp-toggle-btn" id="rp-toggleBtn" onclick="ReadingPractice.toggleMeaning()">
 *       <span>📖 Xem nghĩa &amp; giải thích</span>
 *       <span class="rp-arrow">▼</span>
 *     </button>
 *     <div class="rp-meaning-panel" id="rp-meaningPanel">
 *       <div class="rp-meaning-inner">
 *         <div class="rp-vn-block">
 *           <div class="rp-section-label">🇻🇳 Dịch nghĩa Tiếng Việt</div>
 *           <p id="rp-vnText"></p>
 *         </div>
 *         <div class="rp-analysis-block">
 *           <div class="rp-section-label">✏️ Giải thích ngữ pháp</div>
 *           <p id="rp-analysisText"></p>
 *         </div>
 *       </div>
 *     </div>
 *     <div class="rp-actions">
 *       <div id="rp-doneBadge" class="rp-done-badge" style="display:none">✅ Đã xem xong</div>
 *       <button class="rp-btn-next" id="rp-nextBtn" onclick="ReadingPractice.nextPassage()">
 *         Chuyển sang đoạn tiếp theo →
 *       </button>
 *     </div>
 *   </div>
 *   <div class="rp-card rp-completion-card" id="rp-completionCard">
 *     <div class="rp-completion-icon">🎉</div>
 *     <div class="rp-completion-title">Hoàn thành tất cả đoạn!</div>
 *     <div class="rp-completion-sub">Bạn đã đọc hết toàn bộ bài luyện đọc.</div>
 *     <button class="rp-btn-restart" onclick="ReadingPractice.restartAll()">↺ Học lại từ đầu</button>
 *   </div>
 *   <div class="rp-dot-grid" id="rp-dotGrid"></div>
 * ──────────────────────────────────────────────────
 */

const ReadingPractice = (() => {
  let _data = [];
  let _storageKey = "rp_default";
  let _state = { currentIndex: 0, done: [] };

  // ── STATE HELPERS ────────────────────────────────────────
  function _loadState() {
    try {
      const raw = localStorage.getItem(_storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { currentIndex: 0, done: [] };
  }

  function _saveState() {
    localStorage.setItem(_storageKey, JSON.stringify(_state));
  }

  // ── DOM HELPERS ──────────────────────────────────────────
  function _el(id) {
    return document.getElementById(id);
  }

  // ── RENDER ───────────────────────────────────────────────
  function _render() {
    const total = _data.length;
    const idx = _state.currentIndex;
    const isDone = idx >= total;

    const mainCard = _el("rp-mainCard");
    const completionCard = _el("rp-completionCard");

    if (isDone) {
      mainCard.style.display = "none";
      completionCard.classList.add("show");
      _renderDots();
      return;
    }

    mainCard.style.display = "block";
    completionCard.classList.remove("show");

    const item = _data[idx];

    _el("rp-passageId").textContent = `Đoạn #${item.id}`;
    _el("rp-jpText").textContent = item.dataJp;
    _el("rp-vnText").textContent = item.dataVn;
    _el("rp-analysisText").textContent = item.dataAnalysis;

    // Reset toggle
    const panel = _el("rp-meaningPanel");
    const btn = _el("rp-toggleBtn");
    panel.classList.remove("open");
    btn.classList.remove("open");

    // Done badge
    const alreadyDone = _state.done.includes(idx);
    _el("rp-doneBadge").style.display = alreadyDone ? "flex" : "none";

    // Next button label
    const nextBtn = _el("rp-nextBtn");
    nextBtn.textContent =
      idx === total - 1 ? "Hoàn thành 🎉" : "Chuyển sang đoạn tiếp theo →";
    nextBtn.disabled = false;

    // Progress
    const doneCount = _state.done.length;
    const pct = Math.round((doneCount / total) * 100);
    _el("rp-progLabel").textContent = `Đoạn ${idx + 1} / ${total}`;
    _el("rp-progPct").textContent = `${pct}% hoàn thành`;
    _el("rp-progressBar").style.width = pct + "%";

    _renderDots();
  }

  function _renderDots() {
    const grid = _el("rp-dotGrid");
    if (!grid) return;
    grid.innerHTML = "";
    _data.forEach((item, i) => {
      const dot = document.createElement("div");
      dot.className = "rp-dot";
      dot.textContent = i + 1;
      if (i === _state.currentIndex) dot.classList.add("current");
      else if (_state.done.includes(i)) dot.classList.add("done");
      dot.title = `Đoạn ${i + 1}`;
      dot.onclick = () => jumpTo(i);
      grid.appendChild(dot);
    });
  }

  // ── PUBLIC API ───────────────────────────────────────────

  /**
   * Khởi tạo engine.
   * @param {Object} options
   * @param {Array}  options.data        - Mảng dữ liệu { id, dataJp, dataVn, dataAnalysis }
   * @param {string} [options.storageKey] - Key localStorage (mặc định: 'rp_default')
   * @param {string} [options.badge]      - Text trên badge (mặc định: 'N2 読解')
   */
  function init({ data, storageKey = "rp_default", badge = "N2 読解" } = {}) {
    if (!data || !data.length) {
      console.error(
        "[ReadingPractice] data is required and must not be empty.",
      );
      return;
    }
    _data = data;
    _storageKey = storageKey;
    _state = _loadState();

    const badgeEl = _el("rp-badge");
    if (badgeEl) badgeEl.textContent = badge;

    _render();
  }

  function toggleMeaning() {
    const panel = _el("rp-meaningPanel");
    const btn = _el("rp-toggleBtn");
    const isOpen = panel.classList.toggle("open");
    btn.classList.toggle("open", isOpen);
  }

  function nextPassage() {
    const idx = _state.currentIndex;
    if (!_state.done.includes(idx)) _state.done.push(idx);
    _state.currentIndex = idx + 1;
    _saveState();
    _render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function jumpTo(i) {
    _state.currentIndex = i;
    _saveState();
    _render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restartAll() {
    _state = { currentIndex: 0, done: [] };
    _saveState();
    _render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return { init, toggleMeaning, nextPassage, jumpTo, restartAll };
})();
