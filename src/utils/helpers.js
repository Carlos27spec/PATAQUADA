import { db } from '../config/database.js';

// =====================================================
// FUNÇÕES AUXILIARES (usadas em vários arquivos)
// =====================================================

export function responderErro(
    res,
    erro,
    mensagem = 'Erro interno do servidor.'
) {
    console.error(mensagem, erro);

    return res.status(500).json({
        sucesso: false,
        mensagem,
        erro: erro.message
    });
}

export function somenteDigitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
}

export function limitar(valor, tamanho) {
    return String(valor ?? '').trim().slice(0, tamanho);
}

// Lista uma tabela (só os ativos, se tiver coluna status), ordenada por nome ou id.
export function consultarTabela(tabela, statusAtivo = true) {

    const existe = db.prepare(`

        SELECT name

        FROM sqlite_master

        WHERE type = 'table'

        AND name = ?

    `).get(tabela);



    if (!existe) {

        throw new Error(`Tabela ${tabela} não encontrada no banco.`);

    }



    const colunas = db.prepare(`

        PRAGMA table_info("${tabela}")

    `).all();



    const possuiStatus = colunas.some(

coluna => coluna.name === 'status'

    );



    const possuiNome = colunas.some(

coluna => coluna.name === 'nome'

    );



    const possuiId = colunas.some(

coluna => coluna.name === 'id'

    );



    let sql = `SELECT * FROM "${tabela}"`;



    if (statusAtivo && possuiStatus) {

        sql += `

            WHERE UPPER(TRIM(CAST(status AS TEXT)))

            IN ('A', 'ATIVO', '1')

        `;

    }



    if (possuiNome) {

        sql += ' ORDER BY nome';

    } else if (possuiId) {

        sql += ' ORDER BY id';

    }



    return db.prepare(sql).all();

}
