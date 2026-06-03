// ==========================================
// LOGIC LUỒNG KHÁCH HÀNG (CUSTOMER)
// ==========================================

let selectedSeat = null;
let currentPrices = { total: 500000, deposit: 150000 };
let currentRoomType = 'meeting';
let roomImages = [];
let currentImageIndex = 0;
let selectedTimeSlot = null;

// Kiểm tra xem đang ở trang detail không
const isDetailPage = window.location.pathname.includes('/detail');

// ==========================================
// HÀM CHUYỂN ĐỔI LOẠI PHÒNG
// ==========================================
function switchRoomType(type) {
    if (!isDetailPage) return; // Chỉ chạy trên trang detail
    
    currentRoomType = type; // 'meeting' hoặc 'desk'
    selectedTimeSlot = null; // Reset thời gian chọn
    selectedSeat = null; // Reset phòng chọn

    // 1. Reset trạng thái UI ngay lập tức
    document.getElementById('available-slots-container')?.classList.add('hidden');
    document.getElementById('booking-summary')?.classList.add('hidden');

    // 2. Reset trạng thái các nút khung giờ
    document.querySelectorAll('.timeslot-btn').forEach(btn => {
        btn.classList.remove('border-teal-600', 'bg-teal-600', 'text-white');
        btn.removeAttribute('data-selected');
    });

    // 3. Reset các card phòng đã chọn
    document.querySelectorAll('.room-card').forEach(card => {
        card.classList.remove('border-teal-500', 'bg-teal-50/30');
    });

    // 4. Cập nhật Tab Button
    const btnMeeting = document.getElementById('btn-type-meeting');
    const btnStudy = document.getElementById('btn-type-study');

    if (btnMeeting) {
        btnMeeting.className = (type === 'meeting') 
            ? "py-2 text-xs font-bold rounded-lg transition bg-white text-teal-700 shadow-sm" 
            : "py-2 text-xs font-bold rounded-lg transition text-slate-500 hover:text-slate-800";
    }

    if (btnStudy) {
        btnStudy.className = (type === 'desk') 
            ? "py-2 text-xs font-bold rounded-lg transition bg-white text-teal-700 shadow-sm" 
            : "py-2 text-xs font-bold rounded-lg transition text-slate-500 hover:text-slate-800";
    }

    // 5. Ẩn/Hiện nhóm khung giờ
    const meetingButtons = document.querySelectorAll('.meeting-slot');
    const studyButtons = document.querySelectorAll('.study-slot');

    if (type === 'meeting') {
        meetingButtons.forEach(b => b.classList.remove('hidden'));
        studyButtons.forEach(b => b.classList.add('hidden'));
    } else {
        studyButtons.forEach(b => b.classList.remove('hidden'));
        meetingButtons.forEach(b => b.classList.add('hidden'));
    }
}

// ==========================================
// EVENT LISTENER CHO KHUNG GIỜ
// ==========================================
function initTimeSlotListener() {
    if (!isDetailPage) return; // Chỉ chạy trên trang detail
    
    const grid = document.getElementById('timeslot-grid');
    if (!grid) return;

    grid.addEventListener('click', function (e) {
        if (e.target.classList.contains('timeslot-btn')) {
            // Bỏ chọn tất cả nút khác
            document.querySelectorAll('.timeslot-btn').forEach(btn => {
                btn.classList.remove('border-teal-600', 'bg-teal-600', 'text-white');
                btn.removeAttribute('data-selected');
            });

            // Chọn nút hiện tại
            e.target.classList.add('border-teal-600', 'bg-teal-600', 'text-white');
            e.target.setAttribute('data-selected', 'true');
            selectedTimeSlot = e.target.getAttribute('data-slot');

            // Reset danh sách phòng và lựa chọn phòng
            selectedSeat = null;
            document.querySelectorAll('.room-card').forEach(card => {
                card.classList.remove('border-teal-500', 'bg-teal-50/30');
            });
            document.getElementById('available-slots-container')?.classList.add('hidden');
            document.getElementById('booking-summary')?.classList.add('hidden');
        }
    });
}

// ==========================================
// KIỂM TRA PHÒNG CÓ SẴN
// ==========================================
async function checkAvailableSlots() {
    if (!isDetailPage) return; // Chỉ chạy trên trang detail
    
    const container = document.getElementById('available-slots-container');
    const listGrid = document.getElementById('available-slots-list');

    if (!container || !listGrid) return;

    // Lấy dữ liệu từ giao diện
    const branchId = document.querySelector('[data-branch-id]')?.getAttribute('data-branch-id');
    const date = document.getElementById('booking-date')?.value;

    // Kiểm tra khung giờ đã chọn
    if (!selectedTimeSlot) {
        alert("Vui lòng chọn khung giờ trước khi xem!");
        return;
    }

    if (!branchId || !date) {
        alert("Thiếu dữ liệu chi nhánh hoặc ngày!");
        return;
    }

    listGrid.innerHTML = '<p class="text-slate-500 text-sm">Đang tải...</p>';

    try {
        const res = await fetch('/spaces/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                branchId: branchId,
                date: date,
                timeSlot: selectedTimeSlot,
                roomType: currentRoomType // 'meeting' hoặc 'desk'
            })
        });

        const data = await res.json();

        if (!res.ok) {
            listGrid.innerHTML = `<p class="text-red-500 text-sm">${data.error || 'Lỗi hệ thống'}</p>`;
            return;
        }

        // Render danh sách phòng từ dữ liệu thực
        // ... (phía trên giữ nguyên)
        if (data.spaces.length === 0) {
            listGrid.innerHTML = '<p class="text-slate-400 text-xs italic">Không còn phòng trống trong khung giờ này.</p>';
        } else {
            listGrid.innerHTML = data.spaces.map(space => `
                <div class="room-card bg-white border border-slate-200 rounded-[1rem] p-4 flex justify-between items-center gap-3 cursor-pointer transition hover:border-teal-300"
                    data-room-id="${space._id}"
                    data-room-price="${space.PricePerHour || 0}"
                    onclick="selectRoomCardDetail(this)">
                    
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
                            '${space.PricePerHour || 0}', 
                            '${encodeURIComponent((space.Images || []).join(','))}',
                            '${encodeURIComponent(space.Description || '')}',
                            '${space.Capacity || 0}',
                            '${encodeURIComponent((space.Amenities || []).join(','))}'
                        ); event.stopPropagation();">
                        Chi tiết
                    </button>
                </div>
            `).join('');
        }
        container.classList.remove('hidden');

    } catch (err) {
        console.error('Lỗi:', err);
        listGrid.innerHTML = '<p class="text-red-500 text-sm">Lỗi kết nối server</p>';
    }
}

// ==========================================
// CHỌN PHÒNG - Rename để tránh xung đột
// ==========================================
function selectRoomCardDetail(element) {
    if (!isDetailPage) return; // Chỉ chạy trên trang detail
    
    // Bỏ chọn các card khác
    document.querySelectorAll('.room-card').forEach(card => {
        card.classList.remove('border-teal-500', 'bg-teal-50/30');
    });
    
    // Chọn card hiện tại
    element.classList.add('border-teal-500', 'bg-teal-50/30');

    selectedSeat = element.getAttribute('data-room-id');
    const pricePerHour = parseInt(element.getAttribute('data-room-price')) || 0;
    
    // Tính toán giá dựa trên thời gian chọn
    if (selectedTimeSlot) {
        const [startStr, endStr] = selectedTimeSlot.split(' - ');
        const start = new Date(`2000-01-01T${startStr}:00`);
        const end = new Date(`2000-01-01T${endStr}:00`);
        const hours = (end - start) / (1000 * 60 * 60);
        
        currentPrices.total = Math.round(pricePerHour * hours);
        currentPrices.deposit = Math.round(currentPrices.total * 0.3); // 30% tiền cọc
    }

    // Hiển thị tóm tắt đặt chỗ
    const summary = document.getElementById('booking-summary');
    if (summary) {
        summary.classList.remove('hidden');
        document.getElementById('val-deposit').innerText = `Cọc: ${currentPrices.deposit.toLocaleString('vi-VN')}đ`;
    }
}

// ==========================================
// XỬ LÝ THANH TOÁN
// ==========================================
async function checkAuthAndGoToPayment() {
    
    if (!selectedSeat) {
        alert("Vui lòng chọn phòng!");
        return;
    }

    if (!selectedTimeSlot) {
        alert("Vui lòng chọn khung giờ!");
        return;
    }

    try {
        // Parse thời gian từ selectedTimeSlot (format: "07:00 - 10:00")
        const [startStr, endStr] = selectedTimeSlot.split(' - ');
        const date = document.getElementById('booking-date').value;
        const startTime = new Date(`${date}T${startStr}:00`);
        const endTime = new Date(`${date}T${endStr}:00`);

        const res = await fetch('/booking/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: typeof currentUserId !== 'undefined' ? currentUserId : null,
                spaceId: selectedSeat,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                paymentType: 'deposit'
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Lỗi hệ thống');
            return;
        }

        alert("Đặt chỗ thành công!");
        // Lấy bookingId để xác nhận thanh toán ở trang payment
        const bookingId = data?.booking?._id || data?.bookingId || null;
        if (bookingId) {
            window.location.href = `/payment?bookingId=${bookingId}`;
        } else {
            window.location.href = '/payment';
        }

    } catch (err) {
        console.error('Lỗi:', err);
        alert("Lỗi kết nối server");
    }
}

function setPaymentType(type) {
    const area = document.getElementById('qr-area');
    if (!area) return;

    area.classList.remove('hidden');
    document.getElementById('qr-placeholder')?.classList.add('hidden');
    document.getElementById('pay-30')?.classList.toggle('active', type === 'deposit');
    document.getElementById('pay-100')?.classList.toggle('active', type === 'full');

    const amount = type === 'deposit' ? currentPrices.deposit : currentPrices.total;
    const priceEl = document.getElementById('qr-price-val');
    if (priceEl) priceEl.innerText = amount.toLocaleString('vi-VN') + 'đ';

    const qrImg = document.getElementById('qr-img');
    if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=PAY_${amount}`;
}

async function handleFinalSuccess() {
    try {
        // bookingId cần được truyền từ trang payment (hidden input hoặc query string)
        const bookingIdEl = document.getElementById('bookingId');
        const bookingId = bookingIdEl?.value || new URLSearchParams(window.location.search).get('bookingId');

        if (!bookingId) {
            showToast('Thiếu bookingId, không thể xác nhận thanh toán!');
            return;
        }

        const token = localStorage.getItem('token');

        const res = await fetch('/api/customers/booking/confirm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ bookingId })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.error || 'Xác nhận thanh toán thất bại');
            return;
        }

        showToast('Thanh toán thành công!');
        setTimeout(() => window.location.href = '/history', 1000);
    } catch (e) {
        console.error(e);
        alert('Lỗi kết nối server');
    }
}

// ==========================================
// QUẢN LÝ MODAL PHÒNG
// ==========================================
function openModalSafe(name, price, encodedUrls, description, capacity, encodedAmenities) {
    if (!isDetailPage) return;
    
    const urls = decodeURIComponent(encodedUrls);
    const desc = decodeURIComponent(description || "");
    const cap = capacity || 0;
    const amenities = decodeURIComponent(encodedAmenities || "");
    
    openRoomModal(name, price, urls, desc, cap, amenities);
}

function openRoomModal(name, price, imageUrlsString, description, capacity, amenities) {
    if (!isDetailPage) return;
    
    const modal = document.getElementById('modal-room-detail');
    const nameEl = document.getElementById('modal-room-name');
    const priceEl = document.getElementById('modal-room-price');
    const imgEl = document.getElementById('modal-room-img');
    
    // Các phần tử mới
    const descEl = document.getElementById('modal-room-desc');
    const capacityEl = document.getElementById('modal-room-capacity');
    const amenitiesEl = document.getElementById('modal-room-amenities');

    roomImages = (imageUrlsString || '')
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);
    currentImageIndex = 0;

    // Gán dữ liệu
    if (nameEl) nameEl.textContent = name;
    if (priceEl) priceEl.textContent = Number(price).toLocaleString('vi-VN') + 'đ/giờ';
    if (imgEl) imgEl.alt = name;
    
    // Gán dữ liệu mới
    if (descEl) descEl.textContent = description || "Không có mô tả chi tiết.";
    if (capacityEl) capacityEl.textContent = `Sức chứa: ${capacity || 0} người`;
    
    if (amenitiesEl) {
        const amenitiesArray = amenities ? amenities.split(',').map(item => item.trim()) : [];
        amenitiesEl.innerHTML = amenitiesArray.map(item => 
            `<span class="bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-full mr-1">${item}</span>`
        ).join('');
    }

    updateModalImageUI();

    if (modal) modal.classList.remove('hidden');
    document.body.classList.add('modal-active');
}

function closeRoomModal() {
    if (!isDetailPage) return; // Chỉ chạy trên trang detail
    
    const modal = document.getElementById('modal-room-detail');
    if (modal) modal.classList.add('hidden');
    document.body.classList.remove('modal-active');
    roomImages = [];
    currentImageIndex = 0;
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
    if (!isDetailPage) return; // Chỉ chạy trên trang detail
    
    const newIndex = currentImageIndex + step;
    if (newIndex < 0 || newIndex >= roomImages.length) return;
    currentImageIndex = newIndex;
    updateModalImageUI();
}

// ==========================================
// KHỞI TẠO KHI TẢI TRANG
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    if (!isDetailPage) return; // Chỉ chạy trên trang detail

    // 1) Load reviews cho branch
    loadBranchReviews();

    // 2) Khởi tạo event listener cho khung giờ
    initTimeSlotListener();
});

// ==========================================
// LOAD REVIEWS (CUSTOMER DETAIL - theo BRANCH)
// ==========================================
async function loadBranchReviews() {
    const container = document.getElementById('review-items-list');
    if (!container) return;

    const branchId = document.querySelector('[data-branch-id]')?.getAttribute('data-branch-id');
    console.log('[reviews] branchId:', branchId);
    if (!branchId) {
        container.innerHTML = '<div class="text-red-500 text-sm">Thiếu branchId (không lấy được từ UI).</div>';
        return;
    }

    container.innerHTML = '<div class="text-slate-500 text-sm">Đang tải đánh giá...</div>';

    try {
        const res = await fetch(`/api/customers/branches/${encodeURIComponent(branchId)}/reviews`);
        const data = await res.json();

        if (!res.ok) {
            container.innerHTML = '<div class="text-red-500 text-sm">Lỗi tải đánh giá</div>';
            return;
        }

        const reviews = data.reviews || [];
        if (reviews.length === 0) {
            container.innerHTML = '<div class="text-slate-400 text-sm italic">Chưa có đánh giá nào.</div>';
            return;
        }

        container.innerHTML = reviews.map(r => `
            <div class="border-b border-slate-100 pb-4">
                <div class="flex justify-between font-bold text-xs text-slate-400">
                    <span>${escapeHtml(r.customerName || 'Khách hàng')}</span>
                    <span>${formatDateVN(r.createdAt)}</span>
                </div>
                <div class="flex text-amber-500 text-xs my-1">
                    ${renderStars(r.rating)}
                </div>
                ${r.comment ? `<p class="text-sm text-slate-600 italic">"${escapeHtml(r.comment)}"</p>` : ''}
            </div>
        `).join('');
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="text-red-500 text-sm">Lỗi kết nối server</div>';
    }
}

function renderStars(rating) {
    const n = Number(rating) || 0;
    const full = '★'.repeat(Math.max(0, Math.min(5, n)));
    const empty = '☆'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, n))));
    return `${full}${empty}`;
}

function formatDateVN(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}

