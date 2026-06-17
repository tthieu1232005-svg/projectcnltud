let currentBranchId = null;
let currentSpaceId = null;

// Mảng cục bộ lưu trữ danh sách file ảnh đang chọn thêm từ thiết bị
let selectedBranchFiles = [];
let selectedSpaceFiles = [];

document.addEventListener("DOMContentLoaded", function () {
  initHostSpacesPage();
});

function initHostSpacesPage() {
  loadBranchList();
}

// ==========================================
// --- LAYER 1: DANH SÁCH CƠ SỞ ---
// ==========================================
async function loadBranchList() {
  try {
    const response = await fetch(`/api/hosts/${HOST_ID}/branches`);
    const data = await response.json();
    const grid = document.getElementById("facility-list-grid");
    const btnAddFacility = document.getElementById("btn-start-add-facility");

    grid.innerHTML = "";

    if (data.branches && data.branches.length >= 1) {
      if (btnAddFacility) btnAddFacility.classList.add("hidden");
    } else {
      if (btnAddFacility) btnAddFacility.classList.remove("hidden");
    }

    if (!data.branches || data.branches.length === 0) {
      grid.innerHTML = `<p class="text-slate-400 text-sm col-span-2">Bạn chưa có cơ sở nào. Hãy thêm cơ sở mới!</p>`;
      return;
    }

    data.branches.forEach((branch) => {
      const imgSrc =
        branch.Images && branch.Images.length > 0
          ? branch.Images[0]
          : "https://placehold.co/600x400?text=WorkHub";
      const card = document.createElement("div");
      card.className =
        "bg-white p-6 rounded-[2rem] border shadow-sm flex gap-4 items-center hover:border-teal-500 cursor-pointer transition";
      card.onclick = () => openLayer2(branch);
      card.innerHTML = `
        <img src="${imgSrc}" class="w-24 h-24 object-cover rounded-2xl bg-slate-100 shrink-0 shadow-inner">
        <div class="overflow-hidden">
          <h4 class="font-black text-lg text-slate-800 truncate">${branch.Name}</h4>
          <p class="text-slate-400 text-xs truncate mt-1">📍 ${branch.Address}</p>
          <p class="text-slate-500 text-xs mt-2 line-clamp-2 font-medium">${branch.Description || "Không có mô tả"}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Lỗi tải danh sách cơ sở:", error);
  }
}

// ==========================================
// --- ĐIỀU HƯỚNG MÀN HÌNH LAYER ---
// ==========================================
function openLayer2(branch) {
  currentBranchId = branch._id;

  // Xóa sạch bộ nhớ tạm ảnh mới khi load cơ sở
  selectedBranchFiles = [];
  const fileInput = document.getElementById("branch-img-input");
  if (fileInput) fileInput.value = "";

  const previewContainer = document.getElementById(
    "branch-selected-preview-container",
  );
  if (previewContainer) previewContainer.innerHTML = "";

  document.getElementById("space-mgr-layer-1").classList.add("hidden");
  document.getElementById("space-mgr-layer-2").classList.remove("hidden");

  document.querySelector('[data-fac-field="name"]').value = branch.Name;
  document.querySelector('[data-fac-field="address"]').value = branch.Address;
  document.querySelector('[data-fac-field="note"]').value =
    branch.Description || "";

  const mainImgContainer =
    document.getElementById("branch-main-img-container") ||
    document.getElementById("branch-main-img");

  if (branch.Images && branch.Images.length > 0) {
    mainImgContainer.innerHTML = branch.Images.map(
      (img) => `
      <div class="relative w-20 h-20 inline-block group">
        <img src="${img}" class="w-full h-full object-cover rounded-xl border shadow-sm">
        <button type="button" onclick="deleteExistingBranchImage('${img}')" 
          class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow hover:bg-red-600 transition">
          ✕
        </button>
      </div>
    `,
    ).join("");
  } else {
    mainImgContainer.innerHTML = `<span class="text-[10px] text-slate-400 uppercase p-4">Chưa có ảnh hiển thị</span>`;
  }

  loadSpaceList(branch._id);
}

function backToLayer1() {
  currentBranchId = null;
  document.getElementById("space-mgr-layer-2").classList.add("hidden");
  document.getElementById("space-mgr-layer-1").classList.remove("hidden");
  loadBranchList();
}

function backToLayer2() {
  currentSpaceId = null;
  document.getElementById("space-mgr-layer-3").classList.add("hidden");
  document.getElementById("space-mgr-layer-2").classList.remove("hidden");
  loadSpaceList(currentBranchId);
}

// ==========================================
// --- LOGIC QUAN SÁT VÀ XỬ LÝ ẢNH CƠ SỞ ---
// ==========================================

async function deleteExistingBranchImage(imgUrl) {
  if (!confirm("Bạn có chắc muốn xóa tấm ảnh này khỏi hệ thống?")) return;

  try {
    const response = await fetch(
      `/api/hosts/${HOST_ID}/branches/${currentBranchId}/delete-image`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imgUrl }),
      },
    );
    const data = await response.json();
    if (response.ok) {
      alert("Xóa ảnh thành công!");
      openLayer2(data.branch);
    } else {
      alert(data.error || "Lỗi xóa ảnh.");
    }
  } catch (error) {
    console.error("Lỗi xóa ảnh cũ:", error);
  }
}

function previewBranchImagesFromInput(input) {
  if (input.files && input.files.length > 0) {
    selectedBranchFiles = [...selectedBranchFiles, ...Array.from(input.files)];
  }
  if (input) input.value = ""; // Xoá vết input để tránh lỗi lặp sự kiện
  renderBranchSelectedPreviews();
}

function renderBranchSelectedPreviews() {
  const container = document.getElementById(
    "branch-selected-preview-container",
  );
  if (!container) return;

  container.innerHTML = "";
  selectedBranchFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const div = document.createElement("div");
    div.className = "relative w-20 h-20 inline-block mt-2";
    div.innerHTML = `
      <img src="${url}" class="w-full h-full object-cover rounded-xl border border-teal-400">
      <button type="button" onclick="removeSelectedBranchFile(${index})" 
        class="absolute -top-1.5 -right-1.5 bg-slate-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold hover:bg-red-500 transition">
        ✕
      </button>
    `;
    container.appendChild(div);
  });
}

function removeSelectedBranchFile(index) {
  selectedBranchFiles.splice(index, 1);
  renderBranchSelectedPreviews();
}

async function saveBranchInfo() {
  if (!currentBranchId) return;

  const name = document.querySelector('[data-fac-field="name"]').value;
  const address = document.querySelector('[data-fac-field="address"]').value;
  const note = document.querySelector('[data-fac-field="note"]').value;

  const formData = new FormData();
  formData.append("name", name);
  formData.append("address", address);
  formData.append("note", note);

  if (selectedBranchFiles.length > 0) {
    selectedBranchFiles.forEach((file) => {
      formData.append("image", file);
    });
  }

  try {
    const response = await fetch(
      `/api/hosts/${HOST_ID}/branches/${currentBranchId}`,
      {
        method: "PUT",
        body: formData,
      },
    );
    const data = await response.json();
    if (response.ok) {
      alert("Cập nhật thông tin cơ sở thành công!");
      selectedBranchFiles = [];
      openLayer2(data.branch);
    } else {
      alert(data.error || "Có lỗi xảy ra.");
    }
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
  }
}

// ==========================================
// --- PHẦN KHÔNG GIAN (SPACES) LAYER 2 & 3 ---
// ==========================================
async function loadSpaceList(branchId) {
  try {
    const response = await fetch(
      `/api/hosts/${HOST_ID}/branches/${branchId}/spaces`,
    );
    const data = await response.json();
    const tbody = document.getElementById("spaces-list-body");
    tbody.innerHTML = "";

    if (!data.spaces || data.spaces.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Chưa có không gian nào.</td></tr>`;
      return;
    }

    data.spaces.forEach((space) => {
      const statusMap = {
        available: "Sẵn sàng",
        maintenance: "Bảo trì",
        inactive: "Tạm dừng",
      };
      const statusText = statusMap[space.Status] || "Sẵn sàng";
      const statusColor =
        space.Status === "available"
          ? "text-teal-600 bg-teal-50"
          : "text-red-600 bg-red-50";

      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-slate-50";
      const spaceStr = encodeURIComponent(JSON.stringify(space));
      tr.innerHTML = `
        <td class="p-4">
          <div class="font-black text-slate-800">${space.Name}</div>
          <div class="text-[10px] text-slate-400">${space.SpaceCode}</div>
        </td>
        <td class="p-4 text-slate-500 uppercase text-[10px]">${space.Category}</td>
        <td class="p-4">
          <span class="px-2 py-1 rounded-md ${statusColor} text-[10px] uppercase">${statusText}</span>
        </td>
        <td class="p-4">
          <button onclick="openLayer3('${spaceStr}')" class="text-teal-600 hover:underline">Chi tiết</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Lỗi tải danh sách phòng:", error);
  }
}

function openLayer3(encodedSpace) {
  const space = JSON.parse(decodeURIComponent(encodedSpace));
  currentSpaceId = space._id;
  selectedSpaceFiles = []; // Reset mảng ảnh mới khi mở phòng mới

  document.getElementById("space-mgr-layer-2").classList.add("hidden");
  document.getElementById("space-mgr-layer-3").classList.remove("hidden");

  document.getElementById("detail-space-title").innerText =
    `Chi tiết: ${space.Name} [${space.SpaceCode}]`;
  document.getElementById("detail-space-price").value = space.PricePerHour;
  document.getElementById("detail-space-status").value = space.Status;

  // Xóa trắng dữ liệu nhập cũ của input file ảnh
  const spaceInput = document.getElementById("space-img-input");
  if (spaceInput) spaceInput.value = "";

  renderSpaceImages(space);
  document.getElementById("space-detail-new-preview").innerHTML = "";

  loadSpaceBookings(space._id);
}

function renderSpaceImages(space) {
  const container = document.getElementById("space-detail-img-container");
  if (!container) return;

  if (space.Images && space.Images.length > 0) {
    container.innerHTML = space.Images.map(
      (img) => `
      <div class="relative w-20 h-20 inline-block mr-2 mb-2">
        <img src="${img}" class="w-full h-full object-cover rounded-xl border">
        <button type="button" onclick="deleteExistingSpaceImage('${img}')" 
          class="absolute -top-1.5 -right-1.5 bg-red-500 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">✕</button>
      </div>
    `,
    ).join("");
  } else {
    container.innerHTML = `<span class="text-[10px] text-slate-400 uppercase p-4">Chưa có ảnh hiển thị</span>`;
  }
}

async function deleteExistingSpaceImage(imgUrl) {
  if (!confirm("Xóa ảnh này khỏi phòng?")) return;

  try {
    const response = await fetch(
      `/api/hosts/${HOST_ID}/spaces/${currentSpaceId}/delete-image`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imgUrl }),
      },
    );
    const data = await response.json();
    if (response.ok) {
      alert("Xóa ảnh thành công!");
      openLayer3(encodeURIComponent(JSON.stringify(data.space)));
    } else {
      alert(data.error || "Lỗi khi xóa ảnh phòng.");
    }
  } catch (error) {
    console.error("Lỗi xóa ảnh phòng cũ:", error);
  }
}

function previewNewSpaceDetailImages(input) {
  if (input.files && input.files.length > 0) {
    selectedSpaceFiles = [...selectedSpaceFiles, ...Array.from(input.files)];
  }
  if (input) input.value = ""; // Xoá vết input để tránh lỗi lặp sự kiện
  renderSpaceSelectedPreviews();
}

function renderSpaceSelectedPreviews() {
  const previewDiv = document.getElementById("space-detail-new-preview");
  if (!previewDiv) return;

  previewDiv.innerHTML = selectedSpaceFiles
    .map(
      (file, index) => `
    <div class="relative w-20 h-20 inline-block mr-2 mb-2">
      <img src="${URL.createObjectURL(file)}" class="w-full h-full object-cover rounded-xl border border-teal-400">
      <button type="button" onclick="removeSelectedSpaceFile(${index})" 
        class="absolute -top-1.5 -right-1.5 bg-slate-600 text-white w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold">✕</button>
    </div>
  `,
    )
    .join("");
}

function removeSelectedSpaceFile(index) {
  selectedSpaceFiles.splice(index, 1);
  renderSpaceSelectedPreviews();
}

async function saveSpaceDetail() {
  if (!currentSpaceId) return;

  const pricePerHour = document.getElementById("detail-space-price").value;
  const status = document.getElementById("detail-space-status").value;

  const formData = new FormData();
  formData.append("pricePerHour", pricePerHour);
  formData.append("status", status);

  // SỬA LỖI: Đọc chính xác từ mảng dữ liệu tạm đã chọn lọc thay vì input gốc
  if (selectedSpaceFiles && selectedSpaceFiles.length > 0) {
    selectedSpaceFiles.forEach((file) => {
      formData.append("image", file);
    });
  }

  try {
    const response = await fetch(
      `/api/hosts/${HOST_ID}/spaces/${currentSpaceId}`,
      {
        method: "PUT",
        body: formData,
      },
    );
    const data = await response.json();
    if (response.ok) {
      alert("Cập nhật chi tiết không gian thành công!");
      selectedSpaceFiles = [];
      openLayer3(encodeURIComponent(JSON.stringify(data.space)));
    } else {
      alert(data.error || "Có lỗi xảy ra.");
    }
  } catch (error) {
    console.error("Lỗi cập nhật phòng:", error);
  }
}

async function loadSpaceBookings(spaceId) {
  try {
    const response = await fetch(`/api/hosts/${HOST_ID}/bookings`);
    const data = await response.json();
    const tbody = document.getElementById("space-schedule-body");
    tbody.innerHTML = "";

    const filtered = data.bookings.filter(
      (b) => b.SpaceID && b.SpaceID._id === spaceId,
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Chưa có lịch đặt nào.</td></tr>`;
      return;
    }

    filtered.forEach((booking) => {
      const start = new Date(booking.StartTime).toLocaleString("vi-VN");
      const end = new Date(booking.EndTime).toLocaleString("vi-VN");
      tbody.innerHTML += `
        <tr class="border-b font-medium text-slate-700">
          <td class="p-4">
            <div class="font-bold">${booking.CustomerID?.FullName || "Ẩn danh"}</div>
            <div class="text-[10px] text-slate-400">${booking.CustomerID?.Email || ""}</div>
          </td>
          <td class="p-4">${start}</td>
          <td class="p-4">${end}</td>
          <td class="p-4 uppercase font-bold text-[10px] text-slate-500">${booking.Status}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error(error);
  }
}

// ==========================================
// --- POPUP MODAL CONTROL & PREVIEW ---
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.classList.remove("opacity-0");
    modal.querySelector(".transform").classList.remove("scale-95");
  }, 10);
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add("opacity-0");
  modal.querySelector(".transform").classList.add("scale-95");
  setTimeout(() => {
    modal.classList.add("hidden");
    const form = modal.querySelector("form");
    if (form) form.reset();
    document.getElementById("modal-space-img-preview").innerHTML =
      `<span class="text-[9px] font-bold text-slate-400 uppercase">Chưa có ảnh</span>`;
  }, 300);
}

function openSpaceModal() {
  openModal("modal-add-space");
}
function closeSpaceModal() {
  closeModal("modal-add-space");
}

function previewModalSpaceImage(input) {
  const preview = document.getElementById("modal-space-img-preview");
  preview.innerHTML = "";
  if (input.files && input.files.length > 0) {
    for (let i = 0; i < input.files.length; i++) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(input.files[i]);
      img.className =
        "w-16 h-16 object-cover rounded border shadow-sm inline-block mr-1 mb-1";
      preview.appendChild(img);
    }
  } else {
    preview.innerHTML = `<span class="text-[9px] font-bold text-slate-400 uppercase">Chưa có ảnh</span>`;
  }
}

async function submitNewSpace(event) {
  event.preventDefault();
  if (!currentBranchId) return alert("Thiếu ID cơ sở!");

  const code = document.getElementById("modal-space-code").value;
  const name = document.getElementById("modal-space-name").value;
  const category = document.getElementById("modal-space-category").value;
  const price = document.getElementById("modal-space-price").value;
  const imgInput = document.getElementById("modal-space-img-input");

  const formData = new FormData();
  formData.append("id", code);
  formData.append("name", name);
  formData.append("type", category);
  formData.append("price", price);
  formData.append("status", "ready");

  if (imgInput && imgInput.files && imgInput.files.length > 0) {
    for (let i = 0; i < imgInput.files.length; i++) {
      formData.append("image", imgInput.files[i]);
    }
  }

  try {
    const response = await fetch(
      `/api/hosts/${HOST_ID}/branches/${currentBranchId}/spaces`,
      {
        method: "POST",
        body: formData,
      },
    );
    const data = await response.json();

    if (response.ok) {
      alert("Thêm không gian mới thành công!");
      closeSpaceModal();
      loadSpaceList(currentBranchId);
    } else {
      alert(data.error || "Có lỗi xảy ra.");
    }
  } catch (error) {
    console.error("Lỗi khi thêm không gian:", error);
  }
}

// ==========================================
// --- WIZARD TẠO CƠ SỞ MỚI (LAYER ADD) ---
// ==========================================
function startAddFacility() {
  document.getElementById("space-mgr-layer-1").classList.add("hidden");
  document.getElementById("space-mgr-layer-add").classList.remove("hidden");
}

function cancelAddFacility() {
  document.getElementById("space-mgr-layer-add").classList.add("hidden");
  document.getElementById("space-mgr-layer-1").classList.remove("hidden");
  loadBranchList();
}

function previewFacilityImage(input) {
  const preview = document.getElementById("add-fac-image-preview");
  preview.innerHTML = "";
  if (input.files && input.files.length > 0) {
    for (let i = 0; i < input.files.length; i++) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(input.files[i]);
      img.className =
        "w-20 h-20 object-cover rounded-xl border shadow-sm inline-block mr-2 mb-2";
      preview.appendChild(img);
    }
  }
}

function addFacilityGoStep2() {
  const name = document.getElementById("add-fac-name").value;
  const address = document.getElementById("add-fac-address").value;
  if (!name || !address) return alert("Vui lòng điền Tên và Địa chỉ!");

  document.getElementById("add-fac-summary-name").innerText = name;
  document.getElementById("add-fac-summary-address").innerText = address;
  document.getElementById("add-facility-step-1").classList.add("hidden");
  document.getElementById("add-facility-step-2").classList.remove("hidden");

  const listDiv = document.getElementById("add-facility-spaces-list");
  if (listDiv.innerHTML === "") addFacilitySpaceRow();
}

function addFacilityBackToStep1() {
  document.getElementById("add-facility-step-2").classList.add("hidden");
  document.getElementById("add-facility-step-1").classList.remove("hidden");
}

function addFacilitySpaceRow() {
  const div = document.createElement("div");
  div.className =
    "p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end relative";
  div.innerHTML = `
    <div>
      <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Mã không gian</label>
      <input type="text" placeholder="VD: P-101" class="w-full bg-white border rounded-lg p-2 text-xs font-bold space-code-input">
    </div>
    <div>
      <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Tên hiển thị</label>
      <input type="text" placeholder="VD: Phòng họp A" class="w-full bg-white border rounded-lg p-2 text-xs font-bold space-name-input">
    </div>
    <div>
      <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Loại hình</label>
      <select class="w-full bg-white border rounded-lg p-2 text-xs font-bold space-type-input">
        <option>Phòng họp</option>
        <option>Chỗ ngồi tự do</option>
        <option>Văn phòng</option>
        <option>Sự kiện</option>
      </select>
    </div>
    <div>
      <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Giá thuê (/Giờ)</label>
      <input type="text" placeholder="VD: 50.000" class="w-full bg-white border rounded-lg p-2 text-xs font-bold space-price-input">
    </div>
  `;
  document.getElementById("add-facility-spaces-list").appendChild(div);
}

async function saveNewFacility() {
  const name = document.getElementById("add-fac-name").value;
  const address = document.getElementById("add-fac-address").value;
  const note = document.getElementById("add-fac-note").value;
  const imgInput = document.getElementById("add-fac-image");

  const formData = new FormData();
  formData.append("name", name);
  formData.append("address", address);
  formData.append("note", note);

  if (imgInput.files && imgInput.files.length > 0) {
    for (let i = 0; i < imgInput.files.length; i++) {
      formData.append("image", imgInput.files[i]);
    }
  }

  try {
    const resBranch = await fetch(`/api/hosts/${HOST_ID}/branches`, {
      method: "POST",
      body: formData,
    });
    const branchData = await resBranch.json();
    if (!resBranch.ok) return alert(branchData.error || "Lỗi tạo cơ sở");

    const rows = document.querySelectorAll("#add-facility-spaces-list > div");
    for (let row of rows) {
      const code = row.querySelector(".space-code-input").value;
      const sName = row.querySelector(".space-name-input").value;
      const type = row.querySelector(".space-type-input").value;
      const price = row.querySelector(".space-price-input").value;

      if (!code) continue;

      await fetch(`/api/hosts/${HOST_ID}/branches/${branchData._id}/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: code,
          name: sName,
          type,
          price,
          status: "ready",
        }),
      });
    }

    alert("Tạo cơ sở thành công!");
    location.reload();
  } catch (error) {
    console.error("Lỗi lưu cơ sở mới:", error);
  }
}