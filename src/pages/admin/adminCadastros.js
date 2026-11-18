// =====================================================
// ÁREA ADMINISTRATIVA — CADASTROS (categorias, fornecedores,
// produtos × fornecedores e movimentações de estoque)
//
// Os campos de cada cadastro estão em cadastrosConfig.js.
//
// Rotas (todas exigem login de administrador):
//   GET    /api/admin/cadastros/:tipo
//   GET    /api/admin/cadastros/:tipo/:id
//   POST   /api/admin/cadastros/:tipo
//   PUT    /api/admin/cadastros/:tipo/:id
//   DELETE /api/admin/cadastros/:tipo/:id          (se permitido)
//   PUT    /api/admin/cadastros/:tipo/:id/imagem   (corpo = arquivo)
//   DELETE /api/admin/cadastros/:tipo/:id/imagem
//   GET    /api/admin/referencias/:nome            (opções dos selects)
// =====================================================

import bcrypt from 'bcrypt';
import express from 'express';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { criarExigirAdmin, exigirPermissao } from './adminInicio.js';
import { PERMISSAO_PAINEL, pode } from './permissoesAdmin.js';
import { CADASTROS, REFERENCIAS, TABELA_DA_REFERENCIA, UFS } from './cadastrosConfig.js';

const PASTA_IMAGENS = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../images'
);

const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

class ErroValidacao extends Error {
    constructor(mensagem, status = 400) {
        super(mensagem);
        this.status = status;
    }
}

// =====================================================
// AUXILIARES
// =====================================================

function digitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
}

function vazio(valor) {
    return valor === null || valor === undefined || String(valor).trim() === '';
}

export function nomeParaArquivo(nome) {
    const base = String(nome)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/g, '');

    return base || 'imagem';
}

function extensaoDaImagem(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
    if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') return 'png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
    if (buffer.toString('ascii', 0, 4) === 'GIF8') return 'gif';
    return null;
}

// Converte e valida um campo conforme o tipo. Devolve o valor do banco.
function valorDoCampo(db, campo, bruto) {
    const nome = campo.rotulo.replace(/\s*\(.*\)$/, '').replace(/\?$/, '');

    if (campo.tipo === 'status' || campo.tipo === 'booleano') {
        if (vazio(bruto)) {
            return campo.tipo === 'status' ? 1 : 0;
        }

        return Number(bruto) === 1 || bruto === true ? 1 : 0;
    }

    if (vazio(bruto)) {
        // Campo com valor padrão (ex.: "Situação: Pendente") usa o padrão.
        if (campo.padrao !== undefined) {
            return campo.padrao;
        }

        if (campo.obrigatorio) {
            throw new ErroValidacao(`Preencha o campo "${nome}".`);
        }

        return null;
    }

    const texto = String(bruto).trim();

    switch (campo.tipo) {
        case 'texto':
        case 'textoLongo':
            return texto.slice(0, campo.max ?? 255);

        case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
                throw new ErroValidacao(`Informe um e-mail válido em "${nome}".`);
            }
            return texto.slice(0, 254);

        case 'inteiro':
        case 'dinheiro': {
            const numero = Number(texto);
            const minimo = campo.minimo ?? 0;

            if (!Number.isInteger(numero) || numero < minimo) {
                throw new ErroValidacao(
                    minimo > 0
                        ? `"${nome}" deve ser um número inteiro a partir de ${minimo}.`
                        : `"${nome}" deve ser um número válido (0 ou mais).`
                );
            }
            return numero;
        }

        case 'data':
            if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || Number.isNaN(Date.parse(texto))) {
                throw new ErroValidacao(`Informe uma data válida em "${nome}".`);
            }
            return texto;

        case 'dataHora': {
            // "2026-11-20T14:30" (tela) -> "2026-11-20 14:30" (banco)
            const valor = texto.replace('T', ' ').slice(0, 16);
            if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(valor)) {
                throw new ErroValidacao(`Informe data e hora válidas em "${nome}".`);
            }
            return valor;
        }

        case 'mes':
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(texto)) {
                throw new ErroValidacao(`Informe o mês no formato AAAA-MM em "${nome}".`);
            }
            return texto;

        case 'decimal': {
            const numero = Number(texto.replace(',', '.'));
            if (!Number.isFinite(numero) || numero <= 0) {
                throw new ErroValidacao(`"${nome}" deve ser maior que zero.`);
            }
            return numero;
        }

        case 'selecao':
            if (!campo.opcoes.some(opcao => opcao.valor === texto)) {
                throw new ErroValidacao(`Escolha uma opção válida em "${nome}".`);
            }
            return texto;

        case 'referencia': {
            const id = Number(texto);
            const tabela = TABELA_DA_REFERENCIA[campo.referencia];

            if (!Number.isInteger(id) || id <= 0 ||
                !db.prepare(`SELECT 1 FROM ${tabela} WHERE id = ?`).get(id)) {
                throw new ErroValidacao(`"${nome}" não encontrado.`);
            }
            return id;
        }

        case 'cep': {
            const cep = digitos(texto);
            if (cep.length !== 8) throw new ErroValidacao('Informe um CEP com 8 dígitos.');
            return cep;
        }

        case 'uf': {
            const uf = texto.toUpperCase();
            if (!UFS.includes(uf)) throw new ErroValidacao('Informe uma UF válida (ex.: SP).');
            return uf;
        }

        case 'telefone': {
            const telefone = digitos(texto);
            if (telefone.length < 10 || telefone.length > 11) {
                throw new ErroValidacao(`Informe um telefone com DDD em "${nome}".`);
            }
            return telefone;
        }

        case 'cpfCnpj': {
            const documento = digitos(texto);
            if (documento.length !== 11 && documento.length !== 14) {
                throw new ErroValidacao('O CPF deve ter 11 dígitos e o CNPJ 14 dígitos.');
            }
            return documento;
        }

        default:
            return texto;
    }
}

// =====================================================
// ROTAS
// =====================================================

export function registrarAdminCadastros({ app, db, autenticar }) {
    const protegido = [autenticar, criarExigirAdmin(db)];

    // Imagem: vale para quem pode cadastrar (logo após criar) ou editar.
    const podeMexerNaImagem = (req, res, next) =>
        pode(req.permissoes, req.params.tipo, 'editar') || pode(req.permissoes, req.params.tipo, 'criar')
            ? next()
            : res.status(403).json({ sucesso: false, mensagem: 'Você não tem permissão para esta ação. Fale com um administrador.' });

    // Trava: ninguém retira o acesso ao painel do próprio tipo de usuário
    // (o administrador ficaria trancado para fora).
    function conferirAcessoProprio(req, idVinculo) {
        if (req.params.tipo !== 'permissoes-tipo') return;

        const vinculo = db.prepare(`
            SELECT pt.id_tipo_usuario, UPPER(p.chave) AS chave
            FROM permissao_tipo_usuario pt
            JOIN permissao_usuario p ON p.id = pt.id_permissao
            WHERE pt.id = ?
        `).get(idVinculo);

        if (vinculo && vinculo.chave === PERMISSAO_PAINEL && vinculo.id_tipo_usuario === req.usuario.id_tipo_usuario) {
            throw new ErroValidacao('Você não pode retirar o acesso ao painel do seu próprio tipo de usuário.');
        }
    }

    const colunasDaTabela = tabela =>
        db.prepare(`PRAGMA table_info(${tabela})`).all().map(coluna => coluna.name);

    function configDe(req) {
        const config = CADASTROS[req.params.tipo];

        if (!config) {
            throw new ErroValidacao('Cadastro não encontrado.', 404);
        }

        return config;
    }

    function idDe(req) {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroValidacao('Registro não encontrado.', 404);
        }

        return id;
    }

    // Tira os campos que nunca saem do servidor (ex.: senha).
    function semOcultos(config, registro) {
        if (!registro || !config.ocultar) {
            return registro;
        }

        const copia = { ...registro };

        for (const campo of config.ocultar) {
            delete copia[campo];
        }

        return copia;
    }

    function buscar(config, id) {
        return db.prepare(`SELECT * FROM ${config.tabela} WHERE id = ?`).get(id) ?? null;
    }

    // Campos que a tela pode enviar (imagem e "só leitura" ficam de fora).
    function lerCampos(config, corpo = {}, { editando = false } = {}) {
        const dados = {};

        for (const campo of config.campos) {
            if (campo.tipo === 'imagem' || campo.tipo === 'permissoes' || campo.somenteLeitura) {
                continue;
            }

            if (campo.tipo === 'senha') {
                const senha = String(corpo[campo.nome] ?? '');

                if (!senha) {
                    if (editando) continue; // em branco = mantém a atual
                    throw new ErroValidacao('Informe a senha (mínimo de 8 caracteres).');
                }

                if (senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) {
                    throw new ErroValidacao('A senha deve ter de 8 a 72 caracteres.');
                }

                dados[campo.nome] = bcrypt.hashSync(senha, 10);
                continue;
            }

            dados[campo.nome] = valorDoCampo(db, campo, corpo[campo.nome]);
        }

        return dados;
    }

    function responder(res, erro, config, mensagemPadrao) {
        if (erro instanceof ErroValidacao) {
            return res.status(erro.status).json({ sucesso: false, mensagem: erro.message });
        }

        const texto = String(erro?.message ?? '');
        const unico = texto.match(/UNIQUE constraint failed: (.+)$/);

        if (unico) {
            const colunas = unico[1].trim();
            const personalizada = config?.mensagensUnicas?.[colunas];

            if (personalizada) {
                return res.status(409).json({ sucesso: false, mensagem: personalizada });
            }

            const coluna = colunas.split(',')[0].split('.').pop();
            const campo = config?.campos.find(item => item.nome === coluna);

            return res.status(409).json({
                sucesso: false,
                mensagem: `Já existe um cadastro com esse(a) ${(campo?.rotulo ?? coluna).toLowerCase()}.`
            });
        }

        if (/FOREIGN KEY constraint failed/.test(texto)) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Não é possível concluir: este registro está ligado a outros cadastros.'
            });
        }

        if (/CHECK constraint failed/.test(texto)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: config?.mensagemCheck ?? 'Alguns valores não são aceitos. Confira os campos.'
            });
        }

        console.error(mensagemPadrao, erro);

        return res.status(500).json({ sucesso: false, mensagem: mensagemPadrao });
    }

    // ----- regras específicas -----

    // Ajusta os dados antes de gravar. "atual" = registro antes da edição
    // (null ao cadastrar).
    function antesDeSalvar(tipo, config, dados, atual, usuarioId) {
        // Quem cadastrou (serviços, consultas...).
        if (!atual && config.usuarioCadastro) {
            dados[config.usuarioCadastro] = usuarioId;
        }

        // Agendamentos e assinaturas: o cliente é o dono do pet.
        if (config.clienteDoPet) {
            const pet = db.prepare('SELECT id_usuario_cliente FROM pets WHERE id = ?').get(dados.id_pet);
            dados.id_usuario_cliente = pet.id_usuario_cliente;
        }

        if (tipo === 'agendamentos' && !dados.id_servico && !dados.id_tipo_consulta) {
            throw new ErroValidacao('Escolha um serviço ou uma consulta para o agendamento.');
        }

        // Consulta com preço fixo não usa faixa de preço.
        if (tipo === 'consultas' && dados.preco_fixo !== null) {
            dados.preco_minimo = 0;
            dados.preco_maximo = 0;
        }

        if (tipo === 'assinaturas') {
            if (dados.valor_contratado === null) {
                dados.valor_contratado = db.prepare('SELECT valor FROM plano WHERE id = ?').get(dados.id_plano).valor;
            }

            // Cobrança única não renova nem agenda próxima cobrança.
            if (dados.tipo_cobranca === 'UNICA') {
                dados.renovacao_automatica = 0;
                dados.cancelar_ao_fim_vigencia = 0;
                dados.proxima_cobranca = null;
            }
        }

        // Configurações da loja: a chave vira minúscula_com_sublinhado e não
        // pode repetir ("Frete Grátis" e "frete_gratis" são a mesma chave).
        if (tipo === 'configuracoes') {
            dados.chave = String(dados.chave ?? '')
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');

            if (!dados.chave) {
                throw new ErroValidacao('Informe a chave da configuração.');
            }

            dados.categoria = String(dados.categoria ?? '').trim().toUpperCase() || 'GERAL';

            const repetida = db.prepare(`
                SELECT id FROM configuracoes_pataquada WHERE LOWER(chave) = ? AND id <> ?
            `).get(dados.chave, atual?.id ?? 0);

            if (repetida) {
                throw new ErroValidacao(`Já existe uma configuração com a chave "${dados.chave}".`, 409);
            }
        }

        if (tipo === 'usuarios') {
            dados.email = dados.email.toLowerCase();
            dados.usuario = dados.usuario ? dados.usuario.toLowerCase() : null;
        }

        // Só um endereço principal por cliente (o banco tem índice único).
        if (config.enderecoPrincipal && dados.endereco_principal === 1) {
            db.prepare(`
                UPDATE enderecos_usuario SET endereco_principal = 0
                WHERE id_usuario = ? AND id <> ?
            `).run(dados.id_usuario, atual?.id ?? -1);
        }
    }

    // ----- permissões do tipo de usuário (caixas de marcar) -----

    const temCampoPermissoes = config => config.campos.some(campo => campo.tipo === 'permissoes');

    function permissoesDoTipo(idTipo) {
        return db.prepare(`
            SELECT UPPER(p.chave) AS chave
            FROM permissao_tipo_usuario pt
            JOIN permissao_usuario p ON p.id = pt.id_permissao
            WHERE pt.id_tipo_usuario = ?
            ORDER BY p.chave
        `).all(idTipo).map(item => item.chave);
    }

    // Deixa o tipo exatamente com as permissões marcadas na tela.
    function sincronizarPermissoes(req, idTipo, lista) {
        if (!Array.isArray(lista)) {
            return; // tela antiga / sem o campo: não mexe
        }

        const chaves = [...new Set(lista.map(item => String(item).trim().toUpperCase()).filter(Boolean))];

        if (idTipo === req.usuario.id_tipo_usuario && !chaves.includes(PERMISSAO_PAINEL)) {
            throw new ErroValidacao('Você não pode retirar o acesso ao painel do seu próprio tipo de usuário.');
        }

        const ids = chaves.map(chave => {
            const permissao = db.prepare('SELECT id FROM permissao_usuario WHERE UPPER(chave) = ?').get(chave);

            if (!permissao) {
                throw new ErroValidacao(`Permissão "${chave}" não encontrada.`);
            }

            return permissao.id;
        });

        db.prepare(`
            DELETE FROM permissao_tipo_usuario
            WHERE id_tipo_usuario = ?
            ${ids.length ? `AND id_permissao NOT IN (${ids.map(() => '?').join(', ')})` : ''}
        `).run(idTipo, ...ids);

        const inserir = db.prepare(`
            INSERT OR IGNORE INTO permissao_tipo_usuario (id_tipo_usuario, id_permissao)
            VALUES (?, ?)
        `);

        for (const id of ids) {
            inserir.run(idTipo, id);
        }
    }

    function aposSalvar(tipo, config, id, dados, atual, usuarioId) {
        // Só um plano "Mais escolhido".
        if (tipo === 'planos' && dados.destaque === 1) {
            db.prepare('UPDATE plano SET destaque = 0 WHERE id <> ?').run(id);
        }

        // Só um fornecedor principal por produto.
        if (tipo === 'produto-fornecedor' && dados.fornecedor_principal === 1) {
            db.prepare(`
                UPDATE produto_fornecedor
                SET fornecedor_principal = 0
                WHERE id_produto = ? AND id <> ?
            `).run(dados.id_produto, id);
        }

        // Histórico: grava cada mudança de situação do agendamento.
        if (config.historico && (!atual || atual.id_situacao !== dados.id_situacao)) {
            db.prepare(`
                INSERT INTO agendamento_historico (
                    id_agendamento, id_situacao_anterior, id_situacao_nova,
                    id_usuario_responsavel, observacao
                )
                VALUES (?, ?, ?, ?, ?)
            `).run(id, atual?.id_situacao ?? null, dados.id_situacao, usuarioId,
                atual ? 'Situação alterada pelo painel.' : 'Agendamento criado pelo painel.');
        }
    }

    // Movimentação de estoque: grava o antes/depois e atualiza o produto.
    function registrarMovimentacao(dados, usuarioId) {
        const temTrigger = Boolean(
            db.prepare(`
                SELECT 1 FROM sqlite_master
                WHERE type = 'trigger' AND name = 'trg_estoque_aplicar_movimentacao'
            `).get()
        );

        return db.transaction(() => {
            const produto = db.prepare('SELECT estoque FROM produtos WHERE id = ?').get(dados.id_produto);
            const anterior = produto.estoque;
            const posterior = dados.tipo === 'ENTRADA'
                ? anterior + dados.quantidade
                : anterior - dados.quantidade;

            if (posterior < 0) {
                throw new ErroValidacao(
                    `Estoque insuficiente: o produto tem ${anterior} unidade(s).`
                );
            }

            const resultado = db.prepare(`
                INSERT INTO movimentacoes_estoque (
                    id_produto, id_fornecedor, id_usuario_responsavel, tipo, origem,
                    quantidade, custo_unitario, numero_documento,
                    estoque_anterior, estoque_posterior, motivo, observacoes
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                dados.id_produto, dados.id_fornecedor, usuarioId, dados.tipo, dados.origem,
                dados.quantidade, dados.custo_unitario, dados.numero_documento,
                anterior, posterior, dados.motivo, dados.observacoes
            );

            // Se o gatilho do script "Triggers e Views.sql" estiver
            // aplicado no banco, ele mesmo atualiza o estoque.
            if (!temTrigger) {
                db.prepare(`
                    UPDATE produtos
                    SET estoque = ?, data_atualizacao = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(posterior, dados.id_produto);
            }

            return Number(resultado.lastInsertRowid);
        })();
    }

    // ----- imagem -----

    function pastaDe(config) {
        const pasta = path.join(PASTA_IMAGENS, config.imagem.pasta);
        fs.mkdirSync(pasta, { recursive: true });
        return pasta;
    }

    function nomeDaImagem(config, registro, extensao) {
        const base = nomeParaArquivo(registro[config.imagem.nomeBase]);
        const simples = `${base}.${extensao}`;
        const emUso = db.prepare(`
            SELECT 1 FROM ${config.tabela}
            WHERE LOWER(${config.imagem.campo}) = LOWER(?) AND id <> ?
        `).get(simples, registro.id);

        return emUso ? `${base}-${registro.id}.${extensao}` : simples;
    }

    // Registro renomeado: renomeia o arquivo também.
    function renomearImagemSePreciso(config, registro) {
        const atual = registro[config.imagem.campo];

        if (!atual) return;

        const extensao = path.extname(atual).slice(1).toLowerCase() || 'png';
        const novo = nomeDaImagem(config, registro, extensao);

        if (novo.toLowerCase() === atual.toLowerCase()) return;

        const pasta = pastaDe(config);
        const origem = path.join(pasta, path.basename(atual));

        if (fs.existsSync(origem)) {
            fs.renameSync(origem, path.join(pasta, novo));
            db.prepare(`UPDATE ${config.tabela} SET ${config.imagem.campo} = ? WHERE id = ?`)
                .run(novo, registro.id);
        }
    }

    // =====================================================

    app.get('/api/admin/referencias/:nome', ...protegido, (req, res) => {
        try {
            const referencia = REFERENCIAS[req.params.nome];

            if (!referencia) {
                throw new ErroValidacao('Lista não encontrada.', 404);
            }

            return res.json({ sucesso: true, dados: db.prepare(referencia.sql).all() });
        } catch (erro) {
            return responder(res, erro, null, 'Erro ao consultar a lista.');
        }
    });

    app.get('/api/admin/cadastros/:tipo', ...protegido, exigirPermissao(req => req.params.tipo, 'ver'), (req, res) => {
        let config = null;
        try {
            config = configDe(req);
            const dados = db.prepare(`${config.sqlLista} ORDER BY ${config.ordem}`).all();
            return res.json({ sucesso: true, dados: dados.map(item => semOcultos(config, item)) });
        } catch (erro) {
            return responder(res, erro, config, 'Erro ao consultar os cadastros.');
        }
    });

    app.get('/api/admin/cadastros/:tipo/:id', ...protegido, exigirPermissao(req => req.params.tipo, 'ver'), (req, res) => {
        let config = null;
        try {
            config = configDe(req);
            const registro = buscar(config, idDe(req));

            if (!registro) {
                throw new ErroValidacao('Registro não encontrado.', 404);
            }

            if (temCampoPermissoes(config)) {
                registro.permissoes = permissoesDoTipo(registro.id);
            }

            return res.json({ sucesso: true, dados: semOcultos(config, registro) });
        } catch (erro) {
            return responder(res, erro, config, 'Erro ao consultar o cadastro.');
        }
    });

    app.post('/api/admin/cadastros/:tipo', ...protegido, exigirPermissao(req => req.params.tipo, 'criar'), (req, res) => {
        let config = null;
        try {
            config = configDe(req);

            if (config.somenteLeitura || config.semInclusao || config.registroUnico) {
                throw new ErroValidacao('Este cadastro não permite incluir registros.', 405);
            }

            const dados = lerCampos(config, req.body);
            let id;

            if (req.params.tipo === 'movimentacoes-estoque') {
                id = registrarMovimentacao(dados, req.usuario.id);
            } else {
                id = db.transaction(() => {
                    antesDeSalvar(req.params.tipo, config, dados, null, req.usuario.id);

                    const nomes = Object.keys(dados);
                    const resultado = db.prepare(`
                        INSERT INTO ${config.tabela} (${nomes.join(', ')})
                        VALUES (${nomes.map(() => '?').join(', ')})
                    `).run(...nomes.map(nome => dados[nome]));

                    const novoId = Number(resultado.lastInsertRowid);
                    aposSalvar(req.params.tipo, config, novoId, dados, null, req.usuario.id);

                    if (temCampoPermissoes(config)) {
                        sincronizarPermissoes(req, novoId, req.body?.permissoes);
                    }
                    return novoId;
                })();
            }

            return res.status(201).json({
                sucesso: true,
                mensagem: `${config.singular[0].toUpperCase()}${config.singular.slice(1)} cadastrado(a) com sucesso.`,
                dados: semOcultos(config, buscar(config, id))
            });
        } catch (erro) {
            return responder(res, erro, config, 'Erro ao salvar o cadastro.');
        }
    });

    app.put('/api/admin/cadastros/:tipo/:id', ...protegido, exigirPermissao(req => req.params.tipo, 'editar'), (req, res) => {
        let config = null;
        try {
            config = configDe(req);

            if (config.somenteInclusao || config.somenteLeitura) {
                throw new ErroValidacao('Este cadastro não pode ser alterado.', 405);
            }

            const id = idDe(req);
            const atual = buscar(config, id);

            if (!atual) {
                throw new ErroValidacao('Registro não encontrado.', 404);
            }

            conferirAcessoProprio(req, id);

            const dados = lerCampos(config, req.body, { editando: true });
            const temDataAtualizacao = colunasDaTabela(config.tabela).includes('data_atualizacao');

            db.transaction(() => {
                antesDeSalvar(req.params.tipo, config, dados, atual, req.usuario.id);

                const nomes = Object.keys(dados);
                db.prepare(`
                    UPDATE ${config.tabela}
                    SET ${nomes.map(nome => `${nome} = ?`).join(', ')}
                        ${temDataAtualizacao ? ', data_atualizacao = CURRENT_TIMESTAMP' : ''}
                    WHERE id = ?
                `).run(...nomes.map(nome => dados[nome]), id);

                aposSalvar(req.params.tipo, config, id, dados, atual, req.usuario.id);

                if (temCampoPermissoes(config)) {
                    sincronizarPermissoes(req, id, req.body?.permissoes);
                }
            })();

            if (config.imagem) {
                renomearImagemSePreciso(config, buscar(config, id));
            }

            return res.json({
                sucesso: true,
                mensagem: 'Alterações salvas com sucesso.',
                dados: semOcultos(config, buscar(config, id))
            });
        } catch (erro) {
            return responder(res, erro, config, 'Erro ao salvar o cadastro.');
        }
    });

    app.delete('/api/admin/cadastros/:tipo/:id', ...protegido, exigirPermissao(req => req.params.tipo, 'excluir'), (req, res) => {
        let config = null;
        try {
            config = configDe(req);

            if (!config.permiteExcluir) {
                throw new ErroValidacao('Este cadastro não pode ser excluído. Marque como inativo.', 405);
            }

            const id = idDe(req);
            conferirAcessoProprio(req, id);
            const resultado = db.prepare(`DELETE FROM ${config.tabela} WHERE id = ?`).run(id);

            if (resultado.changes === 0) {
                throw new ErroValidacao('Registro não encontrado.', 404);
            }

            return res.json({ sucesso: true, mensagem: 'Registro excluído.' });
        } catch (erro) {
            return responder(res, erro, config, 'Erro ao excluir o cadastro.');
        }
    });

    app.put(
        '/api/admin/cadastros/:tipo/:id/imagem',
        ...protegido,
        podeMexerNaImagem,
        express.raw({ type: 'image/*', limit: TAMANHO_MAXIMO_IMAGEM }),
        (req, res) => {
            let config = null;
            try {
                config = configDe(req);

                if (!config.imagem) {
                    throw new ErroValidacao('Este cadastro não tem imagem.', 404);
                }

                const registro = buscar(config, idDe(req));

                if (!registro) {
                    throw new ErroValidacao('Registro não encontrado.', 404);
                }

                const extensao = extensaoDaImagem(req.body);

                if (!extensao) {
                    throw new ErroValidacao('Envie uma imagem PNG, JPG, WEBP ou GIF.');
                }

                const pasta = pastaDe(config);
                const nome = nomeDaImagem(config, registro, extensao);
                const temporario = path.join(pasta, `.envio-${registro.id}-${Date.now()}.tmp`);

                fs.writeFileSync(temporario, req.body);
                fs.renameSync(temporario, path.join(pasta, nome));

                const antigo = registro[config.imagem.campo];

                if (antigo && antigo.toLowerCase() !== nome.toLowerCase()) {
                    fs.rmSync(path.join(pasta, path.basename(antigo)), { force: true });
                }

                db.prepare(`UPDATE ${config.tabela} SET ${config.imagem.campo} = ? WHERE id = ?`)
                    .run(nome, registro.id);

                return res.json({
                    sucesso: true,
                    mensagem: 'Imagem salva com sucesso.',
                    dados: buscar(config, registro.id)
                });
            } catch (erro) {
                return responder(res, erro, config, 'Erro ao salvar a imagem.');
            }
        }
    );

    app.delete('/api/admin/cadastros/:tipo/:id/imagem', ...protegido, podeMexerNaImagem, (req, res) => {
        let config = null;
        try {
            config = configDe(req);

            if (!config.imagem) {
                throw new ErroValidacao('Este cadastro não tem imagem.', 404);
            }

            const registro = buscar(config, idDe(req));

            if (!registro) {
                throw new ErroValidacao('Registro não encontrado.', 404);
            }

            const atual = registro[config.imagem.campo];

            if (atual) {
                db.prepare(`UPDATE ${config.tabela} SET ${config.imagem.campo} = NULL WHERE id = ?`)
                    .run(registro.id);
                fs.rmSync(path.join(pastaDe(config), path.basename(atual)), { force: true });
            }

            return res.json({
                sucesso: true,
                mensagem: 'Imagem removida.',
                dados: buscar(config, registro.id)
            });
        } catch (erro) {
            return responder(res, erro, config, 'Erro ao remover a imagem.');
        }
    });

    // Imagem maior que o limite.
    app.use('/api/admin/cadastros', (erro, req, res, next) => {
        if (erro?.type === 'entity.too.large') {
            return res.status(413).json({ sucesso: false, mensagem: 'A imagem deve ter no máximo 5 MB.' });
        }

        return next(erro);
    });

}
