PRAGMA foreign_keys = ON;

-- 1. TIPOS DE USUÁRIO
CREATE TABLE IF NOT EXISTS tipo_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
    tipo TEXT NOT NULL,
    descricao TEXT
) STRICT;

-- 2. USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT UNIQUE,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    id_tipo_usuario INTEGER NOT NULL,
    usuario TEXT COLLATE NOCASE UNIQUE,
    senha TEXT NOT NULL,
    telefone TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    FOREIGN KEY (id_tipo_usuario) REFERENCES tipo_usuario(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) STRICT;

-- 3. PERMISSÕES
CREATE TABLE IF NOT EXISTS permissao_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL COLLATE NOCASE UNIQUE,
    descricao TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS permissao_tipo_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tipo_usuario INTEGER NOT NULL,
    id_permissao INTEGER NOT NULL,
    FOREIGN KEY (id_tipo_usuario) REFERENCES tipo_usuario(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_permissao) REFERENCES permissao_usuario(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (id_tipo_usuario, id_permissao)
) STRICT;

-- 4. ENDEREÇOS
CREATE TABLE IF NOT EXISTS enderecos_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER NOT NULL,
    apelido TEXT,
    cep TEXT NOT NULL,
    logradouro TEXT NOT NULL,
    numero TEXT NOT NULL,
    complemento TEXT,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    uf TEXT NOT NULL,
    referencia TEXT,
    endereco_principal INTEGER NOT NULL DEFAULT 0
        CHECK (endereco_principal IN (0,1)),
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) STRICT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_endereco_principal
ON enderecos_usuario(id_usuario)
WHERE endereco_principal = 1 AND status = 1;

-- 5. PETS
CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario_cliente INTEGER NOT NULL,
    nome TEXT NOT NULL,
    especie TEXT NOT NULL,
    raca TEXT,
    sexo TEXT CHECK (sexo IS NULL OR sexo IN ('MACHO','FEMEA','NAO_INFORMADO')),
    data_nascimento TEXT,
    porte TEXT CHECK (porte IS NULL OR porte IN ('PEQUENO','MEDIO','GRANDE')),
    peso REAL CHECK (peso IS NULL OR peso > 0),
    castrado INTEGER CHECK (castrado IS NULL OR castrado IN (0,1)),
    imagem TEXT,
    observacoes TEXT,
    observacoes_saude TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    FOREIGN KEY (id_usuario_cliente) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (id, id_usuario_cliente)
) STRICT;

-- 6. CATEGORIAS
CREATE TABLE IF NOT EXISTS categorias_produto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
    descricao TEXT,
    imagem TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1))
) STRICT;

-- 7. PRODUTOS
-- Valores monetários em centavos.
CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_categoria_produto INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco INTEGER NOT NULL CHECK (preco >= 0),
    estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
    imagem TEXT,
    id_usuario_cadastro INTEGER NOT NULL,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    FOREIGN KEY (id_categoria_produto) REFERENCES categorias_produto(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_usuario_cadastro) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) STRICT;

-- 8. SERVIÇOS
CREATE TABLE IF NOT EXISTS servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_categoria_produto INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco INTEGER NOT NULL CHECK (preco >= 0),
    duracao_media INTEGER NOT NULL CHECK (duracao_media > 0),
    imagem TEXT,
    id_usuario_cadastro INTEGER NOT NULL,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    FOREIGN KEY (id_categoria_produto) REFERENCES categorias_produto(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_usuario_cadastro) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) STRICT;

-- 9. TIPOS DE CONSULTA
CREATE TABLE IF NOT EXISTS tipos_consulta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_categoria_produto INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_fixo INTEGER CHECK (preco_fixo IS NULL OR preco_fixo >= 0),
    preco_minimo INTEGER NOT NULL DEFAULT 0 CHECK (preco_minimo >= 0),
    preco_maximo INTEGER NOT NULL DEFAULT 0 CHECK (preco_maximo >= preco_minimo),
    duracao_media INTEGER CHECK (duracao_media IS NULL OR duracao_media > 0),
    id_usuario_cadastro INTEGER NOT NULL,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    CHECK (
        (preco_fixo IS NOT NULL AND preco_minimo = 0 AND preco_maximo = 0)
        OR (preco_fixo IS NULL AND preco_maximo >= preco_minimo)
    ),
    FOREIGN KEY (id_categoria_produto) REFERENCES categorias_produto(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_usuario_cadastro) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) STRICT;

-- 10. PROFISSIONAIS
CREATE TABLE IF NOT EXISTS profissionais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario INTEGER UNIQUE,
    nome TEXT NOT NULL,
    sobrenome TEXT NOT NULL,
    cpf TEXT UNIQUE,
    telefone TEXT,
    email TEXT COLLATE NOCASE,
    especialidade TEXT,
    descricao TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) STRICT;

-- 11. SITUAÇÕES
CREATE TABLE IF NOT EXISTS situacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE,
    tipo TEXT NOT NULL CHECK (tipo IN ('AGENDAMENTO','ASSINATURA')),
    descricao TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    UNIQUE (nome, tipo)
) STRICT;

-- 12. AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pet INTEGER NOT NULL,
    id_usuario_cliente INTEGER NOT NULL,
    id_servico INTEGER,
    id_tipo_consulta INTEGER,
    id_profissional INTEGER,
    id_situacao INTEGER NOT NULL,
    data_agendamento TEXT NOT NULL,
    observacoes TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1)),
    FOREIGN KEY (id_pet, id_usuario_cliente) REFERENCES pets(id, id_usuario_cliente)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_servico) REFERENCES servicos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_tipo_consulta) REFERENCES tipos_consulta(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_profissional) REFERENCES profissionais(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_situacao) REFERENCES situacao(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (id_servico IS NOT NULL OR id_tipo_consulta IS NOT NULL)
) STRICT;

-- 13. HISTÓRICO DE AGENDAMENTOS
CREATE TABLE IF NOT EXISTS agendamento_historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_agendamento INTEGER NOT NULL,
    id_situacao_anterior INTEGER,
    id_situacao_nova INTEGER NOT NULL,
    id_usuario_responsavel INTEGER,
    observacao TEXT,
    data_alteracao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_agendamento) REFERENCES agendamentos(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_situacao_anterior) REFERENCES situacao(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_situacao_nova) REFERENCES situacao(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_usuario_responsavel) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) STRICT;

-- 14. PLANOS
CREATE TABLE IF NOT EXISTS plano (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor INTEGER NOT NULL CHECK (valor >= 0),
    periodicidade TEXT NOT NULL DEFAULT 'MENSAL'
        CHECK (periodicidade IN ('MENSAL','TRIMESTRAL','SEMESTRAL','ANUAL')),
    beneficios TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1))
) STRICT;

-- 15. ASSINATURAS
CREATE TABLE IF NOT EXISTS assinaturas_plano (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_plano INTEGER NOT NULL,
    id_usuario_cliente INTEGER NOT NULL,
    id_pet INTEGER NOT NULL,
    valor_contratado INTEGER NOT NULL CHECK (valor_contratado >= 0),
    tipo_cobranca TEXT NOT NULL DEFAULT 'RECORRENTE'
        CHECK (tipo_cobranca IN ('RECORRENTE','UNICA')),
    data_inicio TEXT NOT NULL,
    data_fim_prevista TEXT,
    data_fim_vigencia TEXT NOT NULL,
    proxima_cobranca TEXT,
    renovacao_automatica INTEGER NOT NULL DEFAULT 1
        CHECK (renovacao_automatica IN (0,1)),
    data_encerramento TEXT,
    cancelar_ao_fim_vigencia INTEGER NOT NULL DEFAULT 0
        CHECK (cancelar_ao_fim_vigencia IN (0,1)),
    data_solicitacao_cancelamento TEXT,
    motivo_cancelamento TEXT,
    status TEXT NOT NULL DEFAULT 'AGUARDANDO'
        CHECK (status IN ('AGUARDANDO','ATIVA','INADIMPLENTE','SUSPENSA','CANCELADA','ENCERRADA')),
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT,
    FOREIGN KEY (id_plano) REFERENCES plano(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_usuario_cliente) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_pet, id_usuario_cliente) REFERENCES pets(id, id_usuario_cliente)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (data_fim_prevista IS NULL OR data_fim_prevista >= data_inicio),
    CHECK (data_fim_vigencia >= data_inicio),
    CHECK (data_encerramento IS NULL OR data_encerramento >= data_inicio),
    CHECK (
        tipo_cobranca = 'RECORRENTE'
        OR (renovacao_automatica = 0 AND proxima_cobranca IS NULL
            AND cancelar_ao_fim_vigencia = 0)
    ),
    CHECK (renovacao_automatica = 0 OR tipo_cobranca = 'RECORRENTE')
) STRICT;

-- 16. COBRANÇAS
CREATE TABLE IF NOT EXISTS cobrancas_assinatura (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_assinatura INTEGER NOT NULL,
    numero_ciclo INTEGER NOT NULL CHECK (numero_ciclo > 0),
    competencia TEXT NOT NULL,
    valor INTEGER NOT NULL CHECK (valor >= 0),
    data_vencimento TEXT NOT NULL,
    data_pagamento TEXT,
    status TEXT NOT NULL DEFAULT 'PENDENTE'
        CHECK (status IN ('PENDENTE','PAGA','ATRASADA','CANCELADA','FALHOU')),
    codigo_transacao TEXT,
    observacao TEXT,
    tentativas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas >= 0),
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT,
    FOREIGN KEY (id_assinatura) REFERENCES assinaturas_plano(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (id_assinatura, numero_ciclo),
    UNIQUE (id_assinatura, competencia)
) STRICT;

-- 17. CARRINHO
CREATE TABLE IF NOT EXISTS carrinho (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario_cliente INTEGER NOT NULL,
    data_criacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'ABERTO'
        CHECK (status IN ('ABERTO','FINALIZADO','ABANDONADO')),
    FOREIGN KEY (id_usuario_cliente) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) STRICT;

-- 18. ITENS DO CARRINHO
CREATE TABLE IF NOT EXISTS itens_carrinho (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_carrinho INTEGER NOT NULL,
    id_produto INTEGER NOT NULL,
    quantidade INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    data_adicao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_carrinho) REFERENCES carrinho(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES produtos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (id_carrinho, id_produto)
) STRICT;

-- 19. FORNECEDORES
CREATE TABLE IF NOT EXISTS fornecedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_pessoa TEXT NOT NULL DEFAULT 'JURIDICA'
        CHECK (tipo_pessoa IN ('FISICA','JURIDICA')),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cpf_cnpj TEXT UNIQUE,
    inscricao_estadual TEXT,
    email TEXT,
    telefone TEXT,
    celular TEXT,
    nome_contato TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    pais TEXT NOT NULL DEFAULT 'Brasil',
    site TEXT,
    prazo_entrega_dias INTEGER CHECK (prazo_entrega_dias IS NULL OR prazo_entrega_dias >= 0),
    condicao_pagamento TEXT,
    observacoes TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0,1))
) STRICT;

-- 20. EXTENSÃO DOS PRODUTOS
CREATE TABLE IF NOT EXISTS produto_detalhes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_produto INTEGER NOT NULL UNIQUE,
    sku TEXT UNIQUE,
    codigo_barras TEXT UNIQUE,
    peso REAL CHECK (peso IS NULL OR peso > 0),
    unidade_medida TEXT NOT NULL DEFAULT 'UN',
    estoque_minimo INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    custo_aquisicao INTEGER NOT NULL DEFAULT 0 CHECK (custo_aquisicao >= 0),
    data_atualizacao TEXT,
    FOREIGN KEY (id_produto) REFERENCES produtos(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) STRICT;

-- 21. RELACIONAMENTO N:N PRODUTOS / FORNECEDORES
CREATE TABLE IF NOT EXISTS produto_fornecedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_produto INTEGER NOT NULL,
    id_fornecedor INTEGER NOT NULL,
    codigo_produto_fornecedor TEXT,
    custo_atual INTEGER NOT NULL DEFAULT 0 CHECK (custo_atual >= 0),
    prazo_entrega_dias INTEGER CHECK (prazo_entrega_dias IS NULL OR prazo_entrega_dias >= 0),
    fornecedor_principal INTEGER NOT NULL DEFAULT 0 CHECK (fornecedor_principal IN (0,1)),
    observacoes TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT,
    FOREIGN KEY (id_produto) REFERENCES produtos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedores(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (id_produto, id_fornecedor)
) STRICT;

-- 22. MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_produto INTEGER NOT NULL,
    id_fornecedor INTEGER,
    id_usuario_responsavel INTEGER,
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
    origem TEXT NOT NULL DEFAULT 'MANUAL'
        CHECK (origem IN ('COMPRA','VENDA','DEVOLUCAO','AJUSTE','PERDA','TROCA','MANUAL')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    custo_unitario INTEGER CHECK (custo_unitario IS NULL OR custo_unitario >= 0),
    numero_documento TEXT,
    estoque_anterior INTEGER,
    estoque_posterior INTEGER,
    motivo TEXT,
    observacoes TEXT,
    data_movimentacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_produto) REFERENCES produtos(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedores(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (id_usuario_responsavel) REFERENCES usuarios(id)
        ON UPDATE CASCADE ON DELETE SET NULL
) STRICT;

-- 23. IMAGENS DOS PRODUTOS
CREATE TABLE IF NOT EXISTS produto_imagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_produto INTEGER NOT NULL,
    caminho_imagem TEXT NOT NULL,
    descricao TEXT,
    imagem_principal INTEGER NOT NULL DEFAULT 0 CHECK (imagem_principal IN (0,1)),
    ordem INTEGER NOT NULL DEFAULT 0,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_produto) REFERENCES produtos(id)
        ON UPDATE CASCADE ON DELETE CASCADE
) STRICT;

-- 24. DADOS INSTITUCIONAIS DA PATAQUADA
CREATE TABLE IF NOT EXISTS dados_pataquada (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    razao_social TEXT,
    nome_fantasia TEXT NOT NULL DEFAULT 'PataQuada',
    cpf_cnpj TEXT,
    inscricao_estadual TEXT,
    email TEXT,
    telefone TEXT,
    whatsapp TEXT,
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    pais TEXT NOT NULL DEFAULT 'Brasil',
    logo TEXT,
    favicon TEXT,
    instagram TEXT,
    facebook TEXT,
    tiktok TEXT,
    youtube TEXT,
    site TEXT,
    descricao_empresa TEXT,
    horario_atendimento TEXT,
    politica_privacidade TEXT,
    termos_uso TEXT,
    politica_troca_devolucao TEXT,
    politica_entrega TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TEXT
) STRICT;

-- 25. CONFIGURAÇÕES DA LOJA
CREATE TABLE IF NOT EXISTS configuracoes_pataquada (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL COLLATE NOCASE UNIQUE,
    valor TEXT,
    descricao TEXT,
    categoria TEXT NOT NULL DEFAULT 'GERAL',
    data_atualizacao TEXT
) STRICT;
