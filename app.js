/* =============================================
   APP.JS - EduPredict Frontend Logic
   ============================================= */

const API_BASE = "http://localhost:8000";
const HISTORY_KEY = "edupredict_history";

let lastPrediction = null;
let lastFormData = null;

/* ==========================================
   SERVER STATUS CHECK
   ========================================== */
async function checkServerStatus() {
    const dot  = document.getElementById("statusDot");
    const text = document.getElementById("statusText");
    try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            dot.className   = "status-dot online";
            text.textContent = "Server online";
        } else { throw new Error(); }
    } catch {
        dot.className   = "status-dot offline";
        text.textContent = "Server offline";
    }
}

checkServerStatus();
setInterval(checkServerStatus, 10000);


/* ==========================================
   CAP NHAT DIEM CHUYEN CAN TU TINH
   ========================================== */
function updateChuyenCan() {
    const buoiVang = parseInt(document.getElementById("buoi_vang").value) || 0;
    const cc = Math.max(0, 10 - buoiVang);

    document.getElementById("chuyenCanValue").textContent = cc.toFixed(1);
    document.getElementById("chuyenCanFill").style.width  = (cc / 10 * 100) + "%";

    // Doi mau theo muc do
    const valEl = document.getElementById("chuyenCanValue");
    if (cc >= 7)       valEl.style.color = "var(--pass-color)";
    else if (cc >= 5)  valEl.style.color = "var(--accent-2)";
    else               valEl.style.color = "var(--fail-color)";
}


/* ==========================================
   SLIDER ↔ INPUT SYNC
   ========================================== */
function syncSlider(fieldId, maxVal) {
    const input  = document.getElementById(fieldId);
    const slider = document.getElementById(`slider_${fieldId}`);
    const fill   = document.getElementById(`fill_${fieldId}`);
    if (!slider || !fill) return;

    let val = parseFloat(input.value);
    if (isNaN(val)) val = 0;
    val = Math.min(maxVal, Math.max(0, val));

    slider.value = val;
    const pct = (val / maxVal) * 100;
    fill.style.width = pct + "%";
}

function syncInput(fieldId, maxVal) {
    const slider = document.getElementById(`slider_${fieldId}`);
    const input  = document.getElementById(fieldId);
    const fill   = document.getElementById(`fill_${fieldId}`);
    if (!input || !fill) return;

    input.value = slider.value;
    const pct = (parseFloat(slider.value) / maxVal) * 100;
    fill.style.width = pct + "%";
}

// Init fill bars on load
window.addEventListener("load", () => {
    syncSlider("buoi_vang", 15);
    syncSlider("giua_ky",   10);
    syncSlider("cuoi_ky",   10);
    updateChuyenCan();
});


/* ==========================================
   MAIN PREDICTION FUNCTION
   ========================================== */
async function layDuDoan(event) {
    if (event) event.preventDefault();

    const buoiVang = parseInt(document.getElementById("buoi_vang").value);
    const giuaKy   = parseFloat(document.getElementById("giua_ky").value);
    const cuoiKy   = parseFloat(document.getElementById("cuoi_ky").value);
    const gioiTinh = parseInt(document.querySelector('input[name="gioi_tinh"]:checked').value);

    // Validate
    if (isNaN(buoiVang) || isNaN(giuaKy) || isNaN(cuoiKy)) {
        showToast("⚠️ Vui long nhap day du thong tin!", "warn");
        return;
    }
    if (buoiVang < 0 || buoiVang > 15) {
        showToast("⚠️ So buoi vang phai trong khoang 0 - 15!", "warn");
        return;
    }
    if (giuaKy < 0 || giuaKy > 10 || cuoiKy < 0 || cuoiKy > 10) {
        showToast("⚠️ Diem giua ky/cuoi ky phai trong khoang 0 - 10!", "warn");
        return;
    }

    // Store for retry
    lastFormData = { buoi_vang: buoiVang, giua_ky: giuaKy, cuoi_ky: cuoiKy, gioi_tinh: gioiTinh };

    // UI: show loading
    setLoading(true);
    hideAll();

    try {
        const response = await fetch(`${API_BASE}/predict`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lastFormData)
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
function renderResult(result) {
    const isPass  = result.prediction === 1;
    const probPass = result.prob_pass ?? (result.probability[1] * 100).toFixed(2);
    const probFail = result.prob_fail ?? (result.probability[0] * 100).toFixed(2);

    // Banner
    const banner = document.getElementById("resultBanner");
    banner.className = "result-banner " + (isPass ? "pass-banner" : "fail-banner");
    document.getElementById("bannerIcon").textContent    = isPass ? "🎉" : "⚠️";
    document.getElementById("bannerVerdict").textContent = isPass ? "ĐẠT" : "TRƯỢT";
    document.getElementById("bannerProb").textContent    =
        isPass
            ? `Xác suất đạt: ${probPass}%`
            : `Xác suất trượt: ${probFail}%`;

    // Gauge circles
    const CIRCUMFERENCE = 2 * Math.PI * 40; // 251.2
    animateGauge("arcPass", parseFloat(probPass), CIRCUMFERENCE);
    animateGauge("arcFail", parseFloat(probFail), CIRCUMFERENCE);
    document.getElementById("numPass").textContent = parseFloat(probPass).toFixed(1);
    document.getElementById("numFail").textContent = parseFloat(probFail).toFixed(1);

    // Risk
    const riskMap = {
        "Thấp":    { cls: "risk-low",    emoji: "🟢" },
        "Trung bình": { cls: "risk-medium", emoji: "🟡" },
        "Cao":     { cls: "risk-high",   emoji: "🔴" },
        "Rất cao": { cls: "risk-high",   emoji: "🔴" }
    };
    const riskInfo = riskMap[result.risk_level] || { cls: "risk-medium", emoji: "⚠️" };
    const riskLevelEl = document.getElementById("riskLevel");
    riskLevelEl.textContent = result.risk_level || "—";
    riskLevelEl.className   = "risk-level " + riskInfo.cls;
    document.getElementById("riskAdvice").textContent = result.advice || "";

    // Summary
    const inp = result.input || lastFormData;
    const cc  = result.chuyen_can_auto ?? Math.max(0, 10 - (inp.buoi_vang || 0));
    document.getElementById("sumBuoiVang").textContent  = (inp.buoi_vang ?? "—") + " buoi";
    document.getElementById("sumChuyenCan").textContent = cc.toFixed(1) + "/10";
    document.getElementById("sumGiuaKy").textContent    = inp.giua_ky    ?? "—";
    document.getElementById("sumCuoiKy").textContent    = inp.cuoi_ky    ?? "—";
    document.getElementById("sumGioiTinh").textContent  =
        typeof inp.gioi_tinh === "string" ? inp.gioi_tinh
        : (inp.gioi_tinh === 1 ? "Nam" : "Nu");

    // Show content
    document.getElementById("resultContent").classList.remove("hidden");
    document.getElementById("resultPlaceholder").classList.add("hidden");
    document.getElementById("resultError").classList.add("hidden");
}

function animateGauge(arcId, percent, circumference) {
    const arc = document.getElementById(arcId);
    const offset = circumference - (percent / 100) * circumference;
    // Start hidden then animate
    arc.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            arc.style.strokeDashoffset = offset;
        });
    });
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
        errEl.innerHTML = `Không thể kết nối tới máy chủ Backend.<br>
            Hãy đảm bảo server đang chạy tại <code>http://localhost:8000</code>.<br><br>
            Chạy lệnh: <code>uvicorn main:app --reload</code>`;
    } else {
        errEl.textContent = `Lỗi: ${msg}`;
    }
}

/* ==========================================
   HISTORY
   ========================================== */
function loadHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch { return []; }
}

function saveHistory(history) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

function addToHistory(result) {
    const history = loadHistory();
    const isPass  = result.prediction === 1;
    const probPass = result.prob_pass ?? (result.probability[1] * 100).toFixed(2);
    const inp     = result.input || lastFormData;
    const cc      = result.chuyen_can_auto ?? Math.max(0, 10 - (inp.buoi_vang || 0));

    history.unshift({
        verdict:    isPass ? "DAT" : "TRUOT",
        isPass,
        probPass:   parseFloat(probPass).toFixed(1),
        buoiVang:   inp.buoi_vang,
        chuyenCan:  cc.toFixed(1),
        giuaKy:     inp.giua_ky,
        cuoiKy:     inp.cuoi_ky,
        gioiTinh:   typeof inp.gioi_tinh === "string" ? inp.gioi_tinh : (inp.gioi_tinh === 1 ? "Nam" : "Nu"),
        time:       new Date().toLocaleTimeString("vi-VN"),
        date:       new Date().toLocaleDateString("vi-VN")
    });

    saveHistory(history);
    renderHistory();
}

function renderHistory() {
    const history    = loadHistory();
    const listEl     = document.getElementById("historyList");
    const clearBtn   = document.getElementById("clearHistoryBtn");

    if (!history.length) {
        listEl.innerHTML = `
            <div class="history-empty">
                <span>📭</span>
                <p>Chưa có lịch sử dự đoán. Hãy thực hiện dự đoán đầu tiên!</p>
            </div>`;
        clearBtn.classList.add("hidden");
        return;
    }

    clearBtn.classList.remove("hidden");
    listEl.innerHTML = history.map(h => `
        <div class="history-item">
            <span class="h-verdict ${h.isPass ? 'pass' : 'fail'}">${h.verdict}</span>
            <div class="h-details">
                Vang: <strong>${h.buoiVang} buoi</strong> &nbsp;|&nbsp;
                Chuyen can: <strong>${h.chuyenCan}/10</strong> &nbsp;|&nbsp;
                Giua: <strong>${h.giuaKy}</strong> &nbsp;|&nbsp;
                Cuoi: <strong>${h.cuoiKy}</strong> &nbsp;|&nbsp;
                ${h.gioiTinh}
                <span class="h-prob">${h.probPass}%</span>
            </div>
            <div class="h-time">${h.time}<br/>${h.date}</div>
        </div>
    `).join("");
}

function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showToast("🗑 Đã xóa lịch sử!");
}

// Load history on start
renderHistory();

/* ==========================================
   RESET FORM
   ========================================== */
function resetForm() {
    document.getElementById("predictForm").reset();
    document.getElementById("buoi_vang").value = "2";
    document.getElementById("giua_ky").value   = "7.0";
    document.getElementById("cuoi_ky").value   = "7.5";
    document.getElementById("gender_male").checked = true;

    syncSlider("buoi_vang", 15);
    syncSlider("giua_ky",   10);
    syncSlider("cuoi_ky",   10);
    updateChuyenCan();

    hideAll();
    document.getElementById("resultPlaceholder").classList.remove("hidden");
    lastPrediction = null;
}

function retryPredict() {
    if (lastFormData) {
        layDuDoan(null);
    }
}

/* ==========================================
   COPY RESULT
   ========================================== */
function copyResult() {
    if (!lastPrediction) return;
    const isPass  = lastPrediction.prediction === 1;
    const probPass = lastPrediction.prob_pass ?? (lastPrediction.probability[1] * 100).toFixed(2);
    const probFail = lastPrediction.prob_fail ?? (lastPrediction.probability[0] * 100).toFixed(2);
    const inp     = lastPrediction.input || lastFormData;

    const text = [
        "=== KẾT QUẢ DỰ ĐOÁN SINH VIÊN ===",
        `Kết quả: ${isPass ? "ĐẠT ✅" : "TRƯỢT ❌"}`,
        `Xác suất đạt: ${probPass}%`,
        `Xác suất trượt: ${probFail}%`,
        `Mức rủi ro: ${lastPrediction.risk_level}`,
        "---",
        `Chuyên cần: ${inp.chuyen_can}`,
        `Giữa kỳ:   ${inp.giua_ky}`,
        `Giờ LMS:   ${inp.gio_lms}h`,
        `Giới tính: ${typeof inp.gioi_tinh === "string" ? inp.gioi_tinh : (inp.gioi_tinh === 1 ? "Nam" : "Nữ")}`,
        "---",
        `Lời khuyên: ${lastPrediction.advice}`,
        `Thời gian: ${new Date().toLocaleString("vi-VN")}`
    ].join("\n");

    navigator.clipboard.writeText(text)
        .then(() => showToast("✅ Đã sao chép kết quả!"))
        .catch(() => showToast("❌ Không thể sao chép", "warn"));
}

/* ==========================================
   TOAST NOTIFICATION
   ========================================== */
function showToast(msg, type = "success") {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    toastMsg.textContent = msg;
    toast.style.background = type === "warn"
        ? "rgba(245,158,11,0.9)"
        : "rgba(16,185,129,0.9)";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

/* ==========================================
   HELPERS
   ========================================== */
function hideAll() {
    document.getElementById("resultContent").classList.add("hidden");
    document.getElementById("resultError").classList.add("hidden");
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
   ACTIVE NAV ON SCROLL
   ========================================== */
const sections = [
    { id: "hero",            nav: "nav-home" },
    { id: "predict-section", nav: "nav-predict" },
    { id: "about",           nav: "nav-about" }
];

window.addEventListener("scroll", () => {
    const scrollY = window.scrollY + 120;
    sections.forEach(({ id, nav }) => {
        const section = document.getElementById(id);
        const navLink = document.getElementById(nav);
        if (!section || !navLink) return;
        const top    = section.offsetTop;
        const bottom = top + section.offsetHeight;
        navLink.classList.toggle("active", scrollY >= top && scrollY < bottom);
    });
}, { passive: true });

/* ==========================================
   INTERSECTION OBSERVER (animations)
   ========================================== */
const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    },
    { threshold: 0.15 }
);

document.querySelectorAll(".step-card, .feature, .tech-item").forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    observer.observe(el);
});
