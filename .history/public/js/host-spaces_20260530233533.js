document.addEventListener('DOMContentLoaded', async () => {
    // Lấy HostID (Ví dụ bạn lưu trong localStorage lúc đăng nhập)
    // Thay chuỗi "ID_MONGO_CUA_HOST" bằng 1 chuỗi ObjectId thật trong MongoDB Compass của bạn để test thử nhé!
    const hostId = localStorage.getItem('hostId') || 'ID_MONGO_CUA_HOST';

    if (!hostId) {
        console.warn("Chưa có HostID để tải dữ liệu.");
        return;
    }

    try {
        // Gọi API
        const response = await fetch(`/api/hosts/${hostId}/dashboard-data`);
        const result = await response.json();

        if (response.ok) {
            renderDashboard(result);
        } else {
            console.error("Lỗi từ server:", result.message);
        }
    } catch (error) {
        console.error("Lỗi mạng / lỗi gọi API:", error);
    }
});

function renderDashboard(data) {
    const { stats, recentBookings, liveFloorPlan } = data;

    // --- 1. CẬP NHẬT 4 THẺ CHỈ SỐ TỔNG QUAN ---
    document.getElementById('stat-revenue').innerText = (stats.totalRevenue || 0).toLocaleString('vi-VN') + 'đ';
    document.getElementById('stat-bookings').innerText = stats.totalBookings || 0;
    document.getElementById('stat-occupied').innerText = stats.uniqueCustomers || 0;
    document.getElementById('stat-rooms').innerText = stats.activeSpacesCount || 0;

    // --- 2. CẬP NHẬT TÀI CHÍNH CHI TIẾT ---
    const totalAll = (stats.totalRevenue || 0) + (stats.totalPending || 0);
    document.getElementById('detail-total-revenue').innerText = totalAll.toLocaleString('vi-VN') + 'đ';
    document.getElementById('detail-received').innerText = (stats.totalRevenue || 0).toLocaleString('vi-VN') + 'đ';
    document.getElementById('detail-pending').innerText = (stats.totalPending || 0).toLocaleString('vi-VN') + 'đ';

    // --- 3. CẬP NHẬT BẢNG BOOKING GẦN NHẤT ---
    const tableBody = document.getElementById('host-recent-table');
    tableBody.innerHTML = ''; // Xóa sạch dữ liệu tĩnh cũ

    if (recentBookings && recentBookings.length > 0) {
        recentBookings.forEach(booking => {
            // Lấy tên khách và tên phòng (đã được populate trong API)
            const customerName = booking.CustomerID ? booking.CustomerID.FullName : 'Khách vãng lai';
            const spaceName = booking.SpaceID ? booking.SpaceID.Name : 'Phòng bị xóa';
            const dateStr = new Date(booking.StartTime).toLocaleDateString('vi-VN'); // Dùng StartTime

            // Dịch trạng thái ra tiếng Việt
            let statusText = booking.Status;
            let statusClass = 'bg-teal-100 text-teal-700'; // Màu mặc định
            if (statusText === 'pending') { statusClass = 'bg-amber-100 text-amber-700'; statusText = 'Chờ xử lý'; }
            if (statusText === 'confirmed') { statusClass = 'bg-blue-100 text-blue-700'; statusText = 'Đã chốt'; }
            if (statusText === 'cancelled') { statusClass = 'bg-red-100 text-red-700'; statusText = 'Đã hủy'; }
            if (statusText === 'completed') { statusClass = 'bg-emerald-100 text-emerald-700'; statusText = 'Hoàn thành'; }

            // Tạo thẻ tr và đẩy vào bảng
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

    // --- 4. CẬP NHẬT SƠ ĐỒ PHÒNG LIVE (MINIMAP) ---
    const floorPlanContainer = document.getElementById('host-floor-plan-mini');
    floorPlanContainer.innerHTML = '';

    if (liveFloorPlan && liveFloorPlan.length > 0) {
        liveFloorPlan.forEach(space => {
            // Xác định màu sắc dựa vào trạng thái phòng
            let styleClass = 'bg-emerald-100 border-emerald-200/80 text-emerald-800'; // Đang trống (available)
            if (space.status === 'occupied') {
                styleClass = 'bg-red-100 border-red-200/80 text-red-800'; // Đang có khách
            } else if (space.status === 'maintenance') {
                styleClass = 'bg-amber-100 border-amber-200/80 text-amber-800'; // Đã đặt trước hoặc bảo trì
            }

            // Gắn vào giao diện
            floorPlanContainer.innerHTML += `
                <div title="${space.name}" class="aspect-square min-h-[2.25rem] rounded-lg flex items-center justify-center text-[10px] font-bold border ${styleClass} cursor-pointer hover:shadow-md transition">
                    ${space.code}
                </div>
            `;
        });
    } else {
        floorPlanContainer.innerHTML = '<p class="col-span-4 text-xs text-slate-400 text-center py-4">Chưa có phòng nào.</p>';
    }
}