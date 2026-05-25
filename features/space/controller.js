const Space = require('../../models/Space');

exports.createSpace = async (req, res) => {
    try {
        const { BranchID, SpaceCode, Type, PricePerHour, Status } = req.body;
        const newSpace = new Space({
            BranchID,
            SpaceCode,
            Type,
            PricePerHour,
            Status: Status || 'available'
        });
        await newSpace.save();
        res.status(201).json({ message: "Tạo Không gian thành công!", data: newSpace });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.getAllSpaces = async (req, res) => {
    try {
        // Liên kết dữ liệu tự động hiển thị kèm tên và địa chỉ của Chi nhánh
        const spaces = await Space.find().populate('BranchID', 'Name Address');
        res.json(spaces);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};