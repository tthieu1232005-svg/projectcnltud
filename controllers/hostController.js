const HostProfile = require('../models/Host_Profile');
const Branch = require('../models/Branch');
const Space = require('../models/Space');
const Booking = require('../models/Booking');
const ExcelJS = require('exceljs');
const PaymentHistory = require('../models/Payment_History');

function sendServerError(res, error) {
  console.error(error);
  return res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại sau.' });
}

async function getHostProfile(req, res) {
  try {
    const hostId = req.user.id || req.user._id || req.user.userId;
    if (!hostId) return res.status(400).json({ error: 'Thiếu hostId.' });

    const profile = await HostProfile.findOne({
      $or: [{ UserID: hostId }, { userID: hostId }]
    }).lean();
    
    if (!profile) return res.status(404).json({ error: 'Hồ sơ chủ cơ sở không tìm thấy.' });
    return res.json({ profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

async function updateHostProfile(req, res) {
  try {
    const hostId = req.user.id || req.user._id || req.user.userId;
    if (!hostId) return res.status(400).json({ error: 'Thiếu hostId.' });

    const update = req.body;
    const profile = await HostProfile.findOneAndUpdate(
      { $or: [{ UserID: hostId }, { userID: hostId }] },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ message: 'Cập nhật hồ sơ chủ cơ sở thành công.', profile });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// TỐI ƯU HÓA: LẤY DANH SÁCH CHI NHÁNH & KHÔNG GIAN
// ==========================================
async function getHostBranches(req, res) {
  try {
    const hostId = req.user.id || req.user._id || req.user.userId; 

    const branches = await Branch.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    }).lean();
    
    return res.json({ branches });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// TỐI ƯU HÓA: LẤY DANH SÁCH KHÔNG GIAN THEO HOST
// ==========================================
async function getHostSpaces(req, res) {
  try {
    const hostId = req.user.id || req.user._id || req.user.userId; 

    const branches = await Branch.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    }).select('_id').lean();
    
    const branchIds = branches.map(branch => branch._id);
    const spaces = await Space.find({
      $or: [{ BranchID: { $in: branchIds } }, { branchID: { $in: branchIds } }]
    }).lean();

    return res.json({ spaces });
  } catch (error) {
    return sendServerError(res, error);
  }
}

function formatVND(value) {
  // Format số sang định dạng tiền tệ Việt Nam, ví dụ 1000000 -> 1.000.000
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

async function buildExcelBuffer(rows, reportTotals) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Báo cáo doanh thu');

  ws.columns = [
    { header: 'Booking ID', key: 'id', width: 20 },
    { header: 'Chi nhánh', key: 'branch', width: 20 },
    { header: 'Không gian', key: 'space', width: 20 },
    { header: 'Trạng thái', key: 'status', width: 12 },
    { header: 'Ngày tạo', key: 'createdAt', width: 18 },
    { header: 'Bắt đầu', key: 'startTime', width: 18 },
    { header: 'Kết thúc', key: 'endTime', width: 18 },
    { header: 'Tổng tiền (VND)', key: 'total', width: 15 },
    { header: 'Tiền cọc (VND)', key: 'deposit', width: 15 },
    { header: 'Ghi chú', key: 'note', width: 25 }
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'center' };

  rows.forEach(row => {
    ws.addRow(row);
  });

  ws.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.getCell('total').numFmt = '#,##0';
      row.getCell('deposit').numFmt = '#,##0';
      row.alignment = { horizontal: 'left', vertical: 'center' };
    }
  });

  const summaryStartRow = rows.length + 3;
  ws.getCell(`A${summaryStartRow}`).value = 'TÓM TẮT BÁO CÁO';
  ws.getCell(`A${summaryStartRow}`).font = { bold: true, size: 12 };
  ws.getCell(`A${summaryStartRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  ws.mergeCells(`A${summaryStartRow}:B${summaryStartRow}`);

  const summaryData = [
    { label: 'Tổng giá trị giao dịch (GMV)', value: reportTotals.gmvText },
    { label: 'Tiền cọc đã thu', value: reportTotals.depositText },
    { label: 'Tổng nợ tại quầy', value: reportTotals.outstandingText },
    { label: 'Doanh thu hủy', value: reportTotals.cancelledText },
    { label: 'Tổng booking xác nhận', value: reportTotals.totalBookings }
  ];

  summaryData.forEach((item, idx) => {
    const row = summaryStartRow + 1 + idx;
    ws.getCell(`A${row}`).value = item.label;
    ws.getCell(`B${row}`).value = item.value;
    ws.getCell(`A${row}`).font = { bold: true };
    ws.getCell(`B${row}`).font = { bold: true, color: { argb: 'FF0D8B8B' } };
  });

  return await workbook.xlsx.writeBuffer();
}

async function getHostReportsPage(req, res) {
  try {
    const hostId = req.user?.userId;
    if (!hostId) {
      // Nếu người dùng chưa đăng nhập, chuyển về trang login
      return res.redirect('/login');
    }

    if (req.user?.role !== 'host') {
      // Chỉ chủ cơ sở mới được phép xem trang báo cáo
      return res.status(403).send('Chỉ chủ cơ sở mới được truy cập trang Báo cáo.');
    }

    // Lấy bộ lọc từ query string
    const { branchId, startDate, endDate } = req.query;
    const exportCsv = req.query.export === '1' || req.query.export === 'true';

    // Lấy danh sách chi nhánh của host để hiển thị bộ lọc và xác thực branchId
    const branches = await Branch.find({ HostID: hostId }).sort({ Name: 1 }).lean();
    const branchIds = branches.map(branch => String(branch._id));
    const selectedBranchId = branchIds.includes(String(branchId || '')) ? branchId : null;

    // Lấy tất cả không gian của host để lọc booking
    const hostSpaces = await Space.find({ HostID: hostId }).select('_id Name BranchID').lean();
    const spaceIds = hostSpaces.map(space => space._id);

    // Nếu chọn chi nhánh, chỉ giữ không gian của chi nhánh đó
    const filteredSpaceIds = selectedBranchId
      ? hostSpaces.filter(space => String(space.BranchID) === String(selectedBranchId)).map(space => space._id)
      : spaceIds;

    // Build bộ lọc cho booking theo SpaceID và theo ngày tạo booking nếu có
    const bookingFilter = {
      SpaceID: { $in: filteredSpaceIds.length ? filteredSpaceIds : [] }
    };

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      bookingFilter.createdAt = { ...bookingFilter.createdAt, $gte: start };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      bookingFilter.createdAt = { ...bookingFilter.createdAt, $lte: end };
    }

    // Tải booking phù hợp filter, đồng thời điền thông tin không gian (SpaceID)
    const allBookings = filteredSpaceIds.length
      ? await Booking.find(bookingFilter).populate({ path: 'SpaceID', select: 'Name BranchID' }).sort({ createdAt: -1 }).lean()
      : [];

    // Phân loại booking theo trạng thái để tính báo cáo
    const successfulBookings = allBookings.filter(booking => ['confirmed', 'completed'].includes(booking.Status));
    const cancelledBookings = allBookings.filter(booking => booking.Status === 'cancelled');

    // Tính tổng các chỉ số chính
    const totalGross = successfulBookings.reduce((sum, booking) => sum + Number(booking.TotalAmount || 0), 0);
    const totalDeposit = successfulBookings.reduce((sum, booking) => sum + Number(booking.DepositAmount || 0), 0);
    const totalOutstanding = totalGross - totalDeposit;
    const cancelledRevenue = cancelledBookings.reduce((sum, booking) => sum + Number(booking.TotalAmount || 0), 0);

    // Tạo map để tra branch name nhanh khi cần hiển thị hoặc export
    const branchMap = branches.reduce((map, branch) => {
      map[String(branch._id)] = branch.Name;
      return map;
    }, {});

    // Tính thống kê hiệu suất từng không gian
    const spaceStats = hostSpaces.reduce((map, space) => {
      const key = String(space._id);
      map[key] = {
        id: key,
        name: space.Name,
        branchName: branchMap[String(space.BranchID)] || 'Không rõ',
        count: 0,
        revenue: 0
      };
      return map;
    }, {});

    allBookings.forEach(booking => {
      const space = booking.SpaceID;
      const key = String(space?._id || '');
      if (!spaceStats[key]) return;
      spaceStats[key].count += 1;
      spaceStats[key].revenue += Number(booking.TotalAmount || 0);
    });

    const maxBookingCount = Math.max(...Object.values(spaceStats).map(item => item.count), 1);
    const performanceRows = Object.values(spaceStats)
      .filter(item => item.count > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((item, index) => ({
        rank: index + 1,
        spaceName: item.name,
        branchName: item.branchName,
        bookings: item.count,
        fillRate: Math.round((item.count / maxBookingCount) * 100),
        revenueText: formatVND(item.revenue)
      }));

    // Dữ liệu gửi vào view để hiển thị các số liệu
    const reportTotals = {
      gmvText: formatVND(totalGross),
      depositText: formatVND(totalDeposit),
      outstandingText: formatVND(totalOutstanding),
      cancelledText: formatVND(cancelledRevenue),
      totalBookings: successfulBookings.length,
      totalSpaces: filteredSpaceIds.length,
      selectedBranchName: selectedBranchId ? branchMap[String(selectedBranchId)] : 'Tất cả chi nhánh'
    };

    // Tạo URL cho export và navigation giữ nguyên filter
    const queryParts = [];
    if (selectedBranchId) queryParts.push(`branchId=${encodeURIComponent(selectedBranchId)}`);
    if (startDate) queryParts.push(`startDate=${encodeURIComponent(startDate)}`);
    if (endDate) queryParts.push(`endDate=${encodeURIComponent(endDate)}`);
    const reportUrl = '/host/reports' + (queryParts.length ? `?${queryParts.join('&')}` : '');
    const exportUrl = reportUrl + (queryParts.length ? '&export=1' : '?export=1');

    if (exportCsv) {
      // Nếu xuất Excel nhưng không có dữ liệu, trả về thông báo lỗi JSON
      if (allBookings.length === 0) {
        return res.status(400).json({ 
          error: 'Hiện chưa có dữ liệu báo cáo!' 
        });
      }

      const rows = allBookings.map(booking => ({
        id: String(booking._id),
        branch: branchMap[String(booking.SpaceID?.BranchID)] || 'Không rõ',
        space: booking.SpaceID?.Name || 'Không rõ',
        status: booking.Status,
        createdAt: booking.createdAt ? new Date(booking.createdAt).toLocaleString('vi-VN') : '',
        startTime: booking.StartTime ? new Date(booking.StartTime).toLocaleString('vi-VN') : '',
        endTime: booking.EndTime ? new Date(booking.EndTime).toLocaleString('vi-VN') : '',
        total: Number(booking.TotalAmount || 0),
        deposit: Number(booking.DepositAmount || 0),
        note: booking.Note || ''
      }));

      const excelBuffer = await buildExcelBuffer(rows, reportTotals);
      const fileName = `workhub-host-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.send(excelBuffer);
    }

    // Render trang báo cáo với dữ liệu và URL export đã tạo
    return res.render('host/reports', {
      branches,
      filters: {
        branchId: selectedBranchId,
        startDate: startDate || '',
        endDate: endDate || ''
      },
      reportTotals,
      performanceRows,
      exportUrl,
      scripts: '<script src="/js/host-spaces.js"></script>'
    });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// TỐI ƯU HÓA: LẤY DANH SÁCH ĐƠN ĐẶT CHỖ
// ==========================================
async function getHostBookings(req, res) {
  try {
    // Tự động chốt đơn hết giờ
    const currentTime = new Date();
    await Booking.updateMany(
      { 
        $or: [{ Status: 'in-use' }, { status: 'in-use' }],
        $or: [{ EndTime: { $lt: currentTime } }, { endTime: { $lt: currentTime } }]
      },
      { $set: { Status: 'completed', status: 'completed' } },
      { strict: false }
    );

    const hostId = req.user.id || req.user._id || req.user.userId; 
    const bookings = await Booking.find({
      $or: [{ HostID: hostId }, { hostID: hostId }]
    })
    .populate({ path: 'CustomerID', select: 'email Email FullName', strictPopulate: false })
    .populate({
      path: 'SpaceID',
      select: 'Name Name name SpaceName spaceName SpaceCode Space_Code space_code Space_code SpaceCode_code code spaceCode spaceCode',
      populate: { path: 'BranchID', select: 'Name name' }
    })
    .sort({ createdAt: -1 })
    .lean();

    return res.json({ bookings });
  } catch (error) {
    return sendServerError(res, error);
  }
}

// ==========================================
// CÁC HÀM HÀNH ĐỘNG CỦA HOST
// ==========================================

async function confirmBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    const currentStatus = booking.Status || booking.status;
    if (currentStatus !== 'pending') {
      return res.status(400).json({ error: 'Đơn hàng này không ở trạng thái chờ xác nhận.' });
    }

    // FIX: Dùng updateOne chọc thẳng vào DB, bỏ qua Mongoose Validation
    await Booking.updateOne(
      { _id: bookingId },
      { $set: { Status: 'confirmed', status: 'confirmed' } }
    );

    const total = booking.TotalAmount || booking.totalAmount || 0;
    const deposit = booking.DepositAmount || 0;
    
    let amountReceived = deposit;
    let paymentType = 'deposit';

    if (booking.percentagePaid !== undefined) {
      amountReceived = (total * booking.percentagePaid) / 100;
      paymentType = booking.percentagePaid === 100 ? 'full_payment' : 'deposit';
    } else {
      paymentType = deposit >= total ? 'full_payment' : 'deposit';
    }

    // Bọc try-catch riêng cho PaymentHistory để không làm sập tiến trình duyệt đơn
    try {
      await PaymentHistory.create({
        BookingID: booking._id,
        CustomerID: booking.CustomerID || booking.customerID,
        HostID: booking.HostID || booking.hostID,
        TransactionCode: `TXN-CONFIRM-${Math.floor(Math.random() * 100000)}`, // Tạo mã giao dịch ngẫu nhiên
        Amount: amountReceived,
        PaymentType: paymentType,
        PaymentMethod: 'bank_transfer',
        Status: 'successful'
      });
      console.log('✅ Đã ghi nhận lịch sử thanh toán thành công!');
    } catch (paymentErr) {
      console.log('⚠️ Lưu ý: Không thể ghi nhận lịch sử thanh toán:', paymentErr.message);
    }
    
    if (global.io) {
        // Phát tín hiệu mang tên 'booking_status_updated' kèm data
        global.io.emit('booking_status_updated', {
            bookingId: bookingId,
            newStatus: 'confirmed'
        });
    }
    
    return res.status(200).json({ message: 'Xác nhận đơn hàng thành công.' });

  } catch (error) {
    return sendServerError(res, error);
  }
}

/**
 * Host xác nhận khách đến nhận phòng (Chuyển sang in-use)
 */
async function checkinBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    const currentStatus = booking.Status || booking.status;
    if (currentStatus !== 'confirmed') {
      return res.status(400).json({ error: 'Chỉ có thể nhận phòng với đơn đã được xác nhận.' });
    }

    // Đảm bảo số tiền được ép kiểu về dạng số
    const total = Number(booking.TotalAmount || booking.totalAmount || 0);

    // BẬT BÙA HỘ MỆNH: strict: false giúp bỏ qua mọi rào cản của Schema
    await Booking.updateOne(
      { _id: bookingId },
      { 
        $set: { 
          Status: 'in-use', 
          status: 'in-use',
          DepositAmount: total,       
          depositAmount: total,
          percentagePaid: 100         
        } 
      },
      { strict: false } 
    );
    
    if (global.io) {
        // Sửa newStatus thành in-use
        global.io.emit('booking_status_updated', {
            bookingId: bookingId,
            newStatus: 'in-use' 
        });
    }
    
    return res.status(200).json({ message: 'Nhận phòng thành công. Hệ thống đã ghi nhận thu đủ 100% tiền!' });
  } catch (error) {
    // In lỗi chi tiết ra Terminal màu đen
    console.error("LỖI CHECK-IN THỰC SỰ LÀ:", error);
    
    // TRẢ THẲNG MÃ LỖI RA GIAO DIỆN ĐỂ BẮT BỆNH, BỎ QUA HÀM CỦA HỆ THỐNG
    return res.status(500).json({ error: `Chi tiết lỗi Server: ${error.message}` });
  }
}

async function cancelBooking(req, res) {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });

    const currentStatus = booking.Status || booking.status;
    
    // Cho phép hủy cả đơn 'pending' (Host từ chối) VÀ đơn 'confirmed' (Khách vắng mặt)
    if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
      return res.status(400).json({ error: 'Chỉ có thể hủy đơn đang chờ hoặc đơn đã xác nhận.' });
    }

    await Booking.updateOne(
      { _id: bookingId },
      { $set: { Status: 'cancelled', status: 'cancelled' } }
    );
    
    if (global.io) {
        // Sửa newStatus thành cancelled
        global.io.emit('booking_status_updated', {
            bookingId: bookingId,
            newStatus: 'cancelled'
        });
    }
    
    return res.status(200).json({ message: 'Đã hủy đơn hàng thành công.' });
  } catch (error) {
    return sendServerError(res, error);
  }
}

module.exports = {
  getHostProfile,
  updateHostProfile,
  getHostBranches,
  getHostSpaces,
  getHostBookings,
  confirmBooking, 
  cancelBooking,
  checkinBooking  
};