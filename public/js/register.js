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


// Hàm xử lý đăng ký (gọi API)
// Sử dụng FormData để có thể gửi cả file (giấy phép kinh doanh) và text
async function handleRegister(event) {
    if (event) event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const fullName = document.getElementById('fullName').value;
    const role = document.querySelector('input[name="role"]:checked').value;

    if (password !== confirmPassword) {
        return showToast('Mật khẩu xác nhận không khớp!'); 
    }

    // TẠO FORM DATA ĐỂ CHỨA ĐƯỢC CẢ FILE VÀ TEXT
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('fullName', fullName);
    formData.append('role', role);
    formData.append('phone', document.getElementById('phone')?.value || "");
    formData.append('bankName', document.getElementById('bankName')?.value || "");
    formData.append('bankNumber', document.getElementById('bankNumber')?.value || "");

    // NẾU LÀ HOST THÌ NHÉT THÊM THÔNG TIN DOANH NGHIỆP & FILE
    if (role === 'host') {
        formData.append('companyName', document.getElementById('companyName')?.value || "");
        formData.append('taxCode', document.getElementById('taxCode')?.value || "");
        
        const fileInput = document.getElementById('verificationDoc');
        if (fileInput.files.length > 0) {
            formData.append('verificationDoc', fileInput.files[0]);
        }
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            // XÓA headers: {'Content-Type': 'application/json'} ĐI! 
            // Trình duyệt sẽ tự động setup chuẩn multipart/form-data cho FormData
            body: formData
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