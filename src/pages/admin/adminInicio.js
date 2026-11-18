// =====================================================
// ÁREA ADMINISTRATIVA — ETAPA 1: ACESSO E TELA INICIAL
//
// Rotas (todas exigem login de administrador):
//   GET /api/admin/eu      -> confirma o acesso e devolve o usuário
//   GET /api/admin/resumo  -> números exibidos na tela inicial
// =====================================================

import process from 'node:process';

import { PERMISSAO_PAINEL, pode } from './permissoesAdmin.js';

// =====================================================
// PERMISSÕES
//
// O acesso ao painel e a cada tela vem das tabelas permissao_usuario e
// permissao_tipo_usuario, conforme o tipo do usuário logado.
//
// Emergência: ids de tipo em ADMIN_TIPOS_USUARIO no .env
// (ex.: ADMIN_TIPOS_USUARIO=1) recebem todas as permissões, mesmo que
// alguém tenha retirado o acesso pelo painel.
// =====================================================

// Chaves (em maiúsculas) das permissões de um usuário.
export function permissoesDoUsuario(db, usuario) {
    const idsEmergencia = String(process.env.ADMIN_TIPOS_USUARIO ?? '')
        .split(',')
        .map(valor => Number(valor.trim()))
        .filter(valor => Number.isInteger(valor) && valor > 0);

    if (idsEmergencia.includes(usuario.id_tipo_usuario)) {
        const todas = db.prepare('SELECT UPPER(chave) AS chave FROM permissao_usuario').all();
        return new Set([PERMISSAO_PAINEL, ...todas.map(item => item.chave)]);
    }

    const linhas = db.prepare(`
        SELECT UPPER(pu.chave) AS chave
        FROM permissao_tipo_usuario ptu
        JOIN permissao_usuario pu ON pu.id = ptu.id_permissao
        WHERE ptu.id_tipo_usuario = ?
    `).all(usuario.id_tipo_usuario);

    return new Set(linhas.map(item => item.chave));
}

// Cria a permissão de acesso ao painel na primeira vez e libera para
// os tipos ADMIN. Depois disso, quem decide é a tela "Permissões por
// tipo" (nada é recriado se alguém retirar o acesso).
export function garantirPermissaoPainel(db) {
    const existe = db.prepare('SELECT id FROM permissao_usuario WHERE UPPER(chave) = ?')
        .get(PERMISSAO_PAINEL);

    if (existe) {
        return;
    }

    db.transaction(() => {
        const { lastInsertRowid } = db.prepare(`
            INSERT INTO permissao_usuario (chave, descricao)
            VALUES (?, 'Acessar o painel administrativo')
        `).run(PERMISSAO_PAINEL);

        db.prepare(`
            INSERT OR IGNORE INTO permissao_tipo_usuario (id_tipo_usuario, id_permissao)
            SELECT id, ? FROM tipo_usuario WHERE UPPER(TRIM(tipo)) = 'ADMIN'
        `).run(lastInsertRowid);
    })();

    console.log(`Permissões: "${PERMISSAO_PAINEL}" criada e liberada para os tipos ADMIN.`);
}

// Middleware: exige a permissão de uma ação numa tela do painel.
// "tela" pode ser fixa ou vir da rota (ex.: req => req.params.tipo).
export function exigirPermissao(tela, acao) {
    return (req, res, next) => {
        const nomeTela = typeof tela === 'function' ? tela(req) : tela;
        const nomeAcao = typeof acao === 'function' ? acao(req) : acao;

        if (!pode(req.permissoes, nomeTela, nomeAcao)) {
            return res.status(403).json({
                sucesso: false,
                mensagem: 'Você não tem permissão para esta ação. Fale com um administrador.'
            });
        }

        return next();
    };
}

// Middleware: só entra no painel quem tem a permissão de acesso.
// Deixa as permissões em req.permissoes para as próximas verificações.
export function criarExigirAdmin(db) {
    return function exigirAdmin(req, res, next) {
        try {
            req.permissoes = permissoesDoUsuario(db, req.usuario);

            if (!req.permissoes.has(PERMISSAO_PAINEL)) {
                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Acesso restrito a administradores.'
                });
            }

            return next();

        } catch (erro) {
            console.error('Erro ao verificar acesso administrativo:', erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Não foi possível verificar o acesso.'
            });
        }
    };
}

export function registrarAdminInicio({ app, db, autenticar }) {
    garantirPermissaoPainel(db);

    const exigirAdmin = criarExigirAdmin(db);
    const protegido = [autenticar, exigirAdmin];

    const existeTabela = nome =>
        Boolean(
            db.prepare(`
                SELECT 1
                FROM sqlite_master
                WHERE type = 'table' AND name = ?
            `).get(nome)
        );

    // CONFIRMAR ACESSO

    app.get('/api/admin/eu', ...protegido, (req, res) => {
        return res.json({
            sucesso: true,
            usuario: {
                id: req.usuario.id,
                nome: req.usuario.nome,
                email: req.usuario.email
            },
            // As telas usam para esconder menu e botões sem permissão.
            permissoes: [...req.permissoes]
        });
    });

    // RESUMO DA TELA INICIAL (somente leitura)

    app.get('/api/admin/resumo', ...protegido, (req, res) => {
        // Cada número é independente: se uma tabela não existir,
        // só aquele cartão deixa de aparecer.
        const contar = sql => {
            try {
                return db.prepare(sql).get().n;
            } catch {
                return null;
            }
        };

        const cartoes = [
            {
                chave: 'produtos',
                rotulo: 'Produtos ativos',
                icone: 'fa-box',
                rota: 'produtos',
                valor: contar(`
                    SELECT COUNT(*) AS n FROM produtos WHERE status = 1
                `)
            },
            {
                chave: 'estoque-baixo',
                rotulo: 'Estoque baixo ou zerado',
                icone: 'fa-triangle-exclamation',
                rota: 'produtos',
                valor: contar(`
                    SELECT COUNT(*) AS n
                    FROM produtos p
                    LEFT JOIN produto_detalhes d ON d.id_produto = p.id
                    WHERE p.status = 1
                    AND p.estoque <= COALESCE(d.estoque_minimo, 0)
                `)
            },
            {
                chave: 'pedidos',
                rotulo: 'Pedidos aguardando pagamento',
                icone: 'fa-cart-shopping',
                rota: 'pedidos',
                valor: existeTabela('pedidos')
                    ? contar(`
                        SELECT COUNT(*) AS n
                        FROM pedidos
                        WHERE status = 'AGUARDANDO_PAGAMENTO'
                    `)
                    : null
            },
            {
                chave: 'agendamentos',
                rotulo: 'Agendamentos futuros',
                icone: 'fa-calendar-check',
                rota: 'agendamentos',
                valor: contar(`
                    SELECT COUNT(*) AS n
                    FROM agendamentos
                    WHERE status = 1
                    AND data_agendamento >= datetime('now', 'localtime')
                `)
            },
            {
                chave: 'clientes',
                rotulo: 'Usuários ativos',
                icone: 'fa-users',
                rota: 'usuarios',
                valor: contar(`
                    SELECT COUNT(*) AS n FROM usuarios WHERE status = 1
                `)
            },
            {
                chave: 'pets',
                rotulo: 'Pets cadastrados',
                icone: 'fa-paw',
                rota: 'pets',
                valor: contar(`
                    SELECT COUNT(*) AS n FROM pets WHERE status = 1
                `)
            },
            {
                chave: 'assinaturas',
                rotulo: 'Assinaturas ativas',
                icone: 'fa-id-card',
                rota: 'assinaturas',
                valor: contar(`
                    SELECT COUNT(*) AS n
                    FROM assinaturas_plano
                    WHERE status = 'ATIVA'
                `)
            }
        ].filter(cartao => cartao.valor !== null);

        return res.json({ sucesso: true, dados: cartoes });
    });

}
