
import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

const WHATSAPP_NUMERO = import.meta.env.VITE_WHATSAPP_NUMERO || ''

const ENDPOINTS = {
    servicos: '/api/pet-care',
    consultas: '/api/consultas',
    planos: '/api/planos'
}

// ========================================
// FORMATAÇÃO
// ========================================

// Valores do banco armazenados em centavos.
function formatarPreco(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return 'Não informado'
    }

    return (Number(valor) / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}

// Duração armazenada em minutos.
function formatarDuracao(minutos) {
    if (minutos === null || minutos === undefined || minutos === '') {
        return 'Não informado'
    }

    const valor = Number(minutos)

    if (!Number.isFinite(valor) || valor <= 0) {
        return 'Não informado'
    }

    const horas = Math.floor(valor / 60)
    const restante = valor % 60

    if (horas > 0 && restante > 0) {
        return `${horas}h ${restante}min`
    }

    if (horas > 0) {
        return `${horas}h`
    }

    return `${restante}min`
}

// Faixa de preços das consultas.
function formatarFaixaPreco(minimo, maximo) {
    if (minimo == null && maximo == null) {
        return 'Não informado'
    }

    if (minimo == null) {
        return `Até ${formatarPreco(maximo)}`
    }

    if (maximo == null || Number(minimo) === Number(maximo)) {
        return formatarPreco(minimo)
    }

    return `${formatarPreco(minimo)} até ${formatarPreco(maximo)}`
}

// Cobrança dos planos.
function formatarCobranca(plano) {
    if (plano.tipo_cobranca === 'UNICA') {
        return 'Pagamento único'
    }

    const intervalo = Number(plano.intervalo_cobranca_meses || 1)

    if (intervalo === 1) {
        return 'Cobrança mensal'
    }

    if (intervalo === 12) {
        return 'Cobrança anual'
    }

    return `A cada ${intervalo} meses`
}

// ========================================
// WHATSAPP
// ========================================

function gerarLinkWhatsApp(tipo, item) {
    if (!WHATSAPP_NUMERO) {
        console.error(
            'Número do WhatsApp não configurado no arquivo .env.'
        )

        return null
    }

    let mensagem = ''

    if (tipo === 'servicos') {
        mensagem =
            `Olá! Gostaria de solicitar o agendamento de um serviço de Pet Care.\n\n` +
            `Serviço: ${item.nome}\n\n` +
            `Poderiam me informar os horários disponíveis?`
    }

    if (tipo === 'consultas') {
        mensagem =
            `Olá! Gostaria de solicitar o agendamento de uma consulta.\n\n` +
            `Consulta: ${item.nome}\n\n` +
            `Poderiam me informar os horários disponíveis?`
    }

    const numero = WHATSAPP_NUMERO.replace(/\D/g, '')

    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
}

// ========================================
// EXTRAÇÃO DA RESPOSTA DA API
// ========================================

function extrairLista(resposta, tipo) {
    if (Array.isArray(resposta)) {
        return resposta
    }

    if (Array.isArray(resposta?.data)) {
        return resposta.data
    }

    if (Array.isArray(resposta?.dados)) {
        return resposta.dados
    }

    if (Array.isArray(resposta?.[tipo])) {
        return resposta[tipo]
    }

    return []
}

// ========================================
// TRATAMENTO DOS SERVIÇOS - PET CARE
// ========================================

function tratarServico(item) {
    const dados = {
        ...item,
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || 'Confira os detalhes deste serviço.',
        imagem: item.imagem || null,
        precoFormatado: formatarPreco(item.preco),
        duracaoFormatada: formatarDuracao(item.duracao_media)
    }

    return {
        ...dados,
        whatsappUrl: gerarLinkWhatsApp('servicos', dados)
    }
}

// ========================================
// TRATAMENTO DOS PLANOS
// ========================================

function tratarPlano(item) {
    return {
        ...item,
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || 'Conheça os benefícios deste plano.',
        imagem: item.imagem || null,
        precoFormatado: formatarPreco(item.preco),
        cobrancaFormatada: formatarCobranca(item),
        duracaoFormatada: item.duracao_meses
            ? `${item.duracao_meses} meses`
            : 'Sem prazo definido'
    }
}

// ========================================
// TRATAMENTO DAS CONSULTAS
// ========================================

function tratarConsulta(item) {
    const dados = {
        ...item,
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || 'Atendimento especializado para seu pet.',
        precoFormatado: formatarFaixaPreco(
            item.preco_minimo,
            item.preco_maximo
        ),
        duracaoFormatada: formatarDuracao(item.duracao_media),
        imagem: null
    }

    return {
        ...dados,
        whatsappUrl: gerarLinkWhatsApp('consultas', dados)
    }
}

// ========================================
// TRATADORES
// ========================================

const TRATADORES = {
    servicos: tratarServico,
    planos: tratarPlano,
    consultas: tratarConsulta
}

// ========================================
// BUSCA DOS DADOS
// ========================================

export function useDadosPagina(tipo) {
    const [dados, setDados] = useState([])
    const [carregando, setCarregando] = useState(true)
    const [erro, setErro] = useState(null)

    useEffect(() => {
        const controller = new AbortController()

        async function buscarDados() {
            setCarregando(true)
            setErro(null)
            setDados([])

            try {
                const endpoint = ENDPOINTS[tipo]
                const tratador = TRATADORES[tipo]

                if (!endpoint || !tratador) {
                    throw new Error('Página não encontrada.')
                }

                const resposta = await fetch(`${API_URL}${endpoint}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json'
                    },
                    signal: controller.signal
                })

                if (!resposta.ok) {
                    throw new Error(
                        `Não foi possível carregar os dados (${resposta.status}).`
                    )
                }

                const resultado = await resposta.json()

                if (resultado?.erro || resultado?.error) {
                    throw new Error(
                        resultado.erro || resultado.error
                    )
                }

                const lista = extrairLista(resultado, tipo)

                const dadosTratados = lista.map(tratador)

                setDados(dadosTratados)

            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(`Erro ao buscar ${tipo}:`, error)

                    setErro(
                        error.message ||
                        'Ocorreu um erro ao carregar os dados.'
                    )
                }
            } finally {
                if (!controller.signal.aborted) {
                    setCarregando(false)
                }
            }
        }

        buscarDados()

        return () => controller.abort()

    }, [tipo])

    return {
        dados,
        carregando,
        erro
    }
}
