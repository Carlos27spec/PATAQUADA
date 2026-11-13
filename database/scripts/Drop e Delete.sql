-- =========================================================
-- PATAQUADA
-- EXCLUSÃO COMPLETA DAS TABELAS - SQLITE
-- =========================================================

SELECT
    name
FROM sqlite_master
WHERE type = 'table'
ORDER BY name;
PRAGMA database_list;
RETURN
PRAGMA foreign_keys = OFF;
return
BEGIN TRANSACTION;

DROP TABLE IF EXISTS itens_carrinho;
DROP TABLE IF EXISTS carrinho;

DROP TABLE IF EXISTS cobrancas_assinatura;
DROP TABLE IF EXISTS assinaturas_plano;
DROP TABLE IF EXISTS plano;

DROP TABLE IF EXISTS agendamento_historico;
DROP TABLE IF EXISTS agendamentos;

DROP TABLE IF EXISTS situacao;

DROP TABLE IF EXISTS profissionais;
DROP TABLE IF EXISTS tipos_consulta;
DROP TABLE IF EXISTS servicos;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS categorias_produto;

DROP TABLE IF EXISTS pets;
DROP TABLE IF EXISTS enderecos_usuario;

DROP TABLE IF EXISTS permissao_tipo_usuario;
DROP TABLE IF EXISTS permissao_usuario;

DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS tipo_usuario;

COMMIT;

PRAGMA foreign_keys = ON;

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

DELETE FROM itens_carrinho;
DELETE FROM carrinho;

DELETE FROM cobrancas_assinatura;
DELETE FROM assinaturas_plano;
DELETE FROM plano;

DELETE FROM agendamento_historico;
DELETE FROM agendamentos;

DELETE FROM produto_imagens;
DELETE FROM movimentacoes_estoque;
DELETE FROM produto_fornecedor;
DELETE FROM produto_detalhes;
DELETE FROM fornecedores;

DELETE FROM produtos;
DELETE FROM servicos;
DELETE FROM tipos_consulta;
DELETE FROM profissionais;

DELETE FROM pets;
DELETE FROM enderecos_usuario;

DELETE FROM permissao_tipo_usuario;
DELETE FROM permissao_usuario;

DELETE FROM situacao;
DELETE FROM categorias_produto;

DELETE FROM configuracoes_pataquada;
DELETE FROM dados_pataquada;

DELETE FROM usuarios;
DELETE FROM tipo_usuario;

COMMIT;

PRAGMA foreign_keys = ON;

-- =========================================================
-- FIM
-- =========================================================