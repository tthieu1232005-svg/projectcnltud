// ID mẫu dùng kiểm tra dữ liệu từ MongoDB Compass (Đổi lại theo ID thực tế của bạn)
const CURRENT_HOST_ID = "6630f9a2e12a450012345678";

document.addEventListener("DOMContentLoaded", () => {
    initHostDashboard(CURRENT_HOST_ID);
});

async function initHostDashboard(hostId) {
    try {
        // Gọi chuẩn đường dẫn khớp với router
        const response = await fetch(`/host/api/${hostId}/dashboard-data`);
        const result = await response.json();

        if (result.error) {
            console.error("Lỗi từ API:", result.error);
            return;
        }

        // 1. Cập nhật các Tabs chi nhánh động từ DB
        const tabContainer = document.querySelector(".flex.flex-wrap.gap-2.bg-white");
        if (tabContainer) {
            tabContainer.innerHTML = `<button type="button" class="branch-tab active px-5 py-2.5 rounded-xl text-sm font-bold transition" id="tab-all" onclick="switchBranch('all')">Tất cả</button>`;
            result.branches.forEach(branch => {
                tabContainer.innerHTML += `<button type="button" class="branch-tab px-5 py-2.5 rounded-xl text-sm font-bold transition" id="tab-${branch._id}" onclick="switchBranch('${branch._id}')">${branch.Name}</button>`;
            });
        }

        // 2. Điền số liệu vào 4 thẻ tổng quan
        document.getElementById("stat-revenue").innerText = result.stats.totalRevenue.toLocaleString('vi-VN') + "đ";
        document.getElementById("stat-bookings").innerText = result.stats.totalBookings;
        document.getElementById("stat-occupied").innerText = result.stats.uniqueCustomers;
        document.getElementById("stat-rooms").innerText = result.stats.activeSpacesCount;

        // 3. Vẽ sơ đồ phòng Live (Floor Plan)
        const floorPlanContainer = document.getElementById("host-floor-plan-mini");
        if (floorPlanContainer) {
            floorPlanContainer.innerHTML = "";
            result.liveFloorPlan.forEach(space => {
                let bgClass = "bg-emerald-100 border-emerald-200/80 text-emerald-800";
                if (space.status === 'occupied') bgClass = "bg-red-100 border-red-200/80 text-red-800";
                else if (space.status === 'maintenance') bgClass = "bg-amber-100 border-amber-200/80 text-amber-800";

                const block = document.createElement("div");
                block.className = `aspect-square min-h-[2.25rem] rounded-lg flex items-center justify-center text-[10px] font-bold ${bgClass}`;
                block.title = space.name;
                block.innerText = space.code;
                floorPlanContainer.appendChild(block);
            });
        }

        // 4. Đổ dữ liệu vào bảng "Booking gần nhất"
        const recentTableBody = document.getElementById("host-recent-table");
        if (recentTableBody) {
            recentTableBody.innerHTML = "";
            if (!result.recentBookings || result.recentBookings.length === 0) {
                recentTableBody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-slate-400">Không tìm thấy lịch sử đặt chỗ nào.</td></tr>`;
            } else {
                result.recentBookings.forEach(booking => {
                    let statusClass = "text-amber-600 bg-amber-50";
                    if (booking.Status === 'confirmed') statusClass = "text-blue-600 bg-blue-50";
                    if (booking.Status === 'completed') statusClass = "text-emerald-600 bg-emerald-50";
                    if (booking.Status === 'cancelled') statusClass = "text-red-600 bg-red-50";

                    const customerName = booking.CustomerID ? booking.CustomerID.FullName : "Khách ẩn danh";
                    const spaceCode = booking.SpaceID ? booking.SpaceID.SpaceCode : "N/A";
                    const startTime = new Date(booking.StartTime).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

                    const row = document.createElement("tr");
                    row.className = "border-b border-slate-100 hover:bg-slate-50/50 transition";
                    row.innerHTML = `
                        <td class="p-3 font-medium text-slate-700">${customerName}</td>
                        <td class="p-3 font-bold text-teal-600">${spaceCode}</td>
                        <td class="p-3 text-slate-500">${startTime}</td>
                        <td class="p-3">
                            <span class="px-2 py-0.5 rounded-md font-bold text-[10px] ${statusClass}">
                                ${booking.Status === 'pending' ? 'Chờ duyệt' : booking.Status === 'confirmed' ? 'Đã xác nhận' : booking.Status === 'completed' ? 'Hoàn thành' : 'Đã hủy'}
                            </span>
                        </td>
                        <td class="p-3 font-black text-slate-800">${booking.TotalAmount.toLocaleString('vi-VN')}đ</td>
                    `;
                    recentTableBody.appendChild(row);
                });
            }
        }

        // 5. Thống kê Tài chính chi tiết ở chân trang
        const totalExpected = result.stats.totalRevenue + result.stats.totalPending;
        const financeSection = document.querySelector(".bg-white.p-8.rounded-\\[2\\.5rem\\] .text-2xl.font-black");
        if (financeSection) financeSection.innerText = totalExpected.toLocaleString('vi-VN') + "đ";

        const successText = document.querySelector(".text-emerald-600");
        if (successText) successText.innerText = result.stats.totalRevenue.toLocaleString('vi-VN') + "đ";

        const pendingText = document.querySelector(".text-amber-500");
        if (pendingText) pendingText.innerText = result.stats.totalPending.toLocaleString('vi-VN') + "đ";

    } catch (error) {
        console.error("Lỗi đồng bộ giao diện Real-time:", error);
    }
}