// ==========================================
// SHARED CONFIGURATION & STATE
// ==========================================
const menus = { 
    'guest': [], 
    'customer': [
        { id: 'home', label: 'Trang chủ', icon: '🏠' }, 
        { id: 'history', label: 'Lịch sử đặt', icon: '📅' }, 
        { id: 'payment_history', label: 'Lịch sử ví', icon: '💳' }, 
        { id: 'profile', label: 'Hồ sơ', icon: '👤' }
    ], 
    'host': [
        { id: 'host_dashboard', label: 'Dashboard', icon: '📊' }, 
        { id: 'host_spaces', label: 'Quản lý không gian', icon: '🏢' }, 
        { id: 'host_bookings', label: 'Đơn đặt chỗ', icon: '📋' }, 
        { id: 'host_reports', label: 'Báo cáo', icon: '💰' }, 
        { id: 'host_payments', label: 'Lịch sử tiền', icon: '💳' }, 
        { id: 'host_profile', label: 'Hồ sơ', icon: '👤' }
    ],
    'admin': [
        { id: 'admin_dashboard', label: 'Bảng điều khiển', icon: '📊' }, 
        { id: 'admin_users', label: 'Người dùng', icon: '👥' }, 
        { id: 'admin_hosts', label: 'Chủ cơ sở', icon: '🏢' }, 
        { id: 'admin_branches', label: 'Chi nhánh', icon: '🏪' }, 
        { id: 'admin_bookings', label: 'Đơn đặt chỗ', icon: '📋' }, 
        { id: 'admin_reviews', label: 'Đánh giá', icon: '⭐' }
    ]
};

// ==========================================
// SHARED NAVIGATION & UI UTILITIES
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

        'login': '/login', 

        'host_profile': '/host/profile',
        'host_dashboard': '/host/dashboard', 
        'host_spaces': '/host/spaces',
        'host_bookings': '/host/bookings',
        'host_reports': '/host/reports',
        'host_payments': '/host/payments',

        'admin_dashboard': '/admin/dashboard',
        'admin_users': '/admin/users',
        'admin_hosts': '/admin/hosts',
        'admin_branches': '/admin/branches',
        'admin_reviews': '/admin/reviews',
        'admin_bookings': '/admin/bookings'
    };
    
    if (routes[id]) {
        window.location.href = routes[id];
    }
}

function openModal(id) { 
    document.getElementById(id).classList.remove('hidden'); 
    document.getElementById(id).classList.add('flex'); 
}

function closeModal(id) { 
    document.getElementById(id).classList.add('hidden'); 
    document.getElementById(id).classList.remove('flex'); 
}

function showToast(msg) { 
    const t = document.getElementById('success-toast'), m = document.getElementById('toast-msg'); 
    if (t && m) { 
        m.innerText = msg; 
        t.classList.remove('hidden'); 
        setTimeout(() => t.classList.add('hidden'), 2000); 
    } 
}

function toggleSidebar() { 
    const s = document.getElementById('sidebar'); 
    if (s) s.classList.toggle('collapsed'); 
}

// ==========================================
// XỬ LÝ GIAO DIỆN CHUNG DỰA TRÊN TRẠNG THÁI ĐĂNG NHẬP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateUIBasedOnAuth();
});

function updateUIBasedOnAuth() {
    // 1. Lấy giấy thông hành từ tủ đồ
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole') || 'guest';
    const userName = localStorage.getItem('userName');

    // 2. Trỏ tới các thành phần UI
    const loginBtn = document.getElementById('nav-login-btn');
    const userInfo = document.getElementById('user-info');
    const nameDisplay = document.getElementById('user-display-name');
    const roleDisplay = document.getElementById('user-display-role');
    const avatarPreview = document.getElementById('header-avatar-preview');
    
    const sidebar = document.getElementById('sidebar'); 
    const sidebarToggle = document.getElementById('sidebar-toggle'); 

    // 3. Phân luồng hiển thị HEADER & SIDEBAR
    if (token) {
        // TRƯỜNG HỢP 1: ĐÃ ĐĂNG NHẬP
        
        // Header
        if (loginBtn) loginBtn.classList.add('hidden');
        if (userInfo) userInfo.classList.remove('hidden');

        if (nameDisplay && userName) nameDisplay.textContent = userName;
        if (avatarPreview && userName) {
            avatarPreview.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8B8B&color=fff`;
        }

        if (roleDisplay) {
            if (role === 'host') {
                roleDisplay.textContent = 'Chủ cơ sở';
                roleDisplay.classList.add('text-indigo-600'); 
            } else if (role === 'admin') {
                roleDisplay.textContent = 'Quản trị viên';
                roleDisplay.classList.add('text-red-600');
            } else {
                roleDisplay.textContent = 'Khách hàng';
                roleDisplay.classList.add('text-teal-600');
            }
        }

        // Sidebar
        if (sidebar) sidebar.classList.remove('hidden-permanent', 'collapsed'); 
        if (sidebarToggle) sidebarToggle.classList.remove('hidden');
        
        // Vẽ lại Menu Sidebar
        renderMenu(role);

    } else {
        // TRƯỜNG HỢP 2: CHƯA ĐĂNG NHẬP (KHÁCH VÃNG LAI)
        
        // Header
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (userInfo) userInfo.classList.add('hidden');
        
        // Sidebar (Khách thì ẩn Sidebar đi cho gọn)
        if (sidebar) sidebar.classList.add('hidden-permanent'); 
        if (sidebarToggle) sidebarToggle.classList.add('hidden');
    }
}

function renderMenu(currentRole) { 
    const c = document.getElementById('menu-items'); 
    if(!c) return;
    c.innerHTML = ''; 
    
    (menus[currentRole] || []).forEach(i => { 
        const d = document.createElement('div'); 
        d.className = 'nav-item cursor-pointer'; 
        
        let expectedPath = '/' + i.id;
        if (i.id === 'home') expectedPath = '/';
        else if (i.id.startsWith('host_')) expectedPath = '/host/' + i.id.replace('host_', '');
        else if (i.id.startsWith('admin_')) { 
                    expectedPath = '/admin/' + i.id.replace('admin_', '');
                }
        if (window.location.pathname === expectedPath) {
            d.classList.add('active');
        }

        d.onclick = () => navigateTo(i.id); 
        d.innerHTML = `<span>${i.icon}</span> ${i.label}`; 
        c.appendChild(d); 
    }); 
}

// ================= CÁC HÀM TƯƠNG TÁC MENU =================
function toggleUserMenu() {
    const dropdown = document.getElementById('dropdown-menu');
    if (dropdown) dropdown.classList.toggle('hidden');
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    window.location.href = '/login';
}

document.addEventListener('click', (event) => {
    const userInfo = document.getElementById('user-info');
    const dropdown = document.getElementById('dropdown-menu');
    if (userInfo && dropdown && !userInfo.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});