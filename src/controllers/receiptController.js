const { query } = require('../config/database');
const PDFDocument = require('pdfkit');
const { assertSaleAccess } = require('../utils/branchAccess');

function formatUgCurrency(amount) {
  return `USh ${Math.round(parseFloat(amount) || 0).toLocaleString('en-UG')}`;
}

const downloadReceiptPDF = async (req, res) => {
  try {
    const { id } = req.params;

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

    assertSaleAccess(req.user, saleResult.rows[0]);

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

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${sale.receipt_number}.pdf"`);

    doc.pipe(res);

    doc.fontSize(18).font('Helvetica-Bold').text('RECEIPT', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(sale.branch_name, { align: 'center' });
    doc.text(sale.location, { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(9).text(`Receipt #: ${sale.receipt_number}`);
    doc.text(`Date: ${new Date(sale.created_at).toLocaleString()}`);
    doc.text(`Cashier: ${sale.agent_name}`);
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Item', 40, tableTop);
    doc.text('Qty', 280, tableTop, { width: 40, align: 'right' });
    doc.text('Price', 330, tableTop, { width: 60, align: 'right' });
    doc.text('Total', 400, tableTop, { width: 80, align: 'right' });

    doc.font('Helvetica').fontSize(8);
    let yPosition = tableTop + 20;

    items.forEach((item) => {
      doc.text(item.product_name.substring(0, 30), 40, yPosition);
      doc.text(item.quantity.toString(), 280, yPosition, { width: 40, align: 'right' });
      doc.text(formatUgCurrency(item.unit_price), 330, yPosition, { width: 60, align: 'right' });
      doc.text(formatUgCurrency(item.subtotal), 400, yPosition, { width: 80, align: 'right' });
      yPosition += 15;
    });

    doc.moveTo(40, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Total Amount:', 280, yPosition, { width: 120, align: 'right' });
    doc.text(formatUgCurrency(sale.total_amount), 400, yPosition, { width: 80, align: 'right' });
    yPosition += 20;

    doc.font('Helvetica').fontSize(9);
    doc.text('Amount Paid:', 280, yPosition, { width: 120, align: 'right' });
    doc.text(formatUgCurrency(sale.amount_paid), 400, yPosition, { width: 80, align: 'right' });
    yPosition += 15;

    doc.text('Change Given:', 280, yPosition, { width: 120, align: 'right' });
    doc.text(formatUgCurrency(sale.change_given), 400, yPosition, { width: 80, align: 'right' });

    doc.moveDown(2);
    doc.fontSize(8).text('Thank you for your purchase!', { align: 'center' });
    doc.text('© Crown Stores. All rights reserved.', { align: 'center' });

    doc.end();
  } catch (error) {
    if (error.status === 403) {
      return res.status(403).json({ success: false, message: error.message });
    }
    console.error('Download receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = { downloadReceiptPDF };
