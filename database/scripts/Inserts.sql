-- =========================================================
-- PATAQUADA - INSERTS / CARGA INICIAL
-- Banco: pataquadaDB
-- Compatível com SQLite / DBeaver
-- =========================================================
PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- =========================================================
-- 1. TIPOS DE USUÁRIO
-- =========================================================

INSERT INTO tipo_usuario (nome, tipo, descricao)
SELECT d.nome, d.tipo, d.descricao
FROM (
    SELECT 'Administrador' AS nome, 'ADMIN' AS tipo,
           'Acesso administrativo ao sistema' AS descricao
    UNION ALL
    SELECT 'Cliente', 'CLIENTE', 'Acesso à área do cliente'
) d
WHERE NOT EXISTS (
    SELECT 1
    FROM tipo_usuario tu
    WHERE tu.tipo = d.tipo
);

-- =========================================================
-- 2. USUÁRIO ADMINISTRADOR
-- =========================================================
-- E-mail: admin@pataquada.com.br
-- Usuário: admin
-- A senha NÃO fica em texto puro: o login usa bcrypt.compare, então um
-- valor como 'admin' nunca funcionaria. O admin é criado com um marcador
-- inválido (nenhuma senha confere) e você define a senha de verdade
-- com o UPDATE abaixo, usando o hash gerado por gerar_hash.js:
--
--   node gerar_hash.js "SuaSenhaAqui"
--   UPDATE usuarios SET senha = '<hash gerado>' WHERE email = 'admin@pataquada.com.br';
-- =========================================================

INSERT INTO usuarios (
    nome,
    email,
    id_tipo_usuario,
    usuario,
    senha,
    telefone
)
SELECT
    'Administrador',
    'admin@pataquada.com.br',
    tu.id,
    'admin',
    '<HASH_BCRYPT_AQUI>',
    NULL
FROM tipo_usuario tu
WHERE tu.tipo = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM usuarios u
      WHERE u.email = 'admin@pataquada.com.br'
  );

-- =========================================================
-- 3. PERMISSÕES
-- =========================================================

INSERT INTO permissao_usuario (chave, descricao)
SELECT d.chave, d.descricao
FROM (
    SELECT 'USUARIO_VISUALIZAR' AS chave, 'Visualizar usuários' AS descricao
    UNION ALL SELECT 'USUARIO_CADASTRAR', 'Cadastrar usuários'
    UNION ALL SELECT 'USUARIO_EDITAR', 'Editar usuários'
    UNION ALL SELECT 'USUARIO_EXCLUIR', 'Excluir usuários'

    UNION ALL SELECT 'PRODUTO_VISUALIZAR', 'Visualizar produtos'
    UNION ALL SELECT 'PRODUTO_CADASTRAR', 'Cadastrar produtos'
    UNION ALL SELECT 'PRODUTO_EDITAR', 'Editar produtos'
    UNION ALL SELECT 'PRODUTO_EXCLUIR', 'Excluir produtos'

    UNION ALL SELECT 'SERVICO_VISUALIZAR', 'Visualizar serviços'
    UNION ALL SELECT 'SERVICO_CADASTRAR', 'Cadastrar serviços'
    UNION ALL SELECT 'SERVICO_EDITAR', 'Editar serviços'
    UNION ALL SELECT 'SERVICO_EXCLUIR', 'Excluir serviços'

    UNION ALL SELECT 'PEDIDO_VISUALIZAR', 'Visualizar pedidos'
    UNION ALL SELECT 'PEDIDO_GERENCIAR', 'Gerenciar pedidos'

    UNION ALL SELECT 'AGENDAMENTO_VISUALIZAR', 'Visualizar agendamentos'
    UNION ALL SELECT 'AGENDAMENTO_GERENCIAR', 'Gerenciar agendamentos'

    UNION ALL SELECT 'PLANO_VISUALIZAR', 'Visualizar planos'
    UNION ALL SELECT 'PLANO_GERENCIAR', 'Gerenciar planos'

    UNION ALL SELECT 'ASSINATURA_VISUALIZAR', 'Visualizar assinaturas'
    UNION ALL SELECT 'ASSINATURA_GERENCIAR', 'Gerenciar assinaturas'

    UNION ALL SELECT 'COBRANCA_VISUALIZAR', 'Visualizar cobranças'
    UNION ALL SELECT 'COBRANCA_GERENCIAR', 'Gerenciar cobranças'
) d
WHERE NOT EXISTS (
    SELECT 1
    FROM permissao_usuario pu
    WHERE pu.chave = d.chave
);

-- =========================================================
-- 4. PERMISSÕES DO ADMINISTRADOR
-- =========================================================
INSERT INTO
    permissao_tipo_usuario (id_tipo_usuario, id_permissao)
SELECT
    tu.id,
    pu.id
FROM tipo_usuario tu
CROSS JOIN permissao_usuario pu
WHERE tu.tipo = 'ADMIN'
  AND NOT EXISTS (
      SELECT 1
      FROM permissao_tipo_usuario ptu
      WHERE ptu.id_tipo_usuario = tu.id
        AND ptu.id_permissao = pu.id
  );

-- =========================================================
-- 5. PERMISSÕES DO CLIENTE
-- =========================================================
INSERT INTO
    permissao_tipo_usuario (id_tipo_usuario, id_permissao)
SELECT
    tu.id,
    pu.id
FROM
    tipo_usuario tu
    INNER JOIN permissao_usuario pu ON pu.chave IN (
        'PRODUTO_VISUALIZAR',
        'SERVICO_VISUALIZAR',
        'PLANO_VISUALIZAR',
        'AGENDAMENTO_VISUALIZAR',
        'ASSINATURA_VISUALIZAR',
        'COBRANCA_VISUALIZAR'
    )
WHERE tu.tipo = 'CLIENTE'
  AND NOT EXISTS (
      SELECT 1
      FROM permissao_tipo_usuario ptu
      WHERE ptu.id_tipo_usuario = tu.id
        AND ptu.id_permissao = pu.id
  );

-- =========================================================
-- 6. CATEGORIAS
-- =========================================================

INSERT INTO categorias_produto (nome, descricao)
SELECT d.nome, d.descricao
FROM (
    SELECT 'Alimentação' AS nome, 'Rações e alimentos para cães e gatos' AS descricao
    UNION ALL SELECT 'Petiscos', 'Petiscos e snacks para animais'
    UNION ALL SELECT 'Higiene', 'Produtos de higiene e limpeza'
    UNION ALL SELECT 'Brinquedos', 'Brinquedos e itens recreativos'
    UNION ALL SELECT 'Acessórios', 'Coleiras, guias, camas e acessórios'
    UNION ALL SELECT 'Saúde e Bem-estar', 'Produtos de cuidado e bem-estar'
    UNION ALL SELECT 'Transporte', 'Caixas de transporte e bolsas'
    UNION ALL SELECT 'Banho e Tosa', 'Serviços de banho e tosa'
    UNION ALL SELECT 'Cuidados Veterinários', 'Serviços e consultas veterinárias'
) d
WHERE NOT EXISTS (
    SELECT 1
    FROM categorias_produto cp
    WHERE cp.nome = d.nome
);

-- =========================================================
-- 7. SITUAÇÕES
-- =========================================================

INSERT INTO situacao (nome, tipo, descricao)
SELECT d.nome, d.tipo, d.descricao
FROM (
    SELECT
        'Aguardando confirmação' AS nome,
        'AGENDAMENTO' AS tipo,
        'Aguardando confirmação do agendamento' AS descricao

    UNION ALL SELECT 'Confirmado', 'AGENDAMENTO', 'Agendamento confirmado'
    UNION ALL SELECT 'Em andamento', 'AGENDAMENTO', 'Atendimento em andamento'
    UNION ALL SELECT 'Concluído', 'AGENDAMENTO', 'Atendimento concluído'
    UNION ALL SELECT 'Cancelado', 'AGENDAMENTO', 'Agendamento cancelado'

    UNION ALL SELECT 'Pendente', 'ASSINATURA', 'Assinatura aguardando confirmação'
    UNION ALL SELECT 'Ativa', 'ASSINATURA', 'Assinatura ativa'
    UNION ALL SELECT 'Inadimplente', 'ASSINATURA', 'Assinatura com cobrança em atraso'
    UNION ALL SELECT 'Suspensa', 'ASSINATURA', 'Assinatura suspensa temporariamente'
    UNION ALL SELECT 'Encerrada', 'ASSINATURA', 'Assinatura encerrada'
    UNION ALL SELECT 'Cancelada', 'ASSINATURA', 'Assinatura cancelada'
) d
WHERE NOT EXISTS (
    SELECT 1
    FROM situacao s
    WHERE s.nome = d.nome
      AND s.tipo = d.tipo
);

-- =========================================================
-- 8. PRODUTOS
-- Valores em centavos
-- =========================================================
INSERT INTO
    produtos (
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
    d.nome,
    d.descricao,
    d.preco,
    d.estoque,
    d.imagem,
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
) d
INNER JOIN categorias_produto cp
    ON cp.nome = d.categoria
INNER JOIN usuarios u
    ON u.email = 'admin@pataquada.com.br'
WHERE NOT EXISTS (
    SELECT 1
    FROM produtos p
    WHERE p.nome = d.nome
      AND p.id_categoria_produto = cp.id
);

-- =========================================================
-- 9. PET-CARE / SERVIÇOS
-- Valores em centavos
-- Duração em minutos
-- =========================================================
INSERT INTO
    servicos (
        id_categoria_produto,
        nome,
        descricao,
        preco,
        duracao_media,
        imagem,
        id_usuario_cadastro
    )
SELECT
    cp.id,
    d.nome,
    d.descricao,
    d.preco,
    d.duracao_media,
    NULL,
    u.id
FROM (
    SELECT
        'Banho e Tosa' AS categoria,
        'Banho' AS nome,
        'Banho completo com produtos adequados ao tipo de pelo e porte do pet.' AS descricao,
        4500 AS preco,
        60 AS duracao_media

    UNION ALL SELECT
        'Banho e Tosa',
        'Banho Premium',
        'Banho especial com produtos premium, hidratação e finalização dos pelos.',
        7500, 90

    UNION ALL SELECT
        'Banho e Tosa',
        'Tosa Higiênica',
        'Remoção dos pelos em regiões que exigem maior cuidado com a higiene.',
        3500, 40

    UNION ALL SELECT
        'Banho e Tosa',
        'Tosa Completa',
        'Tosa realizada conforme o padrão desejado e as características do pet.',
        6500, 60

    UNION ALL SELECT
        'Banho e Tosa',
        'Hidratação dos Pelos',
        'Tratamento para hidratação e recuperação dos pelos.',
        4000, 30

    UNION ALL SELECT
        'Banho e Tosa',
        'Escovação de Pelos',
        'Escovação para remoção de pelos soltos e prevenção de nós.',
        2500, 30

    UNION ALL SELECT
        'Banho e Tosa',
        'Corte de Unhas',
        'Corte cuidadoso das unhas para manter o conforto e a mobilidade do pet.',
        2000, 15

    UNION ALL SELECT
        'Banho e Tosa',
        'Limpeza de Ouvidos',
        'Higienização externa dos ouvidos com produtos apropriados.',
        2000, 15

    UNION ALL SELECT
        'Cuidados Veterinários',
        'Avaliação de Saúde',
        'Avaliação básica das condições gerais de saúde do pet.',
        8000, 30

    UNION ALL SELECT
        'Cuidados Veterinários',
        'Acompanhamento Preventivo',
        'Acompanhamento periódico para monitoramento da saúde e bem-estar do pet.',
        10000, 30
) d
INNER JOIN categorias_produto cp
    ON cp.nome = d.categoria
INNER JOIN usuarios u
    ON u.email = 'admin@pataquada.com.br'
WHERE NOT EXISTS (
    SELECT 1
    FROM servicos s
    WHERE s.nome = d.nome
      AND s.id_categoria_produto = cp.id
);

-- =========================================================
-- 10. TIPOS DE CONSULTA
-- Valores em centavos
-- Duração em minutos
-- =========================================================

INSERT INTO tipos_consulta (
    id_categoria_produto,
    nome,
    descricao,
    preco_fixo,
    preco_minimo,
    preco_maximo,
    duracao_media,
    id_usuario_cadastro
)
SELECT
    cp.id,
    d.nome,
    d.descricao,
    d.preco_fixo,
    d.preco_minimo,
    d.preco_maximo,
    d.duracao_media,
    u.id
FROM (
    SELECT
        'Consulta Geral' AS nome,
        'Avaliação clínica geral do pet, incluindo análise do histórico, exame físico e orientações.' AS descricao,
        NULL AS preco_fixo,
        10000 AS preco_minimo,
        18000 AS preco_maximo,
        40 AS duracao_media

    UNION ALL SELECT
        'Consulta de Retorno',
        'Reavaliação do pet após consulta ou tratamento anterior.',
        8000, 0, 0, 20

    UNION ALL SELECT
        'Avaliação Preventiva',
        'Avaliação periódica para prevenção de doenças e acompanhamento da saúde.',
        NULL, 8000, 15000, 30

    UNION ALL SELECT
        'Consulta Dermatológica',
        'Avaliação de problemas de pele, pelos, alergias, coceiras e irritações.',
        NULL, 15000, 25000, 40

    UNION ALL SELECT
        'Consulta Geriátrica',
        'Acompanhamento de pets idosos, com foco na prevenção e controle de alterações relacionadas à idade.',
        NULL, 15000, 25000, 45

    UNION ALL SELECT
        'Consulta Nutricional',
        'Avaliação alimentar e orientação nutricional conforme idade, porte e necessidades do pet.',
        NULL, 10000, 18000, 30

    UNION ALL SELECT
        'Aplicação de Vacina',
        'Aplicação de vacina com avaliação prévia do estado de saúde do pet.',
        5000, 0, 0, 15

    UNION ALL SELECT
        'Acompanhamento Pós-operatório',
        'Avaliação da recuperação do pet após procedimento cirúrgico.',
        8000, 0, 0, 20

    UNION ALL SELECT
        'Corte de Unhas',
        'Corte e manutenção das unhas do pet.',
        2500, 0, 0, 15

    UNION ALL SELECT
        'Limpeza de Ouvidos',
        'Higienização dos ouvidos e avaliação de possíveis alterações.',
        3000, 0, 0, 15
) d
INNER JOIN categorias_produto cp
    ON cp.nome = 'Cuidados Veterinários'
INNER JOIN usuarios u
    ON u.email = 'admin@pataquada.com.br'
WHERE NOT EXISTS (
    SELECT 1
    FROM tipos_consulta tc
    WHERE tc.nome = d.nome
      AND tc.id_categoria_produto = cp.id
);

-- =========================================================
-- 11. PLANOS DE ASSINATURA
-- Valores em centavos
-- Cobrança recorrente mensal
-- =========================================================
INSERT INTO
    plano (
        id_categoria_produto,
        nome,
        descricao,
        preco,
        tipo_cobranca,
        intervalo_cobranca_meses,
        duracao_meses,
        permite_renovacao,
        imagem,
        id_usuario_cadastro
    )
SELECT
    cp.id,
    d.nome,
    d.descricao,
    d.preco,
    'RECORRENTE',
    1,
    NULL,
    1,
    NULL,
    u.id
FROM (
    SELECT
        'Essencial' AS nome,
        'Plano de entrada para quem deseja manter os cuidados básicos do pet em dia. Inclui benefícios e condições especiais nos serviços participantes.' AS descricao,
        2990 AS preco

    UNION ALL SELECT
        'Plus',
        'Plano intermediário com benefícios ampliados, descontos em serviços de banho e tosa e condições especiais para consultas.',
        4990

    UNION ALL SELECT
        'Premium',
        'Plano completo com benefícios diferenciados, descontos ampliados e vantagens nos serviços e cuidados veterinários participantes.',
        7990
) d
INNER JOIN categorias_produto cp
    ON cp.nome = 'Saúde e Bem-estar'
INNER JOIN usuarios u
    ON u.email = 'admin@pataquada.com.br'
WHERE NOT EXISTS (
    SELECT 1
    FROM plano p
    WHERE p.nome = d.nome
      AND p.id_categoria_produto = cp.id
);

-- =========================================================
-- 12. PERMISSÕES DOS NOVOS MÓDULOS ADMINISTRATIVOS
-- =========================================================

INSERT OR IGNORE INTO permissao_usuario (chave, descricao)
VALUES
('FORNECEDOR_VISUALIZAR', 'Visualizar fornecedores'),
('FORNECEDOR_CADASTRAR', 'Cadastrar fornecedores'),
('FORNECEDOR_EDITAR', 'Editar fornecedores'),
('FORNECEDOR_INATIVAR', 'Inativar fornecedores'),
('ESTOQUE_VISUALIZAR', 'Visualizar estoque'),
('ESTOQUE_MOVIMENTAR', 'Registrar entradas e saídas de estoque'),
('DADOS_EMPRESA_EDITAR', 'Editar dados institucionais da PataQuada'),
('CONFIGURACAO_EDITAR', 'Editar configurações da loja'),
('RELATORIO_VISUALIZAR', 'Visualizar relatórios administrativos');

INSERT OR IGNORE INTO permissao_tipo_usuario (id_tipo_usuario, id_permissao)
SELECT tu.id, pu.id
FROM tipo_usuario tu
CROSS JOIN permissao_usuario pu
WHERE tu.tipo = 'ADMIN'
  AND pu.chave IN (
      'FORNECEDOR_VISUALIZAR',
      'FORNECEDOR_CADASTRAR',
      'FORNECEDOR_EDITAR',
      'FORNECEDOR_INATIVAR',
      'ESTOQUE_VISUALIZAR',
      'ESTOQUE_MOVIMENTAR',
      'DADOS_EMPRESA_EDITAR',
      'CONFIGURACAO_EDITAR',
      'RELATORIO_VISUALIZAR'
  )
  AND NOT EXISTS (
      SELECT 1
      FROM permissao_tipo_usuario ptx
      WHERE ptx.id_tipo_usuario = tu.id
        AND ptx.id_permissao = pu.id
  );

-- =========================================================
-- 13. DADOS INSTITUCIONAIS DA PATAQUADA
-- =========================================================

INSERT OR IGNORE INTO dados_pataquada (
    id,
    nome_fantasia,
    pais
)
VALUES (
    1,
    'PataQuada',
    'Brasil'
);

-- =========================================================
-- 14. CONFIGURAÇÕES INICIAIS
-- =========================================================

INSERT OR IGNORE INTO configuracoes_pataquada (
    chave,
    valor,
    descricao,
    categoria
)
VALUES
('loja_ativa', '1', 'Define se a loja está disponível.', 'LOJA'),
('modo_manutencao', '0', 'Ativa ou desativa o modo de manutenção.', 'LOJA'),
('moeda', 'BRL', 'Moeda utilizada pela loja.', 'GERAL'),
('fuso_horario', 'America/Sao_Paulo', 'Fuso horário da aplicação.', 'GERAL'),
('mostrar_estoque', '1', 'Exibe a disponibilidade dos produtos.', 'PRODUTOS'),
('permitir_compra_sem_estoque', '0', 'Permite venda sem saldo disponível.', 'PRODUTOS'),
('estoque_minimo_padrao', '0', 'Estoque mínimo padrão dos produtos.', 'ESTOQUE'),
('whatsapp_vendas', NULL, 'WhatsApp de atendimento e vendas.', 'CONTATO'),
('email_notificacoes', NULL, 'E-mail para notificações administrativas.', 'NOTIFICACOES');

-- =========================================================
-- 15. FINALIZAÇÃO DA TRANSAÇÃO
-- =========================================================
COMMIT;

--RETURN;
-- =========================================================
-- 16. CONFERÊNCIA DOS DADOS
-- Execute os SELECTs abaixo separadamente, se desejar.
-- =========================================================

/*

-- Administrador
SELECT
    u.id,
    u.nome,
    u.email,
    u.usuario,
    tu.nome AS tipo_usuario
FROM usuarios u
INNER JOIN tipo_usuario tu
ON tu.id = u.id_tipo_usuario
WHERE u.email = 'admin@pataquada.com.br';

-- Tipos de usuário
SELECT *
FROM tipo_usuario;

-- Permissões
SELECT *
FROM permissao_usuario;

-- Permissões por tipo de usuário
SELECT
tu.nome AS tipo_usuario,
pu.chave AS permissao,
pu.descricao
FROM permissao_tipo_usuario ptu
INNER JOIN tipo_usuario tu
ON tu.id = ptu.id_tipo_usuario
INNER JOIN permissao_usuario pu
ON pu.id = ptu.id_permissao
ORDER BY tu.nome, pu.chave;

-- Categorias
SELECT *
FROM categorias_produto;

-- Situações
SELECT *
FROM situacao;

-- Produtos
SELECT
p.id,
p.nome,
p.descricao,
p.preco,
p.estoque,
cp.nome AS categoria
FROM produtos p
INNER JOIN categorias_produto cp
ON cp.id = p.id_categoria_produto
ORDER BY cp.nome, p.nome;

-- Serviços / Pet-care
SELECT
s.id,
s.nome,
s.descricao,
s.preco,
s.duracao_media,
cp.nome AS categoria
FROM servicos s
INNER JOIN categorias_produto cp
ON cp.id = s.id_categoria_produto
ORDER BY cp.nome, s.nome;

-- Consultas
SELECT
tc.id,
tc.nome,
tc.descricao,
tc.preco_minimo,
tc.preco_maximo,
tc.duracao_media,
cp.nome AS categoria
FROM tipos_consulta tc
INNER JOIN categorias_produto cp
ON cp.id = tc.id_categoria_produto
ORDER BY tc.nome;

-- Planos
SELECT
p.id,
p.nome,
p.descricao,
p.preco,
p.tipo_cobranca,
p.intervalo_cobranca_meses,
p.duracao_meses,
p.permite_renovacao,
cp.nome AS categoria
FROM plano p
INNER JOIN categorias_produto cp
ON cp.id = p.id_categoria_produto
ORDER BY p.preco;

*/

-- =========================================================
-- FIM DA CARGA INICIAL
-- =========================================================