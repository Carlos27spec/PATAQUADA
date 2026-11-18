// =====================================================
// CADASTROS DO PAINEL ADMINISTRATIVO (menu "Produtos")
//
// Este arquivo é usado pelo SERVIDOR (validação e SQL) e pelas TELAS
// (formulário e lista). Para mudar um campo, mude só aqui.
//
// Tipos de campo:
//   texto, textoLongo, email, inteiro, dinheiro (centavos no banco,
//   reais na tela), decimal, selecao (opcoes fixas), referencia (id de
//   outra tabela), status (1 ativo / 0 inativo), booleano (sim/não),
//   cep, uf, telefone, cpfCnpj, imagem (arquivo salvo em src/images/<pasta>)
// =====================================================

export const UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export const CADASTROS = {

    // ---------------------------------------------------
    categorias: {
        tabela: 'categorias_produto',
        titulo: 'Categorias',
        singular: 'categoria',
        novo: 'Nova categoria',
        descricao: 'Organize os produtos da loja em categorias.',
        icone: 'fa-tags',
        permiteExcluir: false,
        imagem: { campo: 'imagem', pasta: 'categorias', nomeBase: 'nome' },
        ordem: 'nome',
        busca: ['nome', 'descricao'],
        campos: [
            { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 80, largura: 'inteira' },
            { nome: 'status', rotulo: 'Situação', tipo: 'status' },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo', max: 1000, largura: 'inteira' },
            { nome: 'imagem', rotulo: 'Imagem', tipo: 'imagem' }
        ],
        colunas: [
            { campo: 'imagem', rotulo: '', tipo: 'imagem' },
            { campo: 'nome', rotulo: 'Categoria', destaque: true },
            { campo: 'total_produtos', rotulo: 'Produtos', tipo: 'numero' },
            { campo: 'status', rotulo: 'Situação', tipo: 'status' }
        ],
        sqlLista: `
            SELECT c.*,
                (SELECT COUNT(*) FROM produtos p WHERE p.id_categoria_produto = c.id) AS total_produtos
            FROM categorias_produto c
        `
    },

    // ---------------------------------------------------
    fornecedores: {
        tabela: 'fornecedores',
        titulo: 'Fornecedores',
        singular: 'fornecedor',
        novo: 'Novo fornecedor',
        descricao: 'Empresas e pessoas que fornecem produtos para a loja.',
        icone: 'fa-truck-field',
        permiteExcluir: false,
        ordem: 'razao_social',
        busca: ['razao_social', 'nome_fantasia', 'cpf_cnpj', 'cidade', 'nome_contato'],
        secoes: ['Identificação', 'Contato', 'Endereço', 'Compras'],
        campos: [
            {
                nome: 'tipo_pessoa', rotulo: 'Tipo', tipo: 'selecao', secao: 'Identificação', padrao: 'JURIDICA',
                opcoes: [
                    { valor: 'JURIDICA', rotulo: 'Pessoa jurídica (CNPJ)' },
                    { valor: 'FISICA', rotulo: 'Pessoa física (CPF)' }
                ]
            },
            { nome: 'status', rotulo: 'Situação', tipo: 'status', secao: 'Identificação' },
            { nome: 'razao_social', rotulo: 'Razão social / Nome', tipo: 'texto', obrigatorio: true, max: 150, largura: 'inteira', secao: 'Identificação' },
            { nome: 'nome_fantasia', rotulo: 'Nome fantasia', tipo: 'texto', max: 150, secao: 'Identificação' },
            { nome: 'cpf_cnpj', rotulo: 'CPF / CNPJ', tipo: 'cpfCnpj', secao: 'Identificação' },
            { nome: 'inscricao_estadual', rotulo: 'Inscrição estadual', tipo: 'texto', max: 30, secao: 'Identificação' },

            { nome: 'nome_contato', rotulo: 'Pessoa de contato', tipo: 'texto', max: 100, secao: 'Contato' },
            { nome: 'email', rotulo: 'E-mail', tipo: 'email', secao: 'Contato' },
            { nome: 'telefone', rotulo: 'Telefone', tipo: 'telefone', secao: 'Contato' },
            { nome: 'celular', rotulo: 'Celular / WhatsApp', tipo: 'telefone', secao: 'Contato' },
            { nome: 'site', rotulo: 'Site', tipo: 'texto', max: 200, secao: 'Contato' },

            { nome: 'cep', rotulo: 'CEP', tipo: 'cep', secao: 'Endereço', dica: 'Preenche o endereço automaticamente.' },
            { nome: 'logradouro', rotulo: 'Rua', tipo: 'texto', max: 150, secao: 'Endereço' },
            { nome: 'numero', rotulo: 'Número', tipo: 'texto', max: 15, secao: 'Endereço' },
            { nome: 'complemento', rotulo: 'Complemento', tipo: 'texto', max: 80, secao: 'Endereço' },
            { nome: 'bairro', rotulo: 'Bairro', tipo: 'texto', max: 80, secao: 'Endereço' },
            { nome: 'cidade', rotulo: 'Cidade', tipo: 'texto', max: 80, secao: 'Endereço' },
            { nome: 'uf', rotulo: 'UF', tipo: 'uf', secao: 'Endereço' },
            { nome: 'pais', rotulo: 'País', tipo: 'texto', max: 60, padrao: 'Brasil', secao: 'Endereço' },

            { nome: 'prazo_entrega_dias', rotulo: 'Prazo de entrega (dias)', tipo: 'inteiro', secao: 'Compras' },
            { nome: 'condicao_pagamento', rotulo: 'Condição de pagamento', tipo: 'texto', max: 100, secao: 'Compras', dica: 'Ex.: 30/60 dias, à vista no Pix.' },
            { nome: 'observacoes', rotulo: 'Observações', tipo: 'textoLongo', max: 2000, largura: 'inteira', secao: 'Compras' }
        ],
        colunas: [
            { campo: 'razao_social', rotulo: 'Fornecedor', destaque: true, sub: 'nome_fantasia' },
            { campo: 'cpf_cnpj', rotulo: 'CPF / CNPJ', tipo: 'cpfCnpj' },
            { campo: 'telefone', rotulo: 'Telefone', tipo: 'telefone' },
            { campo: 'cidade_uf', rotulo: 'Cidade' },
            { campo: 'total_produtos', rotulo: 'Produtos', tipo: 'numero' },
            { campo: 'status', rotulo: 'Situação', tipo: 'status' }
        ],
        sqlLista: `
            SELECT f.*,
                CASE WHEN f.cidade IS NOT NULL THEN f.cidade || COALESCE('/' || f.uf, '') END AS cidade_uf,
                (SELECT COUNT(*) FROM produto_fornecedor pf WHERE pf.id_fornecedor = f.id) AS total_produtos
            FROM fornecedores f
        `
    },

    // ---------------------------------------------------
    'produto-fornecedor': {
        tabela: 'produto_fornecedor',
        titulo: 'Produtos × Fornecedores',
        singular: 'vínculo',
        novo: 'Novo vínculo',
        descricao: 'Quais fornecedores vendem cada produto, por qual custo e prazo.',
        icone: 'fa-link',
        permiteExcluir: true,
        ordem: 'produto_nome, fornecedor_nome',
        busca: ['produto_nome', 'fornecedor_nome', 'codigo_produto_fornecedor'],
        campos: [
            { nome: 'id_produto', rotulo: 'Produto', tipo: 'referencia', referencia: 'produtos', obrigatorio: true, largura: 'inteira' },
            { nome: 'id_fornecedor', rotulo: 'Fornecedor', tipo: 'referencia', referencia: 'fornecedores', obrigatorio: true, largura: 'inteira' },
            { nome: 'codigo_produto_fornecedor', rotulo: 'Código do produto no fornecedor', tipo: 'texto', max: 60 },
            { nome: 'custo_atual', rotulo: 'Custo atual (R$)', tipo: 'dinheiro', padrao: 0 },
            { nome: 'prazo_entrega_dias', rotulo: 'Prazo de entrega (dias)', tipo: 'inteiro' },
            { nome: 'fornecedor_principal', rotulo: 'Fornecedor principal deste produto?', tipo: 'booleano', dica: 'Só um fornecedor pode ser o principal de cada produto.' },
            { nome: 'observacoes', rotulo: 'Observações', tipo: 'textoLongo', max: 1000, largura: 'inteira' }
        ],
        colunas: [
            { campo: 'produto_nome', rotulo: 'Produto', destaque: true },
            { campo: 'fornecedor_nome', rotulo: 'Fornecedor' },
            { campo: 'custo_atual', rotulo: 'Custo', tipo: 'dinheiro' },
            { campo: 'prazo_entrega_dias', rotulo: 'Prazo (dias)', tipo: 'numero' },
            { campo: 'fornecedor_principal', rotulo: 'Principal', tipo: 'simNao' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT pf.*,
                    p.nome AS produto_nome,
                    COALESCE(f.nome_fantasia, f.razao_social) AS fornecedor_nome
                FROM produto_fornecedor pf
                JOIN produtos p ON p.id = pf.id_produto
                JOIN fornecedores f ON f.id = pf.id_fornecedor
            )
        `,
        mensagensUnicas: {
            'produto_fornecedor.id_produto, produto_fornecedor.id_fornecedor':
                'Esse fornecedor já está vinculado a esse produto.'
        }
    },

    // ---------------------------------------------------
    // Movimentações não são editadas nem apagadas: para corrigir,
    // lance uma movimentação contrária (ex.: AJUSTE).
    'movimentacoes-estoque': {
        tabela: 'movimentacoes_estoque',
        titulo: 'Estoque',
        singular: 'movimentação',
        novo: 'Nova movimentação',
        descricao: 'Entradas e saídas de estoque. Cada movimentação atualiza o estoque do produto.',
        icone: 'fa-boxes-stacked',
        somenteInclusao: true,
        permiteExcluir: false,
        ordem: 'data_movimentacao DESC, id DESC',
        busca: ['produto_nome', 'fornecedor_nome', 'numero_documento', 'motivo'],
        campos: [
            { nome: 'id_produto', rotulo: 'Produto', tipo: 'referencia', referencia: 'produtos', obrigatorio: true, largura: 'inteira' },
            {
                nome: 'tipo', rotulo: 'Tipo', tipo: 'selecao', obrigatorio: true, padrao: 'ENTRADA',
                opcoes: [
                    { valor: 'ENTRADA', rotulo: 'Entrada (soma ao estoque)' },
                    { valor: 'SAIDA', rotulo: 'Saída (tira do estoque)' }
                ]
            },
            {
                nome: 'origem', rotulo: 'Origem', tipo: 'selecao', obrigatorio: true, padrao: 'COMPRA',
                opcoes: [
                    { valor: 'COMPRA', rotulo: 'Compra' },
                    { valor: 'VENDA', rotulo: 'Venda' },
                    { valor: 'DEVOLUCAO', rotulo: 'Devolução' },
                    { valor: 'AJUSTE', rotulo: 'Ajuste de inventário' },
                    { valor: 'PERDA', rotulo: 'Perda / avaria' },
                    { valor: 'TROCA', rotulo: 'Troca' },
                    { valor: 'MANUAL', rotulo: 'Manual' }
                ]
            },
            { nome: 'quantidade', rotulo: 'Quantidade', tipo: 'inteiro', obrigatorio: true, minimo: 1 },
            { nome: 'custo_unitario', rotulo: 'Custo unitário (R$)', tipo: 'dinheiro', dica: 'Opcional. Útil nas compras.' },
            { nome: 'id_fornecedor', rotulo: 'Fornecedor', tipo: 'referencia', referencia: 'fornecedores' },
            { nome: 'numero_documento', rotulo: 'Nº do documento (nota fiscal, pedido...)', tipo: 'texto', max: 60 },
            { nome: 'motivo', rotulo: 'Motivo', tipo: 'texto', max: 150, largura: 'inteira' },
            { nome: 'observacoes', rotulo: 'Observações', tipo: 'textoLongo', max: 1000, largura: 'inteira' }
        ],
        colunas: [
            { campo: 'data_movimentacao', rotulo: 'Data', tipo: 'dataHora' },
            { campo: 'produto_nome', rotulo: 'Produto', destaque: true, sub: 'motivo' },
            { campo: 'tipo', rotulo: 'Tipo', tipo: 'tipoMovimentacao' },
            { campo: 'origem_rotulo', rotulo: 'Origem' },
            { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero' },
            { campo: 'estoque_resultado', rotulo: 'Estoque (antes → depois)' },
            { campo: 'responsavel_nome', rotulo: 'Responsável' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT m.*,
                    p.nome AS produto_nome,
                    COALESCE(f.nome_fantasia, f.razao_social) AS fornecedor_nome,
                    u.nome AS responsavel_nome,
                    CASE m.origem
                        WHEN 'COMPRA' THEN 'Compra' WHEN 'VENDA' THEN 'Venda'
                        WHEN 'DEVOLUCAO' THEN 'Devolução' WHEN 'AJUSTE' THEN 'Ajuste'
                        WHEN 'PERDA' THEN 'Perda' WHEN 'TROCA' THEN 'Troca'
                        ELSE 'Manual'
                    END AS origem_rotulo,
                    m.estoque_anterior || ' → ' || m.estoque_posterior AS estoque_resultado
                FROM movimentacoes_estoque m
                JOIN produtos p ON p.id = m.id_produto
                LEFT JOIN fornecedores f ON f.id = m.id_fornecedor
                LEFT JOIN usuarios u ON u.id = m.id_usuario_responsavel
            )
        `
    },

    // =====================================================
    // SERVIÇOS E PLANOS
    // =====================================================

    servicos: {
        tabela: 'servicos',
        titulo: 'Serviços Pet Care',
        singular: 'serviço',
        novo: 'Novo serviço',
        descricao: 'Banho, tosa e demais serviços oferecidos no Pet Care.',
        permiteExcluir: false,
        usuarioCadastro: 'id_usuario_cadastro',
        imagem: { campo: 'imagem', pasta: 'servicos', nomeBase: 'nome' },
        ordem: 'nome',
        busca: ['nome', 'descricao', 'categoria_nome'],
        campos: [
            { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 100, largura: 'inteira' },
            { nome: 'id_categoria_produto', rotulo: 'Categoria', tipo: 'referencia', referencia: 'categorias', obrigatorio: true },
            { nome: 'status', rotulo: 'Situação', tipo: 'status' },
            { nome: 'preco', rotulo: 'Preço (R$)', tipo: 'dinheiro', obrigatorio: true },
            { nome: 'duracao_media', rotulo: 'Duração média (minutos)', tipo: 'inteiro', obrigatorio: true, minimo: 1 },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo', max: 1000 },
            { nome: 'imagem', rotulo: 'Imagem', tipo: 'imagem' }
        ],
        colunas: [
            { campo: 'imagem', rotulo: '', tipo: 'imagem' },
            { campo: 'nome', rotulo: 'Serviço', destaque: true, sub: 'categoria_nome' },
            { campo: 'preco', rotulo: 'Preço', tipo: 'dinheiro' },
            { campo: 'duracao_media', rotulo: 'Duração (min)', tipo: 'numero' },
            { campo: 'status', rotulo: 'Situação', tipo: 'status' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT s.*, c.nome AS categoria_nome
                FROM servicos s
                LEFT JOIN categorias_produto c ON c.id = s.id_categoria_produto
            )
        `
    },

    consultas: {
        tabela: 'tipos_consulta',
        titulo: 'Consultas',
        singular: 'consulta',
        novo: 'Nova consulta',
        descricao: 'Tipos de consulta veterinária. Use preço fixo OU uma faixa de preço.',
        permiteExcluir: false,
        usuarioCadastro: 'id_usuario_cadastro',
        ordem: 'nome',
        busca: ['nome', 'descricao', 'categoria_nome'],
        mensagemCheck: 'Informe um preço fixo OU uma faixa de preço (o máximo deve ser maior ou igual ao mínimo).',
        campos: [
            { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 100, largura: 'inteira' },
            { nome: 'id_categoria_produto', rotulo: 'Categoria', tipo: 'referencia', referencia: 'categorias', obrigatorio: true },
            { nome: 'status', rotulo: 'Situação', tipo: 'status' },
            { nome: 'preco_fixo', rotulo: 'Preço fixo (R$)', tipo: 'dinheiro', dica: 'Preenchendo aqui, a faixa abaixo é ignorada.' },
            { nome: 'duracao_media', rotulo: 'Duração média (minutos)', tipo: 'inteiro', minimo: 1 },
            { nome: 'preco_minimo', rotulo: 'Preço mínimo (R$)', tipo: 'dinheiro', padrao: 0 },
            { nome: 'preco_maximo', rotulo: 'Preço máximo (R$)', tipo: 'dinheiro', padrao: 0 },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo', max: 1000 }
        ],
        colunas: [
            { campo: 'nome', rotulo: 'Consulta', destaque: true, sub: 'categoria_nome' },
            { campo: 'preco_texto', rotulo: 'Preço' },
            { campo: 'duracao_media', rotulo: 'Duração (min)', tipo: 'numero' },
            { campo: 'status', rotulo: 'Situação', tipo: 'status' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT t.*, c.nome AS categoria_nome,
                    CASE
                        WHEN t.preco_fixo IS NOT NULL THEN 'R$ ' || printf('%.2f', t.preco_fixo / 100.0)
                        WHEN t.preco_maximo > 0 THEN 'R$ ' || printf('%.2f', t.preco_minimo / 100.0)
                            || ' a R$ ' || printf('%.2f', t.preco_maximo / 100.0)
                        ELSE 'Sob consulta'
                    END AS preco_texto
                FROM tipos_consulta t
                LEFT JOIN categorias_produto c ON c.id = t.id_categoria_produto
            )
        `
    },

    profissionais: {
        tabela: 'profissionais',
        titulo: 'Profissionais',
        singular: 'profissional',
        novo: 'Novo profissional',
        descricao: 'Veterinários, tosadores e demais profissionais dos atendimentos.',
        permiteExcluir: false,
        ordem: 'nome, sobrenome',
        busca: ['nome', 'sobrenome', 'especialidade', 'email'],
        campos: [
            { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 60 },
            { nome: 'sobrenome', rotulo: 'Sobrenome', tipo: 'texto', obrigatorio: true, max: 80 },
            { nome: 'especialidade', rotulo: 'Especialidade', tipo: 'texto', max: 80 },
            { nome: 'status', rotulo: 'Situação', tipo: 'status' },
            { nome: 'cpf', rotulo: 'CPF', tipo: 'cpfCnpj' },
            { nome: 'telefone', rotulo: 'Telefone', tipo: 'telefone' },
            { nome: 'email', rotulo: 'E-mail', tipo: 'email' },
            { nome: 'id_usuario', rotulo: 'Usuário do sistema (opcional)', tipo: 'referencia', referencia: 'usuarios', dica: 'Se o profissional também entra no site.' },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo', max: 1000 }
        ],
        colunas: [
            { campo: 'nome_completo', rotulo: 'Profissional', destaque: true, sub: 'especialidade' },
            { campo: 'telefone', rotulo: 'Telefone', tipo: 'telefone' },
            { campo: 'email', rotulo: 'E-mail' },
            { campo: 'status', rotulo: 'Situação', tipo: 'status' }
        ],
        sqlLista: `SELECT p.*, p.nome || ' ' || p.sobrenome AS nome_completo FROM profissionais p`
    },

    planos: {
        tabela: 'plano',
        titulo: 'Planos',
        singular: 'plano',
        novo: 'Novo plano',
        descricao: 'Planos de assinatura oferecidos aos clientes.',
        permiteExcluir: false,
        ordem: 'valor',
        busca: ['nome', 'descricao', 'beneficios'],
        campos: [
            { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 80, largura: 'inteira' },
            { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'dinheiro', obrigatorio: true },
            {
                nome: 'periodicidade', rotulo: 'Periodicidade', tipo: 'selecao', obrigatorio: true, padrao: 'MENSAL',
                opcoes: [
                    { valor: 'MENSAL', rotulo: 'Mensal' },
                    { valor: 'TRIMESTRAL', rotulo: 'Trimestral' },
                    { valor: 'SEMESTRAL', rotulo: 'Semestral' },
                    { valor: 'ANUAL', rotulo: 'Anual' }
                ]
            },
            { nome: 'status', rotulo: 'Situação', tipo: 'status' },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo', max: 1000 },
            { nome: 'beneficios', rotulo: 'Benefícios', tipo: 'textoLongo', max: 2000, dica: 'Um benefício por linha.' }
        ],
        colunas: [
            { campo: 'nome', rotulo: 'Plano', destaque: true },
            { campo: 'valor', rotulo: 'Valor', tipo: 'dinheiro' },
            { campo: 'periodicidade', rotulo: 'Periodicidade', tipo: 'rotulo' },
            { campo: 'total_assinaturas', rotulo: 'Assinaturas', tipo: 'numero' },
            { campo: 'status', rotulo: 'Situação', tipo: 'status' }
        ],
        sqlLista: `
            SELECT p.*,
                (SELECT COUNT(*) FROM assinaturas_plano a WHERE a.id_plano = p.id) AS total_assinaturas
            FROM plano p
        `
    },

    assinaturas: {
        tabela: 'assinaturas_plano',
        titulo: 'Assinaturas',
        singular: 'assinatura',
        novo: 'Nova assinatura',
        descricao: 'Planos contratados pelos clientes para os seus pets.',
        permiteExcluir: false,
        clienteDoPet: true,
        ordem: 'id DESC',
        busca: ['cliente_nome', 'pet_nome', 'plano_nome'],
        mensagemCheck: 'Confira as datas (o fim não pode ser antes do início) e, em cobrança única, desmarque a renovação automática e o cancelamento ao fim da vigência.',
        secoes: ['Contrato', 'Vigência', 'Cancelamento'],
        campos: [
            { nome: 'id_plano', rotulo: 'Plano', tipo: 'referencia', referencia: 'planos', obrigatorio: true, secao: 'Contrato' },
            { nome: 'id_pet', rotulo: 'Pet (cliente)', tipo: 'referencia', referencia: 'pets', obrigatorio: true, secao: 'Contrato' },
            { nome: 'valor_contratado', rotulo: 'Valor contratado (R$)', tipo: 'dinheiro', secao: 'Contrato', dica: 'Vazio = valor atual do plano.' },
            {
                nome: 'tipo_cobranca', rotulo: 'Cobrança', tipo: 'selecao', obrigatorio: true, padrao: 'RECORRENTE', secao: 'Contrato',
                opcoes: [
                    { valor: 'RECORRENTE', rotulo: 'Recorrente' },
                    { valor: 'UNICA', rotulo: 'Única' }
                ]
            },
            {
                nome: 'status', rotulo: 'Situação', tipo: 'selecao', obrigatorio: true, padrao: 'AGUARDANDO', secao: 'Contrato',
                opcoes: [
                    { valor: 'AGUARDANDO', rotulo: 'Aguardando' },
                    { valor: 'ATIVA', rotulo: 'Ativa' },
                    { valor: 'INADIMPLENTE', rotulo: 'Inadimplente' },
                    { valor: 'SUSPENSA', rotulo: 'Suspensa' },
                    { valor: 'CANCELADA', rotulo: 'Cancelada' },
                    { valor: 'ENCERRADA', rotulo: 'Encerrada' }
                ]
            },
            { nome: 'data_inicio', rotulo: 'Início', tipo: 'data', obrigatorio: true, secao: 'Vigência' },
            { nome: 'data_fim_vigencia', rotulo: 'Fim da vigência', tipo: 'data', obrigatorio: true, secao: 'Vigência' },
            { nome: 'data_fim_prevista', rotulo: 'Fim previsto', tipo: 'data', secao: 'Vigência' },
            { nome: 'proxima_cobranca', rotulo: 'Próxima cobrança', tipo: 'data', secao: 'Vigência' },
            { nome: 'renovacao_automatica', rotulo: 'Renovar automaticamente', tipo: 'booleano', secao: 'Vigência' },
            { nome: 'cancelar_ao_fim_vigencia', rotulo: 'Cancelar ao fim da vigência', tipo: 'booleano', secao: 'Cancelamento' },
            { nome: 'data_solicitacao_cancelamento', rotulo: 'Pedido de cancelamento em', tipo: 'data', secao: 'Cancelamento' },
            { nome: 'data_encerramento', rotulo: 'Encerrada em', tipo: 'data', secao: 'Cancelamento' },
            { nome: 'motivo_cancelamento', rotulo: 'Motivo do cancelamento', tipo: 'textoLongo', max: 500, secao: 'Cancelamento' }
        ],
        colunas: [
            { campo: 'cliente_nome', rotulo: 'Cliente', destaque: true, sub: 'pet_nome' },
            { campo: 'plano_nome', rotulo: 'Plano' },
            { campo: 'valor_contratado', rotulo: 'Valor', tipo: 'dinheiro' },
            { campo: 'data_inicio', rotulo: 'Início', tipo: 'data' },
            { campo: 'data_fim_vigencia', rotulo: 'Vigência até', tipo: 'data' },
            { campo: 'status', rotulo: 'Situação', tipo: 'rotulo' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT a.*, u.nome AS cliente_nome, 'Pet: ' || pt.nome AS pet_nome, p.nome AS plano_nome
                FROM assinaturas_plano a
                JOIN usuarios u ON u.id = a.id_usuario_cliente
                JOIN pets pt ON pt.id = a.id_pet
                JOIN plano p ON p.id = a.id_plano
            )
        `
    },

    cobrancas: {
        tabela: 'cobrancas_assinatura',
        titulo: 'Cobranças',
        singular: 'cobrança',
        novo: 'Nova cobrança',
        descricao: 'Cobranças de cada ciclo das assinaturas.',
        permiteExcluir: false,
        ordem: 'data_vencimento DESC',
        busca: ['cliente_nome', 'plano_nome', 'competencia', 'codigo_transacao'],
        mensagensUnicas: {
            'cobrancas_assinatura.id_assinatura, cobrancas_assinatura.numero_ciclo': 'Essa assinatura já tem uma cobrança com esse número de ciclo.',
            'cobrancas_assinatura.id_assinatura, cobrancas_assinatura.competencia': 'Essa assinatura já tem uma cobrança nessa competência.'
        },
        campos: [
            { nome: 'id_assinatura', rotulo: 'Assinatura', tipo: 'referencia', referencia: 'assinaturas', obrigatorio: true, largura: 'inteira' },
            { nome: 'numero_ciclo', rotulo: 'Nº do ciclo', tipo: 'inteiro', obrigatorio: true, minimo: 1 },
            { nome: 'competencia', rotulo: 'Competência (mês)', tipo: 'mes', obrigatorio: true },
            { nome: 'valor', rotulo: 'Valor (R$)', tipo: 'dinheiro', obrigatorio: true },
            { nome: 'data_vencimento', rotulo: 'Vencimento', tipo: 'data', obrigatorio: true },
            {
                nome: 'status', rotulo: 'Situação', tipo: 'selecao', obrigatorio: true, padrao: 'PENDENTE',
                opcoes: [
                    { valor: 'PENDENTE', rotulo: 'Pendente' },
                    { valor: 'PAGA', rotulo: 'Paga' },
                    { valor: 'ATRASADA', rotulo: 'Atrasada' },
                    { valor: 'CANCELADA', rotulo: 'Cancelada' },
                    { valor: 'FALHOU', rotulo: 'Falhou' }
                ]
            },
            { nome: 'data_pagamento', rotulo: 'Pago em', tipo: 'data' },
            { nome: 'tentativas', rotulo: 'Tentativas de cobrança', tipo: 'inteiro', padrao: 0 },
            { nome: 'codigo_transacao', rotulo: 'Código da transação', tipo: 'texto', max: 100 },
            { nome: 'observacao', rotulo: 'Observação', tipo: 'textoLongo', max: 500 }
        ],
        colunas: [
            { campo: 'cliente_nome', rotulo: 'Cliente', destaque: true, sub: 'plano_nome' },
            { campo: 'competencia', rotulo: 'Competência' },
            { campo: 'valor', rotulo: 'Valor', tipo: 'dinheiro' },
            { campo: 'data_vencimento', rotulo: 'Vencimento', tipo: 'data' },
            { campo: 'status', rotulo: 'Situação', tipo: 'rotulo' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT c.*, u.nome AS cliente_nome, p.nome || ' · ciclo ' || c.numero_ciclo AS plano_nome
                FROM cobrancas_assinatura c
                JOIN assinaturas_plano a ON a.id = c.id_assinatura
                JOIN usuarios u ON u.id = a.id_usuario_cliente
                JOIN plano p ON p.id = a.id_plano
            )
        `
    },

    // =====================================================
    // ATENDIMENTO
    // =====================================================

    agendamentos: {
        tabela: 'agendamentos',
        titulo: 'Agendamentos',
        singular: 'agendamento',
        novo: 'Novo agendamento',
        descricao: 'Serviços e consultas agendados. Mudanças de situação ficam no histórico.',
        permiteExcluir: false,
        clienteDoPet: true,
        historico: true,
        ordem: 'data_agendamento DESC',
        busca: ['cliente_nome', 'pet_nome', 'atendimento', 'profissional_nome', 'situacao_nome'],
        campos: [
            { nome: 'id_pet', rotulo: 'Pet (cliente)', tipo: 'referencia', referencia: 'pets', obrigatorio: true, largura: 'inteira' },
            { nome: 'id_servico', rotulo: 'Serviço', tipo: 'referencia', referencia: 'servicos', dica: 'Escolha um serviço OU uma consulta.' },
            { nome: 'id_tipo_consulta', rotulo: 'Consulta', tipo: 'referencia', referencia: 'consultas' },
            { nome: 'data_agendamento', rotulo: 'Data e hora', tipo: 'dataHora', obrigatorio: true },
            { nome: 'id_profissional', rotulo: 'Profissional', tipo: 'referencia', referencia: 'profissionais' },
            { nome: 'id_situacao', rotulo: 'Situação do atendimento', tipo: 'referencia', referencia: 'situacoesAgendamento', obrigatorio: true },
            { nome: 'status', rotulo: 'Registro', tipo: 'status' },
            { nome: 'observacoes', rotulo: 'Observações', tipo: 'textoLongo', max: 1000 }
        ],
        colunas: [
            { campo: 'data_agendamento', rotulo: 'Data', tipo: 'dataHora', local: true },
            { campo: 'cliente_nome', rotulo: 'Cliente', destaque: true, sub: 'pet_nome' },
            { campo: 'atendimento', rotulo: 'Atendimento' },
            { campo: 'profissional_nome', rotulo: 'Profissional' },
            { campo: 'situacao_nome', rotulo: 'Situação', tipo: 'rotulo' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT a.*, u.nome AS cliente_nome, 'Pet: ' || pt.nome AS pet_nome,
                    COALESCE(s.nome, t.nome) AS atendimento,
                    pr.nome || ' ' || pr.sobrenome AS profissional_nome,
                    si.nome AS situacao_nome
                FROM agendamentos a
                JOIN usuarios u ON u.id = a.id_usuario_cliente
                JOIN pets pt ON pt.id = a.id_pet
                LEFT JOIN servicos s ON s.id = a.id_servico
                LEFT JOIN tipos_consulta t ON t.id = a.id_tipo_consulta
                LEFT JOIN profissionais pr ON pr.id = a.id_profissional
                LEFT JOIN situacao si ON si.id = a.id_situacao
            )
        `
    },

    'historico-agendamentos': {
        tabela: 'agendamento_historico',
        titulo: 'Histórico de agendamentos',
        singular: 'registro',
        descricao: 'Todas as mudanças de situação dos agendamentos (só consulta).',
        somenteLeitura: true,
        ordem: 'data_alteracao DESC, id DESC',
        busca: ['cliente_nome', 'pet_nome', 'situacao_anterior', 'situacao_nova', 'responsavel_nome'],
        campos: [],
        colunas: [
            { campo: 'data_alteracao', rotulo: 'Data', tipo: 'dataHora' },
            { campo: 'agendamento', rotulo: 'Agendamento', destaque: true, sub: 'pet_nome' },
            { campo: 'cliente_nome', rotulo: 'Cliente' },
            { campo: 'mudanca', rotulo: 'Situação' },
            { campo: 'responsavel_nome', rotulo: 'Responsável' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT h.*, '#' || a.id || ' · ' || COALESCE(s.nome, t.nome) AS agendamento,
                    'Pet: ' || pt.nome AS pet_nome, u.nome AS cliente_nome,
                    COALESCE(sa.nome || ' → ', '') || sn.nome AS mudanca,
                    sa.nome AS situacao_anterior, sn.nome AS situacao_nova,
                    r.nome AS responsavel_nome
                FROM agendamento_historico h
                JOIN agendamentos a ON a.id = h.id_agendamento
                JOIN pets pt ON pt.id = a.id_pet
                JOIN usuarios u ON u.id = a.id_usuario_cliente
                LEFT JOIN servicos s ON s.id = a.id_servico
                LEFT JOIN tipos_consulta t ON t.id = a.id_tipo_consulta
                LEFT JOIN situacao sa ON sa.id = h.id_situacao_anterior
                JOIN situacao sn ON sn.id = h.id_situacao_nova
                LEFT JOIN usuarios r ON r.id = h.id_usuario_responsavel
            )
        `
    },

    situacoes: {
        tabela: 'situacao',
        titulo: 'Situações',
        singular: 'situação',
        novo: 'Nova situação',
        descricao: 'Etapas usadas nos agendamentos e nas assinaturas.',
        permiteExcluir: false,
        ordem: 'tipo, nome',
        busca: ['nome', 'descricao', 'tipo'],
        mensagensUnicas: { 'situacao.nome, situacao.tipo': 'Já existe uma situação com esse nome para esse tipo.' },
        campos: [
            { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 60 },
            {
                nome: 'tipo', rotulo: 'Usada em', tipo: 'selecao', obrigatorio: true, padrao: 'AGENDAMENTO',
                opcoes: [
                    { valor: 'AGENDAMENTO', rotulo: 'Agendamentos' },
                    { valor: 'ASSINATURA', rotulo: 'Assinaturas' }
                ]
            },
            { nome: 'status', rotulo: 'Situação', tipo: 'status' },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo', max: 500 }
        ],
        colunas: [
            { campo: 'nome', rotulo: 'Situação', destaque: true, sub: 'descricao' },
            { campo: 'tipo', rotulo: 'Usada em', tipo: 'rotulo' },
            { campo: 'status', rotulo: 'Ativa', tipo: 'status' }
        ],
        sqlLista: 'SELECT * FROM situacao'
    },

    // =====================================================
    // CLIENTES
    // =====================================================

    usuarios: {
        tabela: 'usuarios',
        titulo: 'Usuários e clientes',
        singular: 'usuário',
        novo: 'Novo usuário',
        descricao: 'Contas de acesso ao site (clientes e equipe).',
        permiteExcluir: false,
        ocultar: ['senha'],
        ordem: 'nome',
        busca: ['nome', 'email', 'cpf', 'usuario', 'tipo_nome'],
        campos: [
            { nome: 'nome', rotulo: 'Nome completo', tipo: 'texto', obrigatorio: true, max: 120, largura: 'inteira' },
            { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true },
            { nome: 'id_tipo_usuario', rotulo: 'Tipo de usuário', tipo: 'referencia', referencia: 'tiposUsuario', obrigatorio: true },
            { nome: 'cpf', rotulo: 'CPF', tipo: 'cpfCnpj' },
            { nome: 'telefone', rotulo: 'Telefone', tipo: 'telefone' },
            { nome: 'usuario', rotulo: 'Nome de usuário', tipo: 'texto', max: 30 },
            { nome: 'status', rotulo: 'Situação', tipo: 'status', dica: 'Inativo não consegue entrar no site.' },
            { nome: 'senha', rotulo: 'Senha', tipo: 'senha', dica: 'Mínimo de 8 caracteres. Na edição, deixe em branco para manter.' }
        ],
        colunas: [
            { campo: 'nome', rotulo: 'Usuário', destaque: true, sub: 'email' },
            { campo: 'tipo_nome', rotulo: 'Tipo', tipo: 'rotulo' },
            { campo: 'telefone', rotulo: 'Telefone', tipo: 'telefone' },
            { campo: 'data_cadastro', rotulo: 'Cadastro', tipo: 'data' },
            { campo: 'status', rotulo: 'Situação', tipo: 'status' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT u.id, u.nome, u.email, u.cpf, u.usuario, u.telefone, u.status, u.data_cadastro,
                    u.id_tipo_usuario, t.nome AS tipo_nome
                FROM usuarios u
                LEFT JOIN tipo_usuario t ON t.id = u.id_tipo_usuario
            )
        `
    },

    pets: {
        tabela: 'pets',
        titulo: 'Pets',
        singular: 'pet',
        novo: 'Novo pet',
        descricao: 'Pets cadastrados pelos clientes.',
        permiteExcluir: false,
        imagem: { campo: 'imagem', pasta: 'pets', nomeBase: 'nome' },
        ordem: 'nome',
        busca: ['nome', 'especie', 'raca', 'cliente_nome'],
        campos: [
            { nome: 'nome', rotulo: 'Nome do pet', tipo: 'texto', obrigatorio: true, max: 60 },
            { nome: 'id_usuario_cliente', rotulo: 'Cliente (dono)', tipo: 'referencia', referencia: 'clientes', obrigatorio: true },
            { nome: 'especie', rotulo: 'Espécie', tipo: 'texto', obrigatorio: true, max: 40, dica: 'Ex.: Cachorro, Gato.' },
            { nome: 'raca', rotulo: 'Raça', tipo: 'texto', max: 60 },
            {
                nome: 'sexo', rotulo: 'Sexo', tipo: 'selecao',
                opcoes: [
                    { valor: 'MACHO', rotulo: 'Macho' },
                    { valor: 'FEMEA', rotulo: 'Fêmea' },
                    { valor: 'NAO_INFORMADO', rotulo: 'Não informado' }
                ]
            },
            {
                nome: 'porte', rotulo: 'Porte', tipo: 'selecao',
                opcoes: [
                    { valor: 'PEQUENO', rotulo: 'Pequeno' },
                    { valor: 'MEDIO', rotulo: 'Médio' },
                    { valor: 'GRANDE', rotulo: 'Grande' }
                ]
            },
            { nome: 'data_nascimento', rotulo: 'Nascimento', tipo: 'data' },
            { nome: 'peso', rotulo: 'Peso (kg)', tipo: 'decimal' },
            { nome: 'castrado', rotulo: 'Castrado(a)', tipo: 'booleano' },
            { nome: 'status', rotulo: 'Situação', tipo: 'status' },
            { nome: 'observacoes', rotulo: 'Observações', tipo: 'textoLongo', max: 1000 },
            { nome: 'observacoes_saude', rotulo: 'Observações de saúde', tipo: 'textoLongo', max: 1000 },
            { nome: 'imagem', rotulo: 'Foto', tipo: 'imagem' }
        ],
        colunas: [
            { campo: 'imagem', rotulo: '', tipo: 'imagem' },
            { campo: 'nome', rotulo: 'Pet', destaque: true, sub: 'detalhes' },
            { campo: 'cliente_nome', rotulo: 'Cliente' },
            { campo: 'status', rotulo: 'Situação', tipo: 'status' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT p.*, u.nome AS cliente_nome,
                    p.especie || COALESCE(' · ' || p.raca, '') AS detalhes
                FROM pets p
                JOIN usuarios u ON u.id = p.id_usuario_cliente
            )
        `
    },

    enderecos: {
        tabela: 'enderecos_usuario',
        titulo: 'Endereços',
        singular: 'endereço',
        novo: 'Novo endereço',
        descricao: 'Endereços de entrega dos clientes.',
        permiteExcluir: false,
        enderecoPrincipal: true,
        ordem: 'cliente_nome, endereco_principal DESC',
        busca: ['cliente_nome', 'logradouro', 'bairro', 'cidade', 'cep'],
        campos: [
            { nome: 'id_usuario', rotulo: 'Cliente', tipo: 'referencia', referencia: 'clientes', obrigatorio: true, largura: 'inteira' },
            { nome: 'apelido', rotulo: 'Nome do endereço', tipo: 'texto', max: 40, dica: 'Ex.: Casa, Trabalho.' },
            { nome: 'cep', rotulo: 'CEP', tipo: 'cep', obrigatorio: true, dica: 'Preenche o endereço automaticamente.' },
            { nome: 'logradouro', rotulo: 'Rua', tipo: 'texto', obrigatorio: true, max: 150 },
            { nome: 'numero', rotulo: 'Número', tipo: 'texto', obrigatorio: true, max: 15 },
            { nome: 'complemento', rotulo: 'Complemento', tipo: 'texto', max: 80 },
            { nome: 'bairro', rotulo: 'Bairro', tipo: 'texto', obrigatorio: true, max: 80 },
            { nome: 'cidade', rotulo: 'Cidade', tipo: 'texto', obrigatorio: true, max: 80 },
            { nome: 'uf', rotulo: 'UF', tipo: 'uf', obrigatorio: true },
            { nome: 'referencia', rotulo: 'Ponto de referência', tipo: 'texto', max: 150 },
            { nome: 'endereco_principal', rotulo: 'Endereço principal do cliente', tipo: 'booleano' },
            { nome: 'status', rotulo: 'Situação', tipo: 'status', dica: 'Inativo some da lista do cliente.' }
        ],
        colunas: [
            { campo: 'cliente_nome', rotulo: 'Cliente', destaque: true, sub: 'apelido' },
            { campo: 'endereco_texto', rotulo: 'Endereço' },
            { campo: 'endereco_principal', rotulo: 'Principal', tipo: 'simNao' },
            { campo: 'status', rotulo: 'Situação', tipo: 'status' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT e.*, u.nome AS cliente_nome,
                    e.logradouro || ', ' || e.numero || ' · ' || e.bairro || ' · ' || e.cidade || '/' || e.uf AS endereco_texto
                FROM enderecos_usuario e
                JOIN usuarios u ON u.id = e.id_usuario
            )
        `
    },

    'tipos-usuario': {
        tabela: 'tipo_usuario',
        titulo: 'Tipos de usuário',
        singular: 'tipo de usuário',
        novo: 'Novo tipo',
        descricao: 'Perfis de acesso (ex.: Administrador, Cliente) e as telas que cada um pode usar.',
        permiteExcluir: false,
        ordem: 'nome',
        busca: ['nome', 'tipo', 'descricao'],
        secoes: ['Dados', 'Telas e permissões'],
        campos: [
            { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 60, secao: 'Dados' },
            { nome: 'tipo', rotulo: 'Código', tipo: 'texto', obrigatorio: true, max: 30, secao: 'Dados', dica: 'Em maiúsculas, ex.: ADMIN, CLIENTE.' },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo', max: 500, secao: 'Dados' },
            // Caixas de marcar com as permissões (grava em permissao_tipo_usuario).
            { nome: 'permissoes', rotulo: 'Telas que este tipo pode acessar', tipo: 'permissoes', referencia: 'permissoesLista', largura: 'inteira', secao: 'Telas e permissões' }
        ],
        colunas: [
            { campo: 'nome', rotulo: 'Tipo', destaque: true, sub: 'descricao' },
            { campo: 'tipo', rotulo: 'Código' },
            { campo: 'total_usuarios', rotulo: 'Usuários', tipo: 'numero' },
            { campo: 'total_permissoes', rotulo: 'Permissões', tipo: 'numero' }
        ],
        sqlLista: `
            SELECT t.*,
                (SELECT COUNT(*) FROM usuarios u WHERE u.id_tipo_usuario = t.id) AS total_usuarios,
                (SELECT COUNT(*) FROM permissao_tipo_usuario p WHERE p.id_tipo_usuario = t.id) AS total_permissoes
            FROM tipo_usuario t
        `
    },

    permissoes: {
        tabela: 'permissao_usuario',
        titulo: 'Permissões',
        singular: 'permissão',
        novo: 'Nova permissão',
        descricao: 'Ações que podem ser liberadas para cada tipo de usuário.',
        permiteExcluir: false,
        ordem: 'chave',
        busca: ['chave', 'descricao'],
        campos: [
            { nome: 'chave', rotulo: 'Chave', tipo: 'texto', obrigatorio: true, max: 60, dica: 'Ex.: PRODUTOS_EDITAR.' },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo', max: 500 }
        ],
        colunas: [
            { campo: 'chave', rotulo: 'Permissão', destaque: true, sub: 'descricao' },
            { campo: 'total_tipos', rotulo: 'Tipos com acesso', tipo: 'numero' }
        ],
        sqlLista: `
            SELECT p.*,
                (SELECT COUNT(*) FROM permissao_tipo_usuario pt WHERE pt.id_permissao = p.id) AS total_tipos
            FROM permissao_usuario p
        `
    },

    'permissoes-tipo': {
        tabela: 'permissao_tipo_usuario',
        titulo: 'Permissões por tipo',
        singular: 'permissão do tipo',
        novo: 'Liberar permissão',
        descricao: 'Quais permissões cada tipo de usuário tem. Exclua para retirar o acesso.',
        permiteExcluir: true,
        ordem: 'tipo_nome, permissao_chave',
        busca: ['tipo_nome', 'permissao_chave', 'permissao_descricao'],
        mensagensUnicas: {
            'permissao_tipo_usuario.id_tipo_usuario, permissao_tipo_usuario.id_permissao': 'Esse tipo de usuário já tem essa permissão.'
        },
        campos: [
            { nome: 'id_tipo_usuario', rotulo: 'Tipo de usuário', tipo: 'referencia', referencia: 'tiposUsuario', obrigatorio: true, largura: 'inteira' },
            { nome: 'id_permissao', rotulo: 'Permissão', tipo: 'referencia', referencia: 'permissoes', obrigatorio: true, largura: 'inteira' }
        ],
        colunas: [
            { campo: 'tipo_nome', rotulo: 'Tipo de usuário', destaque: true },
            { campo: 'permissao_chave', rotulo: 'Permissão' },
            { campo: 'permissao_descricao', rotulo: 'Descrição' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT pt.*, t.nome AS tipo_nome, p.chave AS permissao_chave, p.descricao AS permissao_descricao
                FROM permissao_tipo_usuario pt
                JOIN tipo_usuario t ON t.id = pt.id_tipo_usuario
                JOIN permissao_usuario p ON p.id = pt.id_permissao
            )
        `
    },

    // =====================================================
    // PEDIDOS
    // =====================================================

    // Pedidos nascem no site; aqui o admin só acompanha e muda a situação.
    pedidos: {
        tabela: 'pedidos',
        titulo: 'Pedidos',
        singular: 'pedido',
        descricao: 'Pedidos feitos na loja. Atualize a situação conforme o pedido anda.',
        semInclusao: true,
        permiteExcluir: false,
        ordem: 'id DESC',
        busca: ['cliente_nome', 'numero', 'status_rotulo', 'entrega_cidade'],
        secoes: ['Situação', 'Valores', 'Entrega'],
        campos: [
            {
                nome: 'status', rotulo: 'Situação do pedido', tipo: 'selecao', obrigatorio: true, secao: 'Situação',
                dica: 'Pagamentos do Mercado Pago atualizam a situação sozinhos.',
                opcoes: [
                    { valor: 'AGUARDANDO_PAGAMENTO', rotulo: 'Aguardando pagamento' },
                    { valor: 'PAGO', rotulo: 'Pago' },
                    { valor: 'EM_SEPARACAO', rotulo: 'Em separação' },
                    { valor: 'ENVIADO', rotulo: 'Enviado' },
                    { valor: 'ENTREGUE', rotulo: 'Entregue' },
                    { valor: 'CANCELADO', rotulo: 'Cancelado' },
                    { valor: 'FALHOU', rotulo: 'Pagamento recusado' }
                ]
            },
            { nome: 'mp_status', rotulo: 'Situação no Mercado Pago', tipo: 'texto', somenteLeitura: true, secao: 'Situação' },
            { nome: 'subtotal', rotulo: 'Subtotal', tipo: 'dinheiro', somenteLeitura: true, secao: 'Valores' },
            { nome: 'frete', rotulo: 'Frete', tipo: 'dinheiro', somenteLeitura: true, secao: 'Valores' },
            { nome: 'total', rotulo: 'Total', tipo: 'dinheiro', somenteLeitura: true, secao: 'Valores' },
            { nome: 'forma_pagamento', rotulo: 'Forma de pagamento', tipo: 'texto', somenteLeitura: true, secao: 'Valores' },
            { nome: 'entrega_destinatario', rotulo: 'Destinatário', tipo: 'texto', somenteLeitura: true, secao: 'Entrega' },
            { nome: 'entrega_telefone', rotulo: 'Telefone', tipo: 'telefone', somenteLeitura: true, secao: 'Entrega' },
            { nome: 'entrega_logradouro', rotulo: 'Rua', tipo: 'texto', somenteLeitura: true, secao: 'Entrega' },
            { nome: 'entrega_numero', rotulo: 'Número', tipo: 'texto', somenteLeitura: true, secao: 'Entrega' },
            { nome: 'entrega_bairro', rotulo: 'Bairro', tipo: 'texto', somenteLeitura: true, secao: 'Entrega' },
            { nome: 'entrega_cidade', rotulo: 'Cidade', tipo: 'texto', somenteLeitura: true, secao: 'Entrega' },
            { nome: 'entrega_uf', rotulo: 'UF', tipo: 'texto', somenteLeitura: true, secao: 'Entrega' },
            { nome: 'entrega_cep', rotulo: 'CEP', tipo: 'cep', somenteLeitura: true, secao: 'Entrega' }
        ],
        colunas: [
            { campo: 'numero', rotulo: 'Pedido', destaque: true, sub: 'data_texto' },
            { campo: 'cliente_nome', rotulo: 'Cliente' },
            { campo: 'total', rotulo: 'Total', tipo: 'dinheiro' },
            { campo: 'itens_texto', rotulo: 'Itens' },
            { campo: 'status_rotulo', rotulo: 'Situação', tipo: 'rotulo' }
        ],
        sqlLista: `
            SELECT * FROM (
                SELECT p.id, p.total, p.status, p.data_criacao, p.entrega_cidade,
                    '#' || p.id AS numero,
                    strftime('%d/%m/%Y', p.data_criacao) AS data_texto,
                    u.nome AS cliente_nome,
                    (SELECT SUM(quantidade) FROM itens_pedido i WHERE i.id_pedido = p.id) || ' item(ns)' AS itens_texto,
                    CASE p.status
                        WHEN 'AGUARDANDO_PAGAMENTO' THEN 'Aguardando pagamento' WHEN 'PAGO' THEN 'Pago'
                        WHEN 'EM_SEPARACAO' THEN 'Em separação' WHEN 'ENVIADO' THEN 'Enviado'
                        WHEN 'ENTREGUE' THEN 'Entregue' WHEN 'CANCELADO' THEN 'Cancelado'
                        ELSE 'Pagamento recusado'
                    END AS status_rotulo
                FROM pedidos p
                JOIN usuarios u ON u.id = p.id_usuario_cliente
            )
        `
    },

    // =====================================================
    // CONFIGURAÇÕES
    // =====================================================

    // Registro único (id = 1): a tela abre direto no formulário.
    'dados-pataquada': {
        tabela: 'dados_pataquada',
        titulo: 'Dados da PataQuada',
        singular: 'dados da empresa',
        descricao: 'Informações da empresa usadas no site (rodapé, frete e contato).',
        registroUnico: 1,
        permiteExcluir: false,
        ordem: 'id',
        busca: [],
        secoes: ['Empresa', 'Contato', 'Endereço', 'Redes sociais', 'Textos e políticas'],
        campos: [
            { nome: 'nome_fantasia', rotulo: 'Nome fantasia', tipo: 'texto', obrigatorio: true, max: 120, secao: 'Empresa' },
            { nome: 'razao_social', rotulo: 'Razão social', tipo: 'texto', max: 150, secao: 'Empresa' },
            { nome: 'cpf_cnpj', rotulo: 'CNPJ / CPF', tipo: 'cpfCnpj', secao: 'Empresa' },
            { nome: 'inscricao_estadual', rotulo: 'Inscrição estadual', tipo: 'texto', max: 30, secao: 'Empresa' },
            { nome: 'horario_atendimento', rotulo: 'Horário de atendimento', tipo: 'texto', max: 150, secao: 'Empresa', dica: 'Ex.: Seg a sex, 8h às 18h.' },

            { nome: 'email', rotulo: 'E-mail', tipo: 'email', secao: 'Contato', dica: 'Recebe as mensagens do formulário de contato.' },
            { nome: 'telefone', rotulo: 'Telefone', tipo: 'telefone', secao: 'Contato' },
            { nome: 'whatsapp', rotulo: 'WhatsApp', tipo: 'telefone', secao: 'Contato', dica: 'Vazio = usa o telefone no botão do rodapé.' },

            { nome: 'cep', rotulo: 'CEP', tipo: 'cep', secao: 'Endereço', dica: 'Origem do cálculo do frete.' },
            { nome: 'logradouro', rotulo: 'Rua', tipo: 'texto', max: 150, secao: 'Endereço' },
            { nome: 'numero', rotulo: 'Número', tipo: 'texto', max: 15, secao: 'Endereço' },
            { nome: 'complemento', rotulo: 'Complemento', tipo: 'texto', max: 80, secao: 'Endereço' },
            { nome: 'bairro', rotulo: 'Bairro', tipo: 'texto', max: 80, secao: 'Endereço' },
            { nome: 'cidade', rotulo: 'Cidade', tipo: 'texto', max: 80, secao: 'Endereço' },
            { nome: 'uf', rotulo: 'UF', tipo: 'uf', secao: 'Endereço' },
            { nome: 'pais', rotulo: 'País', tipo: 'texto', max: 60, padrao: 'Brasil', secao: 'Endereço' },

            { nome: 'instagram', rotulo: 'Instagram', tipo: 'texto', max: 200, secao: 'Redes sociais', dica: 'Ex.: @pataquada ou o link.' },
            { nome: 'facebook', rotulo: 'Facebook', tipo: 'texto', max: 200, secao: 'Redes sociais' },
            { nome: 'tiktok', rotulo: 'TikTok', tipo: 'texto', max: 200, secao: 'Redes sociais' },
            { nome: 'youtube', rotulo: 'YouTube', tipo: 'texto', max: 200, secao: 'Redes sociais' },
            { nome: 'site', rotulo: 'Site', tipo: 'texto', max: 200, secao: 'Redes sociais' },

            { nome: 'descricao_empresa', rotulo: 'Sobre a empresa', tipo: 'textoLongo', max: 3000, secao: 'Textos e políticas' },
            { nome: 'politica_entrega', rotulo: 'Política de entrega', tipo: 'textoLongo', max: 10000, secao: 'Textos e políticas' },
            { nome: 'politica_troca_devolucao', rotulo: 'Política de troca e devolução', tipo: 'textoLongo', max: 10000, secao: 'Textos e políticas' },
            { nome: 'politica_privacidade', rotulo: 'Política de privacidade', tipo: 'textoLongo', max: 20000, secao: 'Textos e políticas' },
            { nome: 'termos_uso', rotulo: 'Termos de uso', tipo: 'textoLongo', max: 20000, secao: 'Textos e políticas' }
        ],
        colunas: [],
        sqlLista: 'SELECT * FROM dados_pataquada'
    },

    configuracoes: {
        tabela: 'configuracoes_pataquada',
        titulo: 'Configurações da loja',
        singular: 'configuração',
        novo: 'Nova configuração',
        descricao: 'Ajustes da loja (frete, estoque, contato...). Mude só o valor, a chave é usada pelo sistema.',
        permiteExcluir: false,
        ordem: 'categoria, chave',
        busca: ['chave', 'valor', 'descricao', 'categoria'],
        campos: [
            { nome: 'chave', rotulo: 'Chave', tipo: 'texto', obrigatorio: true, max: 60, dica: 'Sem acentos nem espaços (ex.: frete_gratis_a_partir_de) e sem repetir. Não altere as chaves existentes: o sistema procura por elas.' },
            { nome: 'categoria', rotulo: 'Categoria', tipo: 'texto', obrigatorio: true, max: 30, padrao: 'GERAL' },
            { nome: 'valor', rotulo: 'Valor', tipo: 'texto', max: 2000, largura: 'inteira' },
            { nome: 'descricao', rotulo: 'Descrição', tipo: 'textoLongo', max: 500 }
        ],
        colunas: [
            { campo: 'chave', rotulo: 'Configuração', destaque: true, sub: 'descricao' },
            { campo: 'valor', rotulo: 'Valor' },
            { campo: 'categoria', rotulo: 'Categoria', tipo: 'rotulo' }
        ],
        sqlLista: 'SELECT * FROM configuracoes_pataquada'
    }
}

// Opções das listas de seleção (campos do tipo "referencia").
export const REFERENCIAS = {
    produtos: {
        sql: `SELECT id, nome || CASE WHEN status = 0 THEN ' (inativo)' ELSE '' END AS nome,
                     estoque
              FROM produtos ORDER BY nome`
    },
    fornecedores: {
        sql: `SELECT id, COALESCE(nome_fantasia, razao_social)
                     || CASE WHEN status = 0 THEN ' (inativo)' ELSE '' END AS nome
              FROM fornecedores ORDER BY 2`
    },
    categorias: {
        sql: `SELECT id, nome FROM categorias_produto ORDER BY nome`
    },
    usuarios: {
        sql: `SELECT id, nome || ' (' || email || ')' AS nome FROM usuarios ORDER BY nome`
    },
    clientes: {
        sql: `SELECT u.id, u.nome || ' (' || u.email || ')' AS nome
              FROM usuarios u JOIN tipo_usuario t ON t.id = u.id_tipo_usuario
              WHERE UPPER(t.tipo) = 'CLIENTE' ORDER BY u.nome`
    },
    pets: {
        sql: `SELECT p.id, p.nome || ' — ' || u.nome AS nome
              FROM pets p JOIN usuarios u ON u.id = p.id_usuario_cliente
              ORDER BY p.nome`
    },
    planos: {
        sql: `SELECT id, nome || CASE WHEN status = 0 THEN ' (inativo)' ELSE '' END AS nome, valor
              FROM plano ORDER BY nome`
    },
    assinaturas: {
        sql: `SELECT a.id, '#' || a.id || ' · ' || u.nome || ' · ' || p.nome || ' (' || pt.nome || ')' AS nome
              FROM assinaturas_plano a
              JOIN usuarios u ON u.id = a.id_usuario_cliente
              JOIN plano p ON p.id = a.id_plano
              JOIN pets pt ON pt.id = a.id_pet
              ORDER BY a.id DESC`
    },
    servicos: {
        sql: `SELECT id, nome || CASE WHEN status = 0 THEN ' (inativo)' ELSE '' END AS nome
              FROM servicos ORDER BY nome`
    },
    consultas: {
        sql: `SELECT id, nome || CASE WHEN status = 0 THEN ' (inativa)' ELSE '' END AS nome
              FROM tipos_consulta ORDER BY nome`
    },
    profissionais: {
        sql: `SELECT id, nome || ' ' || sobrenome || COALESCE(' — ' || especialidade, '') AS nome
              FROM profissionais ORDER BY nome`
    },
    situacoesAgendamento: {
        sql: `SELECT id, nome FROM situacao WHERE tipo = 'AGENDAMENTO' AND status = 1 ORDER BY id`
    },
    tiposUsuario: {
        sql: `SELECT id, nome FROM tipo_usuario ORDER BY nome`
    },
    permissoes: {
        sql: `SELECT id, chave || COALESCE(' — ' || descricao, '') AS nome FROM permissao_usuario ORDER BY chave`
    },
    // Lista completa para as caixas de marcar do tipo de usuário.
    permissoesLista: {
        sql: `SELECT id, UPPER(chave) AS chave, descricao FROM permissao_usuario ORDER BY chave`
    }
}

// Tabela de cada "referencia" (o servidor confere se o id existe).
export const TABELA_DA_REFERENCIA = {
    produtos: 'produtos',
    fornecedores: 'fornecedores',
    categorias: 'categorias_produto',
    usuarios: 'usuarios',
    clientes: 'usuarios',
    pets: 'pets',
    planos: 'plano',
    assinaturas: 'assinaturas_plano',
    servicos: 'servicos',
    consultas: 'tipos_consulta',
    profissionais: 'profissionais',
    situacoesAgendamento: 'situacao',
    tiposUsuario: 'tipo_usuario',
    permissoes: 'permissao_usuario'
}
