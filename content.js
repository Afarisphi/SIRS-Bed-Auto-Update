(async function () {

  if (window.__SIRS_RUNNING__) return;
  window.__SIRS_RUNNING__ = true;

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getTodayLocal() {
    const now = new Date();
    return (
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0")
    );
  }

  const TODAY = getTodayLocal();

  /* =========================
     WAIT TABLE READY
  ========================== */
  async function waitTable() {
    while (!document.querySelector("#example2 tbody tr")) {
      await delay(500);
    }
  }

  /* =========================
     WAIT TABLE CHANGE (ANTI SKIP)
  ========================== */
  async function waitTableChange(prev) {
    let retry = 0;

    while (retry < 30) {
      const firstRow = document.querySelector("#example2 tbody tr");

      if (!firstRow) {
        await delay(300);
        retry++;
        continue;
      }

      if (firstRow.innerText !== prev) return;

      await delay(300);
      retry++;
    }
  }

  /* =========================
     TOTAL PAGE
  ========================== */
  function getTotalPages() {
    const pages = document.querySelectorAll("#example2_paginate ul li a");
    let max = 1;

    pages.forEach(p => {
      const num = parseInt(p.textContent.trim());
      if (!isNaN(num) && num > max) max = num;
    });

    return max;
  }

  /* =========================
     GO TO PAGE (STABLE)
  ========================== */
  async function goToPage(pageNumber) {

    const prev =
      document.querySelector("#example2 tbody tr")?.innerText || "";

    const pages = document.querySelectorAll("#example2_paginate ul li");

    for (let li of pages) {
      const a = li.querySelector("a");
      if (!a) continue;

      if (a.textContent.trim() === String(pageNumber)) {

        a.click();

        await waitTableChange(prev);

        await delay(200);

        break;
      }
    }
  }

  function parseDate(str) {
    if (!str) return "";
    return str.split(" ")[0].trim();
  }

  /* =========================
     SCAN ALL PAGE
  ========================== */
  async function scanAllPages() {

    const beds = [];
    const totalPages = getTotalPages();

    for (let i = 1; i <= totalPages; i++) {

      await goToPage(i);

      await delay(200);

      const rows = document.querySelectorAll("#example2 tbody tr");

      rows.forEach(row => {

        const cells = row.querySelectorAll("td");
        if (cells.length < 7) return;

        const kelas = cells[1].innerText.trim();
        const ruang = cells[2].innerText.trim();
        const tanggal = parseDate(cells[5].innerText);

        const editLink = cells[6].querySelector("a[href*='/edit/']");
        if (!editLink) return;

        const idMatch = editLink.href.match(/edit\/(\d+)/);
        if (!idMatch) return;

        const id = idMatch[1];

        // tampilkan SEMUA bed (bukan cuma yang perlu update)
        beds.push({
          id,
          kelas,
          ruang,
          tanggal,
          url: editLink.href,
          needUpdate: tanggal !== TODAY
        });

      });
    }

    return beds;
  }

  /* =========================
     DRAG PANEL
  ========================== */
  function makeDraggable(panel, header) {

    let isDown = false, offsetX = 0, offsetY = 0;

    header.style.cursor = "move";

    header.addEventListener("mousedown", e => {
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
  }

  /* =========================
     PANEL UI
  ========================== */
  function createPanel(beds) {

    if (document.getElementById("sirsPanel")) return;

    const panel = document.createElement("div");
    panel.id = "sirsPanel";

    panel.style.position = "fixed";
    panel.style.top = "120px";
    panel.style.left = "60px";
    panel.style.width = "350px";
    panel.style.maxHeight = "520px";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.background = "#0d0d0d";
    panel.style.color = "#00ff88";
    panel.style.border = "1px solid #00aa55";
    panel.style.borderRadius = "12px";
    panel.style.zIndex = "999999";
    panel.style.boxShadow = "0 0 20px rgba(0,255,120,0.3)";
    panel.style.overflow = "hidden";

    panel.innerHTML = `
      <div id="header" style="padding:10px;background:#111;font-weight:bold;">
        SIRS Auto Bed Update
        <div style="margin-top:8px;">
          <button id="selectAll">Select All</button>
          <button id="clearAll">Clear</button>
          <button id="updateBtn">Update</button>
          <button id="rescanBtn">Scan</button>
        </div>
      </div>

      <div id="content" style="padding:10px;overflow:auto;flex:1;"></div>
    `;

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector("#header"));

    const content = panel.querySelector("#content");

    /* SUMMARY */
    const need = beds.filter(b => b.needUpdate).length;

    content.innerHTML = `
      <div style="margin-bottom:10px;">
        Total: ${beds.length}<br>
        Perlu update: ${need}
      </div>
    `;

    /* LIST */
    beds.forEach(bed => {

      const div = document.createElement("div");

      div.style.padding = "6px";
      div.style.marginBottom = "6px";
      div.style.border = "1px solid #003322";
      div.style.borderRadius = "6px";

      div.innerHTML = `
        <label>
          <input type="checkbox" value="${bed.id}" data-url="${bed.url}">
          <strong>${bed.ruang}</strong><br>
          <small>${bed.kelas}</small><br>
          <small style="color:${bed.needUpdate ? '#ff5555' : '#00ff88'}">
            ${bed.tanggal}
          </small>
        </label>
      `;

      content.appendChild(div);
    });

    /* BUTTON ACTION */
    const checkboxes = panel.querySelectorAll("input[type='checkbox']");

    panel.querySelector("#selectAll").onclick =
      () => checkboxes.forEach(cb => cb.checked = true);

    panel.querySelector("#clearAll").onclick =
      () => checkboxes.forEach(cb => cb.checked = false);

    panel.querySelector("#updateBtn").onclick = async () => {

      const selected = panel.querySelectorAll("input:checked");

      if (selected.length === 0) {
        alert("Pilih minimal 1 bed");
        return;
      }

      if (!confirm(`Update ${selected.length} bed?`)) return;

      for (let cb of selected) {

        const tab = window.open(cb.dataset.url, "_blank");

        await delay(2500);

        tab.document.querySelector("#simpan")?.click();

        await delay(1500);

        tab.close();

        await delay(800);
      }

      alert("Update selesai");
    };

    panel.querySelector("#rescanBtn").onclick = async () => {
      panel.remove();
      await init();
    };
  }

  /* =========================
     INIT
  ========================== */
  async function init() {

    if (!location.href.includes("/fo/formtt")) return;

    await waitTable();

    const beds = await scanAllPages();

    createPanel(beds);
  }

  init();

})();