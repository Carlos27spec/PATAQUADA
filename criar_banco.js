// Cria as tabelas e os dados iniciais no banco que o server.js usa
// (src/config/database.js), rodando o Creates.sql e depois o Inserts.sql.
//
// Como usar (na pasta do back end, a mesma do server.js, com o servidor PARADO):
//     node criar_banco.js
//
// Ele procura o Creates.sql e o Inserts.sql na pasta atual, em ./database,
// em ./sql e na pasta de cima. Se estiverem em outro lugar, passe os caminhos:
//     node criar_banco.js "caminho/Creates.sql" "caminho/Inserts.sql"
//
// Por segurança, se a tabela "usuarios" já existir, ele NÃO faz nada
// (para não duplicar dados). Nesse caso use o migrar_sobrenome.js.

import fs from 'node:fs';
import path from 'node:path';
import { db, arquivoBanco } from './src/config/database.js';

function localizar(nome, caminhoInformado) {
    const candidatos = caminhoInformado
        ? [caminhoInformado]
        : [nome, `database/${nome}`, `sql/${nome}`, `../${nome}`];

    const achado = candidatos.find((c) => fs.existsSync(c));

    if (!achado) {
        console.error(`Não encontrei o arquivo ${nome}.`);
        console.error(`Procurei em: ${candidatos.join(', ')}`);
        console.error(`Copie o ${nome} para a pasta do back end ou informe o caminho:`);
        console.error('  node criar_banco.js "caminho/Creates.sql" "caminho/Inserts.sql"');
        process.exit(1);
    }

    return achado;
}

const arquivoCreates = localizar('Creates.sql', process.argv[2]);
const arquivoInserts = localizar('Inserts.sql', process.argv[3]);

console.log(`Banco: ${arquivoBanco}`);

const jaExiste = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'")
    .get();

if (jaExiste) {
    console.log('A tabela "usuarios" já existe neste banco. Nada foi alterado.');
    console.log('Se só falta a coluna "sobrenome", rode: node migrar_sobrenome.js');
    db.close();
    process.exit(0);
}

console.log(`Executando ${path.basename(arquivoCreates)}...`);
db.exec(fs.readFileSync(arquivoCreates, 'utf-8'));

console.log(`Executando ${path.basename(arquivoInserts)}...`);
db.exec(fs.readFileSync(arquivoInserts, 'utf-8'));

const tabelas = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((t) => t.name);

console.log(`Pronto! ${tabelas.length} tabelas criadas:`);
console.log(tabelas.join(', '));

db.close();
