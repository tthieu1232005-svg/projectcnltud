// public/js/host-spaces.js

// Giả sử ID của Host đang test lấy từ hệ thống của bạn (Thay ID thật ở Compass của bạn vào đây nhé)
const TEST_HOST_ID = "6630f9a2e12a450012345678";

document.addEventListener("DOMContentLoaded", () => {
    fetchDashboardData(TEST_HOST_ID);
});

async function fetchDashboardData(hostId) {
    try {
        // Gọi tới API vừa tạo ở Bước 2
        const response = await fetch(`/api/hosts/${hostId}/dashboard-data`);
        const result = await response.json();

        if (result.error) {
            console.error("Lỗi từ API:", result.error);
            return;
        }

        // 1. Đổ dữ liệu vào 4 thẻ tổng quan trên giao diện bằng ID
        document.getElementById("stat-revenue").innerText = result.stats.totalRevenue.toLocaleString('vi-VN') + "đ";
        document.getElementById("stat-bookings").innerText = result.stats.totalBookings;
        document.getElementById("stat-occupied").innerText = result.stats.uniqueCustomers;
        document.getElementById("stat-rooms").innerText = result.stats.activeSpacesCount;

        // 2. Vẽ Sơ đồ phòng Live (Floor Plan)
        const floorPlanContainer = document.getElementById("host-floor-plan-mini");
        if (floorPlanContainer) {
            floorPlanContainer.innerHTML = ""; // Xóa dữ liệu tĩnh cũ đi

            result.liveFloorPlan.forEach(space => {
                let bgClass = "bg-emerald-100 border-emerald-200 text-emerald-800"; // Trống
                if (space.status === 'occupied') bgClass = "bg-red-100 border-red-200 text-red-800"; // Đang dùng
                if (space.status === 'maintenance') bgClass = "bg-amber-100 border-amber-200 text-amber-800"; // Bảo trì

                const spaceDiv = document.createElement("div");
                spaceDiv.className = `aspect-square min-h-[2.25rem] rounded-lg flex items-center justify-center text-[10px] font-bold border ${bgClass}`;
                spaceDiv.title = space.name;
                spaceDiv.innerText = space.code;

                floorPlanContainer.appendChild(spaceDiv);
            });
        }

        // 3. Đổ dữ liệu vào Bảng "Booking gần nhất"
        const recentTableBody = document.getElementById("host-recent-table");
        if (recentTableBody) {
            recentTableBody.innerHTML = ""; // Xóa các hàng dữ liệu cũ tĩnh

            if (result.recentBookings.length === 0) {
                recentTableBody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-slate-400">Chưa có booking nào.</td></tr>`;
            } else {
                result.recentBookings.forEach(booking => {
                    let statusClass = "text-amber-600 bg-amber-50";
                    if (booking.Status === 'confirmed') statusClass = "text-blue-600 bg-blue-50";
                    if (booking.Status === 'completed') statusClass = "text-emerald-600 bg-emerald-50";
                    if (booking.Status === 'cancelled') statusClass = "text-red-600 bg-red-50";

                    const row = document.createElement("tr");
                    row.className = "border-b border-slate-100 hover:bg-slate-50/50";
                    row.innerHTML = `
                        <td class="p-3 font-medium text-slate-700">Khách hàng (ID: ${booking.CustomerID.substring(0, 6)}...)</td>
                        <td class="p-3 font-bold text-teal-600">${booking.SpaceID ? booking.SpaceID.SpaceCode : 'N/A'}</td>
                        <td class="p-3 text-slate-500">${new Date(booking.StartTime).toLocaleString('vi-VN')}</td>
                        <td class="p-3">
                            <span class="px-2 py-0.5 rounded-md font-bold text-[10px] ${statusClass}">
                                ${booking.Status.toUpperCase()}
                            </span>
                        </td>
                        <td class="p-3 font-black text-slate-800">${booking.TotalAmount.toLocaleString('vi-VN')}đ</td>
                    `;
                    recentTableBody.appendChild(row);
                });
            }
        }

    } catch (error) {
        console.error("Lỗi khi fetch dữ liệu dashboard:", error);
    }
}