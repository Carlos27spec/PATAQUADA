// =====================================================
// ÁREA DO CLIENTE — TELA INICIAL
//
// Rotas (exigem apenas estar logado, qualquer tipo de usuário):
//   GET /api/cliente/eu      -> confirma o login e devolve o usuário
//   GET /api/cliente/inicio  -> usuário + pedidos recentes
// Cada cliente só enxerga os próprios dados.
// =====================================================

import { permissoesDoUsuario } from '../admin/adminInicio.js';
import { PERMISSAO_PAINEL } from '../admin/permissoesAdmin.js';

export const STATUS_DO_PEDIDO = {
    AGUARDANDO_PAGAMENTO: { grupo: 'pendente', rotulo: 'Aguardando pagamento', detalhe: null },
    PAGO: { grupo: 'andamento', rotulo: 'Em andamento', detalhe: 'Pagamento confirmado' },
    EM_SEPARACAO: { grupo: 'andamento', rotulo: 'Em andamento', detalhe: 'Em separação' },
    ENVIADO: { grupo: 'andamento', rotulo: 'Em andamento', detalhe: 'Enviado' },
    ENTREGUE: { grupo: 'entregue', rotulo: 'Entregue', detalhe: null },
    CANCELADO: { grupo: 'cancelado', rotulo: 'Cancelado', detalhe: null },
    FALHOU: { grupo: 'cancelado', rotulo: 'Pagamento recusado', detalhe: null }
};

export function registrarAreaCliente({ app, db, autenticar }) {
    const existeTabela = nome =>
        Boolean(
            db.prepare(`
                SELECT 1
                FROM sqlite_master
                WHERE type = 'table' AND name = ?
            `).get(nome)
        );

    const dadosDoUsuario = usuario => ({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
    });

    // CONFIRMAR LOGIN

    app.get('/api/cliente/eu', autenticar, (req, res) => {
        return res.json({
            sucesso: true,
            usuario: {
                ...dadosDoUsuario(req.usuario),
                // Mostra o botão "Painel administrativo" no menu da conta.
                painel_admin: permissoesDoUsuario(db, req.usuario).has(PERMISSAO_PAINEL)
            }
        });
    });

    // TELA INICIAL

    app.get('/api/cliente/inicio', autenticar, (req, res) => {
        try {
            let pedidosRecentes = [];
            let totalPedidos = 0;

            if (existeTabela('pedidos') && existeTabela('itens_pedido')) {
                // Pedidos cancelados porque o pagamento nem chegou a ser
                // criado (falha técnica) não aparecem para o cliente.
                const visiveis = `
                    id_usuario_cliente = ?
                    AND NOT (status = 'CANCELADO' AND mp_preference_id IS NULL)
                `;

                totalPedidos = db.prepare(`
                    SELECT COUNT(*) AS n FROM pedidos WHERE ${visiveis}
                `).get(req.usuario.id).n;

                const pedidos = db.prepare(`
                    SELECT id, status, total, data_criacao
                    FROM pedidos
                    WHERE ${visiveis}
                    ORDER BY id DESC
                    LIMIT 3
                `).all(req.usuario.id);

                const buscarItens = db.prepare(`
                    SELECT nome, imagem, quantidade
                    FROM itens_pedido
                    WHERE id_pedido = ?
                    ORDER BY id
                    LIMIT 4
                `);

                pedidosRecentes = pedidos.map(pedido => ({
                    ...pedido,
                    ...(STATUS_DO_PEDIDO[pedido.status] ?? {
                        grupo: 'pendente',
                        rotulo: pedido.status,
                        detalhe: null
                    }),
                    itens: buscarItens.all(pedido.id)
                }));
            }

            return res.json({
                sucesso: true,
                usuario: dadosDoUsuario(req.usuario),
                pedidosRecentes,
                totalPedidos
            });

        } catch (erro) {
            console.error('Erro ao carregar a área do cliente:', erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Não foi possível carregar a sua área agora.'
            });
        }
    });

    console.log('Área do cliente: /api/cliente/* disponível.');
}
