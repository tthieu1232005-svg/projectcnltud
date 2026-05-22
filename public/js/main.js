// ==========================================
// DỮ LIỆU DEMO MẶC ĐỊNH
// ==========================================
const pageLabels = { 'home': 'Trang Chủ', 'search': 'Kết Quả Tìm Kiếm', 'detail': 'Chi Tiết Không Gian', 'payment': 'Thanh Toán', 'history': 'Lịch Sử Đặt Chỗ', 'profile': 'Hồ Sơ Cá Nhân', 'payment_history': 'Lịch Sử Thanh Toán', 'login': 'Đăng nhập', 'host_dashboard': 'Bảng Điều Hành Host', 'host_spaces': 'Quản Lý Không Gian', 'host_bookings': 'Quản lý đơn đặt chỗ' };
const menus = { 'guest': [], 'customer': [{ id: 'home', label: 'Trang chủ', icon: '🏠' }, { id: 'history', label: 'Lịch sử đặt', icon: '📅' }, { id: 'payment_history', label: 'Lịch sử ví', icon: '💳' }, { id: 'profile', label: 'Hồ sơ', icon: '👤' }], 'host': [{ id: 'host_dashboard', label: 'Dashboard', icon: '📊' }, { id: 'host_spaces', label: 'Quản lý không gian', icon: '🏢' }, { id: 'host_bookings', label: 'Đơn đặt chỗ', icon: '📋' }, { id: 'host_reports', label: 'Báo cáo', icon: '💰' }, { id: 'host_payments', label: 'Lịch sử tiền', icon: '💳' }, { id: 'host_profile', label: 'Hồ sơ', icon: '👤' }] };

const facilitySpaces = { 'central': [{id: '101', type: 'Phòng đơn', status: 'occupied', price: '250.000đ'}, {id: '102', type: 'Phòng đơn', status: 'ready', price: '250.000đ'}, {id: 'A-01', type: 'Ghế ngồi', status: 'preparing', price: '35.000đ'}, {id: 'A-02', type: 'Ghế ngồi', status: 'suspended', price: '35.000đ'}] };
const hostData = {
    all: { rev: '12.5M', book: 42, occ: 128, rooms: 24, pot: '5.2M', recent: [{name: 'Nguyễn Văn A', room: '101', time: '14:00-16:00', status: 'paid', paid: '500k', rem: '500k'}, {name: 'Lê Văn B', room: 'A04', time: '09:00-11:00', status: 'deposit', paid: '150k', rem: '350k'}, {name: 'Trần Thị C', room: '203', time: '10:00-12:00', status: 'paid', paid: '800k', rem: '0'}], mini: [{id: '101', s: 'occupied'}, {id: '102', s: 'booked'}, {id: 'A1', s: 'available'}, {id: 'A2', s: 'available'}, {id: '201', s: 'occupied'}] },
    q1: { rev: '8.1M', book: 28, occ: 86, rooms: 16, pot: '3.4M', recent: [{name: 'Nguyễn Văn A', room: '101', time: '14:00-16:00', status: 'paid', paid: '500k', rem: '500k'}, {name: 'Lê Văn B', room: 'A04', time: '09:00-11:00', status: 'deposit', paid: '150k', rem: '350k'}], mini: [{id: '101', s: 'occupied'}, {id: '102', s: 'booked'}, {id: 'A1', s: 'available'}, {id: 'A2', s: 'available'}] },
    q3: { rev: '4.4M', book: 14, occ: 42, rooms: 8, pot: '1.8M', recent: [{name: 'Phạm Văn D', room: '301', time: '13:00-15:00', status: 'deposit', paid: '200k', rem: '400k'}], mini: [{id: '301', s: 'occupied'}, {id: '302', s: 'available'}, {id: '303', s: 'booked'}] }
};

// Khôi phục trạng thái từ LocalStorage để Demo MVC hoạt động trơn tru
let currentRole = localStorage.getItem('workhub_role') || 'guest';
let isLoggedIn = currentRole !== 'guest';
let selectedSeat = null, currentPrices = { total: 500000, deposit: 150000 }, charts = {};

// ==========================================
// 1. HÀM ĐIỀU HƯỚNG CHUẨN MVC
// ==========================================
function navigateTo(id) {
    const routes = {
        'home': '/', 
        'search': '/search', 
        'detail': '/detail', 
        'payment': '/payment',
        'history': '/history', 
        'payment_history': '/payment_history', 
        'profile': '/profile',
        'host_profile': '/host/profile',
        'login': '/login', 
        'host_dashboard': '/host/dashboard', 
        'host_spaces': '/host/spaces',
        'host_bookings': '/host/bookings',
        // Bổ sung 2 đường dẫn mới cho luồng Host:
        'host_reports': '/host/reports',
        'host_payments': '/host/payments'
    };
    
    if (routes[id]) {
        window.location.href = routes[id];
    }
}

// ==========================================
// 2. CHỨC NĂNG DÙNG CHUNG (UI/UX)
// ==========================================
function openModal(id) { document.getElementById(id).classList.remove('hidden'); document.getElementById(id).classList.add('flex'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); document.getElementById(id).classList.remove('flex'); }
function showToast(msg) { const t = document.getElementById('success-toast'), m = document.getElementById('toast-msg'); if (t && m) { m.innerText = msg; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 2000); } }

function toggleSidebar() { const s = document.getElementById('sidebar'); if (s) s.classList.toggle('collapsed'); }
function toggleUserMenu() { document.getElementById('dropdown-menu').classList.toggle('hidden'); }

// ==========================================
// 3. XỬ LÝ ĐĂNG NHẬP / ROLE
// ==========================================
function fakeLogin(role) { 
    localStorage.setItem('workhub_role', role); // Lưu role vào trình duyệt
    currentRole = role; isLoggedIn = true; 
    updateAuthUI(); renderMenu();
    navigateTo(role === 'host' ? 'host_dashboard' : 'home'); 
}
function logout() { 
    localStorage.setItem('workhub_role', 'guest'); 
    currentRole = 'guest'; isLoggedIn = false; 
    updateAuthUI(); renderMenu();
    navigateTo('home'); 
}
function renderMenu() { 
    const c = document.getElementById('menu-items'); 
    if(!c) return;
    c.innerHTML = ''; 
    (menus[currentRole] || []).forEach(i => { 
        const d = document.createElement('div'); 
        d.className = 'nav-item cursor-pointer'; 
        
        // 1. Tạo ra chuỗi đường dẫn (route) chuẩn xác từ id của menu
        let expectedPath = '/' + i.id;
        if (i.id === 'home') expectedPath = '/';
        else if (i.id.startsWith('host_')) expectedPath = '/host/' + i.id.replace('host_', '');

        // 2. So sánh chính xác tuyệt đối với URL hiện tại trên trình duyệt
        if (window.location.pathname === expectedPath) {
            d.classList.add('active');
        }

        d.onclick = () => navigateTo(i.id); 
        d.innerHTML = `<span>${i.icon}</span> ${i.label}`; 
        c.appendChild(d); 
    }); 
}
function updateAuthUI() { 
    const b = document.getElementById('nav-login-btn'), u = document.getElementById('user-info'), s = document.getElementById('sidebar'), t = document.getElementById('sidebar-toggle'); 
    if (!b || !u) return;
    if(isLoggedIn) { 
        b.classList.add('hidden'); u.classList.remove('hidden'); 
        s?.classList.remove('hidden-permanent', 'collapsed'); t?.classList.remove('hidden');
        document.getElementById('user-display-name').innerText = currentRole === 'host' ? "Chủ Cơ Sở" : "Nguyễn Văn An"; 
        document.getElementById('user-display-role').innerText = currentRole === 'host' ? 'Quản lý' : 'Thành viên'; 
    } else { 
        b.classList.remove('hidden'); u.classList.add('hidden'); 
        s?.classList.add('hidden-permanent'); t?.classList.add('hidden');
    } 
}

function handleRegisterDemo() {
    const selectedRole = document.querySelector('input[name="role"]:checked').value;
    const roleName = selectedRole === 'host' ? 'Chủ cơ sở' : 'Khách hàng';
    showToast(`Đăng ký thành công vai trò ${roleName}!`);
    setTimeout(() => {
        window.location.href = '/login';
    }, 1500);
}
// Biến tạm để giữ vai trò đang chọn khi đăng nhập
let tempSelectedRole = 'guest';

// Hàm hiển thị Form khi nhấn chọn vai trò
function prepareLogin(role) {
    tempSelectedRole = role;
    const roleArea = document.getElementById('role-selection-area');
    const formArea = document.getElementById('login-form-area');
    const title = document.getElementById('login-title');
    const subtitle = document.getElementById('login-subtitle');

    if (roleArea && formArea) {
        roleArea.classList.add('hidden');
        formArea.classList.remove('hidden');
        
        // Cập nhật tiêu đề theo vai trò
        title.innerText = role === 'host' ? 'Chủ cơ sở đăng nhập' : 'Khách hàng đăng nhập';
        subtitle.innerText = `Chào mừng ${role === 'host' ? 'Chủ cơ sở' : 'Khách hàng'} quay trở lại`;
    }
}

// Hàm quay lại phần chọn vai trò
function backToRoleSelect() {
    document.getElementById('role-selection-area').classList.remove('hidden');
    document.getElementById('login-form-area').classList.add('hidden');
}

// Hàm xử lý nút "Đăng nhập ngay"
function handleLoginSubmit() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    if (!email || !pass) {
        alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");
        return;
    }

    // Demo: Chấp nhận mọi thông tin và thực hiện đăng nhập
    showToast(`Đang xác thực tài khoản ${tempSelectedRole}...`);
    
    setTimeout(() => {
        // Gọi hàm fakeLogin cũ để thiết lập trạng thái hệ thống
        fakeLogin(tempSelectedRole);
    }, 1000);
}
// ==========================================
// 4. LOGIC LUỒNG KHÁCH HÀNG (CUSTOMER)
// ==========================================
function checkAvailableSlots() {
    const c = document.getElementById('available-slots-container');
    if (c) c.classList.remove('hidden');
}

function selectRoomCard(cardEl) {
    document.querySelectorAll('.room-card').forEach(c => {
        c.classList.remove('border-2', 'border-teal-500');
        c.classList.add('border', 'border-slate-200');
    });
    cardEl.classList.remove('border', 'border-slate-200');
    cardEl.classList.add('border-2', 'border-teal-500');
    selectedSeat = cardEl.dataset.roomId || cardEl.querySelector('.font-bold')?.innerText;
    const summary = document.getElementById('booking-summary');
    if (summary) summary.classList.remove('hidden');
}

function selectSeat(id, el) { selectRoomCard(el); selectedSeat = id; }
function checkAuthAndGoToPayment() { if(!isLoggedIn) { alert("Vui lòng đăng nhập để đặt chỗ!"); navigateTo('login'); return; } navigateTo('payment'); }
function setPaymentType(type) { 
    const area = document.getElementById('qr-area'); if(!area) return;
    area.classList.remove('hidden'); document.getElementById('qr-placeholder').classList.add('hidden'); 
    document.getElementById('pay-30').classList.toggle('active', type === 'deposit'); 
    document.getElementById('pay-100').classList.toggle('active', type === 'full'); 
    const amount = type === 'deposit' ? currentPrices.deposit : currentPrices.total; 
    document.getElementById('qr-price-val').innerText = amount.toLocaleString('vi-VN') + 'đ'; 
    document.getElementById('qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=PAY_${amount}`; 
}
function handleFinalSuccess() { showToast("Thanh toán thành công!"); setTimeout(() => navigateTo('history'), 1500); }
function renderHistory() {
    const l = document.getElementById('history-list');
    if (!l) return;
    const historyData = [{ id: 'BK01', name: 'WorkHub Central Q1', time: '20/03/2026 | 09:00 - 11:00', status: 'completed', deposit: '150.000đ', paidPercent: 100 }, { id: 'BK02', name: 'WorkHub Central Q1', time: '26/03/2026 | 08:00 - 10:00', status: 'confirmed', deposit: '21.000đ', paidPercent: 30 }];
    l.innerHTML = historyData.map(item => {
        let badge = item.status === 'completed' ? '<span class="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold uppercase">Hoàn thành</span>' : '<span class="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold uppercase">Đã xác nhận</span>';
        let paymentInfo = `<p class="text-[10px] font-black mt-2 ${item.paidPercent === 100 ? 'text-teal-600' : 'text-orange-500'}">THANH TOÁN: ${item.paidPercent}%</p>`;
        if(item.paidPercent < 100) paymentInfo += `<p class="text-[9px] text-slate-400 italic font-bold">Cần trả 70% còn lại tại quầy</p>`;
        return `<div class="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm"><div class="flex gap-4 items-center"><div class="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-3xl text-teal-600 font-bold shadow-inner">🏢</div><div><h4 class="font-bold text-slate-800">${item.name} ${badge}</h4><p class="text-sm text-slate-500">${item.time}</p>${paymentInfo}</div></div><div class="text-right text-xs font-bold text-teal-700 uppercase tracking-widest">Tiền cọc: ${item.deposit}</div></div>`;
    }).join('');
}

function renderSearch() {
    const l = document.getElementById('search-results-list');
    if (!l) return;
    l.innerHTML = `<div onclick="navigateTo('detail')" class="bg-white rounded-2xl border p-4 flex gap-4 hover:border-teal-500 cursor-pointer shadow-sm"><img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=300" class="w-20 h-20 rounded-xl object-cover"><div class="flex-1"><h4 class="font-bold text-slate-800 text-sm">WorkHub Central Q1</h4><div class="text-teal-700 font-bold text-xs">250.000đ/giờ</div></div></div>`.repeat(4);
}
// ==========================================
// 5. LOGIC LUỒNG CHỦ CƠ SỞ (HOST)
// ==========================================
function switchBranch(branchId) { 
    document.querySelectorAll('.branch-tab').forEach(t => t.classList.remove('active')); 
    const tab = document.getElementById(`tab-${branchId}`); if (tab) tab.classList.add('active'); 
    const d = hostData[branchId]; if(!d || !document.getElementById('stat-revenue')) return; 
    document.getElementById('stat-revenue').innerText = d.rev; document.getElementById('stat-bookings').innerText = d.book; document.getElementById('stat-occupied').innerText = d.occ; document.getElementById('stat-rooms').innerText = d.rooms; document.getElementById('stat-potential').innerText = d.pot; 
    document.getElementById('host-recent-table').innerHTML = d.recent.map(r => `<tr class="border-b border-slate-50"><td class="p-3 font-bold text-slate-700">${r.name}</td><td class="p-3">${r.room}</td><td class="p-3">${r.time}</td><td class="p-3"><span class="px-2 py-0.5 rounded-full font-black text-[10px] uppercase ${r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}">${r.status === 'paid' ? 'Đã thanh toán' : 'Đã cọc'}</span></td><td class="p-3 font-medium"><span class="text-teal-600">${r.paid}</span>/<span class="text-slate-300">${r.rem}</span></td></tr>`).join(''); 
    const roomStatusClass = { available: 'bg-emerald-100 border border-emerald-200/80 text-emerald-800', booked: 'bg-amber-100 border border-amber-200/80 text-amber-800', occupied: 'bg-red-100 border border-red-200/80 text-red-800' };
    const miniEl = document.getElementById('host-floor-plan-mini');
    if (miniEl) miniEl.innerHTML = d.mini.map(s => `<div class="aspect-square min-h-[2.25rem] rounded-lg flex items-center justify-center text-[10px] font-bold ${roomStatusClass[s.s] || 'bg-slate-100 text-slate-600'}">${s.id}</div>`).join(''); 
}

function initHostCharts() { 
    Object.values(charts).forEach(c => c.destroy()); 
    const ctx1 = document.getElementById('revenueChart')?.getContext('2d'), ctx2 = document.getElementById('bookingChart')?.getContext('2d'); 
    if(ctx1) charts.rev = new Chart(ctx1, { type: 'line', data: { labels: ['01/04', '02/04', '03/04', '04/04', '05/04'], datasets: [{ data: [1.2, 2.5, 1.8, 3.4, 2.9], borderColor: '#0d9488', tension: 0.4, fill: true, backgroundColor: 'rgba(13, 148, 136, 0.05)' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); 
    if(ctx2) charts.book = new Chart(ctx2, { type: 'bar', data: { labels: ['01/04', '02/04', '03/04', '04/04', '05/04'], datasets: [{ data: [10, 18, 14, 22, 20], backgroundColor: '#38bdf8', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); 
    const ctx3 = document.getElementById('potentialChart')?.getContext('2d'); 
    if(ctx3) charts.pot = new Chart(ctx3, { type: 'bar', indexAxis: 'y', data: { labels: ['02/04', '03/04', '04/04'], datasets: [{ data: [500000, 0, 1000000], backgroundColor: '#fb7185', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } }); 
}

function openSpaceDetail(spaceId) {
    if (typeof showHostSpaceLayer === 'function') showHostSpaceLayer('space-mgr-layer-3');
    else {
        document.getElementById('space-mgr-layer-2')?.classList.add('hidden');
        document.getElementById('space-mgr-layer-3')?.classList.remove('hidden');
    }
    const title = document.getElementById('detail-space-title');
    if (title) title.innerText = `Chi tiết: ${spaceId}`;
    const schedule = document.getElementById('space-schedule-body');
    if (schedule) schedule.innerHTML = `<tr class="border-b border-slate-50"><td class="p-4 font-black text-slate-700">Nguyễn Văn An</td><td class="p-4">26/03/26 14:00</td><td class="p-4">16:00</td><td class="p-4 text-teal-600 font-bold">150.000đ (Cọc 30%)</td></tr>`;
}

// ==========================================
// KHỞI TẠO KHI TẢI TRANG
// ==========================================
window.onload = () => { 
    updateAuthUI(); 
    renderMenu(); 
    
    const currentPath = window.location.pathname;

    // Render dữ liệu ảo cho Khách hàng
    if(currentPath === '/history') renderHistory();
    if(currentPath === '/search') renderSearch();
    
    // Nếu đang đứng ở trang Host Dashboard thì kích hoạt biểu đồ
    if(currentPath === '/host/dashboard') {
        switchBranch('all');
        setTimeout(initHostCharts, 100);
    }
    if (currentPath === '/host/spaces' && typeof initHostSpacesPage === 'function') {
        initHostSpacesPage();
    }
};