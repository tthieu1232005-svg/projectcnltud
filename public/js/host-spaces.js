// =======================================================
// QUẢN LÝ CƠ SỞ & KHÔNG GIAN (HOST SPACES) - MOCK DATA
// =======================================================

const DEFAULT_FACILITIES = {
    central: {
        id: 'central',
        name: 'WorkHub Central Q1',
        address: '123 Lê Lợi, Phường Bến Thành, Quận 1',
        note: 'Chi nhánh trung tâm nhất của hệ thống.',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800'
    }
};

const DEFAULT_FACILITY_SPACES = {
    central: [
        { id: '101', type: 'Phòng họp', status: 'occupied', price: '250.000đ', image: '' },
        { id: '102', type: 'Phòng họp', status: 'ready', price: '250.000đ', image: '' },
        { id: 'A-01', type: 'Chỗ ngồi tự do', status: 'preparing', price: '35.000đ', image: '' },
        { id: 'A-02', type: 'Chỗ ngồi tự do', status: 'suspended', price: '35.000đ', image: '' }
    ]
};

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
        showToast?.('Vui lòng nhập Tên cơ sở và Địa chỉ') || alert('Vui lòng nhập Tên cơ sở và Địa chỉ');
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
        showToast?.('Thiếu thông tin cơ sở') || alert('Thiếu thông tin cơ sở');
        setAddFacilityStep(1);
        return;
    }
    if (!spaces.length) {
        showToast?.('Thêm ít nhất một không gian có Tên/Mã') || alert('Thêm ít nhất một không gian có Tên/Mã');
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
    showToast?.(`Đã tạo cơ sở "${name}" với ${spaces.length} không gian`) || alert(`Đã tạo cơ sở "${name}" với ${spaces.length} không gian`);
}

function initHostSpacesPage() {
    loadHostFacilitiesFromStorage();
    renderFacilityList();
}

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

// =======================================================
// LOGIC ĐIỀU KHIỂN BẢNG ĐƠN ĐẶT CHỖ (HOST BOOKINGS)
// =======================================================

let allBookingsCache = []; 

// ==========================================
// TỐI ƯU HÓA: LẤY DANH SÁCH CƠ SỞ & KHÔNG GIAN
// ==========================================
async function loadHostBookings() {
    const tableBody = document.getElementById('host-booking-table-body');
    const emptyState = document.getElementById('booking-empty-state');
    
    const token = localStorage.getItem('token'); 
    
    // Nếu chưa đăng nhập, không tải
    if (!token) {
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-red-500 font-bold bg-red-50 rounded-xl">Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại!</td></tr>`;
        if (emptyState) emptyState.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`/api/hosts/bookings`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Không thể tải danh sách đơn hàng.');
        }
    
        allBookingsCache = data.bookings || [];
        
        if (allBookingsCache.length === 0) {
            if (tableBody) tableBody.innerHTML = ''; 
            if (emptyState) emptyState.style.display = 'block'; 
            
            const pendingCountBadge = document.getElementById('host-pending-count');
            if (pendingCountBadge) pendingCountBadge.classList.add('hidden'); 
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        const pendingCount = allBookingsCache.filter(b => (b.Status || b.status) === 'pending').length;
        const pendingCountBadge = document.getElementById('host-pending-count');
        if (pendingCountBadge) {
            if (pendingCount > 0) {
                pendingCountBadge.textContent = pendingCount;
                pendingCountBadge.classList.remove('hidden'); 
            } else {
                pendingCountBadge.classList.add('hidden'); 
            }
        }

        // Gọi hàm lọc tổng hợp (mặc định ban đầu sẽ tự load Tất cả)
        applyCombinedFilters();

    } catch (error) {
        console.error('Lỗi tải đơn hàng Host:', error);
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-rose-500 font-bold bg-rose-50">Lỗi kết nối máy chủ: ${error.message}</td></tr>`;
        if (emptyState) emptyState.style.display = 'none';
    }
}

// =======================================================
// TRẠNG THÁI BỘ LỌC TOÀN CỤC (GLOBAL FILTER STATE)
// =======================================================
let currentStatusFilter = 'all'; 
let currentTimeFilter = { type: 'all', start: null, end: null };
let currentKeywordFilter = ''; // Biến lưu trữ từ khóa tìm kiếm

// =======================================================
// HÀM LỌC VÀ SẮP XẾP KẾT HỢP (TÌM KIẾM + TRẠNG THÁI + THỜI GIAN)
// =======================================================
function applyCombinedFilters() {
    const now = new Date();
    
    // 1. BƯỚC LỌC DỮ LIỆU (FILTERING)
    let filteredList = allBookingsCache.filter(booking => {
        const originalStatus = booking.Status || booking.status;
        const end = new Date(booking.EndTime || booking.endTime);
        const isExpired = !isNaN(end.getTime()) && (now >= end);
        
        // Tự động ép trạng thái Đã kết thúc nếu lố giờ (ảo trên UI)
        let displayStatus = originalStatus;
        if (originalStatus === 'in-use' && isExpired) displayStatus = 'completed';

        // --- Điều kiện A: Khớp Trạng thái ---
        let passStatus = false;
        if (currentStatusFilter === 'all') passStatus = true;
        else if (currentStatusFilter === 'in-use') passStatus = (displayStatus === 'in-use');
        else if (currentStatusFilter === 'completed') passStatus = (displayStatus === 'completed' || originalStatus === 'cancelled');
        else passStatus = (displayStatus === currentStatusFilter);

        // --- Điều kiện B: Khớp Thời gian (Ngày cụ thể) ---
        let passTime = true;
        if (currentTimeFilter.type === 'specific') {
            const bookingStart = new Date(booking.StartTime || booking.startTime);
            passTime = (bookingStart >= currentTimeFilter.start && bookingStart <= currentTimeFilter.end);
        }

        // --- Điều kiện C: Khớp Từ khóa tìm kiếm ---
        let passKeyword = true;
        if (currentKeywordFilter !== '') {
            const bookingId = (booking._id || '').toLowerCase();
            const customer = booking.CustomerID || booking.customerID || {};
            const customerEmail = (customer.email || customer.Email || '').toLowerCase();
            const customerName = (customer.fullName || customer.FullName || '').toLowerCase();
            
            passKeyword = bookingId.includes(currentKeywordFilter) || 
                          customerEmail.includes(currentKeywordFilter) || 
                          customerName.includes(currentKeywordFilter);
        }

        return passStatus && passTime && passKeyword;
    });

    // 2. BƯỚC SẮP XẾP DỮ LIỆU (SORTING LÊN ĐẦU)
    filteredList.sort((a, b) => {
        const nowTime = now.getTime();

        // Hàm chấm điểm ưu tiên (Điểm càng thấp càng ưu tiên nằm trên cùng)
        const getPriorityScore = (bk) => {
            const status = bk.Status || bk.status;
            const endObj = new Date(bk.EndTime || bk.endTime);
            const isExpired = !isNaN(endObj.getTime()) && (nowTime >= endObj.getTime());
            
            let dStatus = status;
            if (status === 'in-use' && isExpired) dStatus = 'completed';

            // Ưu tiên 1: Đang dùng và Sắp hết giờ (<= 15p)
            if (dStatus === 'in-use') {
                const minsLeft = Math.floor((endObj.getTime() - nowTime) / (1000 * 60));
                if (minsLeft <= 14 && minsLeft >= 0) return 1; 
                return 3; // Đang dùng bình thường (Ưu tiên 3)
            }
            // Ưu tiên 2: Chờ duyệt (Cần xử lý gấp)
            if (dStatus === 'pending') return 2; 
            
            // Ưu tiên 4: Đã xác nhận (Chờ khách đến)
            if (dStatus === 'confirmed') return 4;
            
            // Ưu tiên 5: Đã kết thúc / Đã hủy (Cho xuống đáy bảng)
            return 5; 
        };

        const scoreA = getPriorityScore(a);
        const scoreB = getPriorityScore(b);

        // Nếu điểm ưu tiên khác nhau, xếp theo điểm (1,2,3,4,5)
        if (scoreA !== scoreB) {
            return scoreA - scoreB;
        }

        // Nếu cùng điểm ưu tiên, xếp đơn có thời gian kết thúc gần nhất lên trước
        const endA = new Date(a.EndTime || a.endTime).getTime();
        const endB = new Date(b.EndTime || b.endTime).getTime();
        return endA - endB;
    });

    // 3. VẼ BẢNG
    renderBookingsToTable(filteredList);
}

// =======================================================
// XỬ LÝ THANH TÌM KIẾM
// =======================================================
function handleBookingSearch() {
    const searchInput = document.getElementById('booking-search-input');
    if (!searchInput) return;

    // Cập nhật từ khóa và gọi hàm lọc tổng hợp
    currentKeywordFilter = searchInput.value.trim().toLowerCase();
    applyCombinedFilters();
}

let liveTimerInterval = null; 

function renderBookingsToTable(bookingsList) {
    const tableBody = document.getElementById('host-booking-table-body');
    const emptyState = document.getElementById('booking-empty-state');

    if (!tableBody) return;

    if (!bookingsList || bookingsList.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    const currentTime = new Date();

    tableBody.innerHTML = bookingsList.map(booking => {
        const start = booking.StartTime || booking.startTime;
        const end = booking.EndTime || booking.endTime;
        const status = booking.Status || booking.status;
        
        const endTimeObj = new Date(end);
        const isDateValid = !isNaN(endTimeObj.getTime());
        const timeDiff = endTimeObj.getTime() - currentTime.getTime();
        const minutesLeft = Math.floor(timeDiff / (1000 * 60)); 
        
        let displayStatus = status;
        let timeWarningUI = ''; 

        // LOGIC XỬ LÝ KHUNG ĐẾM NGƯỢC
        if (status === 'in-use' && isDateValid) {
            if (minutesLeft < 0) {
                displayStatus = 'completed';
            } else {
                const isHidden = minutesLeft > 14 ? 'hidden' : 'flex animate-pulse';
                timeWarningUI = `
                    <div class="live-countdown-container mt-2 ${isHidden} items-center gap-1 bg-amber-100 text-amber-600 px-3 py-1.5 rounded-xl text-xs font-black uppercase border border-amber-200 shadow-sm w-max whitespace-nowrap justify-center"
                         data-endtime="${end}">
                        ⏰ <span class="timer-text font-mono">...</span>
                    </div>
                `;
            }
        }

        const total = booking.TotalAmount || booking.totalAmount || 0;
        const deposit = booking.DepositAmount || booking.depositAmount || 0;
        
        let percent = booking.percentagePaid !== undefined ? booking.percentagePaid : (total > 0 ? Math.round((deposit / total) * 100) : 0);
        let actualPaid = deposit > 0 ? deposit : (total * percent / 100);
        let remaining = total - actualPaid;

        if (displayStatus === 'in-use' || displayStatus === 'completed') {
            percent = 100;
            actualPaid = total;
            remaining = 0; 
        }

        const customer = booking.CustomerID || booking.customerID || {};
        const space = booking.SpaceID || booking.spaceID || {};

        const startTimeStr = start ? new Date(start).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--';
        const endTimeStr = end ? new Date(end).toLocaleString('vi-VN', {hour: '2-digit', minute:'2-digit'}) : '--:--';
        const dateStr = start ? new Date(start).toLocaleDateString('vi-VN') : 'Dữ liệu thời gian lỗi';

        let statusBadge = '';
        if (displayStatus === 'pending') {
            statusBadge = `<span class="bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-black uppercase tracking-wider text-[10px]">Chờ duyệt</span>`;
        } else if (displayStatus === 'confirmed') {
            statusBadge = `<span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-black uppercase tracking-wider text-[10px] whitespace-nowrap">Đã xác nhận</span>`;
        } else if (displayStatus === 'in-use') {
            statusBadge = `<span class="bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-black uppercase tracking-wider text-[10px]">Đang dùng</span>`;
        } else if (displayStatus === 'completed') {
            statusBadge = `<span class="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-black uppercase tracking-wider text-[10px]">Đã kết thúc</span>`;
        } else if (displayStatus === 'cancelled') {
            statusBadge = `<span class="bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-black uppercase tracking-wider text-[10px]">Đã hủy</span>`;
        }

        let actionButtons = '';
        if (displayStatus === 'pending') {
            actionButtons = `
                <button onclick="executeBookingAction('${booking._id}', 'confirm')" class="bg-teal-50 text-teal-700 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase hover:bg-teal-600 hover:text-white transition mr-1">Duyệt</button>
                <button onclick="executeBookingAction('${booking._id}', 'cancel')" class="bg-rose-50 text-rose-700 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase hover:bg-rose-600 hover:text-white transition">Từ chối</button>
            `;
        } else if (displayStatus === 'confirmed') {
            actionButtons = `
                <button onclick="executeBookingAction('${booking._id}', 'checkin')" class="bg-blue-50 text-blue-700 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase hover:bg-blue-600 hover:text-white transition shadow-sm mr-1">Nhận phòng</button>
                <button onclick="executeBookingAction('${booking._id}', 'cancel')" class="bg-rose-50 text-rose-700 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase hover:bg-rose-600 hover:text-white transition shadow-sm" title="Hủy do khách đến trễ/vắng mặt">Hủy (Khách trễ)</button>
            `;
        } else {
            actionButtons = `<span class="text-slate-300 font-black text-lg">-</span>`;
        }

        let paymentUI = '';
        if (total === 0) {
            paymentUI = `
                <div class="font-black text-rose-500 text-[11px] italic">⚠️ Lỗi dữ liệu</div>
                <div class="text-[9px] font-bold text-slate-400 mt-0.5">DB trống giá (0đ)</div>
            `;
        } else {
            paymentUI = `
                <div class="font-black text-slate-800">${total.toLocaleString('vi-VN')}đ</div>
                <div class="text-[10px] font-bold text-slate-500 mt-0.5">Đã trả: ${actualPaid.toLocaleString('vi-VN')}đ (${percent}%)</div>
            `;
            
            if (displayStatus === 'cancelled') {
                paymentUI += `<div class="text-[10px] font-black text-slate-500 mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded border border-slate-200">Không thu thêm</div>`;
            } else if (displayStatus === 'pending' || displayStatus === 'confirmed') {
                if (remaining > 0) {
                    paymentUI += `<div class="text-[10px] font-black text-rose-600 mt-1 bg-rose-50 inline-block px-2 py-0.5 rounded border border-rose-100">Cần thu: ${remaining.toLocaleString('vi-VN')}đ</div>`;
                } else {
                    paymentUI += `<div class="text-[10px] font-black text-emerald-600 mt-1 bg-emerald-50 inline-block px-2 py-0.5 rounded border border-emerald-100">Đã thu đủ</div>`;
                }
            } else {
                paymentUI += `<div class="text-[10px] font-black text-emerald-600 mt-1 bg-emerald-50 inline-block px-2 py-0.5 rounded border border-emerald-100">Đã thu đủ</div>`;
            }
        }

        const displayEmail = customer.email || customer.Email || '<span class="text-rose-500">Lỗi dữ liệu khách</span>';
        const displayCustName = customer.fullName || customer.FullName || '';
        const nameUI = displayCustName ? `<div class="text-slate-800 font-bold text-xs mt-1">${displayCustName}</div>` : '';

        function getSpaceDisplayName(sp) {
            if (!sp || typeof sp !== 'object') return 'Chưa cập nhật tên Không gian';
            return (
                sp.name ||
                sp.Name ||
                sp.spaceName ||
                sp.SpaceName ||
                'Chưa cập nhật tên Không gian'
            );
        }

        function getSpaceDisplayCode(sp) {
            if (!sp || typeof sp !== 'object') return '---';
            return (
                sp.SpaceCode ||
                sp.spaceCode ||
                sp.Space_Code ||
                sp.space_code ||
                sp.code ||
                sp.Space_code ||
                '---'
            );
        }

        const displaySpaceName = getSpaceDisplayName(space);
        const displaySpaceCode = getSpaceDisplayCode(space);

        return `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition">
                <td class="p-5">
                    <div class="text-teal-600 font-black">#${booking._id ? booking._id.substring(booking._id.length - 6).toUpperCase() : 'N/A'}</div>
                    ${nameUI}
                    <div class="text-slate-500 text-[11px] font-medium mt-0.5">${displayEmail}</div>
                </td>
                
                <td class="p-5 font-bold text-slate-700">
                    <div class="text-sm text-slate-800 mb-1">${displaySpaceName}</div>
                    <div class="text-xs font-bold text-slate-500 mb-3">Mã phòng: ${displaySpaceCode}</div>
                </td>
                
                <td class="p-5 text-slate-500 font-semibold">
                    <div>${startTimeStr} - ${endTimeStr}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">${dateStr}</div>
                    ${timeWarningUI}
                </td>
                
                <td class="p-5">
                    ${paymentUI}
                </td>
                <td class="p-5">${statusBadge}</td>
                <td class="p-5 text-right">${actionButtons}</td>
            </tr>
        `;
    }).join('');

    // Gọi lại hàm đếm ngược thời gian nếu có
    if (typeof startLiveTimers === 'function') {
        startLiveTimers();
    }
}

function startLiveTimers() {
    if (liveTimerInterval) clearInterval(liveTimerInterval);

    liveTimerInterval = setInterval(() => {
        const containers = document.querySelectorAll('.live-countdown-container');
        let needToRefreshTable = false; 

        containers.forEach(container => {
            const endStr = container.getAttribute('data-endtime');
            const endTime = new Date(endStr).getTime();
            const now = new Date().getTime();
            const diff = endTime - now;

            if (diff <= 0) {
                // Chạm mốc 0 giây -> Kích hoạt load lại bảng để xếp nó xuống đáy
                needToRefreshTable = true;
            } else {
                const totalSeconds = Math.floor(diff / 1000);
                const mins = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                
                const secsFormatted = secs < 10 ? '0' + secs : secs;
                container.querySelector('.timer-text').textContent = `Hết giờ: ${mins}p ${secsFormatted}s`;

                // Nếu đếm lùi đến <= 15 phút, xóa class ẩn để hiện lên
                if (mins <= 14) {
                    container.classList.remove('hidden');
                    container.classList.add('flex', 'animate-pulse');
                }
            }
        });

        // Khi có đơn hết giờ, applyCombinedFilters() sẽ tự động chấm điểm lại.
        // Đơn đó từ "Ưu tiên 1" sẽ bị rớt xuống "Ưu tiên 5" và chuyển sang Đã kết thúc.
        if (needToRefreshTable) {
            applyCombinedFilters(); 
        }
    }, 1000); 
}

async function executeBookingAction(bookingId, action) {
    if (action !== 'checkin' && !confirm(`Bạn có chắc chắn muốn thực hiện hành động này không?`)) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`/api/hosts/bookings/${bookingId}/${action}`, { 
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gặp lỗi khi cập nhật đơn.');

        if (action !== 'checkin') alert(data.message || 'Thao tác dữ liệu thành công!');
        
        loadHostBookings();

    } catch (error) {
        alert(error.message);
    }
}

// =======================================================
// XỬ LÝ KHI CLICK VÀO TAB TRẠNG THÁI (BÊN TRÁI)
// =======================================================
function filterHostBookings(status, tabElement) {
    document.querySelectorAll('.booking-filter-tab').forEach(tab => {
        tab.classList.remove('active', 'bg-white', 'shadow-sm', 'text-teal-600', 'border-teal-500');
        tab.classList.add('text-slate-500', 'hover:bg-white', 'border-transparent');
    });

    if (tabElement) {
        tabElement.classList.add('active', 'bg-white', 'shadow-sm', 'text-teal-600', 'border-teal-500');
        tabElement.classList.remove('text-slate-500', 'hover:bg-white', 'border-transparent');
    }

    currentStatusFilter = status;
    applyCombinedFilters();
}

// =======================================================
// XỬ LÝ KHI CLICK VÀO PHỄU THỜI GIAN (BÊN PHẢI)
// =======================================================
function triggerDatePicker() {
    const dateInput = document.getElementById('funnel-date-picker');
    if (dateInput) {
        try { dateInput.showPicker(); } 
        catch (error) { dateInput.focus(); }
    }
}

function applyFunnelFilter(filterType) {
    const displayLabel = document.getElementById('filter-display-text');
    const datePicker = document.getElementById('funnel-date-picker');

    if (filterType === 'all') {
        datePicker.value = ''; 
        if (displayLabel) {
            displayLabel.textContent = 'Tất cả thời gian';
            displayLabel.classList.remove('text-teal-600'); 
        }
        currentTimeFilter = { type: 'all', start: null, end: null };
        
    } else if (filterType === 'specific') {
        const selectedDateVal = datePicker.value; 
        if (!selectedDateVal) return; 

        const targetDate = new Date(selectedDateVal);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

        if (displayLabel) {
            displayLabel.textContent = `Lọc: ${startOfDay.toLocaleDateString('vi-VN')}`;
            displayLabel.classList.add('text-teal-600'); 
        }

        currentTimeFilter = { type: 'specific', start: startOfDay, end: endOfDay };
    }

    applyCombinedFilters();
}

// =======================================================
// TỰ ĐỘNG KÍCH HOẠT KHI TẢI TRANG
// =======================================================
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/host/bookings') {
        loadHostBookings();
    }

    const searchInput = document.getElementById('booking-search-input');
    if (searchInput) {
        // Cập nhật: Có thể lọc trực tiếp khi gõ chữ (input) hoặc khi bấm Enter
        searchInput.addEventListener('input', handleBookingSearch);
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); 
                handleBookingSearch();  
            }
        });
    }
});

// ==========================================
// ĐỒNG BỘ THỜI GIAN THỰC (SOCKET.IO)
// ==========================================
if (typeof io !== 'undefined') {
    const socket = io();

    // Lắng nghe sự kiện từ Backend
    socket.on('booking_status_updated', (data) => {
        console.log('Đơn hàng cập nhật (Host):', data);
        
        // Gọi lại hàm load dữ liệu để làm mới bảng quản lý
        if (typeof loadHostBookings === 'function') {
            loadHostBookings();
        }
    });
}