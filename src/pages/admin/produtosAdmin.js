// Funções das telas de produtos do painel administrativo.
import { chamarApi, obterToken } from '../shop/carrinho.js'
import { PASTAS_IMAGEM, imagemDe } from '../../images/index.js'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const UNIDADES_MEDIDA = [
    { codigo: 'UN', nome: 'Unidade' },
    { codigo: 'KG', nome: 'Quilo' },
    { codigo: 'G', nome: 'Grama' },
    { codigo: 'L', nome: 'Litro' },
    { codigo: 'ML', nome: 'Mililitro' },
    { codigo: 'CX', nome: 'Caixa' },
    { codigo: 'PCT', nome: 'Pacote' },
    { codigo: 'PAR', nome: 'Par' },
    { codigo: 'KIT', nome: 'Kit' }
]

export const TIPOS_IMAGEM_ACEITOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024

// ----- API -----

export function listarProdutos() {
    return chamarApi('/api/admin/produtos')
}

export function buscarProduto(id) {
    return chamarApi(`/api/admin/produtos/${id}`)
}

export function listarCategorias() {
    return chamarApi('/api/admin/categorias-produto')
}

export function salvarProduto(id, dados) {
    return id
        ? chamarApi(`/api/admin/produtos/${id}`, { metodo: 'PUT', corpo: dados })
        : chamarApi('/api/admin/produtos', { metodo: 'POST', corpo: dados })
}

export function removerImagem(id) {
    return chamarApi(`/api/admin/produtos/${id}/imagem`, { metodo: 'DELETE' })
}

// Envia o arquivo como está (o servidor renomeia e salva na pasta).
export function enviarImagem(id, arquivo) {
    return enviarArquivoImagem(`/api/admin/produtos/${id}/imagem`, arquivo)
}

export async function enviarArquivoImagem(caminho, arquivo) {
    let resposta

    try {
        resposta = await fetch(`${API_URL}${caminho}`, {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                'Content-Type': arquivo.type,
                Authorization: `Bearer ${obterToken()}`
            },
            body: arquivo
        })
    } catch {
        throw new Error('Não foi possível conectar ao servidor.')
    }

    const dados = await resposta.json().catch(() => ({}))

    if (!resposta.ok) {
        const erro = new Error(dados.mensagem || `Erro ${resposta.status}.`)
        erro.status = resposta.status
        throw erro
    }

    return dados
}

// ----- IMAGEM -----

export function imagemDoProduto(nomeArquivo) {
    return imagemDe(PASTAS_IMAGEM.produtos, nomeArquivo)
}

// Mesma regra do servidor: "Ração Premium 10kg" -> "racao-premium-10kg"
export function nomeParaArquivo(nome) {
    const base = String(nome)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/g, '')

    return base || 'produto'
}

export function extensaoDoArquivo(arquivo) {
    return {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
        'image/gif': 'gif'
    }[arquivo?.type] ?? null
}

// ----- DINHEIRO (banco em centavos, tela em reais) -----

// 15990 -> "159,90"
export function centavosParaTexto(centavos) {
    if (centavos === null || centavos === undefined || centavos === '') {
        return ''
    }

    return (Number(centavos) / 100).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

// "1.159,90" / "159.9" / "159" -> 115990 / 15990 / 15900. Inválido -> null.
export function textoParaCentavos(texto) {
    let limpo = String(texto ?? '').trim().replace(/[R$\s]/g, '')

    if (!limpo) {
        return null
    }

    if (limpo.includes(',')) {
        limpo = limpo.replace(/\./g, '').replace(',', '.')
    }

    const numero = Number(limpo)

    if (!Number.isFinite(numero) || numero < 0) {
        return null
    }

    return Math.round(numero * 100)
}

export function formatarReais(centavos) {
    return (Number(centavos || 0) / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}
