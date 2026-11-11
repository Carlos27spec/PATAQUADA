
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// ========================================
// CONFIGURAÇÕES
// ========================================

// Chave do carrinho do visitante no localStorage.
// Formato: [{ id_produto, quantidade }]
export const CHAVE_CARRINHO_LOCAL = 'pataquada_carrinho';

// Chaves onde o token do login pode estar salvo.
const CHAVES_TOKEN = ['pataquada_token', 'token', 'authToken'];

// Evento disparado quando o carrinho muda.
export const EVENTO_CARRINHO = 'carrinho:atualizado';

// ========================================
// AUXILIARES
// ========================================

function obterToken() {
    for (const chave of CHAVES_TOKEN) {
        const valor =
            localStorage.getItem(chave) ||
            sessionStorage.getItem(chave);

        if (valor) {
            return valor;
        }
    }

    return null;
}

function lerCarrinhoLocal() {
    try {
        const itens = JSON.parse(
            localStorage.getItem(CHAVE_CARRINHO_LOCAL) || '[]'
        );

        return Array.isArray(itens) ? itens : [];
    } catch {
        return [];
    }
}

function salvarCarrinhoLocal(itens) {
    localStorage.setItem(
        CHAVE_CARRINHO_LOCAL,
        JSON.stringify(itens)
    );
}

function avisarAtualizacao() {
    window.dispatchEvent(
        new CustomEvent(EVENTO_CARRINHO)
    );
}

// ========================================
// ADICIONAR AO CARRINHO
// ========================================

// Retorna sempre { ok, mensagem }.
export async function adicionarAoCarrinho(produto, quantidade = 1) {
    const qtd = Math.max(1, Math.floor(Number(quantidade) || 1));

    if (!produto || !produto.disponivel) {
        return {
            ok: false,
            mensagem: 'Este produto está esgotado.'
        };
    }

    const token = obterToken();

    // Usuário logado: salva no carrinho da conta (banco de dados).
    if (token) {
        try {
            const resposta = await fetch(`${API_URL}/api/carrinho/itens`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    id_produto: produto.id,
                    quantidade: qtd
                })
            });

            const resultado = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                return {
                    ok: false,
                    mensagem:
                        resultado.mensagem ||
                        'Não foi possível adicionar ao carrinho.'
                };
            }

            avisarAtualizacao();

            return {
                ok: true,
                mensagem:
                    resultado.mensagem ||
                    'Produto adicionado ao carrinho.'
            };
        } catch {
            return {
                ok: false,
                mensagem: 'Não foi possível conectar ao servidor.'
            };
        }
    }

    // Visitante: salva no navegador.
    const itens = lerCarrinhoLocal();

    const existente = itens.find(
        item => Number(item.id_produto) === Number(produto.id)
    );

    const quantidadeFinal = (existente?.quantidade || 0) + qtd;

    if (quantidadeFinal > produto.estoque) {
        return {
            ok: false,
            mensagem: `Estoque insuficiente. Disponível: ${produto.estoque}.`
        };
    }

    if (existente) {
        existente.quantidade = quantidadeFinal;
    } else {
        itens.push({
            id_produto: produto.id,
            quantidade: qtd
        });
    }

    salvarCarrinhoLocal(itens);
    avisarAtualizacao();

    return {
        ok: true,
        mensagem: 'Produto adicionado ao carrinho.'
    };
}
