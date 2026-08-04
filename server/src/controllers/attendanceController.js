const { AttendanceRecord, Student, Laboratory, Session } = require('../models');
const fastCsv = require('fast-csv');
const PDFDocument = require('pdfkit');

exports.getAttendance = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.labId) filter.labId = req.query.labId;
    if (req.query.date) {
      const date = new Date(req.query.date);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }
    if (req.query.studentId) filter.studentId = req.query.studentId;

    const records = await AttendanceRecord.find(filter)
      .populate('studentId', 'fullName matricNumber department level')
      .populate('labId', 'name location')
      .populate('sessionId', 'courseCode loginMethod startTime endTime')
      .sort({ date: -1, checkInTime: -1 });

    res.json({ records, count: records.length });
  } catch (error) {
    next(error);
  }
};

exports.exportCSV = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.labId) filter.labId = req.query.labId;
    if (req.query.date) {
      const date = new Date(req.query.date);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');

    const csvStream = fastCsv.format({ headers: true });
    csvStream.pipe(res);

    const cursor = AttendanceRecord.find(filter)
      .populate('studentId', 'fullName matricNumber department')
      .populate('labId', 'name')
      .cursor();

    for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
      csvStream.write({
        Date: new Date(doc.date).toISOString().split('T')[0],
        StudentName: doc.studentId?.fullName || 'Guest',
        MatricNumber: doc.studentId?.matricNumber || 'N/A',
        Department: doc.studentId?.department || 'N/A',
        Lab: doc.labId?.name || 'N/A',
        CheckIn: doc.checkInTime?.toISOString() || '',
        CheckOut: doc.checkOutTime?.toISOString() || '',
        Status: doc.status,
      });
    }
    csvStream.end();
  } catch (error) {
    next(error);
  }
};

exports.exportPDF = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.labId) filter.labId = req.query.labId;
    if (req.query.date) {
      const date = new Date(req.query.date);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const records = await AttendanceRecord.find(filter)
      .populate('studentId', 'fullName matricNumber department')
      .populate('labId', 'name')
      .sort({ checkInTime: 1 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.pdf');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(10);
    const headers = ['Date', 'Student Name', 'Matric #', 'Lab', 'Check In', 'Check Out', 'Status'];
    const columnWidths = [80, 120, 80, 80, 120, 120, 60];
    let y = doc.y;

    headers.forEach((h, i) => {
      let x = 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.font('Helvetica-Bold').text(h, x, y, { width: columnWidths[i] });
    });

    doc.moveDown();
    doc.font('Helvetica');

    for (const record of records) {
      y = doc.y;
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      const row = [
        new Date(record.date).toISOString().split('T')[0],
        (record.studentId?.fullName || 'Guest').substring(0, 20),
        (record.studentId?.matricNumber || 'N/A').substring(0, 15),
        (record.labId?.name || 'N/A').substring(0, 15),
        record.checkInTime?.toISOString().substring(0, 19) || '',
        record.checkOutTime?.toISOString().substring(0, 19) || '',
        record.status,
      ];
      row.forEach((cell, i) => {
        let x = 50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(cell || '', x, y, { width: columnWidths[i] });
      });
      doc.moveDown();
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

exports.manualOverride = async (req, res, next) => {
  try {
    const record = await AttendanceRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Attendance record not found' });

    record.status = req.body.status || record.status;
    record.checkOutTime = req.body.checkOutTime || record.checkOutTime;
    record.verifiedBy = 'manual';
    await record.save();

    res.json({ record });
  } catch (error) {
    next(error);
  }
};