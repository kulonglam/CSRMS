const { query } = require('../config/database');
const { auditLog } = require('../middleware/audit');

// GET /api/cashier-balancing
const getBalances = async (req, res, next) => {
  try {
    const { agent_id, from_date, to_date, status } = req.query;
    const branch_id = req.user.branch_id;

    let sql = `SELECT cb.*, 
                      ua.full_name AS agent_name,
                      um.full_name AS manager_name,
                      b.name AS branch_name
               FROM cashier_balancing cb
               JOIN users ua ON ua.id = cb.sales_agent_id
               JOIN users um ON um.id = cb.manager_id
               JOIN branches b ON b.id = cb.branch_id
               WHERE cb.branch_id = $1`;
    const params = [branch_id];

    if (agent_id)  { params.push(agent_id);  sql += ` AND cb.sales_agent_id = $${params.length}`; }
    if (from_date) { params.push(from_date); sql += ` AND cb.balance_date >= $${params.length}`; }
    if (to_date)   { params.push(to_date);   sql += ` AND cb.balance_date <= $${params.length}`; }
    if (status)    { params.push(status);    sql += ` AND cb.status = $${params.length}`; }

    sql += ' ORDER BY cb.balance_date DESC, ua.full_name';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/cashier-balancing/agent/:agentId/summary  — daily sales summary for an agent
const getAgentDailySummary = async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const { date } = req.query;
    const balanceDate = date || new Date().toISOString().split('T')[0];
    const branch_id = req.user.branch_id;

    // Total sales for this agent on this date
    const salesResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total_sales,
              COUNT(*) AS transaction_count
       FROM sales
       WHERE sales_agent_id = $1 AND branch_id = $2 AND sale_date = $3 AND status = 'completed'`,
      [agentId, branch_id, balanceDate]
    );

    // Itemised list
    const salesList = await query(
      `SELECT s.id, s.receipt_number, s.total_amount, s.amount_paid, s.change_given, s.created_at
       FROM sales s
       WHERE s.sales_agent_id = $1 AND s.branch_id = $2 AND s.sale_date = $3 AND s.status = 'completed'
       ORDER BY s.created_at`,
      [agentId, branch_id, balanceDate]
    );

    const agent = await query('SELECT id, full_name, username FROM users WHERE id = $1', [agentId]);
    if (agent.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Agent not found.' });

    res.json({
      success: true,
      data: {
        agent: agent.rows[0],
        balance_date: balanceDate,
        expected_amount: parseFloat(salesResult.rows[0].total_sales),
        transaction_count: parseInt(salesResult.rows[0].transaction_count),
        sales: salesList.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/cashier-balancing
const createBalance = async (req, res, next) => {
  try {
    const { sales_agent_id, submitted_amount, balance_date, notes } = req.body;
    const branch_id = req.user.branch_id;
    const bDate = balance_date || new Date().toISOString().split('T')[0];

    // Calculate expected amount from completed sales
    const salesResult = await query(
      `SELECT COALESCE(SUM(total_amount), 0) AS total
       FROM sales
       WHERE sales_agent_id = $1 AND branch_id = $2 AND sale_date = $3 AND status = 'completed'`,
      [sales_agent_id, branch_id, bDate]
    );
    const expectedAmount = parseFloat(salesResult.rows[0].total);

    // Determine status
    const variance = submitted_amount - expectedAmount;
    const status = variance === 0 ? 'approved' : 'flagged';

    const result = await query(
      `INSERT INTO cashier_balancing (branch_id, sales_agent_id, manager_id, balance_date, expected_amount, submitted_amount, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (sales_agent_id, balance_date)
       DO UPDATE SET submitted_amount = $6, manager_id = $3, notes = $7, status = $8
       RETURNING *`,
      [branch_id, sales_agent_id, req.user.id, bDate, expectedAmount, submitted_amount, notes, status]
    );

    await auditLog({
      userId: req.user.id, action: 'CASHIER_BALANCE', tableName: 'cashier_balancing',
      recordId: result.rows[0].id, newValues: result.rows[0], ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: `Cashier balance ${status === 'approved' ? 'approved' : 'recorded with variance'}.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/cashier-balancing/:id/approve
const approveBalance = async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE cashier_balancing SET status = 'approved' WHERE id = $1 AND branch_id = $2 RETURNING *",
      [req.params.id, req.user.branch_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Balancing record not found.' });

    await auditLog({ userId: req.user.id, action: 'APPROVE_BALANCE', tableName: 'cashier_balancing', recordId: +req.params.id, ipAddress: req.ip });
    res.json({ success: true, message: 'Balance approved.', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBalances, getAgentDailySummary, createBalance, approveBalance };