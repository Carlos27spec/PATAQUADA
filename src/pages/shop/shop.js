import { useEffect, useState } from 'react';

import patinha from '../../assets/paw.png';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Valor mínimo (em centavos) para frete grátis.
export const FRETE_GRATIS_A_PARTIR_DE = 10000;

// ========================================
// IMAGENS
// ========================================

// Todas as imagens de src/assets (inclusive subpastas).
const imagensLocais = import.meta.glob(
    '../../assets/**/*.{png,jpg,jpeg,webp,svg,avif}',
    {
        eager: true,
        query: '?url',
        import: 'default'
    }
);

function nomeArquivo(caminho) {
    return String(caminho)
        .split('?')[0]
        .split(/[\\/]/)
        .pop()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Procura uma imagem em src/assets pelo nome do arquivo (contém a palavra).
// Retorna null se não existir, para a página simplesmente não exibir.
export function localizarImagem(palavras) {
    const achada = Object.entries(imagensLocais).find(([caminho]) =>
        palavras.some(palavra => nomeArquivo(caminho).includes(palavra))
    );

    return achada ? achada[1] : null;
}

// Converte o texto salvo na coluna "imagem" do banco em uma URL.
// Aceita: http(s), data:, caminho começando com "/", caminho relativo
// da pasta public (ex.: "images/racao.png") ou só o nome de um arquivo
// que esteja em src/assets.
export function resolverImagem(valor) {
    if (!valor) {
        return patinha;
    }

    const texto = String(valor).trim();

    if (/^(https?:|data:|blob:|\/)/i.test(texto)) {
        return texto;
    }

    const base = nomeArquivo(texto);

    const achada = Object.entries(imagensLocais).find(
        ([caminho]) => nomeArquivo(caminho) === base
    );

    if (achada) {
        return achada[1];
    }

    if (texto.includes('/')) {
        return `/${texto}`;
    }

    return patinha;
}

// ========================================
// FORMATAÇÃO
// ========================================

// Valores do banco armazenados em centavos.
export function formatarPreco(valor) {
    const numero = Number(valor);

    if (valor === null || valor === undefined || !Number.isFinite(numero)) {
        return 'Não informado';
    }

    return (numero / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Remove acentos e deixa em minúsculas (para a busca).
export function normalizarTexto(texto) {
    return String(texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// ========================================
// TRATAMENTO DOS DADOS DA API
// ========================================

function extrairLista(resposta) {
    if (Array.isArray(resposta)) {
        return resposta;
    }

    if (Array.isArray(resposta?.dados)) {
        return resposta.dados;
    }

    if (Array.isArray(resposta?.data)) {
        return resposta.data;
    }

    return [];
}

function tratarCategoria(item) {
    return {
        ...item,
        id: item.id,
        nome: item.nome,
        imagem: resolverImagem(item.imagem)
    };
}

function tratarProduto(item, categoriasPorId) {
    const estoque = Number(item.estoque) || 0;
    const preco = Number(item.preco) || 0;
    const categoria = categoriasPorId.get(Number(item.id_categoria_produto));

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
        categoriaId: Number(item.id_categoria_produto),
        categoriaNome: categoria?.nome || ''
    };
}

// ========================================
// SEMELHANTES
// ========================================

// Mesma categoria primeiro (disponíveis antes), depois completa com
// produtos de outras categorias, dos mais próximos em preço.
export function produtosSemelhantes(produto, produtos, limite = 4) {
    const outros = produtos.filter(item => item.id !== produto.id);

    const porProximidadeDePreco = (a, b) =>
        Math.abs(a.preco - produto.preco) -
        Math.abs(b.preco - produto.preco);

    const mesmaCategoria = outros
        .filter(item => item.categoriaId === produto.categoriaId)
        .sort(
            (a, b) =>
                Number(b.disponivel) - Number(a.disponivel) ||
                porProximidadeDePreco(a, b)
        );

    if (mesmaCategoria.length >= limite) {
        return mesmaCategoria.slice(0, limite);
    }

    const demais = outros
        .filter(item => item.categoriaId !== produto.categoriaId)
        .sort(
            (a, b) =>
                Number(b.disponivel) - Number(a.disponivel) ||
                porProximidadeDePreco(a, b)
        );

    return [...mesmaCategoria, ...demais].slice(0, limite);
}

// ========================================
// BUSCA DOS DADOS (produtos + categorias)
// ========================================

// Guarda a última resposta: ao abrir um produto e voltar para a loja,
// a página aparece na hora, sem "piscar". Se os dados têm mais de
// 60 segundos, eles aparecem e são atualizados em segundo plano.
const VALIDADE_CACHE = 60 * 1000;
let cache = null;

async function buscarJson(endpoint, signal) {
    const resposta = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal
    });

    if (!resposta.ok) {
        throw new Error(
            `Não foi possível carregar os dados (${resposta.status}).`
        );
    }

    const resultado = await resposta.json();

    if (resultado?.erro || resultado?.error) {
        throw new Error(resultado.erro || resultado.error);
    }

    return extrairLista(resultado);
}

export function useShop() {
    // Estado inicial vindo do cache (sem chamar Date.now durante a renderização).
    const [produtos, setProdutos] = useState(() => cache?.produtos ?? []);
    const [categorias, setCategorias] = useState(
        () => cache?.categorias ?? []
    );
    const [carregando, setCarregando] = useState(() => !cache);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        // Dados recentes no cache: não precisa buscar de novo.
        if (cache && Date.now() - cache.em < VALIDADE_CACHE) {
            return undefined;
        }

        const controller = new AbortController();
        const temCache = Boolean(cache);

        async function buscarDados() {
            // Com cache antigo, mantém os dados na tela enquanto atualiza.
            if (!temCache) {
                setCarregando(true);
            }

            setErro(null);

            try {
                const [listaProdutos, listaCategorias] = await Promise.all([
                    buscarJson('/api/produtos', controller.signal),
                    buscarJson('/api/categorias-produto', controller.signal)
                ]);

                // A rota de categorias devolve também as inativas.
                const categoriasAtivas = listaCategorias
                    .filter(
                        item =>
                            item.status === undefined ||
                            Number(item.status) === 1
                    )
                    .map(tratarCategoria);

                const categoriasPorId = new Map(
                    categoriasAtivas.map(item => [Number(item.id), item])
                );

                const produtosTratados = listaProdutos
                    .filter(
                        item =>
                            item.status === undefined ||
                            Number(item.status) === 1
                    )
                    .map(item => tratarProduto(item, categoriasPorId));

                cache = {
                    produtos: produtosTratados,
                    categorias: categoriasAtivas,
                    em: Date.now()
                };

                setProdutos(produtosTratados);
                setCategorias(categoriasAtivas);

            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Erro ao buscar dados da loja:', error);

                    if (!temCache) {
                        setErro(
                            error.message ||
                            'Ocorreu um erro ao carregar a loja.'
                        );
                    }
                }

            } finally {
                if (!controller.signal.aborted) {
                    setCarregando(false);
                }
            }
        }

        buscarDados();

        return () => controller.abort();
    }, []);

    return {
        produtos,
        categorias,
        carregando,
        erro
    };
}