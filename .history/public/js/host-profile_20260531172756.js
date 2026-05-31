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

        // Nếu người dùng có tương tác hoặc nhập vào các ô mật khẩu
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

            // Tiến hành gọi API đổi mật khẩu riêng biệt
            const passResponse = await fetch('/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    oldPassword: oldPassword, // Khớp với Backend nhận dữ liệu
                    newPassword: newPassword
                })
            });

            const passResult = await passResponse.json();
            if (!passResponse.ok) {
                alert('Lỗi đổi mật khẩu: ' + (passResult.error || 'Thất bại'));
                resetSubmitButton();
                return; // Dừng lại không lưu thông tin profile nữa nếu mật khẩu sai
            }
        }

        // --- PHẦN 2: XỬ LÝ CẬP NHẬT HỒ SƠ DOANH NGHIỆP ---
        const formElement = document.getElementById('profile-form');
        const formData = new FormData(formElement);

        // Gọi API cập nhật thông tin cá nhân (Hãy kiểm tra lại đường dẫn API profile của bạn)
        const profileResponse = await fetch('/host/update-profile', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Lưu ý: Tuyệt đối không để 'Content-Type': 'application/json' ở đây vì đang gửi FormData có file
            },
            body: formData
        });

        const profileResult = await profileResponse.json();

        if (profileResponse.ok) {
            if (typeof showToast === 'function') {
                showToast('Cập nhật hồ sơ và mật khẩu thành công!');
            } else {
                alert('Cập nhật hồ sơ thành công!');
            }

            // Ẩn lại các ô mật khẩu sau khi thành công
            document.getElementById('password-fields').classList.add('hidden');
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
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
    submitBtn.disabled = false;
    submitBtn.innerText = 'LƯU THAY ĐỔI HỒ SƠ';
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
}
