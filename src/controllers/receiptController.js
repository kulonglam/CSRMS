// Receipt Controller
const { query } = require('../config/database');
const PDFDocument = require('pdfkit');

const getReceipts = async (req, res) => {
  try {
    const { sale_id, branch_id, start_date, end_date } = req.query;

    let sql = `
      SELECT 
        s.id, s.receipt_number, s.branch_id, b.name as branch_name,
        s.sales_agent_id, u.full_name as agent_name, s.total_amount, 
        s.amount_paid, s.change_given, s.status, s.sale_date, s.created_at
      FROM sales s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN users u ON s.sales_agent_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (sale_id) {
      sql += ` AND s.id = $${paramCount++}`;
      params.push(sale_id);
    }
    if (branch_id) {
      sql += ` AND s.branch_id = $${paramCount++}`;
      params.push(branch_id);
    }
    if (start_date) {
      sql += ` AND s.sale_date >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      sql += ` AND s.sale_date <= $${paramCount++}`;
      params.push(end_date);
    }

    sql += ' ORDER BY s.created_at DESC';

    const result = await query(sql, params);

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const getReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    // Get sale details
    const saleResult = await query(
      `
      SELECT 
        s.id, s.receipt_number, s.branch_id, b.name as branch_name, b.location,
        s.sales_agent_id, u.full_name as agent_name, s.total_amount, 
        s.amount_paid, s.change_given, s.status, s.sale_date, s.created_at
      FROM sales s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN users u ON s.sales_agent_id = u.id
      WHERE s.id = $1
      `,
      [id]
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sale/receipt not found',
      });
    }

    // Get sale items
    const itemsResult = await query(
      `
      SELECT 
        si.id, si.product_id, p.name as product_name, si.quantity,
        si.unit_price, si.subtotal
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = $1
      `,
      [id]
    );

    const receipt = saleResult.rows[0];
    receipt.items = itemsResult.rows;

    res.status(200).json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const downloadReceiptPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get sale and items
    const saleResult = await query(
      `
      SELECT 
        s.id, s.receipt_number, s.branch_id, b.name as branch_name, b.location,
        s.sales_agent_id, u.full_name as agent_name, s.total_amount, 
        s.amount_paid, s.change_given, s.sale_date, s.created_at
      FROM sales s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN users u ON s.sales_agent_id = u.id
      WHERE s.id = $1
      `,
      [id]
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found',
      });
    }

    const itemsResult = await query(
      `
      SELECT 
        si.product_id, p.name as product_name, si.quantity,
        si.unit_price, si.subtotal
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = $1
      ORDER BY si.id
      `,
      [id]
    );

    const sale = saleResult.rows[0];
    const items = itemsResult.rows;

    // Create PDF
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${sale.receipt_number}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('RECEIPT', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(sale.branch_name, { align: 'center' });
    doc.text(sale.location, { align: 'center' });
    doc.moveDown(0.5);

    // Receipt details
    doc.fontSize(9).text(`Receipt #: ${sale.receipt_number}`);
    doc.text(`Date: ${new Date(sale.created_at).toLocaleString()}`);
    doc.text(`Cashier: ${sale.agent_name}`);
    doc.moveDown(0.5);

    // Items table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Item', 40, tableTop);
    doc.text('Qty', 280, tableTop, { width: 40, align: 'right' });
    doc.text('Price', 330, tableTop, { width: 60, align: 'right' });
    doc.text('Total', 400, tableTop, { width: 80, align: 'right' });

    // Items
    doc.font('Helvetica').fontSize(8);
    let yPosition = tableTop + 20;

    items.forEach((item) => {
      doc.text(item.product_name.substring(0, 30), 40, yPosition);
      doc.text(item.quantity.toString(), 280, yPosition, { width: 40, align: 'right' });
      doc.text(`USh${parseFloat(item.unit_price).toFixed(2)}`, 330, yPosition, { width: 60, align: 'right' });
      doc.text(`USh${parseFloat(item.subtotal).toFixed(2)}`, 400, yPosition, { width: 80, align: 'right' });
      yPosition += 15;
    });

    // Summary
    doc.moveTo(40, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Total Amount:', 280, yPosition, { width: 120, align: 'right' });
    doc.text(`USh${parseFloat(sale.total_amount).toFixed(2)}`, 400, yPosition, { width: 80, align: 'right' });
    yPosition += 20;

    doc.font('Helvetica').fontSize(9);
    doc.text('Amount Paid:', 280, yPosition, { width: 120, align: 'right' });
    doc.text(`USh${parseFloat(sale.amount_paid).toFixed(2)}`, 400, yPosition, { width: 80, align: 'right' });
    yPosition += 15;

    doc.text('Change Given:', 280, yPosition, { width: 120, align: 'right' });
    doc.text(`USh${parseFloat(sale.change_given).toFixed(2)}`, 400, yPosition, { width: 80, align: 'right' });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).text('Thank you for your purchase!', { align: 'center' });
    doc.text('© Crown Stores. All rights reserved.', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

const printReceipt = async (req, res) => {
  try {
    const { id } = req.params;

    // Get receipt data
    const saleResult = await query(
      `
      SELECT 
        s.id, s.receipt_number, s.branch_id, b.name as branch_name,
        s.sales_agent_id, u.full_name as agent_name, s.total_amount, 
        s.amount_paid, s.change_given, s.created_at
      FROM sales s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN users u ON s.sales_agent_id = u.id
      WHERE s.id = $1
      `,
      [id]
    );

    if (saleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found',
      });
    }

    // Log print action
    await query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES ($1, $2, $3, $4)',
      [req.user.id, 'PRINT_RECEIPT', 'sales', id]
    );

    res.status(200).json({
      success: true,
      message: 'Receipt marked for printing',
      data: saleResult.rows[0],
    });
  } catch (error) {
    console.error('Print receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getReceipts,
  getReceipt,
  downloadReceiptPDF,
  printReceipt,
};
