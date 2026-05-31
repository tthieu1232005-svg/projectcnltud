// ==========================================
// LOGIC LUỒNG KHÁCH HÀNG (CUSTOMER)
// ==========================================

let selectedSeat = null, currentPrices = { total: 500000, deposit: 150000 };

function checkAvailableSlots() {
    const c = document.getElementById('available-slots-container');
    if (c) c.classList.remove('hidden');
}

function selectRoomCard(cardEl) {
    document.querySelectorAll('.room-card').forEach(c => {
        c.classList.remove('border-2', 'border-teal-500');
        c.classList.add('border', 'border-slate-200');
    });
    cardEl.classList.remove('border', 'border-slate-200');
    cardEl.classList.add('border-2', 'border-teal-500');
    selectedSeat = cardEl.dataset.roomId || cardEl.querySelector('.font-bold')?.innerText;
    const summary = document.getElementById('booking-summary');
    if (summary) summary.classList.remove('hidden');
}

function selectSeat(id, el) { selectRoomCard(el); selectedSeat = id; }

function checkAuthAndGoToPayment() { 
    if(!isLoggedIn) { 
        alert("Vui lòng đăng nhập để đặt chỗ!"); 
        navigateTo('login'); 
        return; 
    } 
    navigateTo('payment'); 
}

function setPaymentType(type) { 
    const area = document.getElementById('qr-area'); 
    if(!area) return;
    area.classList.remove('hidden'); 
    document.getElementById('qr-placeholder').classList.add('hidden'); 
    document.getElementById('pay-30').classList.toggle('active', type === 'deposit'); 
    document.getElementById('pay-100').classList.toggle('active', type === 'full'); 
    const amount = type === 'deposit' ? currentPrices.deposit : currentPrices.total; 
    document.getElementById('qr-price-val').innerText = amount.toLocaleString('vi-VN') + 'đ'; 
    document.getElementById('qr-img').src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=PAY_${amount}`; 
}

function handleFinalSuccess() { 
    showToast("Thanh toán thành công!"); 
    setTimeout(() => navigateTo('history'), 1500); 
}

// =======================================================
// LOGIC XỬ LÝ TRANG LỊCH SỬ ĐẶT CHỖ (CUSTOMER HISTORY)
// =======================================================

/**
 * Hàm gọi API thật và render danh sách lịch sử đặt chỗ của Khách hàng
 */
async function renderHistory() {
    const l = document.getElementById('history-list');
    if (!l) return;
    
    // Lấy Token bảo mật và Thông tin User đã lưu ở localStorage khi Đăng nhập
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('workhub_user') || '{}');
    const userId = user.id || user._id;

    // NẾU CHƯA ĐĂNG NHẬP: Hiển thị thông báo yêu cầu đăng nhập rõ ràng
    if (!token || !userId) {
        l.innerHTML = `
            <div class="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-center text-amber-800 font-medium shadow-sm">
                🔒 Vui lòng đăng nhập tài khoản Khách hàng để xem lịch sử đặt chỗ của bạn.
            </div>`;
        return;
    }

    try {
        // Gọi API Backend thật lấy danh sách đơn hàng của Khách hàng
        const response = await fetch(`/api/customers/${userId}/bookings`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Không thể tải danh sách lịch sử đặt chỗ.');
        }

        const bookings = data.bookings || [];

        // Trường hợp Khách hàng chưa từng đặt đơn nào
        if (bookings.length === 0) {
            l.innerHTML = `
                <div class="p-10 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div class="text-4xl mb-3 opacity-30">📅</div>
                    <p class="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Bạn chưa có đơn đặt chỗ nào</p>
                </div>`;
            return;
        }

        // Tiến hành render danh sách đơn hàng thật từ Database
        l.innerHTML = bookings.map(item => {
            let badge = '';
            let actionBtn = '';

            // 1. Phân loại cấu hình Badge trạng thái & nút bấm Hành động
            if (item.status === 'pending') {
                badge = '<span class="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ml-2 border border-amber-100">Chờ duyệt</span>';
                // Đơn Chờ duyệt -> Cho phép xuất hiện nút Hủy đơn đặt chỗ
                actionBtn = `
                    <button onclick="customerCancelBooking('${item._id}')" 
                            class="mt-4 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-1">
                        ❌ Hủy đơn đặt
                    </button>`;
            } else if (item.status === 'confirmed') {
                badge = '<span class="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ml-2 border border-blue-100">Đã xác nhận</span>';
                // Đơn đã xác nhận nhưng chưa thanh toán đủ 100% (ví dụ mới cọc 30%) -> Xuất hiện nút Thanh toán nốt
                if (item.percentagePaid < 100) {
                    actionBtn = `
                        <button onclick="customerPayRemainder('${item._id}')" 
                                class="mt-4 bg-teal-600 text-white hover:bg-teal-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1">
                            💳 Thanh toán nốt phần còn lại
                        </button>`;
                }
            } else if (item.status === 'completed') {
                badge = '<span class="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ml-2 border border-emerald-100">Hoàn thành</span>';
            } else if (item.status === 'cancelled') {
                badge = '<span class="text-[10px] bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider ml-2 border border-slate-100">Đã hủy</span>';
            }

            // 2. Xử lý hiển thị thông tin tiền bạc và ghi chú thanh toán đi kèm
            let paymentInfo = `<p class="text-[11px] font-black mt-2 ${item.percentagePaid === 100 ? 'text-teal-600' : 'text-orange-500'}">ĐÃ THANH TOÁN: ${item.percentagePaid}%</p>`;
            if (item.percentagePaid < 100 && item.status !== 'cancelled') {
                paymentInfo += `<p class="text-[10px] text-slate-400 italic font-bold mt-0.5">Vui lòng hoàn tất thanh toán trước khi nhận phòng.</p>`;
            }

            // Lấy tên không gian được Populate từ Backend, nếu lỗi lấy tên mặc định
            const spaceName = item.spaceID?.name || 'Không gian đặt chỗ WorkHub';
            const dateStr = new Date(item.startTime).toLocaleDateString('vi-VN');
            const timeStr = `${new Date(item.startTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} - ${new Date(item.endTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}`;

            return `
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm gap-4 hover:shadow-md transition-all duration-300">
                    <div class="flex gap-4 items-center">
                        <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl text-teal-600 font-bold shadow-inner flex-shrink-0">🏢</div>
                        <div>
                            <h4 class="font-black text-slate-800 text-base flex items-center flex-wrap gap-1">
                                ${spaceName} ${badge}
                            </h4>
                            <p class="text-sm text-slate-500 font-medium mt-0.5">${dateStr} | Thời gian: ${timeStr}</p>
                            <p class="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Mã đơn: <span class="text-teal-600 font-mono font-black">#${item._id.substring(item._id.length - 6).toUpperCase()}</span></p>
                            ${paymentInfo}
                            <div class="flex gap-2">${actionBtn}</div>
                        </div>
                    </div>
                    <div class="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 flex flex-col justify-center">
                        <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Tổng chi phí</div>
                        <div class="text-xl font-black text-slate-800 mt-0.5">${item.totalAmount.toLocaleString('vi-VN')}đ</div>
                    </div>
                </div>`;
        }).join('');

    } catch (error) {
        console.error('Lỗi tải dữ liệu lịch sử:', error);
        l.innerHTML = `
            <div class="text-center text-red-500 font-bold p-6 bg-red-50 rounded-2xl border border-red-100">
                ❌ Có lỗi xảy ra khi nạp dữ liệu: ${error.message}
            </div>`;
    }
}

/**
 * Hàm Frontend xử lý hành động: Khách hàng tự hủy đơn hàng Chờ duyệt
 */
async function customerCancelBooking(bookingId) {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn đặt chỗ này không? Hành động này không thể hoàn tác.")) return;
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('workhub_user') || '{}');
    const userId = user.id || user._id;

    try {
        const response = await fetch(`/api/customers/${userId}/bookings/${bookingId}/cancel`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gặp lỗi trong quá trình hủy đơn.');

        alert(data.message || 'Hủy đơn đặt chỗ thành công!');
        renderHistory(); // Gọi lại hàm để reload ngay giao diện mới nhất
    } catch (error) { 
        alert(`Lỗi: ${error.message}`); 
    }
}

/**
 * Hàm Frontend xử lý hành động: Khách hàng bấm thanh toán nốt phần tiền còn thiếu
 */
async function customerPayRemainder(bookingId) {
    if (!confirm("Xác nhận thực hiện giao dịch thanh toán trực tuyến cho phần tiền còn lại?")) return;
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('workhub_user') || '{}');
    const userId = user.id || user._id;

    try {
        const response = await fetch(`/api/customers/${userId}/bookings/${bookingId}/pay`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paymentMethod: 'vnpay' }) 
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Thanh toán thất bại.');

        alert(data.message || 'Thanh toán thành công! Trạng thái đơn của bạn đã cập nhật chi trả 100%.');
        renderHistory(); // Gọi lại hàm để reload giao diện cập nhật phần trăm thanh toán
    } catch (error) { 
        alert(`Lỗi: ${error.message}`); 
    }
}

function renderSearch() {
    const l = document.getElementById('search-results-list');
    if (!l) return;
    l.innerHTML = `<div onclick="navigateTo('detail')" class="bg-white rounded-2xl border p-4 flex gap-4 hover:border-teal-500 cursor-pointer shadow-sm"><img src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=300" class="w-20 h-20 rounded-xl object-cover"><div class="flex-1"><h4 class="font-bold text-slate-800 text-sm">WorkHub Central Q1</h4><div class="text-teal-700 font-bold text-xs">250.000đ/giờ</div></div></div>`.repeat(4);
}

// ==========================================
// KHỞI TẠO CUSTOMER KHI TẢI TRANG
// ==========================================
window.addEventListener('load', () => { 
    const currentPath = window.location.pathname;

    // Render dữ liệu ảo cho Khách hàng
    if(currentPath === '/history') renderHistory();
    if(currentPath === '/search') renderSearch();
});
