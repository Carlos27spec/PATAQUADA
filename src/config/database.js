import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, '../../database');

const databaseName = process.env.DB_NAME || 'pataquada.db';
import fs from 'fs';
fs.mkdirSync(databasePath, { recursive: true });

const arquivoBanco = path.join(databasePath, databaseName);



const db = new Database(arquivoBanco);



db.pragma('journal_mode = WAL');

db.pragma('foreign_keys = ON');



console.log('\n========== BANCO DE DADOS ==========');

console.log('Arquivo utilizado:', arquivoBanco);



const tabelas = db.prepare(`

    SELECT name

    FROM sqlite_master

    WHERE type = 'table'

    ORDER BY name

`).all();



console.log('Tabelas encontradas:', tabelas);

console.log('====================================\n');




export { db, arquivoBanco };
