import { useEffect, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const ENDPOINTS = {
    servicos: '/api/pet-care',
    consultas: '/api/consultas',
    planos: '/api/planos'
};

// O WhatsApp vem do banco (Dados da empresa / Configurações da loja).
import { carregarEmpresa, linkWhatsapp } from '../../utils/empresa.js';

// ========================================
// IMAGENS LOCAIS
// ========================================

// Localiza automaticamente as imagens existentes em src/assets.
// Os nomes dos arquivos são utilizados para identificar a categoria.

import patinha from '../../assets/paw.png';
import { PASTAS_IMAGEM, imagemDe } from '../../images/index.js';

const imagensLocais = import.meta.glob(
    '../../assets/*.{png,jpg,jpeg,webp,svg}',
    {
        eager: true,
        query: '?url',
        import: 'default'
    }
);

function localizarImagem(palavras) {
    const arquivo = Object.entries(imagensLocais).find(([caminho]) => {
        const nomeArquivo = caminho
            .split('/')
            .pop()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        return palavras.some(palavra =>
            nomeArquivo.includes(palavra)
        );
    });

    return arquivo ? arquivo[1] : patinha;
}

const IMAGENS_PADRAO = {
    servicos: localizarImagem([
        'pet-care',
        'petcare',
        'servico',
        'banho',
        'tosa'
    ]),

    consultas: localizarImagem([
        'medico',
        'medica',
        'estetoscopio'
    ]),

    planos: localizarImagem([
        'plano',
        'planos',
        'assinatura'
    ])
};

// ========================================
// FORMATAÇÃO
// ========================================

// Valores do banco armazenados em centavos.

function formatarPreco(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return 'Não informado';
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return 'Não informado';
    }

    return (numero / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Duração armazenada em minutos.

function formatarDuracao(minutos) {
    if (minutos === null || minutos === undefined || minutos === '') {
        return 'Não informado';
    }

    const valor = Number(minutos);

    if (!Number.isFinite(valor) || valor <= 0) {
        return 'Não informado';
    }

    const horas = Math.floor(valor / 60);
    const restante = valor % 60;

    if (horas > 0 && restante > 0) {
        return `${horas}h ${restante}min`;
    }

    if (horas > 0) {
        return `${horas}h`;
    }

    return `${restante}min`;
}

// ========================================
// FORMATAÇÃO DE PREÇO DAS CONSULTAS
// ========================================

// Considera preço fixo ou faixa de preços.

function formatarPrecoConsulta(item) {

    // Preço fixo
    if (
        item.preco_fixo !== null &&
        item.preco_fixo !== undefined &&
        item.preco_fixo !== ''
    ) {
        return formatarPreco(item.preco_fixo);
    }

    const minimo = item.preco_minimo;
    const maximo = item.preco_maximo;

    // Nenhum preço informado
    if (minimo == null && maximo == null) {
        return 'Não informado';
    }

    // Somente preço máximo
    if (minimo == null) {
        return `Até ${formatarPreco(maximo)}`;
    }

    // Valores iguais: preço único
    if (
        maximo == null ||
        Number(minimo) === Number(maximo)
    ) {
        return formatarPreco(minimo);
    }

    // Faixa de preços
    return `${formatarPreco(minimo)} até ${formatarPreco(maximo)}`;
}

// ========================================
// COBRANÇA DOS PLANOS
// ========================================

// Meses de cada periodicidade da tabela plano.
const MESES_POR_PERIODICIDADE = {
    MENSAL: 1,
    TRIMESTRAL: 3,
    SEMESTRAL: 6,
    ANUAL: 12
};

function mesesDoPlano(plano) {
    const pelaPeriodicidade =
        MESES_POR_PERIODICIDADE[String(plano.periodicidade ?? '').toUpperCase()];

    return pelaPeriodicidade || Number(plano.intervalo_cobranca_meses || 1);
}

function formatarCobranca(plano) {
    if (plano.tipo_cobranca === 'UNICA') {
        return 'Pagamento único';
    }

    const intervalo = mesesDoPlano(plano);

    if (intervalo === 1) {
        return 'Cobrança mensal';
    }

    if (intervalo === 12) {
        return 'Cobrança anual';
    }

    return `A cada ${intervalo} meses`;
}

// Texto exibido ao lado do preço (ex.: "R$ 89,90 /mês").

function formatarPeriodoPreco(plano) {
    if (plano.tipo_cobranca === 'UNICA') {
        return '';
    }

    const intervalo = mesesDoPlano(plano);

    if (intervalo === 1) {
        return '/mês';
    }

    if (intervalo === 12) {
        return '/ano';
    }

    return `/${intervalo} meses`;
}

// Benefícios do plano: aceita lista (array ou JSON)
// ou texto separado por quebra de linha ou ponto e vírgula.

function normalizarBeneficios(valor) {
    let lista = valor;

    if (typeof lista === 'string') {
        const texto = lista.trim();

        if (texto.startsWith('[')) {
            try {
                lista = JSON.parse(texto);
            } catch {
                lista = texto;
            }
        }
    }

    if (typeof lista === 'string') {
        lista = lista.split(/\r?\n|;/);
    }

    if (!Array.isArray(lista)) {
        return [];
    }

    return lista
        .map(item =>
            typeof item === 'string'
                ? item.trim()
                : item?.descricao || item?.nome || ''
        )
        .filter(Boolean);
}

// ========================================
// WHATSAPP
// ========================================

function gerarLinkWhatsApp(tipo, item, numero) {
    if (!numero) {
        console.warn('WhatsApp não cadastrado em Dados da empresa.');
        return null;
    }

    let mensagem = '';

    if (tipo === 'servicos') {
        mensagem =
            `Olá! Gostaria de solicitar o agendamento de um serviço de Pet Care.\n\n` +
            `Serviço: ${item.nome}\n\n` +
            `Poderiam me informar os horários disponíveis?`;
    }

    if (tipo === 'consultas') {
        mensagem =
            `Olá! Gostaria de solicitar o agendamento de uma consulta.\n\n` +
            `Consulta: ${item.nome}\n\n` +
            `Poderiam me informar os horários disponíveis?`;
    }

    if (!mensagem) {
        return null;
    }

    return linkWhatsapp(numero, mensagem);
}

// ========================================
// EXTRAÇÃO DA RESPOSTA DA API
// ========================================

function extrairLista(resposta, tipo) {
    if (Array.isArray(resposta)) {
        return resposta;
    }

    if (Array.isArray(resposta?.data)) {
        return resposta.data;
    }

    if (Array.isArray(resposta?.dados)) {
        return resposta.dados;
    }

    if (Array.isArray(resposta?.[tipo])) {
        return resposta[tipo];
    }

    return [];
}

// ========================================
// TRATAMENTO DOS SERVIÇOS - PET CARE
// ========================================

function tratarServico(item, whatsapp) {
    const dados = {
        ...item,
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || 'Confira os detalhes deste serviço.',
        imagem: imagemDe(PASTAS_IMAGEM.servicos, item.imagem, IMAGENS_PADRAO.servicos),
        precoFormatado: formatarPreco(item.preco),
        duracaoFormatada: formatarDuracao(item.duracao_media)
    };

    return {
        ...dados,
        whatsappUrl: gerarLinkWhatsApp('servicos', dados, whatsapp)
    };
}

// ========================================
// TRATAMENTO DOS PLANOS
// ========================================

function tratarPlano(item) {
    // Plano marcado como "Mais escolhido" (se a API enviar).
    // Marcado pelo painel (coluna destaque da tabela plano).
    const marcado = item.destaque ?? item.mais_escolhido;

    return {
        ...item,
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || 'Conheça os benefícios deste plano.',
        imagem: imagemDe(PASTAS_IMAGEM.planos, item.imagem, IMAGENS_PADRAO.planos),
        // Na tabela plano o preço fica na coluna "valor" (em centavos).
        precoFormatado: formatarPreco(item.valor ?? item.preco),
        cobrancaFormatada: formatarCobranca(item),
        periodoPreco: formatarPeriodoPreco(item),
        duracaoFormatada: item.duracao_meses
            ? `${item.duracao_meses} meses`
            : null,
        beneficios: normalizarBeneficios(
            item.beneficios ?? item.vantagens
        ),
        destaque:
            marcado === null || marcado === undefined
                ? undefined
                : Boolean(Number(marcado))
    };
}

// ========================================
// TRATAMENTO DAS CONSULTAS
// ========================================

function tratarConsulta(item, whatsapp) {
    const dados = {
        ...item,
        id: item.id,
        nome: item.nome,
        descricao: item.descricao || 'Atendimento especializado para seu pet.',

        // Aceita preço fixo ou faixa de preços.
        precoFormatado: formatarPrecoConsulta(item),

        duracaoFormatada: formatarDuracao(item.duracao_media),

        // A tabela tipos_consulta não possui coluna imagem.
        // A imagem é definida localmente pelo JavaScript.
        imagem: imagemDe(PASTAS_IMAGEM.consultas, item.imagem, IMAGENS_PADRAO.consultas)
    };

    return {
        ...dados,
        whatsappUrl: gerarLinkWhatsApp('consultas', dados, whatsapp)
    };
}

// ========================================
// TRATADORES
// ========================================

const TRATADORES = {
    servicos: tratarServico,
    planos: tratarPlano,
    consultas: tratarConsulta
};

// ========================================
// BUSCA DOS DADOS
// ========================================

export function useDadosPagina(tipo) {
    const [dados, setDados] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        async function buscarDados() {
            setCarregando(true);
            setErro(null);
            setDados([]);

            try {
                const endpoint = ENDPOINTS[tipo];
                const tratador = TRATADORES[tipo];

                if (!endpoint || !tratador) {
                    throw new Error('Página não encontrada.');
                }

                const [resposta, empresa] = await Promise.all([
                    fetch(`${API_URL}${endpoint}`, {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json'
                        },
                        signal: controller.signal
                    }),
                    carregarEmpresa()
                ]);

                if (!resposta.ok) {
                    throw new Error(
                        `Não foi possível carregar os dados (${resposta.status}).`
                    );
                }

                const resultado = await resposta.json();

                if (resultado?.erro || resultado?.error) {
                    throw new Error(
                        resultado.erro || resultado.error
                    );
                }

                const lista = extrairLista(resultado, tipo);
                const dadosTratados = lista.map(item => tratador(item, empresa.whatsapp));

                setDados(dadosTratados);

            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error(`Erro ao buscar ${tipo}:`, error);

                    setErro(
                        error.message ||
                        'Ocorreu um erro ao carregar os dados.'
                    );
                }

            } finally {
                if (!controller.signal.aborted) {
                    setCarregando(false);
                }
            }
        }

        buscarDados();

        return () => controller.abort();

    }, [tipo]);

    return {
        dados,
        carregando,
        erro
    };
}