let currentSelectedBranch = 'all';

document.addEventListener("DOMContentLoaded", function () {
    loadDashboardData('all');
});

async function loadDashboardData(branchId) {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Vui lòng đăng nhập để xem dữ liệu!');
        return;
    }

    try {
        const response = await fetch(`/host/api/dashboard-stats?branchId=${branchId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (!response.ok) {
            console.error(result.error);
            return;
        }

        // 1. Cập nhật các ô số liệu Tổng quan
        document.getElementById('stat-revenue').innerText = result.stats.revenue.toLocaleString('vi-VN') + 'đ';
        document.getElementById('stat-bookings').innerText = result.stats.totalBookings;
        document.getElementById('stat-occupied').innerText = result.stats.totalOccupiedGuests;
        document.getElementById('stat-rooms').innerText = result.stats.activeRoomsCount;
        document.getElementById('finance-paid').innerText = result.stats.paidAmount.toLocaleString('vi-VN') + 'đ';
        document.getElementById('finance-pending').innerText = result.stats.pendingAmount.toLocaleString('vi-VN') + 'đ';

        if (branchId === 'all' && result.branches) {
            const tabContainer = document.getElementById('branch-tabs-container');
            tabContainer.innerHTML = `<button type="button" class="branch-tab px-5 py-2.5 rounded-xl text-sm font-bold transition ${currentSelectedBranch === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600'}" onclick="switchBranch('all')">Tất cả</button>`;

            result.branches.forEach(b => {
                tabContainer.innerHTML += `
                        <button type="button" class="branch-tab px-5 py-2.5 rounded-xl text-sm font-bold transition ${currentSelectedBranch === b._id ? 'bg-indigo-600 text-white' : 'text-slate-600'}" onclick="switchBranch('${b._id}')">
                            ${b.Name}
                        </button>
                    `;
            });
        }

        const floorPlanContainer = document.getElementById('host-floor-plan-mini');
        floorPlanContainer.innerHTML = '';
        if (result.liveFloorPlan && result.liveFloorPlan.length > 0) {
            result.liveFloorPlan.forEach(space => {
                let colorClass = 'bg-emerald-100 border-emerald-200 text-emerald-800'; // Trống
                if (space.LiveStatus === 'occupied') colorClass = 'bg-rose-100 border-rose-200 text-rose-800'; // Đang dùng
                if (space.LiveStatus === 'upcoming') colorClass = 'bg-amber-100 border-amber-200 text-amber-800'; // Sắp có khách
                if (space.LiveStatus === 'maintenance') colorClass = 'bg-slate-200 border-slate-300 text-slate-500'; // Bảo trì

                floorPlanContainer.innerHTML += `
                        <div class="aspect-square min-h-[2.25rem] rounded-lg flex items-center justify-center text-[10px] font-bold border ${colorClass}">
                            ${space.SpaceCode}
                        </div>
                    `;
            });
        } else {
            floorPlanContainer.innerHTML = '<p class="text-xs text-slate-400 col-span-4">Không có phòng</p>';
        }

        // 4. Render Bảng Booking gần nhất
        const tableBody = document.getElementById('host-recent-table');
        tableBody.innerHTML = '';
        if (result.recentBookings && result.recentBookings.length > 0) {
            result.recentBookings.forEach(b => {
                const customerName = b.CustomerID ? (b.CustomerID.FullName || b.CustomerID.fullName || 'Khách vãng lai') : 'N/A';
                const spaceCode = b.SpaceID ? b.SpaceID.SpaceCode : 'N/A';
                const startTime = new Date(b.StartTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

                let statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-600">${b.Status}</span>`;
                if (b.Status === 'confirmed') statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">Đã xác nhận</span>`;
                if (b.Status === 'completed') statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">Hoàn thành</span>`;
                if (b.Status === 'cancelled') statusBadge = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700">Đã hủy</span>`;

                tableBody.innerHTML += `
                        <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition">
                            <td class="p-3 font-semibold text-slate-800">${customerName}</td>
                            <td class="p-3 font-bold text-indigo-600">${spaceCode}</td>
                            <td class="p-3 text-slate-500">${startTime}</td>
                            <td class="p-3">${statusBadge}</td>
                        </tr>
                    `;
            });
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Chưa có lịch đặt chỗ nào gần đây.</td></tr>`;
        }

    } catch (err) {
        console.error("Lỗi khi load dữ liệu Dashboard:", err);
    }
}

// Hàm đổi Chi nhánh khi click chọn Tab
function switchBranch(branchId) {
    currentSelectedBranch = branchId;
    const tabs = document.querySelectorAll('.branch-tab');

    tabs.forEach(tab => {
        tab.classList.remove('bg-indigo-600', 'text-white');
        tab.classList.add('text-slate-600');

        if (tab.getAttribute('onclick').includes(`'${branchId}'`)) {
            tab.classList.remove('text-slate-600');
            tab.classList.add('bg-indigo-600', 'text-white');
        }
    });
    loadDashboardData(branchId);
}