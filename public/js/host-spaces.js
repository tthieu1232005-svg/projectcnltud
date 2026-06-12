// // =======================================================
// // [CẬP NHẬT] TẢI DỮ LIỆU CƠ SỞ & KHÔNG GIAN TỪ DATABASE
// // =======================================================
// async function loadHostFacilitiesFromDB() {
//     try {
//         const token = localStorage.getItem('token');

//         // 1. Gọi API lấy danh sách Cơ sở (Branches)
//         // Lưu ý: Đổi URL '/api/hosts/branches' cho đúng với file Router của bạn
//         const branchRes = await fetch('/api/hosts/branches', {
//             method: 'GET',
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         const branchData = await branchRes.json();

//         // 2. Gọi API lấy danh sách Không gian (Spaces)
//         // Lưu ý: Đổi URL '/api/hosts/spaces' cho đúng với file Router của bạn
//         const spaceRes = await fetch('/api/hosts/spaces', {
//             method: 'GET',
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         const spaceData = await spaceRes.json();

//         if (branchRes.ok && spaceRes.ok) {
//             // Reset lại dữ liệu UI
//             hostFacilities = {};
//             facilitySpacesData = {};

//             // 3. Đổ dữ liệu Branches từ DB vào biến của UI
//             const branches = branchData.branches || [];
//             branches.forEach(b => {
//                 const branchId = b._id; // Dùng ID thật của MongoDB
//                 hostFacilities[branchId] = {
//                     id: branchId,
//                     name: b.Name || b.name || 'Chưa có tên',
//                     address: b.Address || b.address || 'Chưa cập nhật địa chỉ',
//                     note: b.Description || b.description || '',
//                     image: b.Image || b.image || 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800'
//                 };

//                 // Khởi tạo mảng không gian rỗng cho cơ sở này
//                 facilitySpacesData[branchId] = [];
//             });

//             // 4. Đổ dữ liệu Spaces từ DB vào đúng Cơ sở của nó
//             const spaces = spaceData.spaces || [];
//             spaces.forEach(s => {
//                 const branchId = s.BranchID || s.branchID;
//                 if (facilitySpacesData[branchId]) {
//                     facilitySpacesData[branchId].push({
//                         id: s.SpaceCode || s.spaceCode || s.Name || s.name || s._id,
//                         type: s.Type || s.type || 'Phòng họp',
//                         status: s.Status || s.status || 'ready',
//                         price: formatPriceDisplay(s.PricePerHour || s.pricePerHour || 0),
//                         image: s.Image || s.image || ''
//                     });
//                 }
//             });
//         }

//         // Cập nhật lại giao diện
//         renderFacilityList();
//     } catch (error) {
//         console.error("❌ Lỗi khi lấy dữ liệu cơ sở từ Database:", error);
//         hostFacilities = {};
//         renderFacilityList();
//     }
// }

// // Hàm khởi tạo trang sẽ gọi hàm fetch từ DB thay vì LocalStorage
// function initHostSpacesPage() {
//     loadHostFacilitiesFromDB();
// }

// // =======================================================
// // [CẬP NHẬT] LƯU CƠ SỞ MỚI LÊN DATABASE
// // =======================================================
// async function saveNewFacilityToDB() {
//     const name = document.getElementById('add-fac-name')?.value.trim();
//     const address = document.getElementById('add-fac-address')?.value.trim();
//     const note = document.getElementById('add-fac-note')?.value.trim();
//     const spaces = collectSpacesFromWizard(); // Hàm này giữ nguyên như cũ

//     if (!name || !address) {
//         alert('Thiếu thông tin cơ sở');
//         setAddFacilityStep(1);
//         return;
//     }
//     if (!spaces.length) {
//         alert('Thêm ít nhất một không gian có Tên/Mã');
//         return;
//     }

//     // Gói dữ liệu gửi lên Backend
//     const payload = {
//         name: name,
//         address: address,
//         description: note,
//         image: addFacilityDraft.imageDataUrl || '',
//         spaces: spaces // Mảng các không gian người dùng vừa nhập
//     };

//     try {
//         const token = localStorage.getItem('token');

//         // GỌI API POST ĐỂ TẠO MỚI (Backend của bạn đang thiếu hàm này)
//         const response = await fetch('/api/hosts/branches', {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(payload)
//         });

//         const data = await response.json();

//         if (response.ok) {
//             alert(`Đã tạo cơ sở "${name}" thành công!`);
//             // Tải lại DB ngay sau khi save để lấy ID thật từ MongoDB
//             loadHostFacilitiesFromDB();
//             showHostSpaceLayer('space-mgr-layer-1');
//         } else {
//             alert(data.error || 'Lỗi khi lưu dữ liệu lên máy chủ.');
//         }
//     } catch (error) {
//         console.error("❌ Lỗi khi gửi dữ liệu tạo cơ sở:", error);
//     }
// }

// // Gắn hàm lưu vào nút hoàn tất (bạn tìm dòng này trong mã cũ và đổi tên hàm nhé)
// // Ví dụ: <button onclick="saveNewFacilityToDB()">Hoàn tất</button>