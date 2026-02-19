(async function () {

  console.log("SIRS Auto Bed Update Loaded");

  /* =========================
     FORMAT TANGGAL LOKAL
  ========================== */
  function getTodayLocal() {
    const now = new Date();
    return (
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0")
    );
  }

  const TODAY = getTodayLocal();
  const CACHE_KEY = "SIRS_BED_CACHE_" + TODAY;

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    return dateStr.split(" ")[0].trim();
  }

  /* =========================
     DETEKSI INDEX KOLOM TGL
  ========================== */
  function getTglUpdateColumnIndex() {
    const headers = document.querySelectorAll("#example2 thead th");

    for (let i = 0; i < headers.length; i++) {
      if (headers[i].textContent.trim().includes("Tgl Update")) {
        return i;
      }
    }
    return -1;
  }

  function getTotalPages() {
    const pages = document.querySelectorAll("#example2_paginate ul li a");
    let max = 1;
    pages.forEach(p => {
      const num = parseInt(p.textContent.trim());
      if (!isNaN(num) && num > max) max = num;
    });
    return max;
  }

  async function goToPage(pageNumber) {
    const pages = document.querySelectorAll("#example2_paginate ul li");

    for (let li of pages) {
      const a = li.querySelector("a");
      if (!a) continue;

      if (a.textContent.trim() === String(pageNumber)) {
        a.click();

        let attempts = 0;
        while (!li.classList.contains("active") && attempts < 20) {
          await delay(200);
          attempts++;
        }

        await delay(300);
        break;
      }
    }
  }

  /* =========================
        SCAN ALL PAGE
  ========================== */
  async function scanAllPages() {

    const tglIndex = getTglUpdateColumnIndex();
    if (tglIndex === -1) {
      console.log("Kolom Tgl Update tidak ditemukan");
      return 0;
    }

    let bedsNeedUpdate = 0;
    const totalPages = getTotalPages();

    for (let i = 1; i <= totalPages; i++) {

      await goToPage(i);

      const rows = document.querySelectorAll("#example2 tbody tr");

      rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length <= tglIndex) return;

        const tglUpdate = parseDate(cells[tglIndex].textContent);

        if (!tglUpdate) return;

        if (tglUpdate !== TODAY) {
          bedsNeedUpdate++;
        }
      });
    }

    return bedsNeedUpdate;
  }

  /* =========================
        CREATE PANEL
  ========================== */
  function createPanel(totalNeedUpdate, scannedTime) {

    if (document.getElementById("sirsAutoPanel")) return;

    const panel = document.createElement("div");
    panel.id = "sirsAutoPanel";

    panel.style.position = "fixed";
    panel.style.top = "120px";
    panel.style.left = "50px";
    panel.style.background = "#1976d2";
    panel.style.color = "white";
    panel.style.padding = "14px 16px";
    panel.style.borderRadius = "12px";
    panel.style.zIndex = "999999";
    panel.style.fontSize = "13px";
    panel.style.boxShadow = "0 6px 18px rgba(0,0,0,0.3)";
    panel.style.cursor = "move";
    panel.style.minWidth = "200px";

    panel.innerHTML = `
      <div style="font-weight:bold;margin-bottom:8px;">
        SIRS Auto Bed Update
      </div>

      <div style="margin-bottom:6px;">
        ${
          totalNeedUpdate > 0
            ? `<span style="color:#ffcccc">${totalNeedUpdate} bed perlu update</span>`
            : `<span style="color:#ccffcc">Semua sudah update hari ini</span>`
        }
      </div>

      <div style="font-size:11px;opacity:0.85;margin-bottom:8px;">
        Last Scan: ${scannedTime}
      </div>

      <button id="rescanBtn" style="
        padding:5px 10px;
        border:none;
        border-radius:6px;
        background:white;
        color:#1976d2;
        cursor:pointer;
        font-size:12px;
      ">
        Scan Ulang
      </button>
    `;

    document.body.appendChild(panel);

    /* DRAG */
    let offsetX, offsetY, isDown = false;

    panel.addEventListener("mousedown", e => {
      isDown = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
    });

    document.addEventListener("mousemove", e => {
      if (!isDown) return;
      panel.style.left = e.clientX - offsetX + "px";
      panel.style.top = e.clientY - offsetY + "px";
    });

    document.addEventListener("mouseup", () => {
      isDown = false;
    });

    document.getElementById("rescanBtn").onclick = async () => {
      sessionStorage.removeItem(CACHE_KEY);
      panel.remove();
      await init(true);
    };
  }

  async function init(force = false) {

    if (!document.querySelector("#example2")) return;

    if (!force) {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        createPanel(data.total, data.time);
        return;
      }
    }

    const totalNeedUpdate = await scanAllPages();
    const scannedTime = new Date().toLocaleTimeString();

    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        total: totalNeedUpdate,
        time: scannedTime
      })
    );

    createPanel(totalNeedUpdate, scannedTime);
  }

  const interval = setInterval(() => {
    if (document.querySelector("#example2")) {
      clearInterval(interval);
      init();
    }
  }, 1000);

})();
