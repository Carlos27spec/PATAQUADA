// Rota da tela de login do site (para quem ainda não entrou).
export const ROTA_LOGIN = '/login'

// Menu lateral. As rotas (/admin/<rota>) correspondem aos cadastros
// que serão liberados nas próximas etapas.
export const GRUPOS_MENU = [
    {
        chave: 'produtos',
        titulo: 'Produtos',
        icone: 'fa-box-open',
        itens: [
            { rota: 'produtos', titulo: 'Produtos' },
            { rota: 'categorias', titulo: 'Categorias' },
            { rota: 'fornecedores', titulo: 'Fornecedores' },
            { rota: 'produto-fornecedor', titulo: 'Produtos × Fornecedores' },
            { rota: 'movimentacoes-estoque', titulo: 'Estoque' }
        ]
    },
    {
        chave: 'servicos',
        titulo: 'Serviços e Planos',
        icone: 'fa-paw',
        itens: [
            { rota: 'servicos', titulo: 'Serviços Pet Care' },
            { rota: 'consultas', titulo: 'Consultas' },
            { rota: 'profissionais', titulo: 'Profissionais' },
            { rota: 'planos', titulo: 'Planos' },
            { rota: 'assinaturas', titulo: 'Assinaturas' },
            { rota: 'cobrancas', titulo: 'Cobranças' }
        ]
    },
    {
        chave: 'atendimento',
        titulo: 'Atendimento',
        icone: 'fa-calendar-check',
        itens: [
            { rota: 'agendamentos', titulo: 'Agendamentos' },
            { rota: 'historico-agendamentos', titulo: 'Histórico' },
            { rota: 'situacoes', titulo: 'Situações' }
        ]
    },
    {
        chave: 'clientes',
        titulo: 'Clientes',
        icone: 'fa-users',
        itens: [
            { rota: 'usuarios', titulo: 'Usuários e clientes' },
            { rota: 'pets', titulo: 'Pets' },
            { rota: 'enderecos', titulo: 'Endereços' },
            { rota: 'tipos-usuario', titulo: 'Tipos de usuário' },
            { rota: 'permissoes', titulo: 'Permissões' },
            { rota: 'permissoes-tipo', titulo: 'Permissões por tipo' }
        ]
    },
    {
        chave: 'pedidos',
        titulo: 'Pedidos',
        icone: 'fa-cart-shopping',
        itens: [{ rota: 'pedidos', titulo: 'Pedidos' }]
    },
    {
        chave: 'configuracoes',
        titulo: 'Configurações',
        icone: 'fa-gear',
        itens: [
            { rota: 'dados-pataquada', titulo: 'Dados da PataQuada' },
            { rota: 'configuracoes', titulo: 'Configurações da loja' }
        ]
    }
]
