(async function () {

  if (window.__SIRS_RUNNING__) return;
  window.__SIRS_RUNNING__ = true;

  const CACHE_KEY = "SIRS_BED_CACHE_V3";

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

  async function waitTable() {
    while (!document.querySelector("#example2 tbody tr")) {
      await delay(500);
    }
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
        await delay(1200);
        break;
      }
    }
  }

  function parseDate(str) {
    if (!str) return "";
    return str.split(" ")[0].trim();
  }

  async function scanAllPages() {

    const beds = [];
    const totalPages = getTotalPages();

    for (let i = 1; i <= totalPages; i++) {

      await goToPage(i);

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

        if (tanggal !== TODAY) {
          beds.push({
            id,
            kelas,
            ruang,
            tanggal,
            url: editLink.href
          });
        }
      });
    }

    return beds;
  }

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

  function createPanel(beds) {

    if (document.getElementById("sirsPanel")) return;

    const panel = document.createElement("div");
    panel.id = "sirsPanel";

    panel.style.position = "fixed";
    panel.style.top = "120px";
    panel.style.left = "60px";
    panel.style.background = "#1976d2";
    panel.style.color = "white";
    panel.style.padding = "14px";
    panel.style.borderRadius = "12px";
    panel.style.zIndex = "999999";
    panel.style.minWidth = "280px";
    panel.style.maxHeight = "500px";
    panel.style.overflowY = "auto";
    panel.style.boxShadow = "0 6px 18px rgba(0,0,0,0.3)";

    panel.innerHTML = `
      <div id="header" style="font-weight:bold;margin-bottom:10px;">
        SIRS Auto Bed Update
      </div>

      <div id="content"></div>

      <div style="margin-top:10px;">
        <button id="rescanBtn">Scan Ulang</button>
      </div>
    `;

    document.body.appendChild(panel);
    makeDraggable(panel, panel.querySelector("#header"));

    const content = panel.querySelector("#content");

    if (beds.length === 0) {
      content.innerHTML = `<div style="color:#ccffcc;">✅ Semua sudah update hari ini</div>`;
      return;
    }

    content.innerHTML = `<div style="color:#ffcccc;margin-bottom:8px;">${beds.length} bed perlu update</div>`;

    beds.forEach(bed => {
      const div = document.createElement("div");
      div.innerHTML = `
        <label>
          <input type="checkbox" value="${bed.id}" data-url="${bed.url}">
          <strong>${bed.ruang}</strong><br>
          <small>${bed.kelas}</small><br>
          <small>Tgl: ${bed.tanggal}</small>
        </label>
        <hr style="border:0.5px solid rgba(255,255,255,0.3);">
      `;
      content.appendChild(div);
    });

    const btnArea = document.createElement("div");
    btnArea.innerHTML = `
      <button id="selectAll">Select All</button>
      <button id="deselectAll">Clear</button>
      <button id="updateBtn">Update</button>
    `;
    content.appendChild(btnArea);

    const checkboxes = panel.querySelectorAll("input[type='checkbox']");

    panel.querySelector("#selectAll").onclick = () =>
      checkboxes.forEach(cb => cb.checked = true);

    panel.querySelector("#deselectAll").onclick = () =>
      checkboxes.forEach(cb => cb.checked = false);

    panel.querySelector("#updateBtn").onclick = async () => {

      for (let cb of panel.querySelectorAll("input:checked")) {

        const url = cb.dataset.url;

        const tab = window.open(url, "_blank");
        await delay(2500);

        tab.document.querySelector("#simpan")?.click();
        await delay(1500);

        tab.close();
        await delay(1000);
      }

      alert("Update selesai.");
    };

    panel.querySelector("#rescanBtn").onclick = async () => {
      panel.remove();
      await init(true);
    };
  }

  async function init(force = false) {

    if (!window.location.href.includes("/fo/formtt")) return;

    await waitTable();

    const beds = await scanAllPages();
    createPanel(beds);
  }

  init();

})();