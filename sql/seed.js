require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'csrms_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting database seed...\n');
    await client.query('BEGIN');

    // Migrate legacy non-Uganda branch names (Nigeria) to Uganda locations
    await client.query(`
      UPDATE branches SET name = 'Kampala Main Branch', location = 'Kampala'
      WHERE name = 'Main Branch' OR location IN ('Lagos', 'lagos');
      UPDATE branches SET name = 'Entebbe Branch', location = 'Entebbe'
      WHERE name = 'Abuja Branch' OR location IN ('Abuja', 'abuja');
      UPDATE branches SET name = 'Jinja Branch', location = 'Jinja'
      WHERE name = 'Kano Branch' OR location IN ('Kano', 'kano');
      UPDATE branches SET name = 'Mbarara Branch', location = 'Mbarara'
      WHERE name = 'Port Harcourt Branch' OR location IN ('Port Harcourt', 'port harcourt');
      UPDATE users SET full_name = 'Branch Manager - Kampala'
      WHERE full_name = 'Branch Manager - Lagos';
      UPDATE users SET full_name = 'Branch Manager - Entebbe'
      WHERE full_name = 'Branch Manager - Abuja';
    `);

    // Branches
    console.log('📍 Creating branches...');
    const branchRes = await client.query(`
      INSERT INTO branches (name, location, status) VALUES
        ('Kampala Main Branch',  'Kampala',  'active'),
        ('Entebbe Branch',       'Entebbe',  'active'),
        ('Jinja Branch',         'Jinja',    'active'),
        ('Mbarara Branch',       'Mbarara',  'active')
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `);
    console.log(`✓ ${branchRes.rows.length} branches created`);

    const branchIds = (await client.query('SELECT id FROM branches ORDER BY id LIMIT 4')).rows.map(b => b.id);

    // Users
    console.log('👥 Creating users...');
    const directorHash = await bcrypt.hash('Director@123', 12);
    const managerHash  = await bcrypt.hash('Manager@123',  12);
    const agentHash    = await bcrypt.hash('Agent@123',    12);

    const userRes = await client.query(`
      INSERT INTO users (full_name, username, email, password_hash, role, branch_id, status) VALUES
        ('Crown Director',           'director', 'director@crowns.ug', $1, 'director',   NULL,          'active'),
        ('Branch Manager - Kampala', 'manager1', 'manager1@crowns.ug', $2, 'manager',    $3,            'active'),
        ('Branch Manager - Entebbe', 'manager2', 'manager2@crowns.ug', $2, 'manager',    $4,            'active'),
        ('Sales Agent 1',            'agent1',   'agent1@crowns.ug',   $5, 'sales_agent',$3,            'active'),
        ('Sales Agent 2',            'agent2',   'agent2@crowns.ug',   $5, 'sales_agent',$3,            'active'),
        ('Sales Agent 3',            'agent3',   'agent3@crowns.ug',   $5, 'sales_agent',$4,            'active')
      ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
      RETURNING id, username, role
    `, [directorHash, managerHash, branchIds[0], branchIds[1], agentHash]);
    console.log(`✓ ${userRes.rows.length} users created`);

    // Categories
    console.log('📦 Creating categories...');
    const catRes = await client.query(`
      INSERT INTO categories (name, description, status) VALUES
        ('Refreshments',   'Soft drinks, juices, water',      'active'),
        ('Groceries',      'Food staples, grains, spices',    'active'),
        ('Dairy Products', 'Milk, cheese, yogurt',            'active'),
        ('Bakery',         'Bread, cakes, pastries',          'active'),
        ('Household Items','Cleaning supplies, utensils',     'active'),
        ('Personal Care',  'Soaps, shampoo, toothpaste',      'active'),
        ('Electronics',    'Electronics and accessories',     'active'),
        ('Stationery',     'Office and school stationery',    'active')
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `);
    console.log(`✓ ${catRes.rows.length} categories created`);

    // Get category IDs by name for reliable referencing
    const cats = (await client.query('SELECT id, name FROM categories ORDER BY id')).rows;
    const catId = (name) => cats.find(c => c.name === name)?.id;

    // Products
    console.log('🛍️  Creating products...');
    const prodRes = await client.query(`
      INSERT INTO products (category_id, name, description, cost_price, selling_price, reorder_level, status) VALUES
        ($1,  'Coca-Cola 500ml',       'Popular soft drink',       250,  400,  20, 'active'),
        ($1,  'Fanta Orange 500ml',    'Fruity soft drink',        200,  350,  20, 'active'),
        ($1,  'Bottled Water 500ml',   'Pure drinking water',      100,  150,  50, 'active'),
        ($2,  'Rice (5kg)',            'Long grain white rice',   2500, 3500,   5, 'active'),
        ($2,  'Beans (2kg)',           'Dried beans',             1500, 2200,   5, 'active'),
        ($3,  'Brookside Milk 500ml',  'Fresh dairy milk',         400,  550,  15, 'active'),
        ($3,  'Cheese 200g',           'Processed cheese',        1000, 1500,  10, 'active'),
        ($4,  'Sliced Bread',          'Fresh white bread',        500,  800,  10, 'active'),
        ($4,  'Donut Pack',            'Assorted donuts',         1000, 1500,   5, 'active'),
        ($5,  'Dish Soap 500ml',       'Cleaning liquid',          300,  500,  10, 'active'),
        ($5,  'Detergent Powder 1kg',  'Laundry detergent',       1200, 1800,   8, 'active'),
        ($6,  'Bath Soap 100g',        'Personal hygiene soap',    200,  350,  20, 'active')
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `, [catId('Refreshments'), catId('Groceries'), catId('Dairy Products'),
        catId('Bakery'), catId('Household Items'), catId('Personal Care')]);
    console.log(`✓ ${prodRes.rows.length} products created`);

    // Barcodes
    console.log('📱 Creating barcodes...');
    const allProds = (await client.query('SELECT id FROM products ORDER BY id LIMIT 12')).rows;
    const barcodeValues = [
      '5901234123457','5901234223457','5901234323457','5901234423457',
      '5901234523457','5901234623457','5901234723457','5901234823457',
      '5901234923457','5901235023457','5901235123457','5901235223457',
    ];
    let barcodeCount = 0;
    for (let i = 0; i < allProds.length; i++) {
      const r = await client.query(
        `INSERT INTO product_barcodes (product_id, barcode_number, status)
         VALUES ($1, $2, 'active') ON CONFLICT (barcode_number) DO NOTHING RETURNING id`,
        [allProds[i].id, barcodeValues[i]]
      );
      barcodeCount += r.rows.length;
    }
    console.log(`✓ ${barcodeCount} barcodes created`);

    // Inventory (all products × all branches)
    console.log('📊 Creating inventory...');
    const allProdsAll = (await client.query('SELECT id FROM products')).rows;
    let inventoryCount = 0;
    for (const branch of branchIds) {
      for (const prod of allProdsAll) {
        const qty = Math.floor(Math.random() * 100) + 10;
        const r = await client.query(
          `INSERT INTO inventory (product_id, branch_id, quantity_available)
           VALUES ($1, $2, $3) ON CONFLICT (product_id, branch_id) DO NOTHING RETURNING id`,
          [prod.id, branch, qty]
        );
        inventoryCount += r.rows.length;
      }
    }
    console.log(`✓ ${inventoryCount} inventory records created`);

    await client.query('COMMIT');

    console.log('\n✅ Database seeded successfully!\n');
    console.log('🔑 Default Login Credentials:');
    console.log('   Director  →  username: director  | password: Director@123');
    console.log('   Manager   →  username: manager1  | password: Manager@123');
    console.log('   Agent     →  username: agent1    | password: Agent@123\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();