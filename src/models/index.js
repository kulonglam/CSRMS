// Database models/queries centralized location
// Import database connection from config
const db = require('../config/database');

// Example model structure - add your database query functions here
// Each function should handle database operations for a specific entity

// Users Model
const Users = {
  findById: (id) => db.query('SELECT * FROM users WHERE id = $1', [id]),
  findByEmail: (email) => db.query('SELECT * FROM users WHERE email = $1', [email]),
  create: (userData) => db.query(
    'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *',
    [userData.email, userData.password, userData.name]
  ),
  // Add more user queries here
};

// Products Model
const Products = {
  findAll: () => db.query('SELECT * FROM products'),
  findById: (id) => db.query('SELECT * FROM products WHERE id = $1', [id]),
  create: (productData) => db.query(
    'INSERT INTO products (name, description, price, category_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [productData.name, productData.description, productData.price, productData.category_id]
  ),
  // Add more product queries here
};

// Inventory Model
const Inventory = {
  findById: (id) => db.query('SELECT * FROM inventory WHERE id = $1', [id]),
  updateStock: (id, quantity) => db.query(
    'UPDATE inventory SET quantity = $1 WHERE id = $2 RETURNING *',
    [quantity, id]
  ),
  // Add more inventory queries here
};

module.exports = {
  Users,
  Products,
  Inventory,
  // Export additional models as needed
};
