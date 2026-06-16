const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { connectDB } = require("./config/db");
const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const hostRoutes = require("./routes/hostRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Kết nối MongoDB ---
connectDB()
  .then(() => {
    console.log("✅ MongoDB connected, starting server...");
    app.listen(PORT, () => {
      console.log(`🚀 WorkHub Server đang chạy tại: http://localhost:${PORT}`);
      console.log(`👉 Bấm Ctrl + Click vào link để mở trình duyệt.`);
    });
  })
  .catch((err) => {
    console.error("❌ Không thể kết nối MongoDB, server không khởi động:", err);
    process.exit(1);
  });

// --- Tài nguyên tĩnh ---
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// --- Middleware xử lý dữ liệu ---
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/hosts", hostRoutes);
app.use("/api/admin", adminRoutes);

// --- View Engine ---
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

// ================================================================
// MIDDLEWARE XÁC THỰC JWT CHO HOST
// Project dùng JWT (không phải session).
// Frontend sau khi login nhận được token, cần lưu vào cookie tên "token"
// để middleware này đọc được khi vào các trang /host/*
//
// Ví dụ frontend lưu cookie sau khi login thành công:
//   document.cookie = `token=${data.token}; path=/`;
// ================================================================
async function requireHostAuth(req, res, next) {
  try {
    // Đọc token từ cookie "token" (ưu tiên) hoặc header Authorization
    let token = null;

    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) return res.redirect("/login");

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "workhub_fallback_secret_key_2026",
    );

    // Lấy user từ DB để có đầy đủ thông tin (_id, FullName, Role...)
    const user = await User.findById(decoded.userId).lean();
    if (!user) return res.redirect("/login");

    req.currentUser = user; // truyền xuống view qua res.render
    next();
  } catch (err) {
    // Token hết hạn hoặc không hợp lệ → về trang login
    return res.redirect("/login");
  }
}

// --- Luồng Khách hàng (Customer) ---
app.get("/", (req, res) =>
  res.render("customer/home", {
    scripts: '<script src="/js/customer-main.js"></script>',
  }),
);
app.get("/search", (req, res) =>
  res.render("customer/search", {
    scripts: '<script src="/js/customer-main.js"></script>',
  }),
);
app.get("/detail", (req, res) =>
  res.render("customer/detail", {
    scripts: '<script src="/js/customer-main.js"></script>',
  }),
);
app.get("/payment", (req, res) =>
  res.render("customer/payment", {
    scripts: '<script src="/js/customer-main.js"></script>',
  }),
);
app.get("/history", (req, res) =>
  res.render("customer/history", {
    scripts: '<script src="/js/customer-main.js"></script>',
  }),
);
app.get("/payment_history", (req, res) =>
  res.render("customer/payment_history", {
    scripts: '<script src="/js/customer-main.js"></script>',
  }),
);
app.get("/profile", (req, res) =>
  res.render("customer/profile", {
    scripts: '<script src="/js/customer-main.js"></script>',
  }),
);

// --- Luồng dùng chung ---
app.get("/login", (req, res) => res.render("customer/login"));
app.get("/register", (req, res) => res.render("customer/register"));

// --- Luồng Chủ cơ sở (Host) — bảo vệ bằng JWT ---

// Tìm đến khu vực luồng Chủ cơ sở (Host) trong server.js của bạn và sửa thành:

const paymentRoutes = require("./routes/paymentRoutes"); // Đường dẫn tùy thuộc cấu trúc thư mục của bạn

// Đăng ký route thanh toán sử dụng middleware bảo vệ
app.use("/host", requireHostAuth, paymentRoutes);

app.get("/host/profile", requireHostAuth, (req, res) =>
  res.render("host/profile", {
    currentUser: req.currentUser,
    scripts: '<script src="/js/host-spaces.js"></script>',
  }),
);
app.get("/host/dashboard", requireHostAuth, (req, res) =>
  res.render("host/dashboard", {
    currentUser: req.currentUser,
    scripts: '<script src="/js/host-spaces.js"></script>',
  }),
);
app.get("/host/spaces", requireHostAuth, (req, res) =>
  res.render("host/spaces", {
    currentUser: req.currentUser,
    scripts: '<script src="/js/host-spaces.js"></script>',
  }),
);
app.get("/host/bookings", requireHostAuth, (req, res) =>
  res.render("host/bookings", {
    currentUser: req.currentUser,
    scripts: '<script src="/js/host-spaces.js"></script>',
  }),
);
app.get("/host/reports", requireHostAuth, (req, res) =>
  res.render("host/reports", {
    currentUser: req.currentUser,
    scripts: '<script src="/js/host-spaces.js"></script>',
  }),
);

// --- Admin ---
app.get("/admin/dashboard", (req, res) =>
  res.render("admin/dashboard", {
    scripts: '<script src="/js/admin-main.js"></script>',
  }),
);

// --- Middleware xử lý lỗi ---
app.use((err, req, res, next) => {
  console.error("❌ Lỗi server:", err);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Đã xảy ra lỗi server",
  });
});
