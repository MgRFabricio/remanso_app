const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.resolve(__dirname, '..', 'data');
const configuredDatabaseUrl = (process.env.DATABASE_URL || '').trim();
const dbPath = configuredDatabaseUrl.startsWith('sqlite:')
  ? configuredDatabaseUrl.replace(/^sqlite:/i, '')
  : path.join(dataDir, 'remanso.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

async function runSqlFile(fileName) {
  const filePath = path.join(__dirname, '..', 'sql', fileName);
  const sql = fs.readFileSync(filePath, 'utf8');
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }
      console.log(`Executed ${fileName}`);
      resolve();
    });
  });
}

function hasSeedData() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) AS total FROM usuarios', (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Number(row?.total || 0) > 0);
    });
  });
}

async function initDatabase() {
  try {
    await runSqlFile('00_schema.sql');
    if (!(await hasSeedData())) {
      await runSqlFile('01_seed.sql');
    } else {
      console.log('Seed ignorado: o banco já contém dados.');
    }
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize the database:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

initDatabase();
