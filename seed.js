const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const CustomerProfile = require('./models/customer_Profile');
const HostProfile = require('./models/host_Profile');
const Branch = require('./models/Branch');
const Space = require('./models/Space');
const Booking = require('./models/Booking');
const PaymentHistory = require('./models/Payment_History');
const Review = require('./models/Review');

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI;

  await mongoose.connect(MONGODB_URI, { autoIndex: true });

  console.log('1. Đang xóa dữ liệu cũ...');
  await mongoose.connection.dropDatabase();

  console.log('2. Đang tạo Users...');
  const rawPassword = '123456';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const users = await User.insertMany([
    { Email: 'customer1@example.com', PasswordHash: passwordHash, FullName: 'Nguyễn Văn A', Role: 'customer', Status: 'active' },
    { Email: 'customer2@example.com', PasswordHash: passwordHash, FullName: 'Trần Thị B', Role: 'customer', Status: 'active' },
    { Email: 'host1@example.com', PasswordHash: passwordHash, FullName: 'Trần Thị Mạnh', Role: 'host', Status: 'active' },
  ]);

  const customer1 = users[0];
  const customer2 = users[1];
  const host1 = users[2];

  console.log('3. Đang tạo Profiles...');
  await CustomerProfile.insertMany([
    { 
      UserID: customer1._id, Phone: '0900000001', Description: 'Khách hàng 1',
      BankName: 'Vietcombank', BankNumber: '1111111111'
    },
    { 
      UserID: customer2._id, Phone: '0900000002', Description: 'Khách hàng 2',
      BankName: 'TPBank', BankNumber: '2222222222'
    }
  ]);

  await HostProfile.create({
    UserID: host1._id,
    CompanyName: 'WorkHub HQ',
    Hotline: '0911111111',
    IsVerified: true,
    TaxCode: 'TAXCODE-HOST-0001',
    BankName: 'BIDV',
    BankNumber: '4444444444'
  });

  console.log('4. Đang tạo Branches & Spaces...');
  const branch1 = await Branch.create({
    HostID: host1._id, Name: 'Chi nhánh Trung Tâm', Address: '12 Nguyễn Trãi', District: 'Quận 5', City: 'TP.HCM',
    OpeningTime: '08:00', ClosingTime: '17:30', DepositPercentage: 0.3, Status: 'active'
  });
  
  const branch2 = await Branch.create({
    HostID: host1._id, Name: 'Chi nhánh Khu Công Nghệ', Address: '88 Lê Lợi', District: 'Quận 1', City: 'TP.HCM',
    OpeningTime: '09:00', ClosingTime: '18:00', DepositPercentage: 0.25, Status: 'active'
  });

  const spaces = await Space.insertMany([
    { BranchID: branch1._id, HostID: host1._id, SpaceCode: 'B1-01', Name: 'Phòng họp 10 người', PricePerHour: 150000, Status: 'available' },
    { BranchID: branch1._id, HostID: host1._id, SpaceCode: 'B1-02', Name: 'Bàn làm việc yên tĩnh', PricePerHour: 50000, Status: 'available' },
    { BranchID: branch2._id, HostID: host1._id, SpaceCode: 'B2-01', Name: 'Phòng họp 6 người', PricePerHour: 100000, Status: 'available' }
  ]);

  console.log('5. Đang tạo Bookings đa dạng kịch bản...');
  const now = new Date();
  
  const addHours = (date, h) => new Date(date.getTime() + h * 3600000);
  const addMinutes = (date, m) => new Date(date.getTime() + m * 60000);

  const bookingsPayload = [
    // [TEST CASE 1] Pending: Chờ duyệt
    {
      CustomerID: customer1._id, SpaceID: spaces[0]._id, HostID: host1._id,
      Status: 'pending', TotalAmount: 300000, DepositAmount: 0, percentagePaid: 0,
      StartTime: addHours(now, 24), EndTime: addHours(now, 26), Note: 'Test chờ duyệt'
    },
    // [TEST CASE 2] Confirmed: Chờ khách đến nhận phòng
    {
      CustomerID: customer1._id, SpaceID: spaces[1]._id, HostID: host1._id,
      Status: 'confirmed', TotalAmount: 100000, DepositAmount: 50000, percentagePaid: 50,
      StartTime: addHours(now, 2), EndTime: addHours(now, 5), Note: 'Test chờ check-in'
    },
    // [TEST CASE 3] In-use (Sắp hết giờ): Test đếm ngược nhấp nháy đỏ (< 15p)
    {
      CustomerID: customer1._id, SpaceID: spaces[2]._id, HostID: host1._id,
      Status: 'in-use', TotalAmount: 200000, DepositAmount: 200000, percentagePaid: 100,
      StartTime: addHours(now, -1), EndTime: addMinutes(now, 10), Note: 'Test countdown < 15p'
    },
    // [TEST CASE 4] In-use (Quá giờ): Test tự động chốt đơn
    {
      CustomerID: customer1._id, SpaceID: spaces[0]._id, HostID: host1._id,
      Status: 'in-use', TotalAmount: 450000, DepositAmount: 450000, percentagePaid: 100,
      StartTime: addHours(now, -3), EndTime: addMinutes(now, -30), Note: 'Test quá giờ tự chốt'
    },
    // [TEST CASE 5] Completed (Chưa đánh giá): Test nút HÃY ĐÁNH GIÁ NGAY
    {
      CustomerID: customer1._id, SpaceID: spaces[1]._id, HostID: host1._id,
      Status: 'completed', TotalAmount: 150000, DepositAmount: 150000, percentagePaid: 100,
      StartTime: addHours(now, -26), EndTime: addHours(now, -24), Note: 'Test nút Hãy đánh giá'
    },
    // [TEST CASE 6] Completed (Đã đánh giá): Test nút Sửa đánh giá (nếu < 7 ngày)
    {
      CustomerID: customer1._id, SpaceID: spaces[2]._id, HostID: host1._id,
      Status: 'completed', TotalAmount: 300000, DepositAmount: 300000, percentagePaid: 100,
      StartTime: addHours(now, -74), EndTime: addHours(now, -72), Note: 'Test sửa review'
    },
    // [TEST CASE 7] Cancelled: Đơn bị hủy (Khách 2 đặt)
    {
      CustomerID: customer2._id, SpaceID: spaces[0]._id, HostID: host1._id,
      Status: 'cancelled', TotalAmount: 150000, DepositAmount: 0, percentagePaid: 0,
      StartTime: addHours(now, -10), EndTime: addHours(now, -8), Note: 'Test đơn bị hủy'
    }
  ];

  const createdBookings = await Booking.insertMany(bookingsPayload);

  console.log('6. Đang tạo Review...');
  await Review.create({
    CustomerID: customer1._id,
    SpaceID: spaces[2]._id,
    BookingID: createdBookings[5]._id, // Ứng với TEST CASE 6
    Rating: 5,
    Comment: 'Dịch vụ rất tốt, phòng sạch sẽ và yên tĩnh!'
  });

  console.log('7. Đang tạo Payment History...');
  const validBookings = createdBookings.filter(b => b.Status !== 'pending' && b.Status !== 'cancelled');
  await PaymentHistory.insertMany(validBookings.map((b, index) => ({
    BookingID: b._id,
    CustomerID: b.CustomerID,
    HostID: b.HostID,
    TransactionCode: `TXN-SEED-${1000 + index}`,
    Amount: b.DepositAmount,
    Status: 'successful',
    PaymentType: 'deposit',
    PaymentMethod: 'bank_transfer'
  })));

  console.log('====================================');
  console.log('✅ SEED THÀNH CÔNG! DỮ LIỆU SẴN SÀNG.');
  console.log(`- Users: ${await User.countDocuments()}`);
  console.log(`- Branches: ${await Branch.countDocuments()}`);
  console.log(`- Spaces: ${await Space.countDocuments()}`);
  console.log(`- Bookings: ${await Booking.countDocuments()}`);
  console.log(`- Reviews: ${await Review.countDocuments()}`);
  console.log('====================================');

  process.exit(0);
}

seed().catch(err => {
  console.error('LỖI SEED:', err);
  process.exit(1);
});