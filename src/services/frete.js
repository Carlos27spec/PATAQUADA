// =====================================================
// FRETE E ENDEREÇOS
//
// Rotas:
//   GET  /api/cep/:cep                -> endereço do CEP (público)
//   POST /api/frete/calcular          -> opções de envio (público)
//        corpo: { cep, itens: [{ id_produto, quantidade }] }
//   GET  /api/usuarios/me/entrega     -> nome, telefone e endereços salvos
//   POST /api/usuarios/me/enderecos   -> salva um novo endereço
//
// Como o frete é calculado (parecido com o Mercado Livre):
//   origem  = endereço da loja em dados_pataquada (id = 1)
//   destino = CEP do cliente
//   1. REGIÃO: mesma cidade, mesmo estado, mesma região do país ou
//      outra região. Cada uma tem um valor base e um prazo base.
//   2. DISTÂNCIA: distância em linha reta entre as cidades x fator de
//      rota, cobrando um valor por km. Se não achar as coordenadas,
//      usa uma distância média da região.
//   3. PESO: soma dos pesos (produto_detalhes.peso, em kg). Produto
//      sem peso usa o peso padrão. Acima do peso incluso, cobra por kg.
//   4. ENVIO: "Normal" e "Expresso" (mais caro e mais rápido).
//      O Normal fica grátis quando o subtotal passa do limite.
//
// Todos os valores ficam em configuracoes_pataquada (categoria FRETE)
// e podem ser alterados sem mexer no código. Valores em centavos.
// =====================================================

/* global process */

import { ErroPagamento } from './mercadoPagoConfig.js';

const USER_AGENT = 'PataQuada-Loja/1.0';

// chave, valor padrão, descrição
const CONFIG_FRETE = [
    ['frete_base_local', 990, 'Valor base do frete na mesma cidade (centavos).'],
    ['frete_base_estadual', 1490, 'Valor base do frete no mesmo estado (centavos).'],
    ['frete_base_regional', 1990, 'Valor base do frete na mesma região do país (centavos).'],
    ['frete_base_nacional', 2690, 'Valor base do frete para outras regiões (centavos).'],
    ['frete_valor_km', 1, 'Valor cobrado por km rodado (centavos).'],
    ['frete_fator_rota', 1.25, 'Multiplicador da distância em linha reta para estimar a rota.'],
    ['frete_peso_padrao_kg', 0.5, 'Peso usado para produto sem peso cadastrado (kg).'],
    ['frete_peso_incluso_kg', 1, 'Peso já incluso no valor base (kg).'],
    ['frete_valor_kg_adicional', 250, 'Valor por kg acima do peso incluso (centavos).'],
    ['frete_prazo_local', 1, 'Prazo base na mesma cidade (dias úteis).'],
    ['frete_prazo_estadual', 2, 'Prazo base no mesmo estado (dias úteis).'],
    ['frete_prazo_regional', 4, 'Prazo base na mesma região (dias úteis).'],
    ['frete_prazo_nacional', 6, 'Prazo base para outras regiões (dias úteis).'],
    ['frete_km_por_dia', 800, 'A cada quantos km o prazo aumenta 1 dia útil.'],
    ['frete_expresso_multiplicador', 1.7, 'Quanto o Expresso custa em relação ao Normal.'],
    ['frete_expresso_fator_prazo', 0.5, 'Fração do prazo do Normal usada no Expresso.'],
    ['frete_gratis_a_partir_de', Number(process.env.FRETE_GRATIS_A_PARTIR_DE ?? 10000),
        'Subtotal a partir do qual o envio Normal é grátis (centavos). 0 desativa.']
];

// Distância média usada quando não há coordenadas.
const KM_MEDIO_POR_REGIAO = {
    LOCAL: 15,
    ESTADUAL: 250,
    REGIONAL: 800,
    NACIONAL: 2200
};

const REGIAO_POR_UF = {
    AC: 'N', AP: 'N', AM: 'N', PA: 'N', RO: 'N', RR: 'N', TO: 'N',
    AL: 'NE', BA: 'NE', CE: 'NE', MA: 'NE', PB: 'NE', PE: 'NE', PI: 'NE', RN: 'NE', SE: 'NE',
    DF: 'CO', GO: 'CO', MT: 'CO', MS: 'CO',
    ES: 'SE', MG: 'SE', RJ: 'SE', SP: 'SE',
    PR: 'S', RS: 'S', SC: 'S'
};

const NOME_REGIAO = {
    LOCAL: 'Mesma cidade',
    ESTADUAL: 'Mesmo estado',
    REGIONAL: 'Mesma região',
    NACIONAL: 'Outra região'
};

// =====================================================
// AUXILIARES
// =====================================================

function somenteDigitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
}

function texto(valor, tamanho) {
    return String(valor ?? '').trim().slice(0, tamanho);
}

function normalizar(valor) {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toLowerCase();
}

// Cache simples em memória (evita consultar o mesmo CEP toda hora).
function criarCache(limite = 500) {
    const mapa = new Map();

    return {
        get: chave => mapa.get(chave),
        set(chave, valor) {
            if (mapa.size >= limite) {
                mapa.delete(mapa.keys().next().value);
            }
            mapa.set(chave, valor);
        }
    };
}

const cacheCep = criarCache();
const cacheCoordenadas = criarCache();

async function buscarJson(url) {
    try {
        const resposta = await fetch(url, {
            headers: {
                Accept: 'application/json',
                'User-Agent': USER_AGENT
            },
            signal: AbortSignal.timeout(6000)
        });

        if (!resposta.ok) {
            return null;
        }

        return await resposta.json();
    } catch {
        return null;
    }
}

// =====================================================
// CONSULTA DE CEP
// =====================================================

// Devolve { cep, logradouro, bairro, cidade, uf, latitude, longitude }
// ou null se o CEP não existir.
export async function consultarCep(cepInformado) {
    const cep = somenteDigitos(cepInformado);

    if (cep.length !== 8) {
        throw new ErroPagamento('Informe um CEP válido com 8 dígitos.');
    }

    const emCache = cacheCep.get(cep);

    if (emCache !== undefined) {
        return emCache;
    }

    let endereco = null;

    // 1ª opção: BrasilAPI (às vezes traz as coordenadas).
    const brasil = await buscarJson(
        `https://brasilapi.com.br/api/cep/v2/${cep}`
    );

    if (brasil?.city && brasil?.state) {
        const coordenadas = brasil.location?.coordinates ?? {};
        const latitude = Number(coordenadas.latitude);
        const longitude = Number(coordenadas.longitude);
        const temCoordenadas =
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            coordenadas.latitude !== '' &&
            coordenadas.longitude !== '';

        endereco = {
            cep,
            logradouro: brasil.street || '',
            bairro: brasil.neighborhood || '',
            cidade: brasil.city,
            uf: String(brasil.state).toUpperCase(),
            latitude: temCoordenadas ? latitude : null,
            longitude: temCoordenadas ? longitude : null
        };
    }

    // 2ª opção: ViaCEP (responde { erro: true } quando o CEP não existe).
    let respondeu = Boolean(brasil);

    if (!endereco) {
        const via = await buscarJson(`https://viacep.com.br/ws/${cep}/json/`);

        respondeu = respondeu || Boolean(via);

        if (via && !via.erro && via.localidade) {
            endereco = {
                cep,
                logradouro: via.logradouro || '',
                bairro: via.bairro || '',
                cidade: via.localidade,
                uf: String(via.uf).toUpperCase(),
                latitude: null,
                longitude: null
            };
        }
    }

    if (!endereco && !respondeu) {
        // Os dois serviços falharam (fora do ar ou sem internet):
        // não guarda no cache para tentar de novo depois.
        throw new ErroPagamento(
            'Não foi possível consultar o CEP agora. Tente novamente.',
            503
        );
    }

    cacheCep.set(cep, endereco);

    return endereco;
}

// Coordenadas da cidade (quando o CEP não trouxe).
async function coordenadasDe(endereco) {
    if (endereco.latitude !== null && endereco.longitude !== null) {
        return { latitude: endereco.latitude, longitude: endereco.longitude };
    }

    const chave = `${normalizar(endereco.cidade)}|${endereco.uf}`;
    const emCache = cacheCoordenadas.get(chave);

    if (emCache !== undefined) {
        return emCache;
    }

    const busca = new URLSearchParams({
        q: `${endereco.cidade}, ${endereco.uf}, Brasil`,
        format: 'json',
        limit: '1',
        countrycodes: 'br'
    });

    const resultado = await buscarJson(
        `https://nominatim.openstreetmap.org/search?${busca}`
    );

    const primeiro = Array.isArray(resultado) ? resultado[0] : null;
    const coordenadas = primeiro
        ? { latitude: Number(primeiro.lat), longitude: Number(primeiro.lon) }
        : null;

    if (
        coordenadas &&
        Number.isFinite(coordenadas.latitude) &&
        Number.isFinite(coordenadas.longitude)
    ) {
        cacheCoordenadas.set(chave, coordenadas);
        return coordenadas;
    }

    return null;
}

function distanciaKm(a, b) {
    const raio = 6371;
    const rad = graus => (graus * Math.PI) / 180;
    const dLat = rad(b.latitude - a.latitude);
    const dLon = rad(b.longitude - a.longitude);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(a.latitude)) *
        Math.cos(rad(b.latitude)) *
        Math.sin(dLon / 2) ** 2;

    return 2 * raio * Math.asin(Math.sqrt(h));
}

function regiaoEntre(origem, destino) {
    if (origem.uf === destino.uf) {
        return normalizar(origem.cidade) === normalizar(destino.cidade)
            ? 'LOCAL'
            : 'ESTADUAL';
    }

    return REGIAO_POR_UF[origem.uf] &&
        REGIAO_POR_UF[origem.uf] === REGIAO_POR_UF[destino.uf]
        ? 'REGIONAL'
        : 'NACIONAL';
}

// Soma dias úteis (pula sábado e domingo).
function dataPrevista(diasUteis) {
    const data = new Date();
    let restantes = diasUteis;

    while (restantes > 0) {
        data.setDate(data.getDate() + 1);
        const dia = data.getDay();

        if (dia !== 0 && dia !== 6) {
            restantes -= 1;
        }
    }

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

// =====================================================
// CONFIGURAÇÃO E ORIGEM
// =====================================================

export function garantirConfiguracoesFrete(db) {
    const inserir = db.prepare(`
        INSERT OR IGNORE INTO configuracoes_pataquada (
            chave, valor, descricao, categoria
        )
        VALUES (?, ?, ?, 'FRETE')
    `);

    const inserirTodas = db.transaction(() => {
        for (const [chave, valor, descricao] of CONFIG_FRETE) {
            inserir.run(chave, String(valor), descricao);
        }
    });

    inserirTodas();
}

function lerConfiguracoes(db) {
    const linhas = db.prepare(`
        SELECT chave, valor
        FROM configuracoes_pataquada
        WHERE chave LIKE 'frete_%'
    `).all();

    const salvas = Object.fromEntries(
        linhas.map(linha => [linha.chave.toLowerCase(), linha.valor])
    );

    const config = {};

    for (const [chave, padrao] of CONFIG_FRETE) {
        const numero = Number(salvas[chave]);
        config[chave] =
            salvas[chave] !== null &&
            salvas[chave] !== undefined &&
            salvas[chave] !== '' &&
            Number.isFinite(numero) &&
            numero >= 0
                ? numero
                : padrao;
    }

    return config;
}

async function enderecoDaLoja(db) {
    const loja = db.prepare(`
        SELECT cep, logradouro, numero, bairro, cidade, uf
        FROM dados_pataquada
        WHERE id = 1
    `).get();

    const cep = somenteDigitos(loja?.cep);

    if (cep.length !== 8) {
        throw new ErroPagamento(
            'O endereço da loja ainda não foi cadastrado. ' +
            'Não é possível calcular o frete.',
            503
        );
    }

    const consultado = await consultarCep(cep);

    if (!consultado) {
        throw new ErroPagamento(
            'O CEP cadastrado para a loja é inválido.',
            503
        );
    }

    // O que estiver preenchido no banco tem prioridade.
    return {
        ...consultado,
        cidade: loja.cidade || consultado.cidade,
        uf: String(loja.uf || consultado.uf).toUpperCase()
    };
}

// =====================================================
// CÁLCULO
// =====================================================

function carregarItens(db, itensInformados) {
    const quantidades = new Map();

    for (const item of Array.isArray(itensInformados) ? itensInformados : []) {
        const id = Number(item?.id_produto ?? item?.id);
        const quantidade = Math.floor(Number(item?.quantidade));

        if (Number.isInteger(id) && id > 0 && quantidade > 0) {
            quantidades.set(id, (quantidades.get(id) ?? 0) + Math.min(quantidade, 999));
        }
    }

    if (quantidades.size === 0 || quantidades.size > 100) {
        throw new ErroPagamento('Informe os produtos para calcular o frete.');
    }

    const ids = [...quantidades.keys()];

    const produtos = db.prepare(`
        SELECT p.id, p.preco, d.peso
        FROM produtos p
        LEFT JOIN produto_detalhes d ON d.id_produto = p.id
        WHERE p.id IN (${ids.map(() => '?').join(', ')})
    `).all(...ids);

    return produtos.map(produto => ({
        id_produto: produto.id,
        preco: produto.preco,
        peso: produto.peso,
        quantidade: quantidades.get(produto.id)
    }));
}

// itens: [{ id_produto, quantidade }]. Preço e peso vêm do banco.
export async function calcularOpcoesFrete(db, { cep, itens }) {
    const produtos = carregarItens(db, itens);

    if (produtos.length === 0) {
        throw new ErroPagamento('Produtos não encontrados.');
    }

    const destino = await consultarCep(cep);

    if (!destino) {
        throw new ErroPagamento('CEP não encontrado.', 404);
    }

    const origem = await enderecoDaLoja(db);
    const config = lerConfiguracoes(db);

    const regiao = regiaoEntre(origem, destino);

    // Distância
    const [coordOrigem, coordDestino] = await Promise.all([
        coordenadasDe(origem),
        coordenadasDe(destino)
    ]);

    let distancia = KM_MEDIO_POR_REGIAO[regiao];
    let distanciaEstimada = true;

    if (coordOrigem && coordDestino) {
        distancia = Math.max(
            distanciaKm(coordOrigem, coordDestino) * config.frete_fator_rota,
            regiao === 'LOCAL' ? 5 : 0
        );
        distanciaEstimada = false;
    }

    distancia = Math.round(distancia);

    // Peso e subtotal
    const pesoTotal = produtos.reduce((soma, item) => {
        const peso = Number(item.peso) > 0
            ? Number(item.peso)
            : config.frete_peso_padrao_kg;

        return soma + peso * item.quantidade;
    }, 0);

    const subtotal = produtos.reduce(
        (soma, item) => soma + item.preco * item.quantidade,
        0
    );

    const chaveRegiao = regiao.toLowerCase();

    const pesoExcedente = Math.max(
        0,
        Math.ceil(pesoTotal - config.frete_peso_incluso_kg)
    );

    const valorNormal = Math.round(
        config[`frete_base_${chaveRegiao}`] +
        distancia * config.frete_valor_km +
        pesoExcedente * config.frete_valor_kg_adicional
    );

    const prazoNormal = Math.max(
        1,
        Math.round(
            config[`frete_prazo_${chaveRegiao}`] +
            (config.frete_km_por_dia > 0
                ? Math.floor(distancia / config.frete_km_por_dia)
                : 0)
        )
    );

    const limiteGratis = config.frete_gratis_a_partir_de;
    const normalGratis = limiteGratis > 0 && subtotal >= limiteGratis;

    const valorExpresso = Math.round(
        valorNormal * config.frete_expresso_multiplicador
    );

    const prazoExpresso = Math.max(
        1,
        Math.ceil(prazoNormal * config.frete_expresso_fator_prazo)
    );

    const opcoes = [
        {
            codigo: 'NORMAL',
            nome: 'Envio Normal',
            valor: normalGratis ? 0 : valorNormal,
            valor_original: valorNormal,
            gratis: normalGratis,
            prazo_dias: prazoNormal,
            data_prevista: dataPrevista(prazoNormal)
        },
        {
            codigo: 'EXPRESSO',
            nome: 'Envio Expresso',
            valor: valorExpresso,
            valor_original: valorExpresso,
            gratis: false,
            prazo_dias: prazoExpresso,
            data_prevista: dataPrevista(prazoExpresso)
        }
    ];

    return {
        destino: {
            cep: destino.cep,
            logradouro: destino.logradouro,
            bairro: destino.bairro,
            cidade: destino.cidade,
            uf: destino.uf
        },
        origem: {
            cidade: origem.cidade,
            uf: origem.uf
        },
        regiao,
        regiao_nome: NOME_REGIAO[regiao],
        distancia_km: distancia,
        distancia_estimada: distanciaEstimada,
        peso_kg: Number(pesoTotal.toFixed(2)),
        subtotal,
        frete_gratis_a_partir_de: limiteGratis,
        opcoes
    };
}

// =====================================================
// ENDEREÇOS DO USUÁRIO
// =====================================================

export function listarEnderecos(db, idUsuario) {
    return db.prepare(`
        SELECT
            id, apelido, cep, logradouro, numero, complemento,
            bairro, cidade, uf, referencia, endereco_principal
        FROM enderecos_usuario
        WHERE id_usuario = ?
        AND status = 1
        ORDER BY endereco_principal DESC, id DESC
    `).all(idUsuario);
}

export function buscarEnderecoDoUsuario(db, idUsuario, idEndereco) {
    return db.prepare(`
        SELECT
            id, cep, logradouro, numero, complemento,
            bairro, cidade, uf
        FROM enderecos_usuario
        WHERE id = ?
        AND id_usuario = ?
        AND status = 1
    `).get(idEndereco, idUsuario) ?? null;
}

// endereco já validado (cep só com dígitos, uf em maiúsculas).
// Devolve o id. Não duplica um endereço igual já salvo.
export function salvarEndereco(db, idUsuario, endereco, { principal = false } = {}) {
    const salvar = db.transaction(() => {
        const existente = db.prepare(`
            SELECT id
            FROM enderecos_usuario
            WHERE id_usuario = ?
            AND status = 1
            AND cep = ?
            AND numero = ?
            AND IFNULL(complemento, '') = ?
        `).get(
            idUsuario,
            endereco.cep,
            endereco.numero,
            endereco.complemento || ''
        );

        const total = db.prepare(`
            SELECT COUNT(*) AS total
            FROM enderecos_usuario
            WHERE id_usuario = ? AND status = 1
        `).get(idUsuario).total;

        const tornarPrincipal = principal || total === 0;

        if (tornarPrincipal) {
            db.prepare(`
                UPDATE enderecos_usuario
                SET endereco_principal = 0
                WHERE id_usuario = ?
            `).run(idUsuario);
        }

        if (existente) {
            db.prepare(`
                UPDATE enderecos_usuario
                SET logradouro = ?, bairro = ?, cidade = ?, uf = ?,
                    endereco_principal = CASE WHEN ? THEN 1 ELSE endereco_principal END
                WHERE id = ?
            `).run(
                endereco.logradouro,
                endereco.bairro,
                endereco.cidade,
                endereco.uf,
                tornarPrincipal ? 1 : 0,
                existente.id
            );

            return existente.id;
        }

        const resultado = db.prepare(`
            INSERT INTO enderecos_usuario (
                id_usuario, apelido, cep, logradouro, numero,
                complemento, bairro, cidade, uf, endereco_principal
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            idUsuario,
            endereco.apelido || null,
            endereco.cep,
            endereco.logradouro,
            endereco.numero,
            endereco.complemento || null,
            endereco.bairro,
            endereco.cidade,
            endereco.uf,
            tornarPrincipal ? 1 : 0
        );

        return Number(resultado.lastInsertRowid);
    });

    return salvar();
}

function validarEndereco(dados = {}) {
    const endereco = {
        apelido: texto(dados.apelido, 40),
        cep: somenteDigitos(dados.cep).slice(0, 8),
        logradouro: texto(dados.logradouro, 150),
        numero: texto(dados.numero, 15),
        complemento: texto(dados.complemento, 80),
        bairro: texto(dados.bairro, 80),
        cidade: texto(dados.cidade, 80),
        uf: texto(dados.uf, 2).toUpperCase()
    };

    if (endereco.cep.length !== 8) return { erro: 'Informe um CEP válido.' };
    if (!endereco.logradouro) return { erro: 'Informe a rua.' };
    if (!endereco.numero) return { erro: 'Informe o número.' };
    if (!endereco.bairro) return { erro: 'Informe o bairro.' };
    if (!endereco.cidade) return { erro: 'Informe a cidade.' };
    if (!REGIAO_POR_UF[endereco.uf]) return { erro: 'Informe a sigla do estado (UF).' };

    return { endereco };
}

// =====================================================
// ROTAS
// =====================================================

function responder(res, erro, mensagemPadrao) {
    if (erro instanceof ErroPagamento) {
        return res.status(erro.status).json({
            sucesso: false,
            mensagem: erro.message
        });
    }

    console.error(mensagemPadrao, erro);

    return res.status(500).json({
        sucesso: false,
        mensagem: mensagemPadrao
    });
}

export function registrarRotasFrete({ app, db, autenticar }) {
    garantirConfiguracoesFrete(db);

    // BUSCAR ENDEREÇO PELO CEP
    app.get('/api/cep/:cep', async (req, res) => {
        try {
            const endereco = await consultarCep(req.params.cep);

            if (!endereco) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: 'CEP não encontrado.'
                });
            }

            return res.json({
                sucesso: true,
                endereco: {
                    cep: endereco.cep,
                    logradouro: endereco.logradouro,
                    bairro: endereco.bairro,
                    cidade: endereco.cidade,
                    uf: endereco.uf
                }
            });
        } catch (erro) {
            return responder(res, erro, 'Erro ao consultar o CEP.');
        }
    });

    // CALCULAR FRETE
    app.post('/api/frete/calcular', async (req, res) => {
        try {
            const resultado = await calcularOpcoesFrete(db, {
                cep: req.body?.cep,
                itens: req.body?.itens
            });

            return res.json({ sucesso: true, ...resultado });
        } catch (erro) {
            return responder(res, erro, 'Erro ao calcular o frete.');
        }
    });

    // DADOS DE ENTREGA DO USUÁRIO LOGADO
    app.get('/api/usuarios/me/entrega', autenticar, (req, res) => {
        try {
            const usuario = db.prepare(`
                SELECT nome, email, telefone
                FROM usuarios
                WHERE id = ?
            `).get(req.usuario.id);

            return res.json({
                sucesso: true,
                usuario,
                enderecos: listarEnderecos(db, req.usuario.id)
            });
        } catch (erro) {
            return responder(res, erro, 'Erro ao consultar os dados de entrega.');
        }
    });

    // SALVAR NOVO ENDEREÇO
    app.post('/api/usuarios/me/enderecos', autenticar, (req, res) => {
        try {
            const { endereco, erro } = validarEndereco(req.body);

            if (erro) {
                return res.status(400).json({ sucesso: false, mensagem: erro });
            }

            const id = salvarEndereco(db, req.usuario.id, endereco, {
                principal: Boolean(req.body?.principal)
            });

            return res.status(201).json({
                sucesso: true,
                id,
                enderecos: listarEnderecos(db, req.usuario.id)
            });
        } catch (erro) {
            return responder(res, erro, 'Erro ao salvar o endereço.');
        }
    });

    console.log('Frete: rotas /api/cep, /api/frete e /api/usuarios/me/* disponíveis');
}
