
require('dotenv').config();

const { Client } = require('pg');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    process.stdout.write(question);

    const stdin = process.stdin;
    let password = '';

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function cleanup() {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write('\n');
    }

    function onData(char) {
      if (char === '\u0003') {
        cleanup();
        reject(new Error('Cancelled.'));
      } else if (char === '\r' || char === '\n') {
        cleanup();
        resolve(password);
      } else if (char === '\u007f' || char === '\b') {
        password = password.slice(0, -1);
      } else if (char >= ' ') {
        password += char;
      }
    }

    stdin.on('data', onData);
  });
}

async function main() {
  let client;

  try {
    console.log('\n=== TUJITUNZE SUPER ADMIN CREATION ===\n');

    const firstName = (await ask('First name: ')).trim();
    const secondName = (await ask('Second name (optional): ')).trim();
    const surname = (await ask('Surname: ')).trim();
    const emailInput = (await ask('Email address: ')).trim();
    const nida = (await ask('NIDA number: ')).trim();

    const password = await askHidden('Create password (hidden): ');
    const confirmation = await askHidden('Confirm password (hidden): ');

    if (!firstName || !surname || !nida || !password) {
      throw new Error('Required fields cannot be empty.');
    }

    if (password !== confirmation) {
      throw new Error('Passwords do not match.');
    }

    if (password.length < 12) {
      throw new Error('Password must contain at least 12 characters.');
    }

    if (!/^[0-9]{8}-[0-9]{5}-[0-9]{5}-[0-9]{2}$/.test(nida)) {
      throw new Error('Invalid NIDA format.');
    }

    const email = emailInput ? emailInput.toLowerCase() : null;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email address.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'tujitunze',
    });

    await client.connect();
    await client.query('BEGIN');

    // Prevent concurrent bootstrap operations.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('tujitunze_super_admin_bootstrap'))"
    );

    const role = await client.query(
      `SELECT role_id FROM roles WHERE role_name = $1`,
      ['Super-admin']
    );

    if (role.rowCount !== 1) {
      throw new Error('Super-admin role is missing or duplicated.');
    }

    const existingAdmin = await client.query(`
      SELECT u.user_id
      FROM users u
      JOIN member_roles mr ON mr.member_id = u.user_id
      JOIN roles r ON r.role_id = mr.role_id
      WHERE r.role_name = 'Super-admin'
      LIMIT 1
    `);

    if (existingAdmin.rowCount > 0) {
      throw new Error('A Super Admin already exists. Creation cancelled.');
    }

    const existingUser = await client.query(
      `SELECT user_id FROM users
       WHERE nida_number = $1
          OR ($2::varchar IS NOT NULL AND email = $2)
       LIMIT 1`,
      [nida, email]
    );

    if (existingUser.rowCount > 0) {
      throw new Error('This NIDA number or email is already registered.');
    }

    const result = await client.query(
      `INSERT INTO users (
        first_name,
        second_name,
        surname,
        email,
        nida_number,
        password_hash,
        member_status,
        email_verified,
        phone_verified
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'Active', FALSE, FALSE)
      RETURNING user_id`,
      [
        firstName,
        secondName || null,
        surname,
        email,
        nida,
        passwordHash,
      ]
    );

    const userId = result.rows[0].user_id;

    await client.query(
      `INSERT INTO member_roles (member_id, role_id)
       VALUES ($1, $2)`,
      [userId, role.rows[0].role_id]
    );

    await client.query('COMMIT');

    console.log('\n====================================');
    console.log('SUPER ADMIN CREATED SUCCESSFULLY');
    console.log('====================================');
    console.log('User ID:', userId);
    console.log('Role: Super-admin');
    console.log('Status: Active');
    console.log('Email verification: Pending');
    console.log('Phone verification: Pending');
    console.log('====================================');
    console.log('Login using your email or NIDA number.');

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('\nCreation failed:', error.message);
    process.exitCode = 1;

  } finally {
    if (client) {
      await client.end().catch(() => {});
    }

    rl.close();
  }
}

main();

