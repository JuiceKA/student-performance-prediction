/* ==========================================================
   APP.JS — EduPredict v2.0 Frontend Logic
   Ket qua 3 muc: H (Tot), M (Kha), L (Yeu)
   ========================================================== */

const API_BASE    = "http://localhost:8000";
const HISTORY_KEY = "edupredict_history_v2";

let lastPrediction = null;
let lastFormData   = null;

/* ==========================================
   SERVER STATUS CHECK
   ========================================== */
async function checkServerStatus() {
    const dot  = document.getElementById("statusDot");
    const text = document.getElementById("statusText");
    try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            dot.className    = "status-dot online";
            text.textContent = "Server online";
        } else { throw new Error(); }
    } catch {
        dot.className    = "status-dot offline";
        text.textContent = "Server offline";
    }
}
checkServerStatus();
setInterval(checkServerStatus, 10000);

/* ==========================================
   SLIDER <-> NUMBER INPUT SYNC
   ========================================== */
function syncSlider(fieldId, maxVal) {
    const input  = document.getElementById(fieldId);
    const slider = document.getElementById(`slider_${fieldId}`);
    const fill   = document.getElementById(`fill_${fieldId}`);
    if (!slider || !fill) return;

    let val = parseInt(input.value);
    if (isNaN(val)) val = 0;
    val = Math.min(maxVal, Math.max(0, val));
    input.value  = val;
    slider.value = val;
    fill.style.width = (val / maxVal * 100) + "%";
}

function syncInput(fieldId, maxVal) {
    const slider = document.getElementById(`slider_${fieldId}`);
    const input  = document.getElementById(fieldId);
    const fill   = document.getElementById(`fill_${fieldId}`);
    if (!input || !fill) return;

    input.value = slider.value;
    fill.style.width = (parseInt(slider.value) / maxVal * 100) + "%";
}

window.addEventListener("load", () => {
    syncSlider("phat_bieu", 100);
    syncSlider("tai_lieu",  100);
    syncSlider("thong_bao", 100);
});

/* ==========================================
   MAIN PREDICTION FUNCTION
   ========================================== */
async function layDuDoan(event) {
    if (event) event.preventDefault();

    const phatBieu = parseInt(document.getElementById("phat_bieu").value);
    const taiLieu  = parseInt(document.getElementById("tai_lieu").value);
    const thongBao = parseInt(document.getElementById("thong_bao").value);
    const nghiHoc  = parseInt(document.getElementById("nghi_hoc").value);

    // Validate
    if (isNaN(phatBieu) || isNaN(taiLieu) || isNaN(thongBao)) {
        showToast("Vui long nhap day du thong tin!", "warn");
        return;
    }

    lastFormData = {
        phat_bieu: phatBieu,
        tai_lieu:  taiLieu,
        thong_bao: thongBao,
        nghi_hoc:  nghiHoc
    };

    setLoading(true);
    hideResult();

    try {
        const response = await fetch(`${API_BASE}/predict`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(lastFormData)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `HTTP ${response.status}`);
        }

        const result = await response.json();
        lastPrediction = result;

        renderResult(result);
        addToHistory(result);
        scrollToResult();

    } catch (error) {
        renderError(error.message);
    } finally {
        setLoading(false);
    }
}

/* ==========================================
   RENDER RESULT
   ========================================== */
const LEVEL_CONFIG = {
    "H": { emoji: "🌟", bannerClass: "green-banner", textClass: "green-text", badgeClass: "green-badge" },
    "M": { emoji: "📘", bannerClass: "yellow-banner", textClass: "yellow-text", badgeClass: "yellow-badge" },
    "L": { emoji: "⚠️",  bannerClass: "red-banner",    textClass: "red-text",   badgeClass: "red-badge"   }
};

function renderResult(result) {
    const level   = result.prediction;
    const cfg     = LEVEL_CONFIG[level] || LEVEL_CONFIG["M"];
    const dt      = result.decision_tree || {};
    const nb      = result.naive_bayes   || {};
    const isAgree = result.dong_thuan;

    // ---- Banner tổng hợp ----
    const banner = document.getElementById("resultBanner");
    banner.className = "result-banner " + cfg.bannerClass;
    document.getElementById("bannerIcon").textContent    = cfg.emoji;
    document.getElementById("bannerVerdict").textContent = `Mức ${level}`;
    document.getElementById("bannerVerdict").className   = "banner-verdict " + cfg.textClass;
    document.getElementById("bannerLabel").textContent   = result.ten_muc || "";

    const agreeTag = document.getElementById("agreeTag");
    agreeTag.textContent = isAgree ? "✅ 2/2 Đồng thuận" : "⚠️ Khác biệt → Dùng DT";
    agreeTag.className   = "agree-tag " + (isAgree ? "agree" : "disagree");

    // ---- Decision Tree card ----
    renderAlgoCard("dt", dt);

    // ---- Naive Bayes card ----
    renderAlgoCard("nb", nb);

    // Highlight card thắng (chinh xac hon)
    const dtAcc = parseFloat(dt.do_chinh_xac) || 0;
    const nbAcc = parseFloat(nb.do_chinh_xac) || 0;
    document.getElementById("dtCard").classList.toggle("winner", dtAcc >= nbAcc);
    document.getElementById("nbCard").classList.toggle("winner", nbAcc > dtAcc);

    // ---- Advice ----
    document.getElementById("adviceText").textContent = result.loi_khuyen || "";
    const riskBadge = document.getElementById("riskBadge");
    riskBadge.textContent = result.canh_bao || "";
    riskBadge.className   = "risk-badge " + cfg.badgeClass;

    // ---- Summary ----
    const inp = result.input || lastFormData;
    document.getElementById("sumPhatBieu").textContent = (inp.phat_bieu ?? "—") + " lần";
    document.getElementById("sumTaiLieu").textContent  = (inp.tai_lieu  ?? "—") + " lần";
    document.getElementById("sumThongBao").textContent = (inp.thong_bao ?? "—") + " lần";
    document.getElementById("sumNghiHoc").textContent  =
        typeof inp.nghi_hoc === "string" ? inp.nghi_hoc
        : (inp.nghi_hoc === 1 ? "Above-7 (Trên 7 ngày)" : "Under-7 (≤ 7 ngày)");

    // Show
    document.getElementById("resultContent").classList.remove("hidden");
    document.getElementById("resultPlaceholder").classList.add("hidden");
    document.getElementById("resultError").classList.add("hidden");
}

function renderAlgoCard(prefix, algoData) {
    const xacSuat = algoData.xac_suat || {};
    const level   = algoData.prediction || "—";
    const cfg     = LEVEL_CONFIG[level];

    document.getElementById(`${prefix}Acc`).textContent =
        algoData.do_chinh_xac ? `Độ chính xác: ${algoData.do_chinh_xac}` : "—";

    const badge = document.getElementById(`${prefix}Badge`);
    badge.textContent = level !== "—" ? `Mức ${level}` : "—";
    badge.className   = cfg ? `algo-badge ${cfg.badgeClass}` : "algo-badge";

    animateProbBar(`${prefix}FillH`, `${prefix}NumH`, xacSuat["H"] ?? 0);
    animateProbBar(`${prefix}FillM`, `${prefix}NumM`, xacSuat["M"] ?? 0);
    animateProbBar(`${prefix}FillL`, `${prefix}NumL`, xacSuat["L"] ?? 0);
}

function animateProbBar(fillId, numId, percent) {
    const fill = document.getElementById(fillId);
    const num  = document.getElementById(numId);
    if (!fill || !num) return;

    fill.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.width = percent + "%";
    }));
    num.textContent = percent.toFixed(1) + "%";
}

/* ==========================================
   RENDER ERROR
   ========================================== */
function renderError(msg) {
    document.getElementById("resultContent").classList.add("hidden");
    document.getElementById("resultPlaceholder").classList.add("hidden");
    document.getElementById("resultError").classList.remove("hidden");

    const errEl = document.getElementById("errorMsg");
    if (msg && msg.toLowerCase().includes("fetch")) {
        errEl.innerHTML = `Khong the ket noi toi may chu Backend.<br>
            Dam bao server dang chay tai <code>http://localhost:8000</code>.<br><br>
            Chay: <code>start_server.bat</code>`;
    } else {
        errEl.textContent = `Loi: ${msg}`;
    }
}

/* ==========================================
   HISTORY
   ========================================== */
function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch { return []; }
}

function saveHistory(h) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20)));
}

function addToHistory(result) {
    const history = loadHistory();
    const inp = result.input || lastFormData;
    history.unshift({
        level:     result.prediction,
        tenMuc:    result.ten_muc,
        phatBieu:  inp.phat_bieu,
        taiLieu:   inp.tai_lieu,
        thongBao:  inp.thong_bao,
        nghiHoc:   typeof inp.nghi_hoc === "string" ? inp.nghi_hoc : (inp.nghi_hoc === 1 ? "Above-7 (Tren 7 ngay)" : "Under-7 (<= 7 ngay)"),
        time:      new Date().toLocaleTimeString("vi-VN"),
        date:      new Date().toLocaleDateString("vi-VN")
    });
    saveHistory(history);
    renderHistory();
}

function renderHistory() {
    const history  = loadHistory();
    const listEl   = document.getElementById("historyList");
    const clearBtn = document.getElementById("clearHistoryBtn");

    if (!history.length) {
        listEl.innerHTML = `<div class="history-empty"><span>📭</span><p>Chua co lich su du doan. Hay thuc hien du doan dau tien!</p></div>`;
        clearBtn.classList.add("hidden");
        return;
    }

    clearBtn.classList.remove("hidden");
    listEl.innerHTML = history.map(h => `
        <div class="history-item">
            <span class="h-level ${h.level}">${h.level}</span>
            <div class="h-details">
                <strong>${h.tenMuc || h.level}</strong> &nbsp;|&nbsp;
                Phat bieu: <strong>${h.phatBieu}</strong> &nbsp;|&nbsp;
                Tai lieu: <strong>${h.taiLieu}</strong> &nbsp;|&nbsp;
                Thong bao: <strong>${h.thongBao}</strong> &nbsp;|&nbsp;
                Nghi: <strong>${h.nghiHoc}</strong>
            </div>
            <div class="h-time">${h.time}<br/>${h.date}</div>
        </div>
    `).join("");
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showToast("Da xoa lich su!");
}

renderHistory();

/* ==========================================
   RESET FORM
   ========================================== */
function resetForm() {
    document.getElementById("phat_bieu").value = "50";
    document.getElementById("tai_lieu").value  = "60";
    document.getElementById("thong_bao").value = "40";
    document.getElementById("nghi_hoc").value  = "0";

    syncSlider("phat_bieu", 100);
    syncSlider("tai_lieu",  100);
    syncSlider("thong_bao", 100);

    hideResult();
    document.getElementById("resultPlaceholder").classList.remove("hidden");
    lastPrediction = null;
}

function retryPredict() {
    if (lastFormData) layDuDoan(null);
}

/* ==========================================
   COPY RESULT
   ========================================== */
function copyResult() {
    if (!lastPrediction) return;
    const inp = lastPrediction.input || lastFormData;
    const text = [
        "=== KET QUA DU DOAN HOC TAP SINH VIEN ===",
        `Muc: ${lastPrediction.prediction} — ${lastPrediction.ten_muc}`,
        `Canh bao: ${lastPrediction.canh_bao}`,
        "---",
        `Phat bieu:  ${inp.phat_bieu} lan`,
        `Tai lieu:   ${inp.tai_lieu} lan`,
        `Thong bao:  ${inp.thong_bao} lan`,
        `Nghi hoc:   ${typeof inp.nghi_hoc === "string" ? inp.nghi_hoc : (inp.nghi_hoc === 1 ? "Above-7 (Tren 7 ngay)" : "Under-7 (<= 7 ngay)")}`,
        "---",
        `Loi khuyen: ${lastPrediction.loi_khuyen}`,
        `Thoi gian: ${new Date().toLocaleString("vi-VN")}`
    ].join("\n");

    navigator.clipboard.writeText(text)
        .then(() => showToast("Da sao chep ket qua!"))
        .catch(() => showToast("Khong the sao chep", "warn"));
}

/* ==========================================
   HELPERS
   ========================================== */
function hideResult() {
    document.getElementById("resultContent").classList.add("hidden");
    document.getElementById("resultError").classList.add("hidden");
    document.getElementById("resultPlaceholder").classList.add("hidden");
}

function setLoading(isLoading) {
    const btn  = document.getElementById("predictBtn");
    const text = document.getElementById("btnText");
    const load = document.getElementById("btnLoading");
    btn.disabled = isLoading;
    text.classList.toggle("hidden", isLoading);
    load.classList.toggle("hidden", !isLoading);
}

function scrollToResult() {
    document.getElementById("resultPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ==========================================
   TOAST
   ========================================== */
function showToast(msg, type = "success") {
    const toast    = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    toastMsg.textContent = msg;
    toast.style.background = type === "warn"
        ? "rgba(245,158,11,0.9)"
        : "rgba(16,185,129,0.9)";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}
