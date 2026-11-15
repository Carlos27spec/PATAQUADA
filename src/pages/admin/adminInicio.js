// =====================================================
// ÁREA ADMINISTRATIVA — ETAPA 1: ACESSO E TELA INICIAL
//
// Rotas (todas exigem login de administrador):
//   GET /api/admin/eu      -> confirma o acesso e devolve o usuário
//   GET /api/admin/resumo  -> números exibidos na tela inicial
// =====================================================

// Quem é administrador (qualquer uma das regras libera):
//  1. o id do tipo de usuário está em ADMIN_TIPOS_USUARIO no .env
//     (ex.: ADMIN_TIPOS_USUARIO=1,2)
//  2. o nome ou o "tipo" do tipo_usuario contém "admin"
//     (ex.: "Administrador", "ADMIN")
//  3. o tipo de usuário tem a permissão ADMIN, ACESSO_ADMIN ou
//     ADMIN_PAINEL em permissao_tipo_usuario
export function criarExigirAdmin(db) {
    function ehAdministrador(usuario) {
        const idsConfigurados = String(process.env.ADMIN_TIPOS_USUARIO ?? '')
            .split(',')
            .map(valor => Number(valor.trim()))
            .filter(Number.isInteger);

        if (idsConfigurados.includes(usuario.id_tipo_usuario)) {
            return true;
        }

        const tipo = db.prepare(`
            SELECT nome, tipo
            FROM tipo_usuario
            WHERE id = ?
        `).get(usuario.id_tipo_usuario);

        if (!tipo) {
            return false;
        }

        if (/admin/i.test(`${tipo.nome} ${tipo.tipo}`)) {
            return true;
        }

        return Boolean(
            db.prepare(`
                SELECT 1
                FROM permissao_tipo_usuario ptu
                JOIN permissao_usuario pu ON pu.id = ptu.id_permissao
                WHERE ptu.id_tipo_usuario = ?
                AND UPPER(pu.chave) IN ('ADMIN', 'ACESSO_ADMIN', 'ADMIN_PAINEL')
            `).get(usuario.id_tipo_usuario)
        );
    }

    return function exigirAdmin(req, res, next) {
        try {
            if (!ehAdministrador(req.usuario)) {
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
            }
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

    console.log('Área administrativa: tela inicial disponível em /api/admin/*');
}
