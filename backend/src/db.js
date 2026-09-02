const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const dataDir = path.resolve(__dirname, '..', 'data');
const configuredDatabaseUrl = (process.env.DATABASE_URL || '').trim();
const dbPath = configuredDatabaseUrl.startsWith('sqlite:')
  ? configuredDatabaseUrl.replace(/^sqlite:/i, '')
  : path.join(dataDir, 'remanso.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error('Erro ao conectar ao SQLite:', error.message);
  }
});

function normalizeSql(sql) {
  return String(sql).replace(/\$\d+/g, '?');
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(normalizeSql(sql), params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        lastID: this.lastID,
        changes: this.changes,
        rows: [],
      });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(normalizeSql(sql), params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(rows || []);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(normalizeSql(sql), params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row || null);
    });
  });
}

module.exports = { db, run, all, get, normalizeSql };
