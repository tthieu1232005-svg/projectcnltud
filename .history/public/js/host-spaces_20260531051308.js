
let hostFacilities = {};
let facilitySpacesData = {};
let addFacilityDraft = { imageDataUrl: '', spaces: [] };
let addFacilitySpaceCounter = 0;

const SPACE_STATUS_LABELS = {
    ready: 'Sẵn sàng',
    preparing: 'Đang chuẩn bị',
    occupied: 'Có khách',
    suspended: 'Tạm ngừng hoạt động'
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function loadHostFacilitiesFromStorage() {
    try {
        const savedFac = localStorage.getItem('workhub_facilities');
        const savedSpaces = localStorage.getItem('workhub_facility_spaces');
        hostFacilities = savedFac ? JSON.parse(savedFac) : { ...DEFAULT_FACILITIES };
        facilitySpacesData = savedSpaces ? JSON.parse(savedSpaces) : JSON.parse(JSON.stringify(DEFAULT_FACILITY_SPACES));
    } catch {
        hostFacilities = { ...DEFAULT_FACILITIES };
        facilitySpacesData = JSON.parse(JSON.stringify(DEFAULT_FACILITY_SPACES));
    }
    if (typeof facilitySpaces !== 'undefined') {
        Object.assign(facilitySpaces, facilitySpacesData);
    }
}

function persistHostFacilities() {
    localStorage.setItem('workhub_facilities', JSON.stringify(hostFacilities));
    localStorage.setItem('workhub_facility_spaces', JSON.stringify(facilitySpacesData));
    if (typeof facilitySpaces !== 'undefined') {
        Object.keys(facilitySpaces).forEach(k => delete facilitySpaces[k]);
        Object.assign(facilitySpaces, facilitySpacesData);
    }
}

function slugifyFacilityId(name) {
    const base = (name || 'facility')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'facility';
    let id = base;
    let n = 1;
    while (hostFacilities[id]) {
        id = `${base}-${n++}`;
    }
    return id;
}

function getFacilitySpaceCount(facId) {
    return (facilitySpacesData[facId] || []).length;
}

function renderFacilityList() {
    const grid = document.getElementById('facility-list-grid');
    if (!grid) return;
    const entries = Object.values(hostFacilities);
    if (!entries.length) {
        grid.innerHTML = '<p class="text-slate-400 text-sm col-span-2">Chưa có cơ sở nào. Bấm "Thêm cơ sở" để bắt đầu.</p>';
        return;
    }
    grid.innerHTML = entries.map(f => {
        const count = getFacilitySpaceCount(f.id);
        const img = f.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800';
        return `
            <div onclick="openFacilityMgmt('${escapeHtml(f.id)}')" class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-teal-500 transition cursor-pointer group">
                <div class="relative h-40 mb-6 rounded-2xl overflow-hidden shadow-inner">
                    <img src="${escapeHtml(img)}" alt="" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                    <div class="absolute top-3 right-3 bg-white/90 px-3 py-1 rounded-full text-[10px] font-black text-teal-600 uppercase">${count} Vị trí</div>
                </div>
                <h3 class="text-xl font-black text-slate-800 tracking-tight">${escapeHtml(f.name)}</h3>
                <p class="text-sm text-slate-400">${escapeHtml(f.address)}</p>
            </div>`;
    }).join('');
}

function showHostSpaceLayer(layerId) {
    ['space-mgr-layer-1', 'space-mgr-layer-2', 'space-mgr-layer-3', 'space-mgr-layer-add'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== layerId);
    });
}

function startAddFacility() {
    addFacilityDraft = { imageDataUrl: '', spaces: [] };
    addFacilitySpaceCounter = 0;
    document.getElementById('add-fac-name').value = '';
    document.getElementById('add-fac-address').value = '';
    document.getElementById('add-fac-note').value = '';
    const imgInput = document.getElementById('add-fac-image');
    if (imgInput) imgInput.value = '';
    const preview = document.getElementById('add-fac-image-preview');
    if (preview) preview.innerHTML = '<span class="text-[10px] font-bold text-slate-400 uppercase">Chưa có ảnh</span>';
    setAddFacilityStep(1);
    showHostSpaceLayer('space-mgr-layer-add');
}

function cancelAddFacility() {
    showHostSpaceLayer('space-mgr-layer-1');
}

function setAddFacilityStep(step) {
    const s1 = document.getElementById('add-facility-step-1');
    const s2 = document.getElementById('add-facility-step-2');
    const label = document.getElementById('add-facility-step-label');
    const b1 = document.getElementById('add-fac-step-1-badge');
    const b2 = document.getElementById('add-fac-step-2-badge');
    if (!s1 || !s2) return;
    s1.classList.toggle('hidden', step !== 1);
    s2.classList.toggle('hidden', step !== 2);
    if (label) {
        label.textContent = step === 1
            ? 'Giai đoạn 1: Nhập thông tin cơ sở'
            : 'Giai đoạn 2: Nhập các không gian trong cơ sở';
    }
    if (b1 && b2) {
        b1.className = step === 1
            ? 'px-4 py-2 rounded-xl bg-teal-600 text-white'
            : 'px-4 py-2 rounded-xl bg-slate-100 text-slate-400';
        b2.className = step === 2
            ? 'px-4 py-2 rounded-xl bg-teal-600 text-white'
            : 'px-4 py-2 rounded-xl bg-slate-100 text-slate-400';
    }
}

function previewFacilityImage(input) {
    const file = input.files && input.files[0];
    const preview = document.getElementById('add-fac-image-preview');
    if (!file || !preview) return;
    const reader = new FileReader();
    reader.onload = e => {
        addFacilityDraft.imageDataUrl = e.target.result;
        preview.innerHTML = `<img src="${e.target.result}" alt="" class="w-full h-full object-cover">`;
    };
    reader.readAsDataURL(file);
}

function previewSpaceImage(input, rowId) {
    const file = input.files && input.files[0];
    const preview = document.getElementById(`space-img-preview-${rowId}`);
    if (!file || !preview) return;
    const reader = new FileReader();
    reader.onload = e => {
        preview.innerHTML = `<img src="${e.target.result}" alt="" class="w-full h-full object-cover">`;
        preview.dataset.imageUrl = e.target.result;
    };
    reader.readAsDataURL(file);
}

function addFacilityGoStep2() {
    const name = document.getElementById('add-fac-name')?.value.trim();
    const address = document.getElementById('add-fac-address')?.value.trim();
    if (!name || !address) {
        showToast('Vui lòng nhập Tên cơ sở và Địa chỉ');
        return;
    }
    document.getElementById('add-fac-summary-name').textContent = name;
    document.getElementById('add-fac-summary-address').textContent = address;
    setAddFacilityStep(2);
    const list = document.getElementById('add-facility-spaces-list');
    if (list && !list.children.length) addFacilitySpaceRow();
}

function addFacilityBackToStep1() {
    setAddFacilityStep(1);
}

function addFacilitySpaceRow() {
    const list = document.getElementById('add-facility-spaces-list');
    if (!list) return;
    const rowId = ++addFacilitySpaceCounter;
    const card = document.createElement('div');
    card.className = 'p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4';
    card.dataset.rowId = String(rowId);
    card.innerHTML = `
        <div class="flex justify-between items-center">
            <p class="text-[10px] font-black text-slate-400 uppercase">Không gian #${rowId}</p>
            <button type="button" onclick="removeFacilitySpaceRow(${rowId})" class="text-red-500 text-[10px] font-black uppercase hover:text-red-700">Xóa</button>
        </div>
        <div class="flex flex-wrap gap-3 items-start">
            <div id="space-img-preview-${rowId}" class="h-20 w-28 bg-white rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                <span class="text-[9px] font-bold text-slate-400 uppercase">Ảnh</span>
            </div>
            <label class="h-20 w-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 font-bold text-[9px] uppercase cursor-pointer hover:border-teal-500 transition shrink-0">
                + Ảnh
                <input type="file" accept="image/*" class="hidden" onchange="previewSpaceImage(this, ${rowId})">
            </label>
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
            <div class="p-3 bg-white rounded-xl border border-slate-100">
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Tên / Mã <span class="text-red-500">*</span></label>
                <input type="text" data-field="id" placeholder="VD: 103, A-05" class="w-full bg-transparent border-none p-0 text-sm font-bold outline-none text-slate-800">
            </div>
            <div class="p-3 bg-white rounded-xl border border-slate-100">
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Loại</label>
                <select data-field="type" class="w-full bg-transparent border-none p-0 text-sm font-bold outline-none text-slate-800">
                    <option value="Phòng họp">Phòng họp</option>
                    <option value="Chỗ ngồi tự do">Chỗ ngồi tự do</option>
                </select>
            </div>
            <div class="p-3 bg-white rounded-xl border border-slate-100">
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Giá niêm yết / Giờ</label>
                <input type="text" data-field="price" placeholder="250000" class="w-full bg-transparent border-none p-0 text-sm font-bold outline-none text-teal-600">
            </div>
            <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-1">Trạng thái</label>
                <select data-field="status" class="w-full bg-transparent border-none p-0 text-sm font-bold outline-none text-slate-800">
                    <option value="ready">Sẵn sàng</option>
                    <option value="preparing">Đang chuẩn bị</option>
                    <option value="occupied">Có khách</option>
                    <option value="suspended">Tạm ngừng hoạt động</option>
                </select>
            </div>
        </div>`;
    list.appendChild(card);
}

function removeFacilitySpaceRow(rowId) {
    const list = document.getElementById('add-facility-spaces-list');
    const card = list?.querySelector(`[data-row-id="${rowId}"]`);
    if (card) card.remove();
    if (list && !list.children.length) addFacilitySpaceRow();
}

function formatPriceDisplay(raw) {
    const num = String(raw || '').replace(/\D/g, '');
    if (!num) return '0đ';
    return `${Number(num).toLocaleString('vi-VN')}đ`;
}

function collectSpacesFromWizard() {
    const list = document.getElementById('add-facility-spaces-list');
    if (!list) return [];
    const spaces = [];
    list.querySelectorAll('[data-row-id]').forEach(card => {
        const id = card.querySelector('[data-field="id"]')?.value.trim();
        if (!id) return;
        const type = card.querySelector('[data-field="type"]')?.value || 'Phòng họp';
        const status = card.querySelector('[data-field="status"]')?.value || 'ready';
        const priceRaw = card.querySelector('[data-field="price"]')?.value.trim();
        const preview = card.querySelector('[id^="space-img-preview-"]');
        spaces.push({
            id,
            type,
            status,
            price: formatPriceDisplay(priceRaw),
            image: preview?.dataset?.imageUrl || ''
        });
    });
    return spaces;
}

function saveNewFacility() {
    const name = document.getElementById('add-fac-name')?.value.trim();
    const address = document.getElementById('add-fac-address')?.value.trim();
    const note = document.getElementById('add-fac-note')?.value.trim();
    const spaces = collectSpacesFromWizard();
    if (!name || !address) {
        showToast('Thiếu thông tin cơ sở');
        setAddFacilityStep(1);
        return;
    }
    if (!spaces.length) {
        showToast('Thêm ít nhất một không gian có Tên/Mã');
        return;
    }
    const facId = slugifyFacilityId(name);
    const image = addFacilityDraft.imageDataUrl
        || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800';
    hostFacilities[facId] = { id: facId, name, address, note, image };
    facilitySpacesData[facId] = spaces;
    persistHostFacilities();
    renderFacilityList();
    showHostSpaceLayer('space-mgr-layer-1');
    showToast(`Đã tạo cơ sở "${name}" với ${spaces.length} không gian`);
}

function initHostSpacesPage() {
    loadHostFacilitiesFromStorage();
    renderFacilityList();
}

// Ghi đè / bổ sung hàm từ main.js khi host-spaces.js được load sau main.js
function openFacilityMgmt(facId) {
    showHostSpaceLayer('space-mgr-layer-2');
    const f = hostFacilities[facId];
    if (f) {
        const nameInput = document.querySelector('#space-mgr-layer-2 [data-fac-field="name"]');
        const addrInput = document.querySelector('#space-mgr-layer-2 [data-fac-field="address"]');
        const noteInput = document.querySelector('#space-mgr-layer-2 [data-fac-field="note"]');
        if (nameInput) nameInput.value = f.name;
        if (addrInput) addrInput.value = f.address;
        if (noteInput) noteInput.value = f.note || '';
    }
    const tbody = document.getElementById('spaces-list-body');
    const spaces = facilitySpacesData[facId] || [];
    if (!tbody) return;
    tbody.innerHTML = spaces.map(s => {
        const statusLabel = SPACE_STATUS_LABELS[s.status] || s.status;
        return `<tr class="border-b border-slate-50 hover:bg-slate-50 transition">
            <td class="p-4 font-black text-slate-700">${escapeHtml(s.id)}</td>
            <td class="p-4 text-slate-500">${escapeHtml(s.type)}</td>
            <td class="p-4"><span class="px-2 py-1 rounded-lg text-[9px] uppercase font-black status-${escapeHtml(s.status)}">${statusLabel}</span></td>
            <td class="p-4"><button type="button" onclick="openSpaceDetail('${escapeHtml(s.id)}')" class="text-teal-600 underline font-black">Chi tiết</button></td>
        </tr>`;
    }).join('');
}

function backToLayer1() {
    showHostSpaceLayer('space-mgr-layer-1');
}

function backToLayer2() {
    showHostSpaceLayer('space-mgr-layer-2');
}

async function loadProfile() {
    try {
        // 1. Lấy token từ bộ nhớ trình duyệt
        const token = localStorage.getItem('token');

        // 2. Gửi request kèm Token để Backend mở cửa
        const response = await fetch('/host/api/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` // Bắt buộc phải có dòng này
            }
        });

        const data = await response.json();
        console.log("Dữ liệu profile tải về:", data);

        if (data.error) {
            console.error("Lỗi từ server:", data.error);
            return;
        }

        // 3. Điền dữ liệu vào form
        document.getElementById('host-name-input').value = data.user?.FullName || '';
        document.getElementById('email').value = data.user?.Email || '';

        document.getElementById('companyName').value = data.profile?.CompanyName || '';
        document.getElementById('hotline').value = data.profile?.Hotline || '';
        document.getElementById('taxCode').value = data.profile?.TaxCode || '';
        document.getElementById('bankName').value = data.profile?.BankName || '';
        document.getElementById('bankNumber').value = data.profile?.BankNumber || '';

    } catch (error) {
        console.error("Lỗi khi tải profile:", error);
    }
}

// Giữ nguyên đoạn DOMContentLoaded của bạn
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
});

async function updateProfile() {
    const token = localStorage.getItem('token');
    const bodyData = {
        CompanyName: document.getElementById('companyName').value,
        Hotline: document.getElementById('hotline').value,
        TaxCode: document.getElementById('taxCode').value,
        BankName: document.getElementById('bankName').value,
        BankNumber: document.getElementById('bankNumber').value
    };

    // Đã sửa URL thành '/host/api/profile'
    const response = await fetch('/host/api/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
    });

    const data = await response.json();
    alert(data.message || 'Đã cập nhật hồ sơ thành công!');
}