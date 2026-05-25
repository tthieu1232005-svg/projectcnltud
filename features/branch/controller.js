const Branch = require('../../models/Branch');

exports.createBranch = async (req, res) => {
    try {
        // Hệ thống tự lấy id của Host từ Token đã giải mã nạp vào database
        const newBranch = new Branch({
            ...req.body,
            HostID: req.user.id 
        });
        await newBranch.save();
        res.status(201).json({ message: "Tạo Chi nhánh thành công!", data: newBranch });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getAllBranches = async (req, res) => {
    try {
        const branches = await Branch.find({ HostID: req.user.id });
        res.json(branches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};