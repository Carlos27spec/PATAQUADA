// =====================================================
// PESQUISA GLOBAL — LÓGICA (sem React)
//
// Trabalha em cima dos dados que as páginas já usam:
//  - planos, servicos e consultas: já tratados por useDadosPagina
//    (servicos.js), inclusive o whatsappUrl montado por lá
//  - produtos: já tratados por useShop (shop.js)
// =====================================================

export const MINIMO_CARACTERES = 2;

// Ordem obrigatória das categorias.
export const ORDEM_CATEGORIAS = [
    'planos',
    'servicos',
    'consultas',
    'produtos'
];

export const TITULOS_SECAO = {
    planos: 'Planos',
    servicos: 'Serviços de Pet-care',
    consultas: 'Consultas e atendimentos',
    produtos: 'Produtos'
};

// Filtros de assunto, na mesma ordem.
export const CATEGORIAS_BUSCA = [
    { id: 'todos', rotulo: 'Todos' },
    ...ORDEM_CATEGORIAS.map(id => ({ id, rotulo: TITULOS_SECAO[id] }))
];

export const ORDENACOES = [
    { valor: 'relevancia', rotulo: 'Relevância' },
    { valor: 'menor-preco', rotulo: 'Menor preço' },
    { valor: 'maior-preco', rotulo: 'Maior preço' },
    { valor: 'nome', rotulo: 'Ordem alfabética' }
];

export const FILTROS_PADRAO = {
    categoria: 'todos',
    ordenacao: 'relevancia',
    precoMinimo: '',
    precoMaximo: '',
    apenasDisponiveis: false
};

// ========================================
// TEXTO
// ========================================

// minúsculas, sem acentos e sem espaços sobrando
export function normalizar(texto) {
    return String(texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function resumir(texto, limite = 120) {
    const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim();

    if (limpo.length <= limite) {
        return limpo;
    }

    return `${limpo.slice(0, limite).trimEnd()}…`;
}

function numeroOuNulo(valor) {
    if (valor === null || valor === undefined || valor === '') {
        return null;
    }

    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : null;
}

// "12,50" ou "12.50" (reais) -> 1250 (centavos). Vazio = null.
function reaisParaCentavos(valor) {
    const texto = String(valor ?? '').trim().replace(',', '.');

    if (texto === '') {
        return null;
    }

    const numero = Number(texto);

    return Number.isFinite(numero) ? Math.round(numero * 100) : null;
}

// benefícios: aceita lista, JSON ou texto separado por linha/";"
function paraLista(valor) {
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

// true / false / null (quando a informação não existe para o item)
function disponibilidade(item) {
    const bruto = item.disponivel ?? item.disponibilidade;

    if (bruto === undefined || bruto === null) {
        return null;
    }

    if (typeof bruto === 'string') {
        const texto = normalizar(bruto);

        if (['0', 'nao', 'false', 'indisponivel'].includes(texto)) {
            return false;
        }

        if (['1', 'sim', 'true', 'disponivel'].includes(texto)) {
            return true;
        }

        return null;
    }

    return Boolean(Number(bruto));
}

// ========================================
// ÍNDICE (um formato único para todas as categorias)
// ========================================

function criarItem(base) {
    const beneficios = base.beneficios ?? [];

    return {
        categoria: '',
        descricao: '',
        beneficios,
        detalhes: [],
        preco: null,
        precoTexto: null,
        disponivel: null,
        rotuloDisponibilidade: null,
        imagem: null,
        extraBusca: [],
        ...base,
        nomeNorm: normalizar(base.nome),
        descricaoNorm: normalizar(base.descricao),
        categoriaNorm: normalizar(base.categoria),
        textoBusca: normalizar(
            [
                base.nome,
                base.descricao,
                base.categoria,
                beneficios.join(' '),
                base.precoTexto,
                ...(base.detalhes ?? []),
                ...(base.extraBusca ?? [])
            ].join(' ')
        )
    };
}

function itemPlano(plano) {
    const beneficios = paraLista(plano.beneficios ?? plano.vantagens);

    const periodo = plano.periodoPreco ? ` ${plano.periodoPreco}` : '';

    return criarItem({
        tipo: 'planos',
        chave: `planos-${plano.id}`,
        id: plano.id,
        nome: plano.nome,
        descricao: plano.descricao,
        beneficios,
        preco: numeroOuNulo(plano.preco),
        precoTexto: plano.precoFormatado
            ? `${plano.precoFormatado}${periodo}`
            : null,
        detalhes: [plano.cobrancaFormatada, plano.duracaoFormatada]
            .filter(Boolean),
        extraBusca: [plano.condicoes],
        // Mesma rota do botão "Conhecer plano" da página de planos.
        destino: {
            tipo: 'rota',
            href: `/contratar-plano?plano=${plano.id}`
        }
    });
}

function itemServico(servico) {
    const categoria =
        servico.categoria_nome ??
        servico.nome_categoria ??
        (typeof servico.categoria === 'string' ? servico.categoria : '');

    return criarItem({
        tipo: 'servicos',
        chave: `servicos-${servico.id}`,
        id: servico.id,
        nome: servico.nome,
        descricao: servico.descricao,
        categoria,
        preco: numeroOuNulo(servico.preco),
        precoTexto: servico.precoFormatado ?? null,
        detalhes: servico.duracaoFormatada
            && servico.duracaoFormatada !== 'Não informado'
            ? [`Duração: ${servico.duracaoFormatada}`]
            : [],
        disponivel: disponibilidade(servico),
        rotuloDisponibilidade: ['Disponível', 'Indisponível'],
        // WhatsApp montado por servicos.js (gerarLinkWhatsApp).
        destino: servico.whatsappUrl
            ? { tipo: 'externo', href: servico.whatsappUrl }
            : {
                tipo: 'rota',
                href: `/agendamento?servico=${servico.id}`
            }
    });
}

function itemConsulta(consulta) {
    return criarItem({
        tipo: 'consultas',
        chave: `consultas-${consulta.id}`,
        id: consulta.id,
        nome: consulta.nome,
        descricao: consulta.descricao,
        preco:
            numeroOuNulo(consulta.preco_fixo) ??
            numeroOuNulo(consulta.preco_minimo) ??
            numeroOuNulo(consulta.preco_maximo),
        precoTexto: consulta.precoFormatado ?? null,
        detalhes: consulta.duracaoFormatada
            && consulta.duracaoFormatada !== 'Não informado'
            ? [`Duração: ${consulta.duracaoFormatada}`]
            : [],
        disponivel: disponibilidade(consulta),
        rotuloDisponibilidade: ['Disponível', 'Indisponível'],
        // WhatsApp montado por servicos.js (gerarLinkWhatsApp).
        destino: consulta.whatsappUrl
            ? { tipo: 'externo', href: consulta.whatsappUrl }
            : {
                tipo: 'rota',
                href: `/agendamento?consulta=${consulta.id}`
            }
    });
}

function itemProduto(produto) {
    return criarItem({
        tipo: 'produtos',
        chave: `produto/${produto.id}`,
        id: produto.id,
        nome: produto.nome,
        descricao: produto.descricao,
        categoria: produto.categoriaNome ?? '',
        preco: numeroOuNulo(produto.preco),
        precoTexto: produto.precoFormatado ?? null,
        imagem: produto.imagem ?? null,
        disponivel: Boolean(produto.disponivel),
        rotuloDisponibilidade: ['Em estoque', 'Esgotado'],
        // Mesma rota da loja.
        destino: { tipo: 'rota', href: `/produto/${produto.id}` }
    });
}

export function montarIndice({ planos, servicos, consultas, produtos }) {
    return {
        planos: planos.map(itemPlano),
        servicos: servicos.map(itemServico),
        consultas: consultas.map(itemConsulta),
        produtos: produtos.map(itemProduto)
    };
}

// O que os dados reais permitem filtrar.
export function recursosDosDados(indice) {
    const itens = ORDEM_CATEGORIAS.flatMap(tipo => indice[tipo]);

    return {
        temPreco: itens.some(item => item.preco !== null),
        temDisponibilidade: itens.some(item => item.disponivel !== null)
    };
}

// ========================================
// PESQUISA
// ========================================

function pontuar(item, tokens, termo) {
    let pontos = 0;

    if (item.nomeNorm === termo) {
        pontos += 100;
    } else if (item.nomeNorm.startsWith(termo)) {
        pontos += 60;
    } else if (item.nomeNorm.includes(termo)) {
        pontos += 40;
    }

    for (const token of tokens) {
        if (item.nomeNorm.includes(token)) {
            pontos += 20;
        } else if (item.categoriaNorm.includes(token)) {
            pontos += 8;
        } else if (item.descricaoNorm.includes(token)) {
            pontos += 4;
        } else {
            pontos += 1;
        }
    }

    return pontos;
}

function passaNosFiltros(item, filtros, minimo, maximo) {
    if (filtros.apenasDisponiveis && item.disponivel === false) {
        return false;
    }

    if (minimo !== null || maximo !== null) {
        if (item.preco === null) {
            return false;
        }

        if (minimo !== null && item.preco < minimo) {
            return false;
        }

        if (maximo !== null && item.preco > maximo) {
            return false;
        }
    }

    return true;
}

function ordenar(pares, ordenacao) {
    const porNome = (a, b) =>
        a.item.nome.localeCompare(b.item.nome, 'pt-BR');

    const lista = [...pares];

    if (ordenacao === 'menor-preco' || ordenacao === 'maior-preco') {
        const sinal = ordenacao === 'menor-preco' ? 1 : -1;

        lista.sort((a, b) => {
            const precoA = a.item.preco;
            const precoB = b.item.preco;

            if (precoA === null && precoB === null) {
                return porNome(a, b);
            }

            if (precoA === null) {
                return 1;
            }

            if (precoB === null) {
                return -1;
            }

            return (precoA - precoB) * sinal || porNome(a, b);
        });
    } else if (ordenacao === 'nome') {
        lista.sort(porNome);
    } else {
        lista.sort((a, b) => b.pontos - a.pontos || porNome(a, b));
    }

    return lista.map(par => par.item);
}

// Resultado por categoria (o filtro de assunto é aplicado na tela,
// para os contadores de cada filtro continuarem corretos).
export function pesquisar(indice, consulta, filtros) {
    const vazio = () => ({
        planos: [],
        servicos: [],
        consultas: [],
        produtos: []
    });

    const termo = normalizar(consulta);

    if (termo.length < MINIMO_CARACTERES) {
        return { porTipo: vazio(), contagens: { ...vazio(), total: 0 } };
    }

    const tokens = termo.split(' ');
    const minimo = reaisParaCentavos(filtros.precoMinimo);
    const maximo = reaisParaCentavos(filtros.precoMaximo);

    const porTipo = vazio();

    for (const tipo of ORDEM_CATEGORIAS) {
        const encontrados = indice[tipo]
            .filter(item => tokens.every(t => item.textoBusca.includes(t)))
            .filter(item => passaNosFiltros(item, filtros, minimo, maximo))
            .map(item => ({ item, pontos: pontuar(item, tokens, termo) }));

        porTipo[tipo] = ordenar(encontrados, filtros.ordenacao);
    }

    const contagens = Object.fromEntries(
        ORDEM_CATEGORIAS.map(tipo => [tipo, porTipo[tipo].length])
    );

    contagens.total = ORDEM_CATEGORIAS.reduce(
        (soma, tipo) => soma + contagens[tipo],
        0
    );

    return { porTipo, contagens };
}

// ========================================
// FILTROS ATIVOS (cada um pode ser removido sozinho)
// ========================================

export function listarFiltrosAtivos(filtros) {
    const ativos = [];

    if (filtros.categoria !== FILTROS_PADRAO.categoria) {
        ativos.push({
            chave: 'categoria',
            rotulo: TITULOS_SECAO[filtros.categoria]
        });
    }

    if (filtros.ordenacao !== FILTROS_PADRAO.ordenacao) {
        ativos.push({
            chave: 'ordenacao',
            rotulo: ORDENACOES.find(o => o.valor === filtros.ordenacao)
                ?.rotulo
        });
    }

    if (filtros.precoMinimo !== '') {
        ativos.push({
            chave: 'precoMinimo',
            rotulo: `A partir de R$ ${filtros.precoMinimo}`
        });
    }

    if (filtros.precoMaximo !== '') {
        ativos.push({
            chave: 'precoMaximo',
            rotulo: `Até R$ ${filtros.precoMaximo}`
        });
    }

    if (filtros.apenasDisponiveis) {
        ativos.push({
            chave: 'apenasDisponiveis',
            rotulo: 'Somente disponíveis'
        });
    }

    return ativos;
}

export function removerFiltro(filtros, chave) {
    return { ...filtros, [chave]: FILTROS_PADRAO[chave] };
}
