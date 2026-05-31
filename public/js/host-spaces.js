// host-spaces.js
// HOST_ID được inject từ spaces.ejs: <script>const HOST_ID = "<%= currentUser._id %>";</script>

const SPACE_STATUS_LABELS = {
  available: "Sẵn sàng",
  maintenance: "Bảo trì",
  inactive: "Tạm ngừng hoạt động",
};

const CATEGORY_LABELS = {
  meeting_room: "Phòng họp",
  desk: "Chỗ ngồi tự do",
  office: "Văn phòng",
  event: "Sự kiện",
};

let addFacilitySpaceCounter = 0;
let currentBranchId = null;
let currentSpaceId = null;

// ==================== UTILITIES ====================

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showToast(msg) {
  alert(msg);
}

// Ẩn img nếu không có src, hiện nếu có
function applyImg(id, src) {
  const el = document.getElementById(id);
  if (!el) return;
  if (src) {
    el.src = src;
    el.classList.remove("hidden");
  } else {
    el.src = "";
    el.classList.add("hidden");
  }
}

// ==================== LAYER NAVIGATION ====================

function showHostSpaceLayer(layerId) {
  [
    "space-mgr-layer-1",
    "space-mgr-layer-2",
    "space-mgr-layer-3",
    "space-mgr-layer-add",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", id !== layerId);
  });
}

function backToLayer1() {
  showHostSpaceLayer("space-mgr-layer-1");
}
function backToLayer2() {
  showHostSpaceLayer("space-mgr-layer-2");
}

// ==================== LAYER 1: DANH SÁCH CƠ SỞ ====================

function renderFacilityList(branches) {
  const grid = document.getElementById("facility-list-grid");
  if (!grid) return;

  if (!branches || !branches.length) {
    grid.innerHTML =
      '<p class="text-slate-400 text-sm col-span-2">Chưa có cơ sở nào. Bấm "Thêm cơ sở" để bắt đầu.</p>';
    return;
  }

  grid.innerHTML = branches
    .map((b) => {
      // Ảnh từ MongoDB, không gắn sẵn nếu không có
      const imgHtml =
        b.Images && b.Images[0]
          ? '<img src="' +
            escapeHtml(b.Images[0]) +
            '" alt="" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">'
          : '<div class="w-full h-full bg-slate-100 flex items-center justify-center"><span class="text-slate-300 text-xs font-bold uppercase">Chưa có ảnh</span></div>';

      return (
        "<div onclick=\"openFacilityMgmt('" +
        escapeHtml(b._id) +
        "')\"" +
        ' class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-teal-500 transition cursor-pointer group">' +
        '<div class="relative h-40 mb-6 rounded-2xl overflow-hidden shadow-inner">' +
        imgHtml +
        "</div>" +
        '<h3 class="text-xl font-black text-slate-800 tracking-tight">' +
        escapeHtml(b.Name) +
        "</h3>" +
        '<p class="text-sm text-slate-400">' +
        escapeHtml(b.Address) +
        "</p>" +
        "</div>"
      );
    })
    .join("");
}

async function initHostSpacesPage() {
  try {
    const res = await fetch("/api/hosts/" + HOST_ID + "/branches");
    const data = await res.json();
    renderFacilityList(data.branches || []);
  } catch (err) {
    console.error("Lỗi tải danh sách cơ sở:", err);
    showToast("Không thể tải danh sách cơ sở.");
  }
}

// ==================== LAYER 2: THÔNG TIN CƠ SỞ + DANH SÁCH KHÔNG GIAN ====================

async function openFacilityMgmt(branchId) {
  currentBranchId = branchId;
  showHostSpaceLayer("space-mgr-layer-2");

  try {
    const branchRes = await fetch("/api/hosts/" + HOST_ID + "/branches");
    const branchData = await branchRes.json();
    const branch = (branchData.branches || []).find(
      (b) => String(b._id) === String(branchId),
    );

    if (branch) {
      const nameEl = document.querySelector('[data-fac-field="name"]');
      const addrEl = document.querySelector('[data-fac-field="address"]');
      const noteEl = document.querySelector('[data-fac-field="note"]');
      if (nameEl) nameEl.value = branch.Name || "";
      if (addrEl) addrEl.value = branch.Address || "";
      if (noteEl) noteEl.value = branch.Description || "";

      // Lấy ảnh từ MongoDB, ẩn nếu chưa có
      applyImg("branch-main-img", branch.Images && branch.Images[0]);
    }

    const spaceRes = await fetch(
      "/api/hosts/" + HOST_ID + "/branches/" + branchId + "/spaces",
    );
    const spaceData = await spaceRes.json();
    renderSpacesList(spaceData.spaces || []);
  } catch (err) {
    console.error("Lỗi tải thông tin chi nhánh:", err);
    showToast("Không thể tải thông tin chi nhánh.");
  }
}

function renderSpacesList(spaces) {
  const tbody = document.getElementById("spaces-list-body");
  if (!tbody) return;

  if (!spaces.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="p-4 text-slate-400 text-sm text-center">Chưa có không gian nào.</td></tr>';
    return;
  }

  tbody.innerHTML = spaces
    .map((s) => {
      const statusLabel = SPACE_STATUS_LABELS[s.Status] || s.Status;
      const catLabel = CATEGORY_LABELS[s.Category] || s.Category;
      const statusColor =
        s.Status === "available"
          ? "bg-green-50 text-green-600"
          : s.Status === "maintenance"
            ? "bg-yellow-50 text-yellow-600"
            : "bg-red-50 text-red-500";
      return (
        '<tr class="border-b border-slate-50 hover:bg-slate-50 transition">' +
        '<td class="p-4 font-black text-slate-700">' +
        escapeHtml(s.SpaceCode) +
        "</td>" +
        '<td class="p-4 text-slate-500">' +
        escapeHtml(catLabel) +
        "</td>" +
        '<td class="p-4"><span class="px-2 py-1 rounded-lg text-[9px] uppercase font-black ' +
        statusColor +
        '">' +
        escapeHtml(statusLabel) +
        "</span></td>" +
        '<td class="p-4"><button type="button" onclick="openSpaceDetail(\'' +
        escapeHtml(String(s._id)) +
        '\')" class="text-teal-600 underline font-black text-xs">Chi tiết</button></td>' +
        "</tr>"
      );
    })
    .join("");
}

// Cập nhật thông tin cơ sở — FormData để gửi kèm ảnh
async function saveBranchInfo() {
  const nameEl = document.querySelector('[data-fac-field="name"]');
  const addrEl = document.querySelector('[data-fac-field="address"]');
  const noteEl = document.querySelector('[data-fac-field="note"]');
  const imgInput = document.getElementById("branch-img-input");

  const name = nameEl?.value.trim();
  const address = addrEl?.value.trim();
  if (!name || !address) {
    showToast("Tên cơ sở và địa chỉ không được để trống.");
    return;
  }

  const form = new FormData();
  form.append("name", name);
  form.append("address", address);
  form.append("note", noteEl?.value.trim() || "");
  if (imgInput && imgInput.files[0]) form.append("image", imgInput.files[0]);

  try {
    const res = await fetch(
      "/api/hosts/" + HOST_ID + "/branches/" + currentBranchId,
      {
        method: "PUT",
        body: form,
      },
    );
    if (!res.ok) {
      const e = await res.json();
      showToast(e.error || "Cập nhật thất bại.");
      return;
    }

    const data = await res.json();
    showToast("Cập nhật cơ sở thành công!");

    // Cập nhật ảnh ngay từ DB trả về
    applyImg(
      "branch-main-img",
      data.branch && data.branch.Images && data.branch.Images[0],
    );
    await initHostSpacesPage();
  } catch (err) {
    console.error("Lỗi cập nhật cơ sở:", err);
    showToast("Lỗi khi cập nhật, vui lòng thử lại.");
  }
}

// ==================== LAYER 3: CHI TIẾT KHÔNG GIAN ====================

async function openSpaceDetail(spaceId) {
  currentSpaceId = spaceId;
  showHostSpaceLayer("space-mgr-layer-3");

  try {
    const res = await fetch(
      "/api/hosts/" + HOST_ID + "/branches/" + currentBranchId + "/spaces",
    );
    const data = await res.json();
    const space = (data.spaces || []).find(
      (s) => String(s._id) === String(spaceId),
    );
    if (!space) {
      showToast("Không tìm thấy thông tin không gian.");
      return;
    }

    const titleEl = document.getElementById("detail-space-title");
    const priceEl = document.getElementById("detail-space-price");
    const statusEl = document.getElementById("detail-space-status");

    if (titleEl) titleEl.textContent = "Chi tiết: " + space.SpaceCode;
    if (priceEl)
      priceEl.value = space.PricePerHour
        ? Number(space.PricePerHour).toLocaleString("vi-VN") + "đ"
        : "0đ";
    if (statusEl) statusEl.value = space.Status || "available";

    // Lấy ảnh từ MongoDB, ẩn nếu chưa có
    applyImg("space-detail-img", space.Images && space.Images[0]);

    await loadSpaceSchedule(spaceId);
  } catch (err) {
    console.error("Lỗi tải chi tiết không gian:", err);
    showToast("Không thể tải chi tiết không gian.");
  }
}

// Lưu chi tiết không gian — FormData để gửi kèm ảnh
async function saveSpaceDetail() {
  const priceEl = document.getElementById("detail-space-price");
  const statusEl = document.getElementById("detail-space-status");
  const imgInput = document.getElementById("space-img-input");

  const pricePerHour = Number(String(priceEl?.value || "").replace(/\D/g, ""));
  const status = statusEl?.value;
  if (!status) {
    showToast("Vui lòng chọn trạng thái.");
    return;
  }

  const form = new FormData();
  form.append("pricePerHour", pricePerHour);
  form.append("status", status);
  if (imgInput && imgInput.files[0]) form.append("image", imgInput.files[0]);

  try {
    const res = await fetch(
      "/api/hosts/" + HOST_ID + "/spaces/" + currentSpaceId,
      {
        method: "PUT",
        body: form,
      },
    );
    if (!res.ok) {
      const e = await res.json();
      showToast(e.error || "Cập nhật thất bại.");
      return;
    }

    const data = await res.json();
    showToast("Lưu chi tiết không gian thành công!");

    if (priceEl) priceEl.value = pricePerHour.toLocaleString("vi-VN") + "đ";

    // Cập nhật ảnh ngay từ DB trả về
    applyImg(
      "space-detail-img",
      data.space && data.space.Images && data.space.Images[0],
    );

    // Reload danh sách spaces
    const spaceRes = await fetch(
      "/api/hosts/" + HOST_ID + "/branches/" + currentBranchId + "/spaces",
    );
    const spaceData = await spaceRes.json();
    renderSpacesList(spaceData.spaces || []);
  } catch (err) {
    console.error("Lỗi lưu chi tiết không gian:", err);
    showToast("Lỗi khi lưu, vui lòng thử lại.");
  }
}

async function loadSpaceSchedule(spaceId) {
  const tbody = document.getElementById("space-schedule-body");
  if (!tbody) return;
  try {
    const res = await fetch("/api/hosts/" + HOST_ID + "/bookings");
    const data = await res.json();
    const bookings = (data.bookings || []).filter(
      (b) =>
        String(b.SpaceID && b.SpaceID._id ? b.SpaceID._id : b.SpaceID) ===
        String(spaceId),
    );

    if (!bookings.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="p-4 text-slate-400 text-sm text-center">Chưa có lịch đặt nào.</td></tr>';
      return;
    }

    tbody.innerHTML = bookings
      .map((b) => {
        const name =
          (b.CustomerID && (b.CustomerID.FullName || b.CustomerID.Email)) ||
          "—";
        const start = b.StartTime
          ? new Date(b.StartTime).toLocaleString("vi-VN")
          : "—";
        const end = b.EndTime
          ? new Date(b.EndTime).toLocaleString("vi-VN")
          : "—";
        const label =
          b.Status === "completed"
            ? "Hoàn thành"
            : b.Status === "confirmed"
              ? "Đã xác nhận"
              : "Chờ xử lý";
        const color =
          b.Status === "completed"
            ? "text-green-600"
            : b.Status === "confirmed"
              ? "text-blue-600"
              : "text-yellow-600";
        return (
          '<tr class="border-b border-slate-50 hover:bg-slate-50 transition">' +
          '<td class="p-4 font-bold text-slate-700">' +
          escapeHtml(name) +
          "</td>" +
          '<td class="p-4 text-slate-500">' +
          start +
          "</td>" +
          '<td class="p-4 text-slate-500">' +
          end +
          "</td>" +
          '<td class="p-4 font-black ' +
          color +
          '">' +
          label +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  } catch (err) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="p-4 text-red-400 text-sm text-center">Không thể tải lịch đặt.</td></tr>';
  }
}

// ==================== WIZARD THÊM CƠ SỞ ====================

function startAddFacility() {
  addFacilitySpaceCounter = 0;
  ["add-fac-name", "add-fac-address", "add-fac-note"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const imgInput = document.getElementById("add-fac-image");
  if (imgInput) imgInput.value = "";
  const preview = document.getElementById("add-fac-image-preview");
  if (preview)
    preview.innerHTML =
      '<span class="text-[10px] font-bold text-slate-400 uppercase">Chưa có ảnh</span>';
  setAddFacilityStep(1);
  showHostSpaceLayer("space-mgr-layer-add");
}

function cancelAddFacility() {
  showHostSpaceLayer("space-mgr-layer-1");
}

function setAddFacilityStep(step) {
  const s1 = document.getElementById("add-facility-step-1");
  const s2 = document.getElementById("add-facility-step-2");
  if (s1) s1.classList.toggle("hidden", step !== 1);
  if (s2) s2.classList.toggle("hidden", step !== 2);
  const label = document.getElementById("add-facility-step-label");
  if (label)
    label.textContent =
      step === 1
        ? "Giai đoạn 1: Nhập thông tin cơ sở"
        : "Giai đoạn 2: Nhập các không gian trong cơ sở";
  const b1 = document.getElementById("add-fac-step-1-badge");
  const b2 = document.getElementById("add-fac-step-2-badge");
  if (b1)
    b1.className =
      step === 1
        ? "px-4 py-2 rounded-xl bg-teal-600 text-white"
        : "px-4 py-2 rounded-xl bg-slate-100 text-slate-400";
  if (b2)
    b2.className =
      step === 2
        ? "px-4 py-2 rounded-xl bg-teal-600 text-white"
        : "px-4 py-2 rounded-xl bg-slate-100 text-slate-400";
}

function previewFacilityImage(input) {
  const file = input.files && input.files[0];
  const preview = document.getElementById("add-fac-image-preview");
  if (!file || !preview) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.innerHTML =
      '<img src="' +
      e.target.result +
      '" alt="" class="w-full h-full object-cover">';
  };
  reader.readAsDataURL(file);
}

function previewSpaceImage(input, rowId) {
  const file = input.files && input.files[0];
  const preview = document.getElementById("space-img-preview-" + rowId);
  if (!file || !preview) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.innerHTML =
      '<img src="' +
      e.target.result +
      '" alt="" class="w-full h-full object-cover">';
  };
  reader.readAsDataURL(file);
}

function addFacilityGoStep2() {
  const name = document.getElementById("add-fac-name")?.value.trim();
  const address = document.getElementById("add-fac-address")?.value.trim();
  if (!name || !address) {
    showToast("Vui lòng nhập Tên cơ sở và Địa chỉ");
    return;
  }
  const sn = document.getElementById("add-fac-summary-name");
  const sa = document.getElementById("add-fac-summary-address");
  if (sn) sn.textContent = name;
  if (sa) sa.textContent = address;
  setAddFacilityStep(2);
  const list = document.getElementById("add-facility-spaces-list");
  if (list && !list.children.length) addFacilitySpaceRow();
}

function addFacilityBackToStep1() {
  setAddFacilityStep(1);
}

function addFacilitySpaceRow() {
  const list = document.getElementById("add-facility-spaces-list");
  if (!list) return;
  const rowId = ++addFacilitySpaceCounter;
  const card = document.createElement("div");
  card.className =
    "p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4";
  card.dataset.rowId = String(rowId);
  card.innerHTML =
    '<div class="flex justify-between items-center">' +
    '<p class="text-[10px] font-black text-slate-400 uppercase">Không gian #' +
    rowId +
    "</p>" +
    '<button type="button" onclick="removeFacilitySpaceRow(' +
    rowId +
    ')" class="text-red-500 text-[10px] font-black uppercase hover:text-red-700">Xóa</button>' +
    "</div>" +
    '<div class="flex gap-3 items-start">' +
    '<div id="space-img-preview-' +
    rowId +
    '" class="h-20 w-28 bg-white rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">' +
    '<span class="text-[9px] font-bold text-slate-400 uppercase">Chưa có ảnh</span></div>' +
    '<label class="h-20 w-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 font-bold text-[9px] uppercase cursor-pointer hover:border-teal-500 transition shrink-0">' +
    '+ Ảnh<input type="file" accept="image/*" class="hidden" onchange="previewSpaceImage(this,' +
    rowId +
    ')" data-row-img="' +
    rowId +
    '"></label>' +
    "</div>" +
    '<div class="grid sm:grid-cols-2 gap-3">' +
    '<div class="p-3 bg-white rounded-xl border border-slate-100"><label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Tên / Mã <span class="text-red-500">*</span></label>' +
    '<input type="text" data-field="id" placeholder="VD: 103, A-05" class="w-full bg-transparent border-none p-0 text-sm font-bold outline-none text-slate-800"></div>' +
    '<div class="p-3 bg-white rounded-xl border border-slate-100"><label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Loại</label>' +
    '<select data-field="type" class="w-full bg-transparent border-none p-0 text-sm font-bold outline-none text-slate-800">' +
    '<option value="Phòng họp">Phòng họp</option><option value="Chỗ ngồi tự do">Chỗ ngồi tự do</option>' +
    '<option value="Văn phòng">Văn phòng</option><option value="Sự kiện">Sự kiện</option></select></div>' +
    '<div class="p-3 bg-white rounded-xl border border-slate-100"><label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Giá / Giờ</label>' +
    '<input type="text" data-field="price" placeholder="250000" class="w-full bg-transparent border-none p-0 text-sm font-bold outline-none text-teal-600"></div>' +
    '<div class="p-3 bg-slate-50 rounded-xl border border-slate-100"><label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Trạng thái</label>' +
    '<select data-field="status" class="w-full bg-transparent border-none p-0 text-sm font-bold outline-none text-slate-800">' +
    '<option value="ready">Sẵn sàng</option><option value="preparing">Đang chuẩn bị</option>' +
    '<option value="suspended">Tạm ngừng hoạt động</option></select></div>' +
    "</div>";
  list.appendChild(card);
}

function removeFacilitySpaceRow(rowId) {
  const list = document.getElementById("add-facility-spaces-list");
  const card = list && list.querySelector('[data-row-id="' + rowId + '"]');
  if (card) card.remove();
  if (list && !list.children.length) addFacilitySpaceRow();
}

function collectSpacesFromWizard() {
  const list = document.getElementById("add-facility-spaces-list");
  if (!list) return [];
  const spaces = [];
  list.querySelectorAll("[data-row-id]").forEach((card) => {
    const id =
      card.querySelector('[data-field="id"]') &&
      card.querySelector('[data-field="id"]').value.trim();
    if (!id) return;
    const imgInput = card.querySelector("[data-row-img]");
    spaces.push({
      id,
      type:
        (card.querySelector('[data-field="type"]') &&
          card.querySelector('[data-field="type"]').value) ||
        "Phòng họp",
      status:
        (card.querySelector('[data-field="status"]') &&
          card.querySelector('[data-field="status"]').value) ||
        "ready",
      price:
        (card.querySelector('[data-field="price"]') &&
          card.querySelector('[data-field="price"]').value.trim()) ||
        "0",
      imgFile: (imgInput && imgInput.files && imgInput.files[0]) || null,
    });
  });
  return spaces;
}

async function saveNewFacility() {
  const name =
    document.getElementById("add-fac-name") &&
    document.getElementById("add-fac-name").value.trim();
  const address =
    document.getElementById("add-fac-address") &&
    document.getElementById("add-fac-address").value.trim();
  const note =
    document.getElementById("add-fac-note") &&
    document.getElementById("add-fac-note").value.trim();
  const facImg = document.getElementById("add-fac-image");
  const spaces = collectSpacesFromWizard();

  if (!name || !address) {
    showToast("Thiếu thông tin cơ sở");
    setAddFacilityStep(1);
    return;
  }
  if (!spaces.length) {
    showToast("Thêm ít nhất một không gian có Tên/Mã");
    return;
  }

  try {
    // Tạo Branch kèm ảnh
    const branchForm = new FormData();
    branchForm.append("name", name);
    branchForm.append("address", address);
    branchForm.append("note", note || "");
    if (facImg && facImg.files && facImg.files[0])
      branchForm.append("image", facImg.files[0]);

    const branchRes = await fetch("/api/hosts/" + HOST_ID + "/branches", {
      method: "POST",
      body: branchForm,
    });
    if (!branchRes.ok) {
      const err = await branchRes.json();
      showToast(err.error || "Không thể tạo cơ sở");
      return;
    }
    const branch = await branchRes.json();

    // Tạo từng Space kèm ảnh
    const results = await Promise.allSettled(
      spaces.map((s) => {
        const spaceForm = new FormData();
        spaceForm.append("id", s.id);
        spaceForm.append("type", s.type);
        spaceForm.append("status", s.status);
        spaceForm.append("price", s.price);
        if (s.imgFile) spaceForm.append("image", s.imgFile);

        return fetch(
          "/api/hosts/" + HOST_ID + "/branches/" + branch._id + "/spaces",
          {
            method: "POST",
            body: spaceForm,
          },
        );
      }),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    showToast(
      failed
        ? "Đã tạo cơ sở nhưng " + failed + " không gian bị lỗi."
        : 'Đã tạo cơ sở "' + name + '" với ' + spaces.length + " không gian",
    );

    showHostSpaceLayer("space-mgr-layer-1");
    await initHostSpacesPage();
  } catch (err) {
    console.error("Lỗi lưu cơ sở:", err);
    showToast("Lỗi khi lưu, vui lòng thử lại.");
  }
}
