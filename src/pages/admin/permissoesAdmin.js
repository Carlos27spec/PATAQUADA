// =====================================================
// PERMISSÕES DO PAINEL ADMINISTRATIVO
//
// Usado pelo SERVIDOR (bloqueia) e pelas TELAS (esconde menu e botões).
// As permissões de cada tipo de usuário ficam nas tabelas
// permissao_usuario + permissao_tipo_usuario (telas "Permissões" e
// "Permissões por tipo" do próprio painel).
// =====================================================

// Sem esta, o usuário nem entra no painel. Ela existe porque o Cliente
// também tem algumas permissões de "visualizar" (para os próprios dados).
export const PERMISSAO_PAINEL = 'PAINEL_ACESSAR'

// Tela (rota do menu) -> permissão de cada ação.
// ver: abrir a lista/registro | criar: botão "Novo" | editar: salvar
// alterações e imagens | excluir: botão "Excluir"
export const PERMISSOES_TELA = {
    produtos: { ver: 'PRODUTO_VISUALIZAR', criar: 'PRODUTO_CADASTRAR', editar: 'PRODUTO_EDITAR', excluir: 'PRODUTO_EXCLUIR' },
    categorias: { ver: 'PRODUTO_VISUALIZAR', criar: 'PRODUTO_CADASTRAR', editar: 'PRODUTO_EDITAR', excluir: 'PRODUTO_EXCLUIR' },
    fornecedores: { ver: 'FORNECEDOR_VISUALIZAR', criar: 'FORNECEDOR_CADASTRAR', editar: 'FORNECEDOR_EDITAR', excluir: 'FORNECEDOR_INATIVAR' },
    'produto-fornecedor': { ver: 'FORNECEDOR_VISUALIZAR', criar: 'FORNECEDOR_EDITAR', editar: 'FORNECEDOR_EDITAR', excluir: 'FORNECEDOR_EDITAR' },
    'movimentacoes-estoque': { ver: 'ESTOQUE_VISUALIZAR', criar: 'ESTOQUE_MOVIMENTAR', editar: 'ESTOQUE_MOVIMENTAR', excluir: 'ESTOQUE_MOVIMENTAR' },

    servicos: { ver: 'SERVICO_VISUALIZAR', criar: 'SERVICO_CADASTRAR', editar: 'SERVICO_EDITAR', excluir: 'SERVICO_EXCLUIR' },
    consultas: { ver: 'SERVICO_VISUALIZAR', criar: 'SERVICO_CADASTRAR', editar: 'SERVICO_EDITAR', excluir: 'SERVICO_EXCLUIR' },
    profissionais: { ver: 'SERVICO_VISUALIZAR', criar: 'SERVICO_CADASTRAR', editar: 'SERVICO_EDITAR', excluir: 'SERVICO_EXCLUIR' },
    planos: { ver: 'PLANO_VISUALIZAR', criar: 'PLANO_GERENCIAR', editar: 'PLANO_GERENCIAR', excluir: 'PLANO_GERENCIAR' },
    assinaturas: { ver: 'ASSINATURA_VISUALIZAR', criar: 'ASSINATURA_GERENCIAR', editar: 'ASSINATURA_GERENCIAR', excluir: 'ASSINATURA_GERENCIAR' },
    cobrancas: { ver: 'COBRANCA_VISUALIZAR', criar: 'COBRANCA_GERENCIAR', editar: 'COBRANCA_GERENCIAR', excluir: 'COBRANCA_GERENCIAR' },

    agendamentos: { ver: 'AGENDAMENTO_VISUALIZAR', criar: 'AGENDAMENTO_GERENCIAR', editar: 'AGENDAMENTO_GERENCIAR', excluir: 'AGENDAMENTO_GERENCIAR' },
    'historico-agendamentos': { ver: 'AGENDAMENTO_VISUALIZAR' },
    situacoes: { ver: 'AGENDAMENTO_VISUALIZAR', criar: 'AGENDAMENTO_GERENCIAR', editar: 'AGENDAMENTO_GERENCIAR', excluir: 'AGENDAMENTO_GERENCIAR' },

    usuarios: { ver: 'USUARIO_VISUALIZAR', criar: 'USUARIO_CADASTRAR', editar: 'USUARIO_EDITAR', excluir: 'USUARIO_EXCLUIR' },
    pets: { ver: 'USUARIO_VISUALIZAR', criar: 'USUARIO_CADASTRAR', editar: 'USUARIO_EDITAR', excluir: 'USUARIO_EXCLUIR' },
    enderecos: { ver: 'USUARIO_VISUALIZAR', criar: 'USUARIO_CADASTRAR', editar: 'USUARIO_EDITAR', excluir: 'USUARIO_EXCLUIR' },
    'tipos-usuario': { ver: 'USUARIO_VISUALIZAR', criar: 'USUARIO_EDITAR', editar: 'USUARIO_EDITAR', excluir: 'USUARIO_EXCLUIR' },
    permissoes: { ver: 'USUARIO_VISUALIZAR', criar: 'USUARIO_EDITAR', editar: 'USUARIO_EDITAR', excluir: 'USUARIO_EXCLUIR' },
    'permissoes-tipo': { ver: 'USUARIO_VISUALIZAR', criar: 'USUARIO_EDITAR', editar: 'USUARIO_EDITAR', excluir: 'USUARIO_EDITAR' },

    pedidos: { ver: 'PEDIDO_VISUALIZAR', editar: 'PEDIDO_GERENCIAR' },

    'dados-pataquada': { ver: 'DADOS_EMPRESA_EDITAR', editar: 'DADOS_EMPRESA_EDITAR' },
    configuracoes: { ver: 'CONFIGURACAO_EDITAR', criar: 'CONFIGURACAO_EDITAR', editar: 'CONFIGURACAO_EDITAR' }
}

// O usuário (lista de chaves) pode fazer a "acao" na "tela"?
// Telas fora do mapa só exigem o acesso ao painel.
export function pode(permissoes, tela, acao = 'ver') {
    const lista = permissoes instanceof Set ? permissoes : new Set(permissoes ?? [])

    if (!lista.has(PERMISSAO_PAINEL)) {
        return false
    }

    const regras = PERMISSOES_TELA[tela]

    if (!regras) {
        return true
    }

    const chave = regras[acao]

    // Ação que a tela não tem (ex.: excluir pedido) fica bloqueada.
    return Boolean(chave) && lista.has(chave)
}
