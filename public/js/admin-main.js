let allUsersList = []; // Biến lưu trữ tạm toàn bộ danh sách người dùng

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    // Chỉ chạy hàm load số liệu nếu đang ở trang dashboard
    if (path === '/admin/dashboard') {
        fetchAdminStats();
    }
    if (path === '/admin/users') {
        fetchUsers(); // Chỉ gọi hàm này khi truy cập đúng trang /admin/users
    }

    // Thiết lập sự kiện cho thanh tìm kiếm và bộ lọc ở trang quản lý người dùng
    const searchInput = document.getElementById('search-user');
    const roleFilter = document.getElementById('filter-role');
    // Nếu có tồn tại thì mới gắn sự kiện, tránh lỗi khi không có phần tử này trên trang
    if (searchInput) searchInput.addEventListener('input', filterUsersList);
    if (roleFilter) roleFilter.addEventListener('change', filterUsersList);

    if (path === '/admin/hosts') {
        fetchPendingHosts();
    }
});

// =====================================
// 1. LẤY SỐ LIỆU TỔNG QUAN
// =====================================
// Hàm này sẽ gọi API để lấy số liệu tổng quan và sau đó hiển thị lên dashboard
async function fetchAdminStats() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const response = await fetch('/api/admin/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            animateValue('stat-users', 0, data.totals.users, 1000);
            animateValue('stat-hosts', 0, data.totals.hosts, 1000);
            animateValue('stat-branches', 0, data.totals.branches, 1000);
            animateValue('stat-spaces', 0, data.totals.spaces, 1000);
            animateValue('stat-bookings', 0, data.totals.bookings, 1000);
        } else {
            console.error('Lỗi lấy số liệu thống kê.');
        }
    } catch (error) {
        console.error('Lỗi kết nối máy chủ:', error);
    }
}

// Hàm này sẽ tạo hiệu ứng đếm số từ 0 đến giá trị thực tế (dùng cho phần số liệu tổng quan)
function animateValue(id, start, end, duration) {
    if (start === end) return;
    let range = end - start;
    let current = start;
    let increment = end > start ? 1 : -1;
    let stepTime = Math.abs(Math.floor(duration / range));
    let obj = document.getElementById(id);
    if (!obj) return;
    
    let timer = setInterval(function() {
        current += increment;
        obj.innerHTML = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// =====================================
// 2. LẤY VÀ VẼ BẢNG NGƯỜI DÙNG
// =====================================
// Hàm này sẽ gọi API để lấy danh sách người dùng và sau đó vẽ vào bảng
// Hàm này sẽ được gọi khi truy cập vào trang /admin/users để lấy dữ liệu và hiển thị
async function fetchUsers() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('user-table-body');
    if (!token) return;

    try {
        const response = await fetch('/api/admin/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            allUsersList = data.users; // LƯU VÀO KHO CHỨA ĐỂ LỌC
            renderUserTable(allUsersList); // Vẽ lần đầu tiên
        } else {
            const errData = await response.json();
            tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">❌ Lỗi từ Server: ${errData.error || 'Không rõ nguyên nhân'}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">❌ Lỗi JavaScript: Vui lòng mở F12 xem chi tiết.</td></tr>`;
        console.error('Lỗi lấy danh sách người dùng:', error);
    }
}

// Hàm này sẽ được gọi mỗi khi người dùng nhập vào ô tìm kiếm hoặc thay đổi bộ lọc vai trò
// Nó sẽ lọc danh sách người dùng dựa trên tên/email và vai trò, sau đó vẽ lại bảng với kết quả đã lọc
function filterUsersList() {
    const searchValue = document.getElementById('search-user').value.toLowerCase().trim();
    const roleValue = document.getElementById('filter-role').value;

    const filteredUsers = allUsersList.filter(user => {
        // 1. Kiểm tra tìm kiếm theo Tên hoặc Email
        const nameMatch = (user.FullName || '').toLowerCase().includes(searchValue);
        const emailMatch = (user.Email || '').toLowerCase().includes(searchValue);
        const isMatchSearch = nameMatch || emailMatch;

        // 2. Kiểm tra bộ lọc Vai trò
        const isMatchRole = (roleValue === 'all') || (user.Role === roleValue);

        // Phải thỏa mãn cả 2 điều kiện
        return isMatchSearch && isMatchRole;
    });

    // Vẽ lại bảng với danh sách đã lọc
    renderUserTable(filteredUsers);
}

// Hàm này sẽ vẽ bảng danh sách người dùng dựa trên dữ liệu trả về từ API
function renderUserTable(users) {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;
    tbody.innerHTML = ''; 

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Chưa có dữ liệu người dùng.</td></tr>';
        return;
    }

    users.forEach(user => {
        let roleBadge = '';
        if (user.Role === 'admin') {
            roleBadge = '<span class="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold">Admin</span>';
        } else if (user.Role === 'host') {
            roleBadge = '<span class="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold">Chủ cơ sở</span>';
        } else {
            roleBadge = '<span class="px-2 py-1 bg-teal-100 text-teal-700 rounded-md text-xs font-bold">Khách hàng</span>';
        }

        let statusBadge = '';
        if (user.Status === 'active') {
            statusBadge = '<span class="flex items-center gap-1 text-green-600 font-medium text-xs"><div class="w-2 h-2 rounded-full bg-green-500"></div> Hoạt động</span>';
        } else if (user.Status === 'banned') {
            statusBadge = '<span class="flex items-center gap-1 text-red-600 font-medium text-xs"><div class="w-2 h-2 rounded-full bg-red-500"></div> Bị khóa</span>';
        } else {
            statusBadge = `<span class="text-slate-500 text-xs">${user.Status || 'Không rõ'}</span>`;
        }

        let actionButtons = '';
        if (user.Role === 'admin') {
            actionButtons = `<span class="text-slate-400 text-xs italic font-medium">Bất tử 🛡️</span>`;
        } else if (user.Status === 'active') {
            actionButtons = `<button class="text-red-600 hover:text-red-800 text-sm font-bold bg-red-50 px-3 py-1 rounded-md" onclick="toggleUserStatus('${user._id}', 'banned')">Khóa</button>`;
        } else {
            actionButtons = `<button class="text-green-600 hover:text-green-800 text-sm font-bold bg-green-50 px-3 py-1 rounded-md" onclick="toggleUserStatus('${user._id}', 'active')">Mở khóa</button>`;
        }

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition';
        tr.innerHTML = `
            <td class="p-4 font-bold text-slate-800">${user.FullName || 'Chưa cập nhật'}</td>
            <td class="p-4 text-slate-600">${user.Email}</td>
            <td class="p-4">${roleBadge}</td>
            <td class="p-4">${statusBadge}</td>
            <td class="p-4 text-right">${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =====================================
// 3. TÍNH NĂNG KHÓA TÀI KHOẢN
// =====================================
// Hàm này sẽ gọi API để đổi trạng thái của user (active <-> banned)
async function toggleUserStatus(userId, targetStatus) {
    const actionName = targetStatus === 'banned' ? 'KHÓA' : 'MỞ KHÓA';
    
    if (!confirm(`Bạn có chắc chắn muốn ${actionName} người dùng này?`)) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            alert(`Đã ${actionName} tài khoản thành công!`);
            fetchUsers(); // Cập nhật lại bảng
        } else {
            const data = await response.json();
            alert(`❌ Lỗi: ${data.error}`);
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật trạng thái:', error);
        alert('❌ Không thể kết nối đến máy chủ.');
    }
}

// =====================================
// 4. PHÊ DUYỆT CHỦ CƠ SỞ
// =====================================
// Hàm này sẽ gọi API để lấy danh sách các Host đang chờ phê duyệt và sau đó vẽ vào bảng
async function fetchPendingHosts() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('pending-hosts-body');
    if (!token || !tbody) return;

    try {
        const response = await fetch('/api/admin/pending-hosts', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            renderPendingHostsTable(data.hosts);
        } else {
            // Thay đổi đoạn code ở đây để moi lỗi từ server ra
            const errData = await response.json();
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500 font-bold">❌ Lỗi từ Server: ${errData.error || '404 - Đường dẫn API chưa tồn tại'}</td></tr>`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-red-500">❌ Lỗi kết nối.</td></tr>`;
    }
}

// Hàm này sẽ vẽ bảng danh sách các Host đang chờ phê duyệt
function renderPendingHostsTable(hosts) {
    const tbody = document.getElementById('pending-hosts-body');
    tbody.innerHTML = ''; 

    if (hosts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-400 font-medium">✨ Tuyệt vời! Hiện không có hồ sơ nào cần phê duyệt.</td></tr>';
        return;
    }

    hosts.forEach(host => {
        // host.UserID chứa thông tin user (do ta dùng lệnh populate ở backend)
        const user = host.UserID || {}; 
        
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-amber-50 transition';
        tr.innerHTML = `
            <td class="p-4">
                <p class="font-bold text-slate-800">${user.FullName || 'Không rõ'}</p>
                <p class="text-xs text-slate-500">${user.Email || ''}</p>
            </td>
            <td class="p-4">
                <p class="font-bold text-indigo-700">${host.CompanyName || 'Chưa cập nhật'}</p>
                <p class="text-xs text-slate-500">Bank: ${host.BankName} - ${host.BankNumber}</p>
            </td>
            <td class="p-4 font-medium text-slate-700">📞 ${host.Hotline || 'Trống'}</td>
            <td class="p-4 text-right">
                <button class="bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-sm" 
                        onclick="verifyHost('${host._id}')">
                    ✅ Phê duyệt ngay
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Hàm này sẽ gọi API để phê duyệt Host và sau đó tải lại danh sách chờ duyệt
async function verifyHost(hostId) {
    if (!confirm('Xác nhận phê duyệt cho Chủ cơ sở này hoạt động?')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/admin/hosts/${hostId}/verify`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            alert('🎉 Đã phê duyệt thành công!');
            fetchPendingHosts(); // Tải lại bảng chờ duyệt
        } else {
            const data = await response.json();
            alert(`❌ Lỗi: ${data.error}`);
        }
    } catch (error) {
        alert('❌ Không thể kết nối đến máy chủ.');
    }
}