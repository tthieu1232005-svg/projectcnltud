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

function renderHistory() {
    const l = document.getElementById('history-list');
    if (!l) return;
    const historyData = [
        { id: 'BK01', name: 'WorkHub Central Q1', time: '20/03/2026 | 09:00 - 11:00', status: 'completed', deposit: '150.000đ', paidPercent: 100 }, 
        { id: 'BK02', name: 'WorkHub Central Q1', time: '26/03/2026 | 08:00 - 10:00', status: 'confirmed', deposit: '21.000đ', paidPercent: 30 }
    ];
    l.innerHTML = historyData.map(item => {
        let badge = item.status === 'completed' ? '<span class="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded font-bold uppercase">Hoàn thành</span>' : '<span class="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold uppercase">Đã xác nhận</span>';
        let paymentInfo = `<p class="text-[10px] font-black mt-2 ${item.paidPercent === 100 ? 'text-teal-600' : 'text-orange-500'}">THANH TOÁN: ${item.paidPercent}%</p>`;
        if(item.paidPercent < 100) paymentInfo += `<p class="text-[9px] text-slate-400 italic font-bold">Cần trả 70% còn lại tại quầy</p>`;
        return `<div class="bg-white p-6 rounded-2xl border border-slate-100 flex justify-between items-center shadow-sm"><div class="flex gap-4 items-center"><div class="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-3xl text-teal-600 font-bold shadow-inner">🏢</div><div><h4 class="font-bold text-slate-800">${item.name} ${badge}</h4><p class="text-sm text-slate-500">${item.time}</p>${paymentInfo}</div></div><div class="text-right text-xs font-bold text-teal-700 uppercase tracking-widest">Tiền cọc: ${item.deposit}</div></div>`;
    }).join('');
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
