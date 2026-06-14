const { query } = require('../config/database');

// ─── MANAGER REPORTS ────────────────────────────────────────────

// GET /api/reports/sales/daily?date=YYYY-MM-DD&branch_id=
const dailySalesReport = async (req, res, next) => {
  try {
    const branch_id = req.user.role === 'director' ? req.query.branch_id : req.user.branch_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required for daily sales report.',
      });
    }

    const summary = await query(
      `SELECT COALESCE(SUM(s.total_amount), 0) AS total_revenue,
              COUNT(s.id) AS total_transactions,
              COUNT(DISTINCT s.sales_agent_id) AS agents_active
       FROM sales s
       WHERE s.branch_id = $1 AND s.sale_date = $2 AND s.status = 'completed'`,
      [branch_id, date]
    );

    const byProduct = await query(
      `SELECT p.id AS product_id, p.name AS product_name, c.name AS category_name,
              SUM(si.quantity) AS total_qty_sold,
              SUM(si.subtotal) AS total_revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE s.branch_id = $1 AND s.sale_date = $2 AND s.status = 'completed'
       GROUP BY p.id, p.name, c.name
       ORDER BY total_revenue DESC`,
      [branch_id, date]
    );

    const byAgent = await query(
      `SELECT u.id, u.full_name, COUNT(s.id) AS transactions, SUM(s.total_amount) AS revenue
       FROM sales s JOIN users u ON u.id = s.sales_agent_id
       WHERE s.branch_id = $1 AND s.sale_date = $2 AND s.status = 'completed'
       GROUP BY u.id, u.full_name ORDER BY revenue DESC`,
      [branch_id, date]
    );

    res.json({
      success: true,
      data: { date, summary: summary.rows[0], by_product: byProduct.rows, by_agent: byAgent.rows },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/inventory
const inventoryReport = async (req, res, next) => {
  try {
    const branch_id = req.user.role === 'manager' ? req.user.branch_id : req.query.branch_id;

    let whereClause = 'WHERE 1=1';
    const params = [];
    if (branch_id) { params.push(branch_id); whereClause += ` AND i.branch_id = $${params.length}`; }

    const summary = await query(
      `SELECT COUNT(*) FILTER (WHERE i.quantity_available = 0) AS out_of_stock,
              COUNT(*) FILTER (WHERE i.quantity_available > 0 AND i.quantity_available <= p.reorder_level) AS low_stock,
              COUNT(*) FILTER (WHERE i.quantity_available > p.reorder_level) AS in_stock,
              COALESCE(SUM(i.quantity_available * p.cost_price), 0) AS total_inventory_value
       FROM inventory i JOIN products p ON p.id = i.product_id ${whereClause}`,
      params
    );

    const items = await query(
      `SELECT p.id, p.name AS product_name, c.name AS category_name,
              i.quantity_available, p.reorder_level,
              p.cost_price, p.selling_price,
              (i.quantity_available * p.cost_price) AS stock_value,
              CASE
                WHEN i.quantity_available = 0 THEN 'out_of_stock'
                WHEN i.quantity_available <= p.reorder_level THEN 'low_stock'
                ELSE 'in_stock'
              END AS stock_status
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ORDER BY stock_status, p.name`,
      params
    );

    res.json({ success: true, data: { summary: summary.rows[0], items: items.rows } });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/procurement?from_date=&to_date=
const procurementReport = async (req, res, next) => {
  try {
    const branch_id = req.user.role === 'manager' ? req.user.branch_id : req.query.branch_id;
    const { from_date, to_date } = req.query;

    let sql = `SELECT pr.id, pr.date_received, pr.supplier_name,
                      pr.quantity_received, pr.cost_price,
                      (pr.quantity_received * pr.cost_price) AS total_cost,
                      p.name AS product_name, c.name AS category_name,
                      b.name AS branch_name, u.full_name AS recorded_by
               FROM procurements pr
               JOIN products p ON p.id = pr.product_id
               JOIN categories c ON c.id = p.category_id
               JOIN branches b ON b.id = pr.branch_id
               JOIN users u ON u.id = pr.recorded_by
               WHERE 1=1`;
    const params = [];

    if (branch_id)  { params.push(branch_id);  sql += ` AND pr.branch_id = $${params.length}`; }
    if (from_date)  { params.push(from_date);  sql += ` AND pr.date_received >= $${params.length}`; }
    if (to_date)    { params.push(to_date);    sql += ` AND pr.date_received <= $${params.length}`; }

    sql += ' ORDER BY pr.date_received DESC';
    const items = await query(sql, params);

    const totalCost = items.rows.reduce((sum, r) => sum + parseFloat(r.total_cost), 0);

    res.json({ success: true, data: { total_cost: totalCost, items: items.rows } });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/cashier-balancing?date=
const cashierBalancingReport = async (req, res, next) => {
  try {
    const branch_id = req.user.branch_id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT cb.*, ua.full_name AS agent_name, um.full_name AS manager_name
       FROM cashier_balancing cb
       JOIN users ua ON ua.id = cb.sales_agent_id
       JOIN users um ON um.id = cb.manager_id
       WHERE cb.branch_id = $1 AND cb.balance_date = $2
       ORDER BY ua.full_name`,
      [branch_id, date]
    );

    const totals = result.rows.reduce(
      (acc, r) => {
        acc.expected += parseFloat(r.expected_amount);
        acc.submitted += parseFloat(r.submitted_amount);
        acc.variance += parseFloat(r.variance);
        return acc;
      },
      { expected: 0, submitted: 0, variance: 0 }
    );

    res.json({ success: true, data: { date, totals, records: result.rows } });
  } catch (err) {
    next(err);
  }
};

// ─── DIRECTOR REPORTS ────────────────────────────────────────────

// GET /api/reports/company/performance?from_date=&to_date=
const companyPerformanceReport = async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;
    const dateFilter = [];
    const params = [];

    if (from_date) { params.push(from_date); dateFilter.push(`s.sale_date >= $${params.length}`); }
    if (to_date)   { params.push(to_date);   dateFilter.push(`s.sale_date <= $${params.length}`); }
    const whereDate = dateFilter.length ? 'AND ' + dateFilter.join(' AND ') : '';

    // Total company sales
    const totalSales = await query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_sales, COUNT(*) AS total_transactions
       FROM sales s WHERE s.status = 'completed' ${whereDate}`,
      params
    );

    // Branch rankings
    const branchRankings = await query(
      `SELECT b.id, b.name AS branch_name,
              COALESCE(SUM(s.total_amount), 0) AS total_sales,
              COUNT(s.id) AS transactions
       FROM branches b
       LEFT JOIN sales s ON s.branch_id = b.id AND s.status = 'completed' ${whereDate}
       GROUP BY b.id, b.name
       ORDER BY total_sales DESC`,
      params
    );

    // Total inventory value
    const inventoryValue = await query(
      `SELECT COALESCE(SUM(i.quantity_available * p.cost_price), 0) AS total_value
       FROM inventory i JOIN products p ON p.id = i.product_id`
    );

    // Total procurement value
    const procurementValue = await query(
      `SELECT COALESCE(SUM(quantity_received * cost_price), 0) AS total_value FROM procurements`
    );

    // Top selling products
    const topProducts = await query(
      `SELECT p.id, p.name AS product_name, c.name AS category_name,
              SUM(si.quantity) AS total_qty, SUM(si.subtotal) AS total_revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE s.status = 'completed' ${whereDate}
       GROUP BY p.id, p.name, c.name
       ORDER BY total_revenue DESC LIMIT 10`,
      params
    );

    // Top selling categories
    const topCategories = await query(
      `SELECT c.id, c.name AS category_name,
              SUM(si.quantity) AS total_qty, SUM(si.subtotal) AS total_revenue
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN products p ON p.id = si.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE s.status = 'completed' ${whereDate}
       GROUP BY c.id, c.name
       ORDER BY total_revenue DESC`,
      params
    );

    res.json({
      success: true,
      data: {
        total_sales: totalSales.rows[0],
        total_inventory_value: inventoryValue.rows[0].total_value,
        total_procurement_value: procurementValue.rows[0].total_value,
        branch_rankings: branchRankings.rows,
        top_products: topProducts.rows,
        top_categories: topCategories.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/sales/trends?period=daily|weekly|monthly&branch_id=
const salesTrends = async (req, res, next) => {
  try {
    const { period = 'daily', branch_id, from_date, to_date } = req.query;
    const effectiveBranchId = req.user.role !== 'director' ? req.user.branch_id : branch_id;

    const truncMap = { daily: 'day', weekly: 'week', monthly: 'month' };
    const trunc = truncMap[period] || 'day';

    let sql = `SELECT DATE_TRUNC('${trunc}', s.sale_date::timestamp) AS period,
                      COALESCE(SUM(s.total_amount), 0) AS revenue,
                      COUNT(s.id) AS transactions
               FROM sales s WHERE s.status = 'completed'`;
    const params = [];

    if (effectiveBranchId) { params.push(effectiveBranchId); sql += ` AND s.branch_id = $${params.length}`; }
    if (from_date)         { params.push(from_date);         sql += ` AND s.sale_date >= $${params.length}`; }
    if (to_date)           { params.push(to_date);           sql += ` AND s.sale_date <= $${params.length}`; }

    sql += ` GROUP BY DATE_TRUNC('${trunc}', s.sale_date::timestamp) ORDER BY period`;

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  dailySalesReport,
  inventoryReport,
  procurementReport,
  cashierBalancingReport,
  companyPerformanceReport,
  salesTrends,
};