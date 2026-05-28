async function handleLogin(event) {
    if (event) event.preventDefault();

    // 1. Thu thập dữ liệu
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        return showToast('Vui lòng nhập đầy đủ Email và Mật khẩu!');
    }

    try {
        // 2. Gửi request sang Backend
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        // 3. Nhận phản hồi
        const data = await response.json();

        if (response.ok) {
            // Đăng nhập thành công! 
            showToast('Đăng nhập thành công! Đang chuyển hướng...');

            // LƯU TOKEN VÀ THÔNG TIN VÀO LOCALSTORAGE
            localStorage.setItem('token', data.token); // Cất giấy thông hành
            localStorage.setItem('userRole', data.user.role); // Nhớ vai trò để render UI sau này

            localStorage.setItem('userName', data.user.fullName); // Lưu tên để hiển thị trên UI
            
            // ĐIỀU HƯỚNG DỰA TRÊN VAI TRÒ (ROLE-BASED ROUTING)
            setTimeout(() => {
                if (data.user.role === 'host') {
                    window.location.href = '/host/dashboard'; // Host vào trang quản lý
                } else if (data.user.role === 'admin') {
                    window.location.href = '/admin/dashboard'; // Admin vào trang admin
                } else {
                    window.location.href = '/'; // Customer về trang chủ tìm phòng
                }
            }, 1000);

        } else {
            // Lỗi sai mật khẩu, sai email, hoặc bị ban
            showToast(data.error || 'Đăng nhập thất bại!');
        }
    } catch (error) {
        console.error('Lỗi khi gọi API:', error);
        showToast('Không thể kết nối đến máy chủ!');
    }
}