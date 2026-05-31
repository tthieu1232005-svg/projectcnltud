// ==========================================
// LOGIC LUỒNG KHÁCH HÀNG (CUSTOMER)
// ==========================================

let selectedSeat = null, currentPrices = { total: 500000, deposit: 150000 };
let currentRoomType = 'meeting';
let roomImages = [];
let currentImageIndex = 0;


// Khai báo sẵn chuỗi URL ảnh gốc
const imgUrlsMeeting = 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600,https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600,https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600';
const imgUrlsStudy = 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=600';

function switchRoomType(type) {
    currentRoomType = type;
    const btnMeeting = document.getElementById('btn-type-meeting');
    const btnStudy = document.getElementById('btn-type-study');
    const meetingButtons = document.querySelectorAll('.meeting-slot');
    const studyButtons = document.querySelectorAll('.study-slot');

    document.querySelectorAll('.timeslot-btn').forEach(btn => {
        btn.classList.remove('!border-teal-600', '!bg-teal-600', '!text-white');
    });

    // Reset ẩn các phần tính toán khi chuyển tab để chờ người dùng check lại
    const container = document.getElementById('available-slots-container');
    const summary = document.getElementById('booking-summary');
    if (container) container.classList.add('hidden');
    if (summary) summary.classList.add('hidden');

    if (type === 'meeting') {
        if(btnMeeting) btnMeeting.className = "py-2 text-xs font-bold rounded-lg transition bg-white text-teal-700 shadow-sm";
        if(btnStudy) btnStudy.className = "py-2 text-xs font-bold rounded-lg transition text-slate-500 hover:text-slate-800";
        meetingButtons.forEach(b => b.classList.remove('hidden'));
        studyButtons.forEach(b => b.classList.add('hidden'));
    } else {
        if(btnStudy) btnStudy.className = "py-2 text-xs font-bold rounded-lg transition bg-white text-teal-700 shadow-sm";
        if(btnMeeting) btnMeeting.className = "py-2 text-xs font-bold rounded-lg transition text-slate-500 hover:text-slate-800";
        studyButtons.forEach(b => b.classList.remove('hidden'));
        meetingButtons.forEach(b => b.classList.add('hidden'));
    }
    checkAvailableSlots();
}

async function checkAvailableSlots() {
    const container = document.getElementById('available-slots-container');
    const listGrid = document.getElementById('available-slots-list');

    if (!container || !listGrid) return;

    listGrid.innerHTML = 'Đang tải...';

    try {
        const res = await fetch('/api/customer/spaces/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: currentRoomType,
                date: selectedDate || new Date().toISOString().split('T')[0]
            })
        });

        const data = await res.json();

        if (!res.ok) {
            listGrid.innerHTML = `<p class="text-red-500">${data.error}</p>`;
            return;
        }

        listGrid.innerHTML = data.spaces.map(space => `
            <div class="room-card bg-white border border-slate-200 rounded-[1rem] p-4 flex justify-between items-center gap-3 cursor-pointer transition hover:border-teal-300"
                data-room-id="${space._id}"
                onclick="selectRoomCard(this)">
                
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-sm text-slate-800">${space.Name}</div>
                    <div class="text-xs font-black text-teal-700 mt-0.5">
                        ${Number(space.PricePerHour || 0).toLocaleString('vi-VN')}đ/giờ
                    </div>
                    <div class="text-[10px] text-emerald-600 font-black uppercase mt-1.5 flex items-center gap-1">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Sẵn sàng
                    </div>
                </div>

                <button type="button"
                    class="text-[10px] px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 font-bold shrink-0 hover:bg-teal-100 transition"
                    onclick="openModalSafe(
                        '${space.Name}',
                        '${space.PricePerHour}',
                        '${encodeURIComponent((space.Images || []).join(','))}'
                    ); event.stopPropagation();">
                    Chi tiết
                </button>
            </div>
        `).join('');

        container.classList.remove('hidden');

    } catch (err) {
        console.error(err);
        listGrid.innerHTML = 'Lỗi server';
    }
}
function selectRoomCard(element) {
    document.querySelectorAll('.room-card').forEach(card => {
        card.classList.remove('border-teal-500', 'bg-teal-50/30');
    });
    element.classList.add('border-teal-500', 'bg-teal-50/30');

    const summary = document.getElementById('booking-summary');
    if (summary) summary.classList.remove('hidden');
}

function selectSeat(id, el) { 
    selectRoomCard(el); 
    selectedSeat = id; 
}

async function checkAuthAndGoToPayment() {
    if (typeof isLoggedIn !== 'undefined' && !isLoggedIn) {
        alert("Vui lòng đăng nhập để đặt chỗ!");
        navigateTo('login');
        return;
    }

    try {
        const res = await fetch('/api/customer/bookings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,   // phải có biến này
                spaceId: selectedSeat,    // phòng đã chọn
                startTime: selectedDate + " 07:00", // tùy bạn map
                endTime: selectedDate + " 10:00",
                paymentType: 'deposit'
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error);
            return;
        }

        alert("Đặt chỗ thành công!");
        navigateTo('payment');

    } catch (err) {
        console.error(err);
        alert("Lỗi hệ thống");
    }
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

function updateModalImageUI() {
    const imgEl = document.getElementById('modal-room-img');
    const counterEl = document.getElementById('modal-img-counter');
    const prevBtn = document.getElementById('modal-btn-prev');
    const nextBtn = document.getElementById('modal-btn-next');
    const total = roomImages.length;

    if (!imgEl || total === 0) return;

    imgEl.src = roomImages[currentImageIndex];
    if (counterEl) {
        counterEl.textContent = (currentImageIndex + 1) + ' / ' + total;
        counterEl.classList.toggle('hidden', total <= 1);
    }

    if (prevBtn) prevBtn.classList.toggle('hidden', currentImageIndex === 0 || total <= 1);
    if (nextBtn) nextBtn.classList.toggle('hidden', currentImageIndex === total - 1 || total <= 1);
}

function changeRoomImage(step) {
    const newIndex = currentImageIndex + step;
    if (newIndex < 0 || newIndex >= roomImages.length) return;
    currentImageIndex = newIndex;
    updateModalImageUI();
}

function openModalSafe(name, price, encodedUrls) {
    const urls = decodeURIComponent(encodedUrls);
    openRoomModal(name, price, urls);
}

function openRoomModal(name, price, imageUrlsString) {
    const modal = document.getElementById('modal-room-detail');
    const nameEl = document.getElementById('modal-room-name');
    const priceEl = document.getElementById('modal-room-price');
    const imgEl = document.getElementById('modal-room-img');

    roomImages = (imageUrlsString || '')
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    currentImageIndex = 0;

    if (nameEl) nameEl.textContent = name;
    if (priceEl) priceEl.textContent = price;
    if (imgEl) imgEl.alt = name;

    updateModalImageUI();

    if (modal) modal.classList.remove('hidden');
    document.body.classList.add('modal-active');
}

function closeRoomModal() {
    const modal = document.getElementById('modal-room-detail');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-active');
    roomImages = [];
    currentImageIndex = 0;
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

document.addEventListener('DOMContentLoaded', function () {
    const grid = document.getElementById('timeslot-grid');
    if (!grid) return;
    grid.addEventListener('click', function (e) {
        if (e.target.classList.contains('timeslot-btn')) {
            e.target.classList.toggle('!border-teal-600');
            e.target.classList.toggle('!bg-teal-600');
            e.target.classList.toggle('!text-white');
        }
    });
});