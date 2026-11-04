
-- =========================================================
-- PATAQUADA
-- ESTRUTURA DO BANCO DE DADOS - SQLITE
-- Banco: aula_login
-- =========================================================

PRAGMA foreign_keys = ON;

-- =========================================================
-- 1. TIPOS DE USUÁRIO E PERMISSÕES
-- =========================================================

CREATE TABLE IF NOT EXISTS tipo_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
    tipo TEXT,
    descricao TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    sobrenome TEXT NOT NULL DEFAULT '',
    cpf TEXT UNIQUE,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    id_tipo_usuario INTEGER NOT NULL,
    usuario TEXT NOT NULL COLLATE NOCASE UNIQUE,
    senha TEXT NOT NULL,
    telefone TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_tipo_usuario)
        REFERENCES tipo_usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS permissao_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chave TEXT NOT NULL COLLATE NOCASE UNIQUE,
    descricao TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS permissao_tipo_usuario (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_tipo_usuario INTEGER NOT NULL,
    id_permissao INTEGER NOT NULL,

    FOREIGN KEY (id_tipo_usuario)
        REFERENCES tipo_usuario(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (id_permissao)
        REFERENCES permissao_usuario(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    UNIQUE (id_tipo_usuario, id_permissao)
) STRICT;

-- =========================================================
-- 2. PETS
-- =========================================================

CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario_cliente INTEGER NOT NULL,
    nome TEXT NOT NULL,
    especie TEXT NOT NULL,
    raca TEXT,
    data_nascimento TEXT,
    observacoes TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_usuario_cliente)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    UNIQUE (id, id_usuario_cliente)
) STRICT;

-- =========================================================
-- 3. CATEGORIAS, PRODUTOS E SERVIÇOS
-- =========================================================

CREATE TABLE IF NOT EXISTS categorias_produto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
    descricao TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1))
) STRICT;

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
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_categoria_produto)
        REFERENCES categorias_produto(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_usuario_cadastro)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS servicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_categoria_produto INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco INTEGER NOT NULL CHECK (preco >= 0),
    duracao_media INTEGER NOT NULL CHECK (duracao_media > 0),
    id_usuario_cadastro INTEGER NOT NULL,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_categoria_produto)
        REFERENCES categorias_produto(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_usuario_cadastro)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

-- =========================================================
-- 4. TIPOS DE CONSULTA E AGENDAMENTOS
-- =========================================================

CREATE TABLE IF NOT EXISTS tipos_consulta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_categoria_produto INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_minimo INTEGER NOT NULL CHECK (preco_minimo >= 0),
    preco_maximo INTEGER NOT NULL CHECK (preco_maximo >= preco_minimo),
    id_usuario_cadastro INTEGER NOT NULL,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_categoria_produto)
        REFERENCES categorias_produto(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_usuario_cadastro)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

-- =========================================================
-- 5. SITUAÇÕES
-- =========================================================

CREATE TABLE IF NOT EXISTS situacao (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE,
    tipo TEXT NOT NULL CHECK (
        tipo IN ('PEDIDO', 'ASSINATURA', 'AGENDAMENTO')
    ),
    descricao TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    UNIQUE (nome, tipo)
) STRICT;

CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pet INTEGER NOT NULL,
    id_usuario_cliente INTEGER NOT NULL,
    id_servico INTEGER NOT NULL,
    id_tipo_consulta INTEGER NOT NULL,
    id_situacao INTEGER NOT NULL,
    data_agendamento TEXT NOT NULL,
    observacoes TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_pet, id_usuario_cliente)
        REFERENCES pets(id, id_usuario_cliente)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_servico)
        REFERENCES servicos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_tipo_consulta)
        REFERENCES tipos_consulta(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_situacao)
        REFERENCES situacao(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

-- =========================================================
-- 6. PLANOS E ASSINATURAS
-- =========================================================

CREATE TABLE IF NOT EXISTS plano (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_categoria_produto INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_mensal INTEGER NOT NULL CHECK (preco_mensal >= 0),
    id_usuario_cadastro INTEGER NOT NULL,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_categoria_produto)
        REFERENCES categorias_produto(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_usuario_cadastro)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

CREATE TABLE IF NOT EXISTS assinaturas_plano (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_plano INTEGER NOT NULL,
    id_usuario_cliente INTEGER NOT NULL,
    data_inicio TEXT NOT NULL,
    data_final TEXT,
    valor_contratado INTEGER NOT NULL CHECK (valor_contratado >= 0),
    id_situacao INTEGER NOT NULL,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_plano)
        REFERENCES plano(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_usuario_cliente)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_situacao)
        REFERENCES situacao(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CHECK (data_final IS NULL OR data_final >= data_inicio)
) STRICT;

-- =========================================================
-- 7. ENDEREÇOS DOS USUÁRIOS
-- =========================================================

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
        CHECK (endereco_principal IN (0, 1)),
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

-- =========================================================
-- 8. PEDIDOS
-- =========================================================

CREATE TABLE IF NOT EXISTS pedido (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_cliente INTEGER NOT NULL,
    id_endereco INTEGER,
    id_situacao INTEGER NOT NULL,
    data_pedido TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_total INTEGER NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
    valor_frete INTEGER NOT NULL DEFAULT 0 CHECK (valor_frete >= 0),

    -- Cópia do endereço utilizado no momento da compra
    cep_entrega TEXT,
    logradouro_entrega TEXT,
    numero_entrega TEXT,
    complemento_entrega TEXT,
    bairro_entrega TEXT,
    cidade_entrega TEXT,
    uf_entrega TEXT,

    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_cliente)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_endereco)
        REFERENCES enderecos_usuario(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    FOREIGN KEY (id_situacao)
        REFERENCES situacao(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

-- =========================================================
-- 9. ITENS DO PEDIDO
-- =========================================================

CREATE TABLE IF NOT EXISTS itens_pedido (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pedido INTEGER NOT NULL,
    id_produto INTEGER NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    valor_unitario INTEGER NOT NULL CHECK (valor_unitario >= 0),
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1)),

    FOREIGN KEY (id_pedido)
        REFERENCES pedido(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    FOREIGN KEY (id_produto)
        REFERENCES produtos(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

-- =========================================================
-- 10. FORMAS DE PAGAMENTO E PAGAMENTOS
-- =========================================================

CREATE TABLE IF NOT EXISTS formas_pagamento (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL COLLATE NOCASE UNIQUE,
    descricao TEXT,
    status INTEGER NOT NULL DEFAULT 1 CHECK (status IN (0, 1))
) STRICT;

CREATE TABLE IF NOT EXISTS pagamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_pedido INTEGER NOT NULL,
    id_forma_pagamento INTEGER NOT NULL,
    valor INTEGER NOT NULL CHECK (valor >= 0),
    status TEXT NOT NULL DEFAULT 'PENDENTE',
    codigo_transacao TEXT,
    data_pagamento TEXT,
    data_cadastro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_pedido)
        REFERENCES pedido(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    FOREIGN KEY (id_forma_pagamento)
        REFERENCES formas_pagamento(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) STRICT;

-- =========================================================
-- 11. ÍNDICES PARA CONSULTAS E RELACIONAMENTOS
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_tipo
    ON usuarios(id_tipo_usuario);

CREATE INDEX IF NOT EXISTS idx_pets_usuario
    ON pets(id_usuario_cliente);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria
    ON produtos(id_categoria_produto);

CREATE INDEX IF NOT EXISTS idx_servicos_categoria
    ON servicos(id_categoria_produto);

CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente
    ON agendamentos(id_usuario_cliente);

CREATE INDEX IF NOT EXISTS idx_agendamentos_pet
    ON agendamentos(id_pet);

CREATE INDEX IF NOT EXISTS idx_agendamentos_data
    ON agendamentos(data_agendamento);

CREATE INDEX IF NOT EXISTS idx_assinaturas_cliente
    ON assinaturas_plano(id_usuario_cliente);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente
    ON pedido(id_cliente);

CREATE INDEX IF NOT EXISTS idx_pedidos_situacao
    ON pedido(id_situacao);

CREATE INDEX IF NOT EXISTS idx_itens_pedido
    ON itens_pedido(id_pedido);

CREATE INDEX IF NOT EXISTS idx_pagamentos_pedido
    ON pagamentos(id_pedido);

CREATE INDEX IF NOT EXISTS idx_enderecos_usuario
    ON enderecos_usuario(id_usuario);
