// Migração: adiciona a coluna "sobrenome" na tabela "usuarios".
//
// Como usar (na pasta do back end, a mesma do server.js, com o servidor PARADO):
//     node migrar_sobrenome.js
//
// Ele usa o mesmo banco que o server.js (src/config/database.js),
// então não precisa descobrir o caminho do arquivo .db.
// Pode rodar mais de uma vez: se a coluna já existir, não faz nada.

import { db, arquivoBanco } from './src/config/database.js';

console.log(`Banco: ${arquivoBanco}`);

const colunas = db.prepare('PRAGMA table_info(usuarios)').all();

if (colunas.length === 0) {
    console.error('A tabela "usuarios" não existe neste banco. Rode o Creates.sql primeiro.');
    process.exit(1);
}

if (colunas.some((coluna) => coluna.name === 'sobrenome')) {
    console.log('A coluna "sobrenome" já existe. Nada a fazer.');
} else {
    db.exec("ALTER TABLE usuarios ADD COLUMN sobrenome TEXT NOT NULL DEFAULT ''");
    console.log('Coluna "sobrenome" criada com sucesso.');
}

db.close();
