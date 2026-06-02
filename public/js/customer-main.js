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

