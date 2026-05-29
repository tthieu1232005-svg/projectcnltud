document.addEventListener('DOMContentLoaded', () => {
    // Chỉ chạy hàm load số liệu nếu đang ở trang dashboard
    if (window.location.pathname === '/admin/dashboard') {
        fetchAdminStats();
    }
});
// Hàm này sẽ gọi API để lấy số liệu thống kê và cập nhật lên giao diện
// Lưu ý: API này đã được bảo vệ bằng middleware xác thực và phân quyền, nên chỉ Admin mới có token hợp lệ để truy cập
async function fetchAdminStats() {
    // 1. Lấy chìa khóa (Token) từ tủ đồ
    const token = localStorage.getItem('token');
    
    // Nếu không có token, hệ thống layout chính đã tự động đuổi ra ngoài rồi, ở đây ta chỉ cần return
    if (!token) return;

    try {
        // 2. Gửi yêu cầu kèm Token trong Header
        const response = await fetch('/api/admin/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // Chìa khóa bắt buộc phải có chữ Bearer đi kèm
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // 3. Nếu thành công, lấy dữ liệu và đắp lên giao diện
            const data = await response.json();
            
            // Hàm tạo hiệu ứng số nhảy từ 0 lên (trông cho xịn xò)
            animateValue('stat-users', 0, data.totals.users, 1000);
            animateValue('stat-hosts', 0, data.totals.hosts, 1000);
            animateValue('stat-spaces', 0, data.totals.spaces, 1000);
            animateValue('stat-bookings', 0, data.totals.bookings, 1000);
        } else {
            const errData = await response.json();
            console.error('Lỗi phân quyền:', errData.error);
        }
    } catch (error) {
        console.error('Lỗi kết nối máy chủ:', error);
    }
}

// Hàm này tạo hiệu ứng số nhảy từ start đến end trong khoảng thời gian duration (ms)
// Ví dụ: animateValue('stat-users', 0, 150, 1000) sẽ làm số ở phần tử có id 'stat-users' nhảy từ 0 lên 150 trong vòng 1 giây
// Lưu ý: Nếu start và end bằng nhau, hàm sẽ không làm gì để tránh lỗi chia cho 0   
function animateValue(id, start, end, duration) {
    if (start === end) return;
    let range = end - start;
    let current = start;
    let increment = end > start ? 1 : -1;
    let stepTime = Math.abs(Math.floor(duration / range));
    let obj = document.getElementById(id);
    
    let timer = setInterval(function() {
        current += increment;
        obj.innerHTML = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}