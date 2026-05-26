// ==========================================
// SHARED CONFIGURATION & STATE
// ==========================================
const pageLabels = { 'home': 'Trang Chủ', 'search': 'Kết Quả Tìm Kiếm', 'detail': 'Chi Tiết Không Gian', 'payment': 'Thanh Toán', 'history': 'Lịch Sử Đặt Chỗ', 'profile': 'Hồ Sơ Cá Nhân', 'payment_history': 'Lịch Sử Thanh Toán', 'login': 'Đăng nhập', 'host_dashboard': 'Bảng Điều Hành Host', 'host_spaces': 'Quản Lý Không Gian', 'host_bookings': 'Quản lý đơn đặt chỗ' };
const menus = { 'guest': [], 'customer': [{ id: 'home', label: 'Trang chủ', icon: '🏠' }, { id: 'history', label: 'Lịch sử đặt', icon: '📅' }, { id: 'payment_history', label: 'Lịch sử ví', icon: '💳' }, { id: 'profile', label: 'Hồ sơ', icon: '👤' }], 'host': [{ id: 'host_dashboard', label: 'Dashboard', icon: '📊' }, { id: 'host_spaces', label: 'Quản lý không gian', icon: '🏢' }, { id: 'host_bookings', label: 'Đơn đặt chỗ', icon: '📋' }, { id: 'host_reports', label: 'Báo cáo', icon: '💰' }, { id: 'host_payments', label: 'Lịch sử tiền', icon: '💳' }, { id: 'host_profile', label: 'Hồ sơ', icon: '👤' }] };

s// Restore role from localStorage
let currentRole = localStorage.getItem('workhub_role') || 'guest';
let isLoggedIn = currentRole !== 'guest';
let tempSelectedRole = 'customer';

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
        'host_profile': '/host/profile',
        'login': '/login', 
        'host_dashboard': '/host/dashboard', 
        'host_spaces': '/host/spaces',
        'host_bookings': '/host/bookings',
        'host_reports': '/host/reports',
        'host_payments': '/host/payments'
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

function toggleUserMenu() { 
    document.getElementById('dropdown-menu').classList.toggle('hidden'); 
}

// ==========================================
// AUTHENTICATION & ROLE MANAGEMENT
// ==========================================
function fakeLogin(role) { 
    localStorage.setItem('workhub_role', role);
    currentRole = role; 
    isLoggedIn = true; 
    updateAuthUI(); 
    renderMenu();
    navigateTo(role === 'host' ? 'host_dashboard' : 'home'); 
}

function logout() { 
    localStorage.setItem('workhub_role', 'guest'); 
    currentRole = 'guest'; 
    isLoggedIn = false; 
    updateAuthUI(); 
    renderMenu();
    navigateTo('home'); 
}

function renderMenu() { 
    const c = document.getElementById('menu-items'); 
    if(!c) return;
    c.innerHTML = ''; 
    (menus[currentRole] || []).forEach(i => { 
        const d = document.createElement('div'); 
        d.className = 'nav-item cursor-pointer'; 
        
        let expectedPath = '/' + i.id;
        if (i.id === 'home') expectedPath = '/';
        else if (i.id.startsWith('host_')) expectedPath = '/host/' + i.id.replace('host_', '');

        if (window.location.pathname === expectedPath) {
            d.classList.add('active');
        }

        d.onclick = () => navigateTo(i.id); 
        d.innerHTML = `<span>${i.icon}</span> ${i.label}`; 
        c.appendChild(d); 
    }); 
}

function updateAuthUI() { 
    const b = document.getElementById('nav-login-btn'), 
          u = document.getElementById('user-info'), 
          s = document.getElementById('sidebar'), 
          t = document.getElementById('sidebar-toggle'); 
    if (!b || !u) return;
    
    if(isLoggedIn) { 
        b.classList.add('hidden'); 
        u.classList.remove('hidden'); 
        s?.classList.remove('hidden-permanent', 'collapsed'); 
        t?.classList.remove('hidden');
        document.getElementById('user-display-name').innerText = currentRole === 'host' ? "Chủ Cơ Sở" : "Nguyễn Văn An"; 
        document.getElementById('user-display-role').innerText = currentRole === 'host' ? 'Quản lý' : 'Thành viên'; 
    } else { 
        b.classList.remove('hidden'); 
        u.classList.add('hidden'); 
        s?.classList.add('hidden-permanent'); 
        t?.classList.add('hidden');
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

// Role selection removed: login flows use 'customer' by default.

function handleLoginSubmit() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;

    if (!email || !pass) {
        alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");
        return;
    }

    showToast(`Đang xác thực tài khoản ${tempSelectedRole}...`);
    
    setTimeout(() => {
        fakeLogin(tempSelectedRole);
    }, 1000);
}

// ==========================================
// INITIALIZATION ON PAGE LOAD
// ==========================================
window.onload = () => { 
    updateAuthUI(); 
    renderMenu();
};
