// ============================================================================
// FILE: public/js/host-spaces.js
// CHỨC NĂNG: Lấy dữ liệu từ API và cập nhật giao diện Dashboard của Host
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Lấy dữ liệu từ LocalStorage
    const hostId = localStorage.getItem('hostId');
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');

    // 2. Kiểm tra bảo mật Frontend: Không có ID/Token thì đuổi về trang Login
    if (!hostId || !token) {
        if (typeof showToast === 'function') {
            showToast("Vui lòng đăng nhập để truy cập trang điều hành!");
        } else {
            alert("Vui lòng đăng nhập để truy cập trang điều hành!");
        }
        setTimeout(() => { window.location.href = '/login'; }, 1000);
        return;
    }

    // 3. Hiển thị tên Chủ cơ sở lên góc phải Header
    const userNameElement = document.getElementById('user-display-name');
    if (userName && userNameElement) {
        userNameElement.innerText = userName;
    }

    // 4. Gọi API lấy dữ liệu Dashboard
    try {
        const response = await fetch(`/api/hosts/${hostId}/dashboard-data`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Kẹp JWT Token vào Header để Backend xác thực
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            // Gọi hàm đắp dữ liệu ra UI nếu API trả về thành công
            renderDashboard(result);
        } else {
            console.error("Lỗi từ server:", result.error || result.message);
            // Nếu Token hết hạn hoặc không hợp lệ (lỗi 401/403), buộc đăng xuất
            if (response.status === 401 || response.status === 403) {
                if (typeof showToast === 'function') showToast("Phiên đăng nhập hết hạn!");
                setTimeout(() => { logout(); }, 1500);
            }
        }
    } catch (error) {
        console.error("Lỗi mạng / lỗi gọi API:", error);
    }
});

// ============================================================================
// HÀM: ĐĂNG XUẤT (Gắn vào nút Đăng xuất trên Header)
// ============================================================================
function logout() {
    localStorage.clear(); // Xóa sạch token, id, role, tên...
    window.location.href = '/login'; // Điều hướng về trang đăng nhập
}

// ============================================================================
// HÀM: VẼ LẠI GIAO DIỆN DASHBOARD (RENDER DATA TO HTML)
// ============================================================================
function renderDashboard(data) {
    const { stats, recentBookings, liveFloorPlan } = data;

    // --- 1. CẬP NHẬT 4 THẺ CHỈ SỐ TỔNG QUAN ---
    const elRevenue = document.getElementById('stat-revenue');
    const elBookings = document.getElementById('stat-bookings');
    const elOccupied = document.getElementById('stat-occupied');
    const elRooms = document.getElementById('stat-rooms');

    if (elRevenue) elRevenue.innerText = (stats.totalRevenue || 0).toLocaleString('vi-VN') + 'đ';
    if (elBookings) elBookings.innerText = stats.totalBookings || 0;
    if (elOccupied) elOccupied.innerText = stats.uniqueCustomers || 0;
    if (elRooms) elRooms.innerText = stats.activeSpacesCount || 0;

    // --- 2. CẬP NHẬT TÀI CHÍNH CHI TIẾT ---
    const totalAll = (stats.totalRevenue || 0) + (stats.totalPending || 0);

    const elTotalRev = document.getElementById('detail-total-revenue');
    const elReceived = document.getElementById('detail-received');
    const elPending = document.getElementById('detail-pending');

    if (elTotalRev) elTotalRev.innerText = totalAll.toLocaleString('vi-VN') + 'đ';
    if (elReceived) elReceived.innerText = (stats.totalRevenue || 0).toLocaleString('vi-VN') + 'đ';
    if (elPending) elPending.innerText = (stats.totalPending || 0).toLocaleString('vi-VN') + 'đ';

    // --- 3. CẬP NHẬT BẢNG BOOKING GẦN NHẤT ---
    const tableBody = document.getElementById('host-recent-table');
    if (tableBody) {
        tableBody.innerHTML = ''; // Xóa sạch dữ liệu tĩnh cũ

        if (recentBookings && recentBookings.length > 0) {
            recentBookings.forEach(booking => {
                // Lấy tên khách và tên phòng (đã được populate trong Controller)
                const customerName = booking.CustomerID ? booking.CustomerID.FullName : 'Khách vãng lai';
                const spaceName = booking.SpaceID ? booking.SpaceID.Name : 'Phòng đã bị xóa';

                // Format ngày tháng đẹp hơn: DD/MM/YYYY - HH:mm
                const dateStr = new Date(booking.StartTime).toLocaleString('vi-VN', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                // Dịch trạng thái ra tiếng Việt & Đổ màu
                let statusText = booking.Status;
                let statusClass = 'bg-teal-100 text-teal-700'; // Mặc định

                if (statusText === 'pending') {
                    statusClass = 'bg-amber-100 text-amber-700';
                    statusText = 'Chờ xử lý';
                } else if (statusText === 'confirmed') {
                    statusClass = 'bg-blue-100 text-blue-700';
                    statusText = 'Đã chốt';
                } else if (statusText === 'cancelled') {
                    statusClass = 'bg-red-100 text-red-700';
                    statusText = 'Đã hủy';
                } else if (statusText === 'completed') {
                    statusClass = 'bg-emerald-100 text-emerald-700';
                    statusText = 'Hoàn thành';
                }

                // Tạo thẻ <tr> và đẩy vào bảng
                const tr = document.createElement('tr');
                tr.className = "border-b border-slate-50 hover:bg-slate-50 transition";
                tr.innerHTML = `
                    <td class="p-3 font-bold text-slate-700">${customerName}</td>
                    <td class="p-3 text-slate-500">${spaceName}</td>
                    <td class="p-3 text-slate-500">${dateStr}</td>
                    <td class="p-3"><span class="px-2 py-1 ${statusClass} font-bold rounded-md text-[10px] uppercase">${statusText}</span></td>
                    <td class="p-3 font-bold text-slate-700 cursor-pointer text-teal-600 hover:underline">Chi tiết</td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400 font-medium">Chưa có đơn đặt phòng nào.</td></tr>';
        }
    }

    // --- 4. CẬP NHẬT SƠ ĐỒ PHÒNG LIVE (MINIMAP) ---
    const floorPlanContainer = document.getElementById('host-floor-plan-mini');
    if (floorPlanContainer) {
        floorPlanContainer.innerHTML = ''; // Xóa sạch dữ liệu tĩnh cũ

        if (liveFloorPlan && liveFloorPlan.length > 0) {
            liveFloorPlan.forEach(space => {
                // Xác định màu sắc dựa vào trạng thái phòng
                let styleClass = 'bg-emerald-100 border-emerald-200/80 text-emerald-800'; // Trống (available)

                if (space.status === 'occupied') {
                    styleClass = 'bg-red-100 border-red-200/80 text-red-800'; // Đang có khách
                } else if (space.status === 'maintenance') {
                    styleClass = 'bg-amber-100 border-amber-200/80 text-amber-800'; // Bảo trì / Bận
                }

                // Gắn vào giao diện
                floorPlanContainer.innerHTML += `
                    <div title="${space.name}" class="aspect-square min-h-[2.25rem] rounded-lg flex items-center justify-center text-[10px] font-bold border ${styleClass} cursor-pointer hover:shadow-md transition">
                        ${space.code}
                    </div>
                `;
            });
        } else {
            floorPlanContainer.innerHTML = '<p class="col-span-4 text-xs text-slate-400 text-center py-4">Chưa thiết lập phòng nào.</p>';
        }
    }
}