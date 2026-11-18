// Funções das telas genéricas de cadastro (categorias, fornecedores,
// produtos × fornecedores e estoque).
import { chamarApi } from '../shop/carrinho.js'
import { PASTAS_IMAGEM, imagemDe } from '../../images/index.js'
import { enviarArquivoImagem } from './produtosAdmin.js'

export const CHAVE_AVISO = tipo => `adm-cadastro-aviso-${tipo}`

// ----- API -----

export const listar = tipo => chamarApi(`/api/admin/cadastros/${tipo}`)

export const buscar = (tipo, id) => chamarApi(`/api/admin/cadastros/${tipo}/${id}`)

export const listarReferencia = nome => chamarApi(`/api/admin/referencias/${nome}`)

export function salvar(tipo, id, dados) {
    return id
        ? chamarApi(`/api/admin/cadastros/${tipo}/${id}`, { metodo: 'PUT', corpo: dados })
        : chamarApi(`/api/admin/cadastros/${tipo}`, { metodo: 'POST', corpo: dados })
}

export const excluir = (tipo, id) =>
    chamarApi(`/api/admin/cadastros/${tipo}/${id}`, { metodo: 'DELETE' })

export const enviarImagemCadastro = (tipo, id, arquivo) =>
    enviarArquivoImagem(`/api/admin/cadastros/${tipo}/${id}/imagem`, arquivo)

export const removerImagemCadastro = (tipo, id) =>
    chamarApi(`/api/admin/cadastros/${tipo}/${id}/imagem`, { metodo: 'DELETE' })

export function imagemDaPasta(pasta, nome) {
    return imagemDe(PASTAS_IMAGEM[pasta] ?? pasta, nome)
}

// ----- MÁSCARAS -----

export function mascaraTelefone(valor) {
    const d = String(valor ?? '').replace(/\D/g, '').slice(0, 11)

    if (d.length <= 2) return d

    const corte = d.length > 10 ? 7 : 6

    return d.length > corte
        ? `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`
        : `(${d.slice(0, 2)}) ${d.slice(2)}`
}

export function mascaraCpfCnpj(valor) {
    const d = String(valor ?? '').replace(/\D/g, '').slice(0, 14)

    if (d.length <= 11) {
        return d
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }

    return d
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function mascaraCep(valor) {
    const d = String(valor ?? '').replace(/\D/g, '').slice(0, 8)
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

// local: data digitada no horário local (ex.: data do agendamento).
// Sem "local", a data veio do CURRENT_TIMESTAMP do SQLite, que é UTC.
export function formatarDataHora(valor, { local = false } = {}) {
    if (!valor) return '—'

    const data = new Date(String(valor).replace(' ', 'T') + (local ? '' : 'Z'))

    if (Number.isNaN(data.getTime())) return valor

    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}
