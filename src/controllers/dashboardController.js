// Dashboard Controller
const { query } = require('../config/database');

// ========== DIRECTOR DASHBOARD ==========
const getDirectorDashboard = async (req, res) => {
  try {
    // Total company sales
    const totalSalesResult = await query(
      `
      SELECT COALESCE(SUM(total_amount), 0) as total_sales
      FROM sales
      WHERE status = 'completed'
      `
    );

    // Total inventory value
    const inventoryValueResult = await query(
      `
      SELECT COALESCE(SUM(i.quantity_available * p.cost_price), 0) as inventory_value
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      `
    );

    // Number of branches
    const branchesResult = await query(
      'SELECT COUNT(*) as branch_count FROM branches WHERE status = $1',
      ['active']
    );

    // Top selling products
    const topProductsResult = await query(
      `
      SELECT 
        p.id, p.name, SUM(si.quantity) as total_quantity, SUM(si.subtotal) as total_revenue
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id IN (SELECT id FROM sales WHERE status = 'completed')
      GROUP BY p.id, p.name
      ORDER BY total_quantity DESC
      LIMIT 10
      `
    );

    // Sales trends (last 7 days)
    const trendsResult = await query(
      `
      SELECT 
        DATE(sale_date) as date, COUNT(*) as transactions, SUM(total_amount) as daily_total
      FROM sales
      WHERE status = 'completed' AND sale_date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY DATE(sale_date)
      ORDER BY date DESC
      `
    );

    // Procurement summary
    const procurementResult = await query(
      `
      SELECT COALESCE(SUM(quantity_received * cost_price), 0) as total_procurement
      FROM procurements
      WHERE DATE(date_received) >= CURRENT_DATE - INTERVAL '30 days'
      `
    );

    res.status(200).json({
      success: true,
      data: {
        total_sales: parseFloat(totalSalesResult.rows[0].total_sales),
        inventory_value: parseFloat(inventoryValueResult.rows[0].inventory_value),
        active_branches: parseInt(branchesResult.rows[0].branch_count),
        top_products: topProductsResult.rows.map(row => ({
          ...row,
          total_revenue: parseFloat(row.total_revenue),
        })),
        sales_trends: trendsResult.rows.map(row => ({
          ...row,
          daily_total: parseFloat(row.daily_total),
        })),
        procurement_value: parseFloat(procurementResult.rows[0].total_procurement),
      },
    });
  } catch (error) {
    console.error('Get director dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ========== MANAGER DASHBOARD ==========
const getManagerDashboard = async (req, res) => {
  try {
    const branch_id = req.user.branch_id;

    // Branch sales
    const branchSalesResult = await query(
      `
      SELECT COALESCE(SUM(total_amount), 0) as total_sales
      FROM sales
      WHERE branch_id = $1 AND status = 'completed'
      `,
      [branch_id]
    );

    // Branch inventory summary
    const inventorySummaryResult = await query(
      `
      SELECT 
        COALESCE(SUM(i.quantity_available), 0) as total_items,
        COALESCE(SUM(i.quantity_available * p.cost_price), 0) as inventory_value,
        COUNT(CASE WHEN i.quantity_available = 0 THEN 1 END) as out_of_stock_count,
        COUNT(CASE WHEN i.quantity_available > 0 AND i.quantity_available <= p.reorder_level THEN 1 END) as low_stock_count
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.branch_id = $1
      `,
      [branch_id]
    );

    // Recent procurements
    const recentProcurementResult = await query(
      `
      SELECT p.id, p.name, pr.quantity_received, pr.cost_price, pr.supplier_name, pr.date_received
      FROM procurements pr
      JOIN products p ON pr.product_id = p.id
      WHERE pr.branch_id = $1
      ORDER BY pr.date_received DESC
      LIMIT 5
      `,
      [branch_id]
    );

    // Low stock alerts
    const lowStockResult = await query(
      `
      SELECT 
        p.id, p.name, i.quantity_available, p.reorder_level
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.branch_id = $1 AND i.quantity_available <= p.reorder_level
      ORDER BY i.quantity_available ASC
      LIMIT 10
      `,
      [branch_id]
    );

    // Cashier sales summary (today)
    const cashierSummaryResult = await query(
      `
      SELECT 
        u.id, u.full_name, COUNT(s.id) as transaction_count, COALESCE(SUM(s.total_amount), 0) as total_sales
      FROM users u
      LEFT JOIN sales s ON u.id = s.sales_agent_id AND s.branch_id = $1 AND DATE(s.sale_date) = CURRENT_DATE
      WHERE u.branch_id = $1 AND u.role = 'sales_agent'
      GROUP BY u.id, u.full_name
      ORDER BY total_sales DESC
      `,
      [branch_id]
    );

    res.status(200).json({
      success: true,
      data: {
        branch_sales: parseFloat(branchSalesResult.rows[0].total_sales),
        inventory: {
          total_items: parseInt(inventorySummaryResult.rows[0].total_items),
          inventory_value: parseFloat(inventorySummaryResult.rows[0].inventory_value),
          out_of_stock_count: parseInt(inventorySummaryResult.rows[0].out_of_stock_count),
          low_stock_count: parseInt(inventorySummaryResult.rows[0].low_stock_count),
        },
        recent_procurements: recentProcurementResult.rows.map(row => ({
          ...row,
          cost_price: parseFloat(row.cost_price),
        })),
        low_stock_alerts: lowStockResult.rows,
        cashier_summary: cashierSummaryResult.rows.map(row => ({
          ...row,
          transaction_count: parseInt(row.transaction_count),
          total_sales: parseFloat(row.total_sales),
        })),
      },
    });
  } catch (error) {
    console.error('Get manager dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

// ========== SALES AGENT DASHBOARD ==========
const getSalesAgentDashboard = async (req, res) => {
  try {
    const agent_id = req.user.id;
    const branch_id = req.user.branch_id;

    // Today's sales
    const todaysSalesResult = await query(
      `
      SELECT COUNT(s.id) as transaction_count, COALESCE(SUM(s.total_amount), 0) as total_sales
      FROM sales s
      WHERE s.sales_agent_id = $1 AND s.branch_id = $2 AND DATE(s.sale_date) = CURRENT_DATE
      `,
      [agent_id, branch_id]
    );

    // Available stock (for quick reference)
    const availableStockResult = await query(
      `
      SELECT 
        p.id, p.name, p.selling_price, i.quantity_available
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      WHERE i.branch_id = $1 AND i.quantity_available > 0
      ORDER BY p.name ASC
      LIMIT 20
      `,
      [branch_id]
    );

    // Recent sales (today)
    const recentSalesResult = await query(
      `
      SELECT 
        s.id, s.receipt_number, s.total_amount, s.amount_paid, s.change_given,
        s.created_at,
        COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.sales_agent_id = $1 AND DATE(s.sale_date) = CURRENT_DATE
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 10
      `,
      [agent_id]
    );

    res.status(200).json({
      success: true,
      data: {
        todays_stats: {
          transactions: parseInt(todaysSalesResult.rows[0].transaction_count),
          total_sales: parseFloat(todaysSalesResult.rows[0].total_sales),
        },
        available_products: availableStockResult.rows.map(row => ({
          ...row,
          selling_price: parseFloat(row.selling_price),
        })),
        recent_sales: recentSalesResult.rows.map(row => ({
          ...row,
          total_amount: parseFloat(row.total_amount),
          amount_paid: parseFloat(row.amount_paid),
          change_given: parseFloat(row.change_given),
        })),
      },
    });
  } catch (error) {
    console.error('Get sales agent dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getDirectorDashboard,
  getManagerDashboard,
  getSalesAgentDashboard,
};
