// Email notification utilities
const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Send low stock alert email to managers
 */
const sendLowStockAlert = async (productName, currentStock, reorderLevel, branchName) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email configuration missing. Skipping notification.');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.MANAGER_EMAIL_LIST || process.env.EMAIL_USER,
      subject: `⚠️ Low Stock Alert: ${productName}`,
      html: `
        <h2>Low Stock Alert</h2>
        <p>The following product has fallen below its reorder level:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background-color: #f2f2f2;">
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Product</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${productName}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Branch</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${branchName}</td>
          </tr>
          <tr style="background-color: #fff3cd;">
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Current Stock</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${currentStock}</td>
          </tr>
          <tr style="background-color: #fff3cd;">
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Reorder Level</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${reorderLevel}</td>
          </tr>
        </table>
        <p>Please take action to restock this item.</p>
        <p>Best regards,<br>CSRMS System</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Low stock alert sent for ${productName}`);
  } catch (error) {
    console.error('Failed to send low stock alert:', error.message);
  }
};

/**
 * Send out-of-stock alert email to managers
 */
const sendOutOfStockAlert = async (productName, branchName) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email configuration missing. Skipping notification.');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.MANAGER_EMAIL_LIST || process.env.EMAIL_USER,
      subject: `🔴 Out of Stock Alert: ${productName}`,
      html: `
        <h2>Out of Stock Alert</h2>
        <p style="color: red; font-weight: bold;">⚠️ The following product is out of stock:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background-color: #f2f2f2;">
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Product</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${productName}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Branch</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;">${branchName}</td>
          </tr>
        </table>
        <p>This product is no longer available for sale. Immediate restocking is required.</p>
        <p>Best regards,<br>CSRMS System</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Out of stock alert sent for ${productName}`);
  } catch (error) {
    console.error('Failed to send out of stock alert:', error.message);
  }
};

/**
 * Send daily sales summary to director
 */
const sendDailySalesSummary = async (totalSales, transactionCount, topProducts) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email configuration missing. Skipping notification.');
      return;
    }

    const productsList = topProducts
      .map((p) => `<li>${p.name}: ${p.quantity} units - ₦${parseFloat(p.revenue).toFixed(2)}</li>`)
      .join('');

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.DIRECTOR_EMAIL || process.env.EMAIL_USER,
      subject: `📊 Daily Sales Summary - ${new Date().toLocaleDateString()}`,
      html: `
        <h2>Daily Sales Summary</h2>
        <p>Here's today's sales performance across all branches:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr style="background-color: #4CAF50; color: white;">
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total Sales</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Transactions</strong></td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 18px; color: #4CAF50; font-weight: bold;">₦${parseFloat(totalSales).toFixed(2)}</td>
            <td style="border: 1px solid #ddd; padding: 8px; font-size: 18px; color: #4CAF50; font-weight: bold;">${transactionCount}</td>
          </tr>
        </table>
        <h3>Top Selling Products:</h3>
        <ul style="list-style-type: none; padding: 0;">
          ${productsList}
        </ul>
        <p>Best regards,<br>CSRMS System</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✓ Daily sales summary sent to director');
  } catch (error) {
    console.error('Failed to send daily sales summary:', error.message);
  }
};

/**
 * Send user account creation notification
 */
const sendAccountCreationEmail = async (fullName, username, tempPassword, email) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email configuration missing. Skipping notification.');
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to CSRMS - Account Created',
      html: `
        <h2>Welcome to Crown Stores Retail Management System</h2>
        <p>Dear ${fullName},</p>
        <p>Your account has been successfully created. Here are your login credentials:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0; background-color: #f9f9f9;">
          <tr>
            <td style="border: 1px solid #ddd; padding: 10px;"><strong>Username:</strong></td>
            <td style="border: 1px solid #ddd; padding: 10px;">${username}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 10px;"><strong>Temporary Password:</strong></td>
            <td style="border: 1px solid #ddd; padding: 10px;"><code>${tempPassword}</code></td>
          </tr>
        </table>
        <p style="color: red;"><strong>⚠️ Important:</strong> Please change your password on first login for security.</p>
        <p>If you did not request this account, please contact your administrator immediately.</p>
        <p>Best regards,<br>CSRMS Administration Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✓ Account creation email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send account creation email:', error.message);
  }
};

module.exports = {
  sendLowStockAlert,
  sendOutOfStockAlert,
  sendDailySalesSummary,
  sendAccountCreationEmail,
};
