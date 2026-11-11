
import { useEffect, useState } from 'react'
import { resolverImagem, formatarPreco } from './shop/shop.js'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const LIMITE_PRODUTOS = 6
const VALIDADE_CACHE = 60 * 1000

let cache = null

/* ---------- Extrair lista da resposta da API ---------- */

function extrairLista(resposta) {
    if (Array.isArray(resposta)) {
        return resposta
    }

    if (Array.isArray(resposta?.dados)) {
        return resposta.dados
    }

    if (Array.isArray(resposta?.data)) {
        return resposta.data
    }

    if (Array.isArray(resposta?.produtos)) {
        return resposta.produtos
    }

    return []
}

/* ---------- Tratar dados dos produtos ---------- */

function tratarProduto(item) {
    const estoque = Number(item.estoque) || 0
    const preco = Number(item.preco) || 0

    return {
        ...item,
        id: item.id,
        nome: item.nome,
        descricao:
            item.descricao ||
            'Produto selecionado com carinho para o bem-estar do seu pet.',
        imagem: resolverImagem(item.imagem),
        preco,
        precoFormatado: formatarPreco(preco),
        estoque,
        disponivel: estoque > 0,
        quantidadeVendida: Number(
            item.quantidade_vendida ??
            item.quantidadeVendida ??
            item.total_vendido ??
            0
        )
    }
}

/* ---------- Buscar produtos mais vendidos ---------- */

async function buscarMaisVendidos(signal) {
    const resposta = await fetch(
        `${API_URL}/api/produtos/mais-vendidos?limite=${LIMITE_PRODUTOS}`,
        {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            signal
        }
    )

    if (!resposta.ok) {
        throw new Error(
            `Não foi possível carregar os produtos mais vendidos (${resposta.status}).`
        )
    }

    const resultado = await resposta.json()

    if (resultado?.erro || resultado?.error) {
        throw new Error(resultado.erro || resultado.error)
    }

    return extrairLista(resultado)
        .map(tratarProduto)
        .filter(
            produto =>
                produto.status === undefined ||
                Number(produto.status) === 1
        )
        .filter(produto => produto.disponivel)
        .sort(
            (a, b) =>
                b.quantidadeVendida - a.quantidadeVendida
        )
        .slice(0, LIMITE_PRODUTOS)
}

/* ---------- Hook da página inicial ---------- */

export function useHome() {
    const [produtosMaisVendidos, setProdutosMaisVendidos] = useState(
        () => cache?.produtos ?? []
    )

    const [carregando, setCarregando] = useState(
        () => !cache
    )

    const [erro, setErro] = useState(null)

    useEffect(() => {
        if (cache && Date.now() - cache.em < VALIDADE_CACHE) {
            return undefined
        }

        const controller = new AbortController()
        const temCache = Boolean(cache)

        async function buscarDados() {
            if (!temCache) {
                setCarregando(true)
            }

            setErro(null)

            try {
                const produtos = await buscarMaisVendidos(
                    controller.signal
                )

                cache = {
                    produtos,
                    em: Date.now()
                }

                setProdutosMaisVendidos(produtos)
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(
                        'Erro ao carregar os produtos mais vendidos:',
                        error
                    )

                    if (!temCache) {
                        setErro(
                            error.message ||
                            'Não foi possível carregar os produtos.'
                        )
                    }
                }
            } finally {
                if (!controller.signal.aborted) {
                    setCarregando(false)
                }
            }
        }

        buscarDados()

        return () => controller.abort()
    }, [])

    return {
        // Propriedade utilizada pelo home.jsx
        produtos: produtosMaisVendidos,

        // Mantida para compatibilidade com outros componentes
        produtosMaisVendidos,

        carregando,
        erro
    }
}
