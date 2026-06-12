// Hàm ẩn/hiện các ô nhập mật khẩu
function togglePasswordFields() {
    const fields = document.getElementById('password-fields');
    fields.classList.toggle('hidden');

    // Nếu ẩn đi thì xóa sạch dữ liệu người dùng đã nhập trước đó cho an toàn
    if (fields.classList.contains('hidden')) {
        document.getElementById('old-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-password').value = '';
        document.getElementById('password-error').classList.add('hidden');
    }
}

// Hàm xem trước Logo khi upload
function previewImage(event) {
    if (event.target.files && event.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function () {
            const output = document.getElementById('logo-preview');
            output.src = reader.result;
        };
        reader.readAsDataURL(event.target.files[0]);
    }
}

// Hàm kiểm tra mật khẩu gõ lại có khớp hay không
function validatePasswordMatch() {
    const newPass = document.getElementById('new-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    const errorText = document.getElementById('password-error');

    if (confirmPass && newPass !== confirmPass) {
        errorText.classList.remove('hidden');
        return false;
    } else {
        errorText.classList.add('hidden');
        return true;
    }
}

// ==========================================
// TỰ ĐỘNG TẢI DỮ LIỆU KHI MỞ TRANG PROFILE
// ==========================================
async function loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        return;
    }

    try {
        // Gọi API lấy dữ liệu Hồ sơ (Khớp với router.get('/api/profile') trong hostRoutes)
        const response = await fetch('/host/api/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể tải dữ liệu hồ sơ.');

        // Điền dữ liệu vào các ô input trên giao diện EJS
        if (document.getElementById('host-name-input')) document.getElementById('host-name-input').value = data.user?.FullName || '';
        if (document.getElementById('email')) document.getElementById('email').value = data.user?.Email || '';
        if (document.getElementById('companyName')) document.getElementById('companyName').value = data.profile?.CompanyName || '';
        if (document.getElementById('hotline')) document.getElementById('hotline').value = data.profile?.Hotline || '';
        if (document.getElementById('taxCode')) document.getElementById('taxCode').value = data.profile?.TaxCode || '';
        if (document.getElementById('bankName')) document.getElementById('bankName').value = data.profile?.BankName || '';
        if (document.getElementById('bankNumber')) document.getElementById('bankNumber').value = data.profile?.BankNumber || '';

        // Hiển thị logo thương hiệu cũ nếu có dữ liệu đường dẫn từ Cloudinary
        if (data.profile?.Logo && document.getElementById('logo-preview')) {
            document.getElementById('logo-preview').src = data.profile.Logo;
        }

    } catch (error) {
        console.error('Lỗi khi tải thông tin hồ sơ:', error.message);
    }
}

// Lắng nghe sự kiện trang tải xong để kích hoạt hàm đổ dữ liệu
window.addEventListener('DOMContentLoaded', () => {
    loadProfile();
});

// ==========================================
// HÀM XỬ LÝ CHÍNH KHI BẤM NÚT LƯU HỒ SƠ
// ==========================================
async function updateProfile() {
    const submitBtn = document.getElementById('submit-btn');
    const token = localStorage.getItem('token');

    // 1. Khóa nút bấm tránh click liên tục
    submitBtn.disabled = true;
    submitBtn.innerText = 'ĐANG XỬ LÝ...';
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        // --- PHẦN 1: XỬ LÝ ĐỔI MẬT KHẨU (NẾU CÓ NHẬP) ---
        const oldPassword = document.getElementById('old-password').value.trim();
        const newPassword = document.getElementById('new-password').value.trim();

        if (oldPassword || newPassword) {
            if (!oldPassword || !newPassword) {
                alert('Vui lòng điền đầy đủ cả Mật khẩu cũ và Mật khẩu mới!');
                resetSubmitButton();
                return;
            }
            if (!validatePasswordMatch()) {
                alert('Mật khẩu xác nhận không trùng khớp!');
                resetSubmitButton();
                return;
            }
            if (newPassword.length < 6) {
                alert('Mật khẩu mới phải từ 6 ký tự trở lên!');
                resetSubmitButton();
                return;
            }

            // Gọi đúng API đổi mật khẩu theo cấu hình: /api/auth/change-password
            const passResponse = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword: oldPassword,
                    newPassword: newPassword
                })
            });

            const passResult = await passResponse.json();
            if (!passResponse.ok) {
                alert('Lỗi đổi mật khẩu: ' + (passResult.error || 'Thất bại'));
                resetSubmitButton();
                return; // Dừng tiến trình nếu mật khẩu cũ không chính xác
            }
        }

        // --- PHẦN 2: XỬ LÝ CẬP NHẬT HỒ SƠ DOANH NGHIỆP ---
        const formElement = document.getElementById('profile-form');
        const formData = new FormData(formElement);

        // Gọi đúng API PUT cập nhật thông tin: /host/api/profile
        const profileResponse = await fetch('/host/api/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
                // Lưu ý: Không đặt Content-Type ở đây khi dùng FormData để trình duyệt tự định nghĩa biên multipart
            },
            body: formData
        });

        const profileResult = await profileResponse.json();

        if (profileResponse.ok) {
            if (typeof showToast === 'function') {
                showToast('Cập nhật hồ sơ thành công!');
            } else {
                alert('Cập nhật hồ sơ thành công!');
            }

            // Ẩn lại các ô mật khẩu và làm sạch dữ liệu sau khi hoàn tất thành công
            document.getElementById('password-fields').classList.add('hidden');
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';

            // Tải lại để cập nhật chính xác ảnh hoặc thông tin mới nhất
            loadProfile();
        } else {
            alert(profileResult.error || 'Cập nhật thông tin hồ sơ thất bại!');
        }

    } catch (error) {
        console.error('Lỗi hệ thống:', error);
        alert('Có lỗi xảy ra trong quá trình truyền dữ liệu!');
    } finally {
        resetSubmitButton();
    }
}

// Hàm trả lại trạng thái cho nút bấm
function resetSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'LƯU THAY ĐỔI HỒ SƠ';
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}