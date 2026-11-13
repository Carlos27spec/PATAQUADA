import { resolverImagem } from './shop.js';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// ========================================
// AJUSTE ESTES NOMES CONFORME O SEU PROJETO
// ========================================

// Chave do carrinho do visitante no localStorage.
// Formato salvo: [{ id_produto, quantidade }]
// (o mesmo formato que a rota /api/carrinho/sincronizar espera).
export const CHAVE_CARRINHO_LOCAL = 'pataquada_carrinho';

// Chaves onde o token do login pode estar salvo.
const CHAVES_TOKEN = ['pataquada_token', 'token', 'authToken'];

// Evento disparado quando o carrinho muda (use no header para
// atualizar o contador do ícone do carrinho).
export const EVENTO_CARRINHO = 'carrinho:atualizado';

// ========================================
// AUXILIARES
// ========================================

export function obterToken() {
    for (const chave of CHAVES_TOKEN) {
        const valor =
            localStorage.getItem(chave) || sessionStorage.getItem(chave);

        if (valor) {
            return valor;
        }
    }

    return null;
}

export function lerCarrinhoLocal() {
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
    localStorage.setItem(CHAVE_CARRINHO_LOCAL, JSON.stringify(itens));
}

function avisarAtualizacao() {
    window.dispatchEvent(new CustomEvent(EVENTO_CARRINHO));
}

// Chamada à API devolvendo o JSON. Em caso de erro, lança um Error
// com a mensagem da API (e o código HTTP em erro.status).
export async function chamarApi(
    caminho,
    { metodo = 'GET', corpo, autenticado = true } = {}
) {
    const headers = { Accept: 'application/json' };

    if (corpo !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const token = obterToken();

    if (autenticado && token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let resposta;

    try {
        resposta = await fetch(`${API_URL}${caminho}`, {
            method: metodo,
            headers,
            body: corpo !== undefined ? JSON.stringify(corpo) : undefined
        });
    } catch {
        throw new Error('Não foi possível conectar ao servidor.');
    }

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        const erro = new Error(
            dados.mensagem || dados.erro || `Erro ${resposta.status}.`
        );

        erro.status = resposta.status;

        throw erro;
    }

    return dados;
}

// ========================================
// ADICIONAR AO CARRINHO
// ========================================

// Retorna sempre { ok, mensagem }.
export async function adicionarAoCarrinho(produto, quantidade = 1) {
    const qtd = Math.max(1, Math.floor(Number(quantidade) || 1));

    if (!produto || !produto.disponivel) {
        return { ok: false, mensagem: 'Este produto está esgotado.' };
    }

    // Usuário logado: salva no carrinho da conta (banco de dados).
    if (obterToken()) {
        try {
            const resultado = await chamarApi('/api/carrinho/itens', {
                metodo: 'POST',
                corpo: { id_produto: produto.id, quantidade: qtd }
            });

            avisarAtualizacao();

            return {
                ok: true,
                mensagem:
                    resultado.mensagem || 'Produto adicionado ao carrinho.'
            };

        } catch (erro) {
            return { ok: false, mensagem: erro.message };
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
        itens.push({ id_produto: produto.id, quantidade: qtd });
    }

    salvarCarrinhoLocal(itens);
    avisarAtualizacao();

    return { ok: true, mensagem: 'Produto adicionado ao carrinho.' };
}

// ========================================
// LER O CARRINHO (conta ou navegador)
// ========================================

function normalizarItem(dados) {
    const preco = Number(dados.preco) || 0;
    const quantidade = Number(dados.quantidade) || 0;
    const estoque = Number(dados.estoque) || 0;

    return {
        id: Number(dados.id_produto),
        nome: dados.nome,
        preco,
        quantidade,
        estoque,
        imagem: resolverImagem(dados.imagem),
        subtotal: preco * quantidade,
        disponivel: Number(dados.status_produto) === 1 && estoque > 0
    };
}

// Passa para a conta o que o visitante colocou no carrinho
// antes de fazer login.
async function sincronizarCarrinhoLocal() {
    const itens = lerCarrinhoLocal();

    if (itens.length === 0) {
        return;
    }

    await chamarApi('/api/carrinho/sincronizar', {
        metodo: 'POST',
        corpo: { itens }
    });

    localStorage.removeItem(CHAVE_CARRINHO_LOCAL);
}

// Retorna { logado, itens, aviso }.
export async function carregarCarrinho() {
    if (obterToken()) {
        let aviso = null;

        try {
            await sincronizarCarrinhoLocal();
        } catch (erro) {
            // Sem estoque para algum item, por exemplo: o carrinho da
            // conta continua funcionando e o motivo é mostrado na tela.
            aviso = erro.message;
        }

        const resposta = await chamarApi('/api/carrinho');
        const itens = resposta.dados?.itens ?? [];

        return { logado: true, itens: itens.map(normalizarItem), aviso };
    }

    const locais = lerCarrinhoLocal();

    if (locais.length === 0) {
        return { logado: false, itens: [], aviso: null };
    }

    const resposta = await chamarApi('/api/produtos', {
        autenticado: false
    });

    const produtos = resposta.dados ?? [];

    const itens = locais
        .map(local => {
            const produto = produtos.find(
                item => Number(item.id) === Number(local.id_produto)
            );

            return produto
                ? normalizarItem({
                    ...produto,
                    id_produto: produto.id,
                    quantidade: local.quantidade,
                    status_produto: produto.status
                })
                : null;
        })
        .filter(Boolean);

    return { logado: false, itens, aviso: null };
}

// ========================================
// ALTERAR O CARRINHO
// ========================================

export async function definirQuantidade(idProduto, quantidade) {
    if (obterToken()) {
        await chamarApi(`/api/carrinho/itens/${idProduto}`, {
            metodo: 'PUT',
            corpo: { quantidade }
        });
    } else {
        const itens = lerCarrinhoLocal();

        const alvo = itens.find(
            item => Number(item.id_produto) === Number(idProduto)
        );

        if (alvo) {
            alvo.quantidade = quantidade;
            salvarCarrinhoLocal(itens);
        }
    }

    avisarAtualizacao();
}

export async function removerDoCarrinho(idProduto) {
    if (obterToken()) {
        await chamarApi(`/api/carrinho/itens/${idProduto}`, {
            metodo: 'DELETE'
        });
    } else {
        salvarCarrinhoLocal(
            lerCarrinhoLocal().filter(
                item => Number(item.id_produto) !== Number(idProduto)
            )
        );
    }

    avisarAtualizacao();
}