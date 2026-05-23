import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export const getDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('contentManager.db');
  }
  return db;
};

export const initDB = async () => {
  try {
    const database = await getDB();
    await database.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        triggerTime TEXT NOT NULL,
        caption TEXT,
        affiliateLink TEXT,
        status TEXT DEFAULT 'Scheduled',
        viewCount INTEGER DEFAULT 0,
        postHour INTEGER
      );
      CREATE TABLE IF NOT EXISTS vault (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        productName TEXT NOT NULL UNIQUE,
        hashtags TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        date TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Insert default settings if they don't exist
    const insertDefault = async (key: string, value: string) => {
      await database.execAsync(`INSERT OR IGNORE INTO settings (key, value) VALUES ('${key}', '${value}')`);
    };

    await insertDefault('theme', 'system');
    await insertDefault('accentColor', '#6B4EFF');
    await insertDefault('currency', 'USD');
    await insertDefault('timeFormat', '12h');
    await insertDefault('notificationsEnabled', 'true');

    try {
      await database.execAsync(`ALTER TABLE posts ADD COLUMN commissionRate REAL DEFAULT 0;`);
    } catch (e) { /* ignores error if column exists */ }
    try {
      await database.execAsync(`ALTER TABLE posts ADD COLUMN earnedRevenue REAL DEFAULT 0;`);
    } catch (e) { /* ignores error if column exists */ }

    console.log('Database initialized');
  } catch (e) {
    console.error('Error initializing database', e);
  }
};

export const getSettingsFromDB = async () => {
  const database = await getDB();
  const rows = await database.getAllAsync('SELECT * FROM settings');
  const settingsObj: any = {};
  rows.forEach((r: any) => {
    settingsObj[r.key] = r.value;
  });
  return settingsObj;
};

export const saveSettingToDB = async (key: string, value: string) => {
  const database = await getDB();
  await database.runAsync('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
};
