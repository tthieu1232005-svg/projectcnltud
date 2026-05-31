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

// ==========================================
// XỬ LÝ SỰ KIỆN ĐỔI MẬT KHẨU (GỬI API LÊN BACKEND)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tìm nút "THAY ĐỔI MẬT KHẨU" bằng cách bắt text hoặc đặt thêm id cho nút đó
    // Ở đây mình sẽ tìm nút dựa trên nội dung chữ "THAY ĐỔI MẬT KHẨU"
    const changePasswordBtn = Array.from(document.querySelectorAll('button, a, div'))
        .find(el => el.textContent.trim() === 'THAY ĐỔI MẬT KHẨU');

    if (changePasswordBtn) {
        // Thay đổi con trỏ chuột cho người dùng biết nút bấm được
        changePasswordBtn.classList.add('cursor-pointer');

        changePasswordBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            // 2. Trỏ tới các ô nhập (Tìm dựa theo nội dung placeholder/chữ hiển thị trong ô)
            // Lời khuyên: Bạn nên đặt thuộc tính id="oldPassword", id="newPassword", id="confirmPassword" cho các thẻ <input> này trong file EJS/HTML để lấy dữ liệu chuẩn xác nhất.
            const inputs = document.querySelectorAll('input[type="password"]');

            // Giả định thứ tự 3 ô nhập từ trái qua phải như trên giao diện của bạn
            const oldPasswordInput = inputs[0];
            const newPasswordInput = inputs[1];
            const confirmPasswordInput = inputs[2];

            if (!oldPasswordInput || !newPasswordInput || !confirmPasswordInput) {
                alert('Không tìm thấy các ô nhập mật khẩu trên giao diện!');
                return;
            }

            const oldPassword = oldPasswordInput.value.trim();
            const newPassword = newPasswordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            // 3. Validate dữ liệu nhanh ở Frontend trước khi gửi đi
            if (!oldPassword || !newPassword || !confirmPassword) {
                alert('Vui lòng điền đầy đủ cả 3 ô mật khẩu!');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('Mật khẩu mới và Xác nhận mật khẩu mới không trùng khớp với nhau!');
                return;
            }

            if (newPassword.length < 6) {
                alert('Mật khẩu mới phải có độ dài từ 6 ký tự trở lên!');
                return;
            }

            try {
                // Đổi trạng thái nút bấm để tránh người dùng click liên tục
                changePasswordBtn.innerText = 'ĐANG XỬ LÝ...';
                changePasswordBtn.style.pointerEvents = 'none';

                // 4. Lấy token từ localStorage (Giấy thông hành để Backend nhận diện ai đang đổi)
                const token = localStorage.getItem('token');

                // 5. Gửi request Fetch đến đúng API Backend
                const response = await fetch('/auth/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` // Truyền Token vào Header để authMiddleware kiểm tra
                    },
                    body: JSON.stringify({
                        oldPassword: oldPassword,
                        newPassword: newPassword
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    // THÀNH CÔNG THẬT SỰ (DB ĐÃ ĐỔI)
                    if (typeof showToast === 'function') {
                        showToast('Cập nhật mật khẩu thành công!');
                    } else {
                        alert('Cập nhật mật khẩu thành công!');
                    }

                    // Xóa sạch dữ liệu cũ trong các ô nhập sau khi đổi thành công
                    oldPasswordInput.value = '';
                    newPasswordInput.value = '';
                    confirmPasswordInput.value = '';

                    // Tùy chọn: Bạn có thể gọi hàm logout() ở đây để bắt người dùng đăng nhập lại bằng mật khẩu mới
                    // setTimeout(() => logout(), 1500);

                } else {
                    // THẤT BẠI: Hiển thị lỗi do Backend trả về (Ví dụ: Mật khẩu cũ không chính xác)
                    alert(result.error || 'Đổi mật khẩu thất bại, vui lòng thử lại!');
                }

            } catch (error) {
                console.error('Lỗi khi gọi API đổi mật khẩu:', error);
                alert('Có lỗi kết nối hệ thống, vui lòng thử lại sau!');
            } finally {
                // Trả lại trạng thái ban đầu cho nút bấm
                changePasswordBtn.innerText = 'THAY ĐỔI MẬT KHẨU';
                changePasswordBtn.style.pointerEvents = 'auto';
            }
        });
    }
});

document.addEventListener('click', (event) => {
    const userInfo = document.getElementById('user-info');
    const dropdown = document.getElementById('dropdown-menu');
    if (userInfo && dropdown && !userInfo.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});