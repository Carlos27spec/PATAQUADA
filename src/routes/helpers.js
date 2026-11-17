// =====================================================
// FUNÇÕES AUXILIARES (usadas em vários arquivos)
// =====================================================

export function responderErro(
    res,
    erro,
    mensagem = 'Erro interno do servidor.'
) {
    console.error(mensagem, erro);

    return res.status(500).json({
        sucesso: false,
        mensagem,
        erro: erro.message
    });
}

export function somenteDigitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
}

export function limitar(valor, tamanho) {
    return String(valor ?? '').trim().slice(0, tamanho);
}
