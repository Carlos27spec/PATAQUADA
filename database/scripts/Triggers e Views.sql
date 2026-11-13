PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_fornecedores_nome
ON fornecedores(razao_social);

CREATE INDEX IF NOT EXISTS idx_fornecedores_status
ON fornecedores(status);

CREATE INDEX IF NOT EXISTS idx_produto_detalhes_sku
ON produto_detalhes(sku);

CREATE INDEX IF NOT EXISTS idx_produto_fornecedor_fornecedor
ON produto_fornecedor(id_fornecedor);

CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_fornecedor_principal
ON produto_fornecedor(id_produto)
WHERE fornecedor_principal = 1;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_data
ON movimentacoes_estoque(id_produto, data_movimentacao);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo_data
ON movimentacoes_estoque(tipo, data_movimentacao);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_fornecedor
ON movimentacoes_estoque(id_fornecedor);

CREATE UNIQUE INDEX IF NOT EXISTS idx_produto_imagem_principal
ON produto_imagens(id_produto)
WHERE imagem_principal = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_carrinho_aberto_cliente
ON carrinho(id_usuario_cliente)
WHERE status = 'ABERTO';

-- =====================================================
-- TRIGGERS DE ATUALIZAÇÃO
-- =====================================================

DROP TRIGGER IF EXISTS trg_usuarios_data_atualizacao;
CREATE TRIGGER trg_usuarios_data_atualizacao
AFTER UPDATE ON usuarios
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE usuarios
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_produtos_data_atualizacao;
CREATE TRIGGER trg_produtos_data_atualizacao
AFTER UPDATE ON produtos
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE produtos
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_servicos_data_atualizacao;
CREATE TRIGGER trg_servicos_data_atualizacao
AFTER UPDATE ON servicos
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE servicos
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_agendamentos_data_atualizacao;
CREATE TRIGGER trg_agendamentos_data_atualizacao
AFTER UPDATE ON agendamentos
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE agendamentos
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_plano_data_atualizacao;
CREATE TRIGGER trg_plano_data_atualizacao
AFTER UPDATE ON plano
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE plano
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_assinaturas_data_atualizacao;
CREATE TRIGGER trg_assinaturas_data_atualizacao
AFTER UPDATE ON assinaturas_plano
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE assinaturas_plano
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_cobrancas_data_atualizacao;
CREATE TRIGGER trg_cobrancas_data_atualizacao
AFTER UPDATE ON cobrancas_assinatura
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE cobrancas_assinatura
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_carrinho_data_atualizacao;
CREATE TRIGGER trg_carrinho_data_atualizacao
AFTER UPDATE ON carrinho
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE carrinho
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- =====================================================
-- HISTÓRICO DE AGENDAMENTOS
-- =====================================================

DROP TRIGGER IF EXISTS trg_agendamento_historico_insert;
CREATE TRIGGER trg_agendamento_historico_insert
AFTER INSERT ON agendamentos
FOR EACH ROW
BEGIN
    INSERT INTO agendamento_historico (
        id_agendamento,
        id_situacao_anterior,
        id_situacao_nova,
        id_usuario_responsavel,
        observacao
    )
    VALUES (
        NEW.id,
        NULL,
        NEW.id_situacao,
        NULL,
        'Agendamento cadastrado.'
    );
END;

DROP TRIGGER IF EXISTS trg_agendamento_historico_update;
CREATE TRIGGER trg_agendamento_historico_update
AFTER UPDATE OF id_situacao ON agendamentos
FOR EACH ROW
WHEN OLD.id_situacao <> NEW.id_situacao
BEGIN
    INSERT INTO agendamento_historico (
        id_agendamento,
        id_situacao_anterior,
        id_situacao_nova,
        id_usuario_responsavel,
        observacao
    )
    VALUES (
        NEW.id,
        OLD.id_situacao,
        NEW.id_situacao,
        NULL,
        'Situação do agendamento alterada.'
    );
END;

-- =====================================================
-- ESTOQUE: VALIDAR SAÍDA
-- =====================================================

DROP TRIGGER IF EXISTS trg_estoque_validar_saida;
CREATE TRIGGER trg_estoque_validar_saida
BEFORE INSERT ON movimentacoes_estoque
WHEN NEW.tipo = 'SAIDA'
BEGIN
    SELECT CASE
        WHEN COALESCE(
            (SELECT estoque
             FROM produtos
             WHERE id = NEW.id_produto), 0
        ) < NEW.quantidade
        THEN RAISE(
            ABORT,
            'Estoque insuficiente para esta saída.'
        )
    END;
END;

-- =====================================================
-- ESTOQUE: APLICAR MOVIMENTAÇÃO
-- =====================================================

DROP TRIGGER IF EXISTS trg_estoque_aplicar_movimentacao;
CREATE TRIGGER trg_estoque_aplicar_movimentacao
AFTER INSERT ON movimentacoes_estoque
FOR EACH ROW
BEGIN
    UPDATE produtos
    SET estoque = CASE
        WHEN NEW.tipo = 'ENTRADA'
            THEN estoque + NEW.quantidade
        WHEN NEW.tipo = 'SAIDA'
            THEN estoque - NEW.quantidade
    END
    WHERE id = NEW.id_produto;

    UPDATE movimentacoes_estoque
    SET
        estoque_anterior = (
            SELECT estoque FROM produtos
            WHERE id = NEW.id_produto
        ) - CASE
            WHEN NEW.tipo = 'ENTRADA' THEN NEW.quantidade
            ELSE -NEW.quantidade
        END,
        estoque_posterior = (
            SELECT estoque FROM produtos
            WHERE id = NEW.id_produto
        )
    WHERE id = NEW.id;
END;

-- =====================================================
-- PROTEGER HISTÓRICO DE ESTOQUE
-- =====================================================

DROP TRIGGER IF EXISTS trg_estoque_bloquear_alteracao;
CREATE TRIGGER trg_estoque_bloquear_alteracao
BEFORE UPDATE ON movimentacoes_estoque
WHEN
    NEW.id_produto IS NOT OLD.id_produto OR
    NEW.id_fornecedor IS NOT OLD.id_fornecedor OR
    NEW.id_usuario_responsavel IS NOT OLD.id_usuario_responsavel OR
    NEW.tipo IS NOT OLD.tipo OR
    NEW.origem IS NOT OLD.origem OR
    NEW.quantidade IS NOT OLD.quantidade OR
    NEW.custo_unitario IS NOT OLD.custo_unitario OR
    NEW.numero_documento IS NOT OLD.numero_documento OR
    NEW.motivo IS NOT OLD.motivo OR
    NEW.observacoes IS NOT OLD.observacoes OR
    NEW.data_movimentacao IS NOT OLD.data_movimentacao
BEGIN
    SELECT RAISE(
        ABORT,
        'Movimentação protegida. Registre outra movimentação para corrigir.'
    );
END;

DROP TRIGGER IF EXISTS trg_estoque_bloquear_exclusao;
CREATE TRIGGER trg_estoque_bloquear_exclusao
BEFORE DELETE ON movimentacoes_estoque
BEGIN
    SELECT RAISE(
        ABORT,
        'Movimentações não podem ser excluídas. Registre uma movimentação inversa.'
    );
END;

-- =====================================================
-- TRIGGERS DAS NOVAS TABELAS
-- =====================================================

DROP TRIGGER IF EXISTS trg_fornecedores_data_atualizacao;
CREATE TRIGGER trg_fornecedores_data_atualizacao
AFTER UPDATE ON fornecedores
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE fornecedores
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_produto_detalhes_data_atualizacao;
CREATE TRIGGER trg_produto_detalhes_data_atualizacao
AFTER UPDATE ON produto_detalhes
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE produto_detalhes
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_produto_fornecedor_data_atualizacao;
CREATE TRIGGER trg_produto_fornecedor_data_atualizacao
AFTER UPDATE ON produto_fornecedor
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE produto_fornecedor
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_dados_pataquada_data_atualizacao;
CREATE TRIGGER trg_dados_pataquada_data_atualizacao
AFTER UPDATE ON dados_pataquada
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE dados_pataquada
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_configuracoes_pataquada_data_atualizacao;
CREATE TRIGGER trg_configuracoes_pataquada_data_atualizacao
AFTER UPDATE ON configuracoes_pataquada
FOR EACH ROW
WHEN NEW.data_atualizacao IS OLD.data_atualizacao
BEGIN
    UPDATE configuracoes_pataquada
    SET data_atualizacao = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- =====================================================
-- VIEWS ADMINISTRATIVAS
-- =====================================================

DROP VIEW IF EXISTS vw_produtos_admin;
CREATE VIEW vw_produtos_admin AS
SELECT
    p.id,
    p.nome,
    p.descricao,
    p.preco,
    p.estoque,
    p.imagem,
    p.status,
    p.data_cadastro,
    p.data_atualizacao,
    cp.nome AS categoria,
    pd.sku,
    pd.codigo_barras,
    pd.peso,
    pd.unidade_medida,
    COALESCE(pd.estoque_minimo, 0) AS estoque_minimo,
    COALESCE(pd.custo_aquisicao, 0) AS custo_aquisicao,
    CASE
        WHEN p.estoque = 0 THEN 'SEM_ESTOQUE'
        WHEN p.estoque <= COALESCE(pd.estoque_minimo, 0)
            THEN 'ESTOQUE_BAIXO'
        ELSE 'DISPONIVEL'
    END AS situacao_estoque
FROM produtos p
INNER JOIN categorias_produto cp
    ON cp.id = p.id_categoria_produto
LEFT JOIN produto_detalhes pd
    ON pd.id_produto = p.id;

DROP VIEW IF EXISTS vw_fornecedores_resumo;
CREATE VIEW vw_fornecedores_resumo AS
SELECT
    f.id,
    f.tipo_pessoa,
    f.razao_social,
    f.nome_fantasia,
    f.cpf_cnpj,
    f.email,
    f.telefone,
    f.celular,
    f.cidade,
    f.uf,
    f.status,
    COUNT(DISTINCT pf.id_produto) AS total_produtos,
    COUNT(DISTINCT me.id) AS total_movimentacoes
FROM fornecedores f
LEFT JOIN produto_fornecedor pf
    ON pf.id_fornecedor = f.id
LEFT JOIN movimentacoes_estoque me
    ON me.id_fornecedor = f.id
GROUP BY f.id;

DROP VIEW IF EXISTS vw_produtos_fornecedores;
CREATE VIEW vw_produtos_fornecedores AS
SELECT
    p.id AS id_produto,
    p.nome AS produto,
    p.estoque,
    f.id AS id_fornecedor,
    f.razao_social AS fornecedor,
    f.nome_fantasia,
    pf.codigo_produto_fornecedor,
    pf.custo_atual,
    pf.prazo_entrega_dias,
    pf.fornecedor_principal
FROM produto_fornecedor pf
INNER JOIN produtos p ON p.id = pf.id_produto
INNER JOIN fornecedores f ON f.id = pf.id_fornecedor;

DROP VIEW IF EXISTS vw_movimentacoes_estoque;
CREATE VIEW vw_movimentacoes_estoque AS
SELECT
    me.id,
    me.data_movimentacao,
    me.tipo,
    me.origem,
    me.quantidade,
    me.custo_unitario,
    me.numero_documento,
    me.estoque_anterior,
    me.estoque_posterior,
    me.motivo,
    me.observacoes,
    p.id AS id_produto,
    p.nome AS produto,
    f.id AS id_fornecedor,
    COALESCE(f.nome_fantasia, f.razao_social) AS fornecedor,
    u.nome AS responsavel
FROM movimentacoes_estoque me
INNER JOIN produtos p ON p.id = me.id_produto
LEFT JOIN fornecedores f ON f.id = me.id_fornecedor
LEFT JOIN usuarios u ON u.id = me.id_usuario_responsavel;

DROP VIEW IF EXISTS vw_agendamentos_admin;
CREATE VIEW vw_agendamentos_admin AS
SELECT
    a.id,
    a.data_agendamento,
    a.observacoes,
    a.status,
    u.nome AS cliente,
    pet.nome AS pet,
    s.nome AS servico,
    tc.nome AS tipo_consulta,
    TRIM(COALESCE(pr.nome, '') || ' ' || COALESCE(pr.sobrenome, '')) AS profissional,
    sit.nome AS situacao
FROM agendamentos a
INNER JOIN usuarios u ON u.id = a.id_usuario_cliente
INNER JOIN pets pet ON pet.id = a.id_pet
LEFT JOIN servicos s ON s.id = a.id_servico
LEFT JOIN tipos_consulta tc ON tc.id = a.id_tipo_consulta
LEFT JOIN profissionais pr ON pr.id = a.id_profissional
INNER JOIN situacao sit ON sit.id = a.id_situacao;

DROP VIEW IF EXISTS vw_assinaturas_admin;
CREATE VIEW vw_assinaturas_admin AS
SELECT
    ap.id,
    u.nome AS cliente,
    pet.nome AS pet,
    pl.nome AS plano,
    ap.valor_contratado,
    ap.tipo_cobranca,
    ap.data_inicio,
    ap.data_fim_vigencia,
    ap.proxima_cobranca,
    ap.status
FROM assinaturas_plano ap
INNER JOIN usuarios u ON u.id = ap.id_usuario_cliente
LEFT JOIN pets pet ON pet.id = ap.id_pet
INNER JOIN plano pl ON pl.id = ap.id_plano;

DROP VIEW IF EXISTS vw_cobrancas_admin;
CREATE VIEW vw_cobrancas_admin AS
SELECT
    ca.id,
    ca.id_assinatura,
    u.nome AS cliente,
    pl.nome AS plano,
    ca.numero_ciclo,
    ca.competencia,
    ca.valor,
    ca.data_vencimento,
    ca.data_pagamento,
    ca.status,
    ca.codigo_transacao,
    ca.tentativas
FROM cobrancas_assinatura ca
INNER JOIN assinaturas_plano ap ON ap.id = ca.id_assinatura
INNER JOIN usuarios u ON u.id = ap.id_usuario_cliente
INNER JOIN plano pl ON pl.id = ap.id_plano;

DROP VIEW IF EXISTS vw_dashboard_admin;
CREATE VIEW vw_dashboard_admin AS
SELECT
    (SELECT COUNT(*) FROM produtos WHERE status = 1) AS total_produtos,
    (SELECT COUNT(*)
     FROM usuarios u
     INNER JOIN tipo_usuario tu ON tu.id = u.id_tipo_usuario
     WHERE tu.tipo = 'CLIENTE' AND u.status = 1) AS total_clientes,
    (SELECT COUNT(*) FROM agendamentos WHERE status = 1) AS total_agendamentos,
    (SELECT COUNT(*) FROM assinaturas_plano
     WHERE status IN ('ATIVA','INADIMPLENTE','SUSPENSA'))
        AS total_assinaturas_ativas,
    (SELECT COUNT(*) FROM cobrancas_assinatura
     WHERE status IN ('PENDENTE','ATRASADA','FALHOU'))
        AS cobrancas_pendentes,
    (SELECT COUNT(*) FROM fornecedores WHERE status = 1)
        AS total_fornecedores,
    (SELECT COUNT(*) FROM produtos
     WHERE status = 1 AND estoque = 0) AS produtos_sem_estoque,
    (SELECT COUNT(*)
     FROM produtos p
     LEFT JOIN produto_detalhes pd ON pd.id_produto = p.id
     WHERE p.status = 1
       AND p.estoque > 0
       AND p.estoque <= COALESCE(pd.estoque_minimo, 0))
        AS produtos_estoque_baixo,
    (SELECT COALESCE(SUM(estoque * preco), 0)
     FROM produtos WHERE status = 1) AS valor_varejo_estoque;

COMMIT;