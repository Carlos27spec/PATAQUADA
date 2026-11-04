
-- =========================================================
-- PATAQUADA
-- CARGA INICIAL DE DADOS (DML)
-- Banco: pataquadaDB
-- =========================================================

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- =========================================================
-- 1. TIPOS DE USUÁRIO
-- =========================================================

INSERT OR IGNORE INTO tipo_usuario (nome, tipo, descricao)
VALUES
    ('Administrador', 'ADMIN', 'Acesso administrativo ao sistema'),
    ('Cliente', 'CLIENTE', 'Acesso à área do cliente');

-- =========================================================
-- 2. PERMISSÕES
-- =========================================================

INSERT OR IGNORE INTO permissao_usuario (chave, descricao)
VALUES
    ('USUARIO_VISUALIZAR', 'Visualizar usuários'),
    ('USUARIO_CADASTRAR', 'Cadastrar usuários'),
    ('USUARIO_EDITAR', 'Editar usuários'),
    ('USUARIO_EXCLUIR', 'Excluir usuários'),

    ('PRODUTO_VISUALIZAR', 'Visualizar produtos'),
    ('PRODUTO_CADASTRAR', 'Cadastrar produtos'),
    ('PRODUTO_EDITAR', 'Editar produtos'),
    ('PRODUTO_EXCLUIR', 'Excluir produtos'),

    ('SERVICO_VISUALIZAR', 'Visualizar serviços'),
    ('SERVICO_CADASTRAR', 'Cadastrar serviços'),
    ('SERVICO_EDITAR', 'Editar serviços'),
    ('SERVICO_EXCLUIR', 'Excluir serviços'),

    ('PEDIDO_VISUALIZAR', 'Visualizar pedidos'),
    ('PEDIDO_GERENCIAR', 'Gerenciar pedidos'),

    ('AGENDAMENTO_VISUALIZAR', 'Visualizar agendamentos'),
    ('AGENDAMENTO_GERENCIAR', 'Gerenciar agendamentos'),

    ('PLANO_VISUALIZAR', 'Visualizar planos'),
    ('PLANO_GERENCIAR', 'Gerenciar planos'),

    ('ASSINATURA_VISUALIZAR', 'Visualizar assinaturas'),
    ('ASSINATURA_GERENCIAR', 'Gerenciar assinaturas'),

    ('COBRANCA_VISUALIZAR', 'Visualizar cobranças'),
    ('COBRANCA_GERENCIAR', 'Gerenciar cobranças');

-- =========================================================
-- 3. PERMISSÕES DO ADMINISTRADOR
-- =========================================================

INSERT OR IGNORE INTO permissao_tipo_usuario (
    id_tipo_usuario,
    id_permissao
)
SELECT
    tu.id,
    pu.id
FROM tipo_usuario tu
CROSS JOIN permissao_usuario pu
WHERE tu.nome = 'Administrador';

-- =========================================================
-- 4. PERMISSÕES DO CLIENTE
-- =========================================================

INSERT OR IGNORE INTO permissao_tipo_usuario (
    id_tipo_usuario,
    id_permissao
)
SELECT
    tu.id,
    pu.id
FROM tipo_usuario tu
JOIN permissao_usuario pu
    ON pu.chave IN (
        'PRODUTO_VISUALIZAR',
        'SERVICO_VISUALIZAR',
        'PLANO_VISUALIZAR',
        'AGENDAMENTO_VISUALIZAR',
        'ASSINATURA_VISUALIZAR',
        'COBRANCA_VISUALIZAR'
    )
WHERE tu.nome = 'Cliente';

-- =========================================================
-- 5. CATEGORIAS
-- =========================================================

INSERT OR IGNORE INTO categorias_produto (nome, descricao)
VALUES
    ('Alimentação', 'Rações e alimentos para cães e gatos'),
    ('Petiscos', 'Petiscos e snacks para animais'),
    ('Higiene', 'Produtos de higiene e limpeza'),
    ('Brinquedos', 'Brinquedos e itens recreativos'),
    ('Acessórios', 'Coleiras, guias, camas e acessórios'),
    ('Saúde e Bem-estar', 'Produtos de cuidado e bem-estar'),
    ('Transporte', 'Caixas de transporte e bolsas'),
    ('Banho e Tosa', 'Serviços de banho e tosa'),
    ('Cuidados Veterinários', 'Serviços e consultas veterinárias');

-- =========================================================
-- 6. SITUAÇÕES
-- =========================================================

INSERT OR IGNORE INTO situacao (nome, tipo, descricao)
VALUES
    -- Agendamentos
    (
        'Aguardando confirmação',
        'AGENDAMENTO',
        'Aguardando confirmação do agendamento'
    ),
    (
        'Confirmado',
        'AGENDAMENTO',
        'Agendamento confirmado'
    ),
    (
        'Em andamento',
        'AGENDAMENTO',
        'Atendimento em andamento'
    ),
    (
        'Concluído',
        'AGENDAMENTO',
        'Atendimento concluído'
    ),
    (
        'Cancelado',
        'AGENDAMENTO',
        'Agendamento cancelado'
    ),

    -- Assinaturas
    (
        'Pendente',
        'ASSINATURA',
        'Assinatura aguardando confirmação'
    ),
    (
        'Ativa',
        'ASSINATURA',
        'Assinatura ativa'
    ),
    (
        'Inadimplente',
        'ASSINATURA',
        'Assinatura com cobrança em atraso'
    ),
    (
        'Suspensa',
        'ASSINATURA',
        'Assinatura suspensa temporariamente'
    ),
    (
        'Encerrada',
        'ASSINATURA',
        'Assinatura encerrada'
    ),
    (
        'Cancelada',
        'ASSINATURA',
        'Assinatura cancelada'
    );

-- =========================================================
-- 7. PRODUTOS
-- Valores em centavos
-- =========================================================

INSERT OR IGNORE INTO produtos (
    id_categoria_produto,
    nome,
    descricao,
    preco,
    estoque,
    imagem,
    id_usuario_cadastro
)
SELECT
    cp.id,
    dados.nome,
    dados.descricao,
    dados.preco,
    dados.estoque,
    dados.imagem,
    u.id
FROM (
    SELECT
        'Alimentação' AS categoria,
        'Ração Premium para Cães Adultos 10kg' AS nome,
        'Alimento completo para cães adultos' AS descricao,
        15990 AS preco,
        20 AS estoque,
        NULL AS imagem

    UNION ALL SELECT
        'Alimentação',
        'Ração Premium para Gatos Adultos 3kg',
        'Alimento completo para gatos adultos',
        8990, 15, NULL

    UNION ALL SELECT
        'Petiscos',
        'Biscoito para Cães 500g',
        'Petisco para cães',
        2490, 30, NULL

    UNION ALL SELECT
        'Petiscos',
        'Petisco para Gatos 40g',
        'Petisco para gatos',
        1290, 25, NULL

    UNION ALL SELECT
        'Higiene',
        'Shampoo para Cães 500ml',
        'Shampoo para higiene dos cães',
        3290, 20, NULL

    UNION ALL SELECT
        'Higiene',
        'Areia Higiênica para Gatos 4kg',
        'Areia sanitária para gatos',
        2190, 30, NULL

    UNION ALL SELECT
        'Brinquedos',
        'Bola de Borracha para Cães',
        'Brinquedo resistente para cães',
        1990, 20, NULL

    UNION ALL SELECT
        'Brinquedos',
        'Varinha com Penas para Gatos',
        'Brinquedo interativo para gatos',
        1590, 15, NULL

    UNION ALL SELECT
        'Acessórios',
        'Coleira Ajustável para Cães',
        'Coleira ajustável para cães',
        2990, 15, NULL

    UNION ALL SELECT
        'Acessórios',
        'Cama para Pets Pequenos',
        'Cama confortável para animais de pequeno porte',
        8990, 10, NULL

    UNION ALL SELECT
        'Transporte',
        'Caixa de Transporte para Gatos',
        'Caixa de transporte para animais',
        11990, 8, NULL

    UNION ALL SELECT
        'Saúde e Bem-estar',
        'Escova para Pelos',
        'Escova para cuidados com a pelagem',
        2590, 12, NULL

) AS dados

JOIN categorias_produto cp
    ON cp.nome = dados.categoria

JOIN usuarios u
    ON u.email = 'admin@pataquada.com.br';

-- =========================================================
-- 8. SERVIÇOS
-- Duração em minutos e preço em centavos
-- =========================================================

INSERT OR IGNORE INTO servicos (
    id_categoria_produto,
    nome,
    descricao,
    preco,
    duracao_media,
    id_usuario_cadastro
)
SELECT
    cp.id,
    dados.nome,
    dados.descricao,
    dados.preco,
    dados.duracao,
    u.id
FROM (
    SELECT
        'Banho e Tosa' AS categoria,
        'Banho para Cães Pequenos' AS nome,
        'Banho completo para cães de pequeno porte' AS descricao,
        5000 AS preco,
        60 AS duracao

    UNION ALL SELECT
        'Banho e Tosa',
        'Banho para Cães Médios',
        'Banho completo para cães de médio porte',
        7000, 75

    UNION ALL SELECT
        'Banho e Tosa',
        'Banho para Cães Grandes',
        'Banho completo para cães de grande porte',
        9000, 90

    UNION ALL SELECT
        'Banho e Tosa',
        'Tosa Higiênica',
        'Tosa higiênica para cães',
        4000, 45

    UNION ALL SELECT
        'Banho e Tosa',
        'Tosa Completa',
        'Tosa completa para cães',
        6500, 60

    UNION ALL SELECT
        'Banho e Tosa',
        'Banho para Gatos',
        'Banho especializado para gatos',
        8000, 60

    UNION ALL SELECT
        'Cuidados Veterinários',
        'Consulta Veterinária',
        'Consulta veterinária geral',
        12000, 60

    UNION ALL SELECT
        'Cuidados Veterinários',
        'Avaliação Veterinária',
        'Avaliação geral do animal',
        10000, 45

) AS dados

JOIN categorias_produto cp
    ON cp.nome = dados.categoria

JOIN usuarios u
    ON u.email = 'admin@pataquada.com.br';

-- =========================================================
-- 9. TIPOS DE CONSULTA
-- Valores em centavos
-- =========================================================

INSERT OR IGNORE INTO tipos_consulta (
    id_categoria_produto,
    nome,
    descricao,
    preco_minimo,
    preco_maximo,
    id_usuario_cadastro
)
SELECT
    cp.id,
    dados.nome,
    dados.descricao,
    dados.preco_minimo,
    dados.preco_maximo,
    u.id
FROM (
    SELECT
        'Cuidados Veterinários' AS categoria,
        'Consulta Geral' AS nome,
        'Consulta veterinária geral' AS descricao,
        10000 AS preco_minimo,
        18000 AS preco_maximo

    UNION ALL SELECT
        'Cuidados Veterinários',
        'Consulta de Retorno',
        'Retorno para acompanhamento veterinário',
        0, 10000

    UNION ALL SELECT
        'Cuidados Veterinários',
        'Avaliação Preventiva',
        'Avaliação preventiva do animal',
        8000, 15000

) AS dados

JOIN categorias_produto cp
    ON cp.nome = dados.categoria

JOIN usuarios u
    ON u.email = 'admin@pataquada.com.br';

-- =========================================================
-- 10. PLANOS DE ASSINATURA
-- Valores em centavos
-- =========================================================

INSERT OR IGNORE INTO plano (
    id_categoria_produto,
    nome,
    descricao,
    preco,
    tipo_cobranca,
    intervalo_cobranca_meses,
    duracao_meses,
    permite_renovacao,
    id_usuario_cadastro
)
SELECT
    cp.id,
    dados.nome,
    dados.descricao,
    dados.preco,
    dados.tipo_cobranca,
    dados.intervalo_cobranca_meses,
    dados.duracao_meses,
    dados.permite_renovacao,
    u.id
FROM (
    SELECT
        'Saúde e Bem-estar' AS categoria,
        'Plano Essencial' AS nome,
        'Plano básico de benefícios para pets' AS descricao,
        2990 AS preco,
        'RECORRENTE' AS tipo_cobranca,
        1 AS intervalo_cobranca_meses,
        NULL AS duracao_meses,
        1 AS permite_renovacao

    UNION ALL SELECT
        'Saúde e Bem-estar',
        'Plano Plus',
        'Plano intermediário de benefícios para pets',
        4990,
        'RECORRENTE',
        1,
        NULL,
        1

    UNION ALL SELECT
        'Saúde e Bem-estar',
        'Plano Premium',
        'Plano completo de benefícios para pets',
        7990,
        'RECORRENTE',
        1,
        NULL,
        1

) AS dados

JOIN categorias_produto cp
    ON cp.nome = dados.categoria

JOIN usuarios u
    ON u.email = 'admin@pataquada.com.br';

COMMIT;

-- =========================================================
-- 11. CONSULTA DOS DADOS INSERIDOS
-- =========================================================

SELECT * FROM tipo_usuario;

SELECT * FROM permissao_usuario;

SELECT * FROM permissao_tipo_usuario;

SELECT * FROM categorias_produto;

SELECT * FROM situacao;

SELECT * FROM produtos;

SELECT * FROM servicos;

SELECT * FROM tipos_consulta;

SELECT * FROM plano;

-- =========================================================
-- FIM DA CARGA INICIAL
-- =========================================================
