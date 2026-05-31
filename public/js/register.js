// Hàm hiển thị các ô nhập liệu của Host khi chọn Role Chủ cơ sở
function toggleHostFields() {
    const isHost = document.getElementById('roleHost').checked;
    const hostFields = document.getElementById('hostFields');
    if (isHost) {
        hostFields.classList.remove('hidden');
    } else {
        hostFields.classList.add('hidden');
    }
}

async function handleRegister(event) {
    if (event) event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const fullName = document.getElementById('fullName').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    // KIỂM TRA MẬT KHẨU KHỚP NHAU TRƯỚC KHI GỬI
    if (password !== confirmPassword) {
        return showToast('Mật khẩu xác nhận không khớp!'); 
    }

    const companyName = document.getElementById('companyName')?.value || "";
    const hotline = document.getElementById('hotline')?.value || "";
    const bankName = document.getElementById('bankName')?.value || "";
    const bankNumber = document.getElementById('bankNumber')?.value || "";

    const payload = {
        email, password, fullName, role, companyName, hotline, bankName, bankNumber
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Đăng ký thành công! Đang chuyển hướng...');
            setTimeout(() => window.location.href = '/login', 1500);
        } else {
            showToast(data.error || 'Đăng ký thất bại!'); 
        }
    } catch (error) {
        console.error('Lỗi khi gọi API:', error);
        showToast('Không thể kết nối đến máy chủ!');
    }
}