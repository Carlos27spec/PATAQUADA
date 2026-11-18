// =====================================================
// ÁREA ADMINISTRATIVA — PRODUTOS
//
// Rotas (todas exigem login de administrador):
//   GET    /api/admin/produtos              -> lista
//   GET    /api/admin/produtos/:id          -> um produto
//   POST   /api/admin/produtos              -> cadastra
//   PUT    /api/admin/produtos/:id          -> edita
//   PUT    /api/admin/produtos/:id/imagem   -> envia a imagem (corpo = arquivo)
//   DELETE /api/admin/produtos/:id/imagem   -> remove a imagem
//   GET    /api/admin/categorias-produto    -> categorias para o formulário
//
// Tabelas: produtos + produto_detalhes (1 para 1).
//
// IMAGEM
//   O arquivo é salvo em src/images/produtos/ com o nome do produto
//   (ex.: "Ração Premium 10kg" -> "racao-premium-10kg.png") e o banco
//   guarda só o nome com a extensão. Se o produto mudar de nome, o
//   arquivo é renomeado junto.
// =====================================================

import express from 'express';
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { criarExigirAdmin, exigirPermissao } from './adminInicio.js';
import { pode } from './permissoesAdmin.js';

const PASTA_IMAGENS = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../images/produtos'
);

const TAMANHO_MAXIMO_IMAGEM = 5 * 1024 * 1024;

const UNIDADES = ['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PCT', 'PAR', 'KIT'];

class ErroValidacao extends Error {
    constructor(mensagem, status = 400) {
        super(mensagem);
        this.status = status;
    }
}

// =====================================================
// AUXILIARES
// =====================================================

function texto(valor, maximo) {
    return String(valor ?? '').trim().slice(0, maximo);
}

function textoOuNulo(valor, maximo) {
    const resultado = texto(valor, maximo);
    return resultado === '' ? null : resultado;
}

function inteiro(valor, { nome, minimo = 0, padrao = null } = {}) {
    if (valor === null || valor === undefined || valor === '') {
        if (padrao !== null) {
            return padrao;
        }

        throw new ErroValidacao(`Informe ${nome}.`);
    }

    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero < minimo) {
        throw new ErroValidacao(`${nome[0].toUpperCase()}${nome.slice(1)} inválido.`);
    }

    return numero;
}

// "Ração Premium p/ Cães 10kg" -> "racao-premium-p-caes-10kg"
export function nomeParaArquivo(nome) {
    const base = String(nome)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80)
        .replace(/-+$/g, '');

    return base || 'produto';
}

// Descobre o tipo pelo conteúdo do arquivo (não confia no nome).
function extensaoDaImagem(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
        return null;
    }

    if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') {
        return 'png';
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'jpg';
    }

    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return 'webp';
    }

    if (buffer.toString('ascii', 0, 4) === 'GIF8') {
        return 'gif';
    }

    return null;
}

function caminhoDaImagem(nomeArquivo) {
    // basename impede sair da pasta (ex.: "../../server.js").
    return path.join(PASTA_IMAGENS, path.basename(nomeArquivo));
}

function apagarArquivo(nomeArquivo) {
    if (!nomeArquivo) {
        return;
    }

    try {
        fs.unlinkSync(caminhoDaImagem(nomeArquivo));
    } catch (erro) {
        if (erro.code !== 'ENOENT') {
            console.warn('Não foi possível apagar a imagem', nomeArquivo, erro.message);
        }
    }
}

// =====================================================
// ROTAS
// =====================================================

export function registrarAdminProdutos({ app, db, autenticar }) {
    const exigirAdmin = criarExigirAdmin(db);
    const protegido = [autenticar, exigirAdmin];

    // Imagem: vale para quem pode cadastrar (logo após criar) ou editar.
    const podeMexerNaImagem = (req, res, next) =>
        pode(req.permissoes, 'produtos', 'editar') || pode(req.permissoes, 'produtos', 'criar')
            ? next()
            : res.status(403).json({ sucesso: false, mensagem: 'Você não tem permissão para esta ação. Fale com um administrador.' });

    fs.mkdirSync(PASTA_IMAGENS, { recursive: true });

    // Nome final do arquivo para um produto. Se outro produto já usa
    // esse nome, acrescenta o id (ex.: "racao-premium-12.png").
    function nomeDaImagemDoProduto(produto, extensao) {
        const base = nomeParaArquivo(produto.nome);
        const simples = `${base}.${extensao}`;

        const emUso = db.prepare(`
            SELECT 1
            FROM produtos
            WHERE LOWER(imagem) = LOWER(?)
            AND id <> ?
        `).get(simples, produto.id);

        return emUso ? `${base}-${produto.id}.${extensao}` : simples;
    }

    function imagemUsadaPorOutro(nomeArquivo, idProduto) {
        return Boolean(
            db.prepare(`
                SELECT 1
                FROM produtos
                WHERE LOWER(imagem) = LOWER(?)
                AND id <> ?
            `).get(nomeArquivo, idProduto)
        );
    }

    function buscarProduto(id) {
        return db.prepare(`
            SELECT
                p.id,
                p.id_categoria_produto,
                c.nome AS categoria_nome,
                p.nome,
                p.descricao,
                p.preco,
                p.estoque,
                p.imagem,
                p.status,
                p.data_cadastro,
                p.data_atualizacao,
                d.sku,
                d.codigo_barras,
                d.peso,
                COALESCE(d.unidade_medida, 'UN') AS unidade_medida,
                COALESCE(d.estoque_minimo, 0) AS estoque_minimo,
                COALESCE(d.custo_aquisicao, 0) AS custo_aquisicao
            FROM produtos p
            LEFT JOIN categorias_produto c ON c.id = p.id_categoria_produto
            LEFT JOIN produto_detalhes d ON d.id_produto = p.id
            WHERE p.id = ?
        `).get(id) ?? null;
    }

    function validar(corpo = {}) {
        const nome = texto(corpo.nome, 150);

        if (nome.length < 3) {
            throw new ErroValidacao('Informe o nome do produto (mínimo 3 letras).');
        }

        const idCategoria = inteiro(corpo.id_categoria_produto, { nome: 'a categoria', minimo: 1 });

        const categoria = db.prepare(`
            SELECT id FROM categorias_produto WHERE id = ?
        `).get(idCategoria);

        if (!categoria) {
            throw new ErroValidacao('Categoria não encontrada.');
        }

        const peso =
            corpo.peso === null || corpo.peso === undefined || corpo.peso === ''
                ? null
                : Number(corpo.peso);

        if (peso !== null && (!Number.isFinite(peso) || peso <= 0)) {
            throw new ErroValidacao('O peso deve ser maior que zero (em kg).');
        }

        const unidade = texto(corpo.unidade_medida, 10).toUpperCase() || 'UN';

        if (!UNIDADES.includes(unidade)) {
            throw new ErroValidacao('Unidade de medida inválida.');
        }

        return {
            produto: {
                nome,
                id_categoria_produto: idCategoria,
                descricao: textoOuNulo(corpo.descricao, 2000),
                preco: inteiro(corpo.preco, { nome: 'o preço' }),
                estoque: inteiro(corpo.estoque, { nome: 'o estoque', padrao: 0 }),
                status: Number(corpo.status) === 0 ? 0 : 1
            },
            detalhes: {
                sku: textoOuNulo(corpo.sku, 60),
                codigo_barras: textoOuNulo(corpo.codigo_barras, 60),
                peso,
                unidade_medida: unidade,
                estoque_minimo: inteiro(corpo.estoque_minimo, { nome: 'o estoque mínimo', padrao: 0 }),
                custo_aquisicao: inteiro(corpo.custo_aquisicao, { nome: 'o custo', padrao: 0 })
            }
        };
    }

    function salvarDetalhes(idProduto, detalhes) {
        db.prepare(`
            INSERT INTO produto_detalhes (
                id_produto, sku, codigo_barras, peso,
                unidade_medida, estoque_minimo, custo_aquisicao
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id_produto) DO UPDATE SET
                sku = excluded.sku,
                codigo_barras = excluded.codigo_barras,
                peso = excluded.peso,
                unidade_medida = excluded.unidade_medida,
                estoque_minimo = excluded.estoque_minimo,
                custo_aquisicao = excluded.custo_aquisicao,
                data_atualizacao = CURRENT_TIMESTAMP
        `).run(
            idProduto,
            detalhes.sku,
            detalhes.codigo_barras,
            detalhes.peso,
            detalhes.unidade_medida,
            detalhes.estoque_minimo,
            detalhes.custo_aquisicao
        );
    }

    // Troca o nome do arquivo no disco, em produtos e nos pedidos antigos.
    function trocarNomeDaImagem(idProduto, nomeAntigo, nomeNovo) {
        db.prepare(`
            UPDATE produtos SET imagem = ? WHERE id = ?
        `).run(nomeNovo, idProduto);

        // Pedidos guardam o nome da imagem no momento da compra.
        db.prepare(`
            UPDATE itens_pedido SET imagem = ?
            WHERE id_produto = ? AND imagem = ?
        `).run(nomeNovo, idProduto, nomeAntigo);
    }

    function responder(res, erro, mensagemPadrao) {
        if (erro instanceof ErroValidacao) {
            return res.status(erro.status).json({ sucesso: false, mensagem: erro.message });
        }

        const mensagem = String(erro?.message ?? '');

        if (/UNIQUE constraint failed: produto_detalhes\.sku/.test(mensagem)) {
            return res.status(409).json({ sucesso: false, mensagem: 'Já existe um produto com esse SKU.' });
        }

        if (/UNIQUE constraint failed: produto_detalhes\.codigo_barras/.test(mensagem)) {
            return res.status(409).json({ sucesso: false, mensagem: 'Já existe um produto com esse código de barras.' });
        }

        console.error(mensagemPadrao, erro);

        return res.status(500).json({ sucesso: false, mensagem: mensagemPadrao });
    }

    function idDaRota(req) {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroValidacao('Produto não encontrado.', 404);
        }

        return id;
    }

    // ----- CATEGORIAS (para o formulário) -----

    app.get('/api/admin/categorias-produto', ...protegido, (req, res) => {
        try {
            const dados = db.prepare(`
                SELECT id, nome, status
                FROM categorias_produto
                ORDER BY nome
            `).all();

            return res.json({ sucesso: true, dados });
        } catch (erro) {
            return responder(res, erro, 'Erro ao consultar as categorias.');
        }
    });

    // ----- LISTAR -----

    app.get('/api/admin/produtos', ...protegido, exigirPermissao('produtos', 'ver'), (req, res) => {
        try {
            const dados = db.prepare(`
                SELECT
                    p.id,
                    p.id_categoria_produto,
                    c.nome AS categoria_nome,
                    p.nome,
                    p.preco,
                    p.estoque,
                    p.imagem,
                    p.status,
                    d.sku,
                    COALESCE(d.estoque_minimo, 0) AS estoque_minimo
                FROM produtos p
                LEFT JOIN categorias_produto c ON c.id = p.id_categoria_produto
                LEFT JOIN produto_detalhes d ON d.id_produto = p.id
                ORDER BY p.nome
            `).all();

            return res.json({ sucesso: true, dados });
        } catch (erro) {
            return responder(res, erro, 'Erro ao consultar os produtos.');
        }
    });

    // ----- VER UM -----

    app.get('/api/admin/produtos/:id', ...protegido, exigirPermissao('produtos', 'ver'), (req, res) => {
        try {
            const produto = buscarProduto(idDaRota(req));

            if (!produto) {
                throw new ErroValidacao('Produto não encontrado.', 404);
            }

            return res.json({ sucesso: true, dados: produto });
        } catch (erro) {
            return responder(res, erro, 'Erro ao consultar o produto.');
        }
    });

    // ----- CADASTRAR -----

    app.post('/api/admin/produtos', ...protegido, exigirPermissao('produtos', 'criar'), (req, res) => {
        try {
            const { produto, detalhes } = validar(req.body);

            const cadastrar = db.transaction(() => {
                const resultado = db.prepare(`
                    INSERT INTO produtos (
                        id_categoria_produto, nome, descricao, preco,
                        estoque, status, id_usuario_cadastro
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    produto.id_categoria_produto,
                    produto.nome,
                    produto.descricao,
                    produto.preco,
                    produto.estoque,
                    produto.status,
                    req.usuario.id
                );

                const id = Number(resultado.lastInsertRowid);

                salvarDetalhes(id, detalhes);

                return id;
            });

            const id = cadastrar();

            return res.status(201).json({
                sucesso: true,
                mensagem: 'Produto cadastrado com sucesso.',
                dados: buscarProduto(id)
            });
        } catch (erro) {
            return responder(res, erro, 'Erro ao cadastrar o produto.');
        }
    });

    // ----- EDITAR -----

    app.put('/api/admin/produtos/:id', ...protegido, exigirPermissao('produtos', 'editar'), (req, res) => {
        try {
            const id = idDaRota(req);
            const atual = buscarProduto(id);

            if (!atual) {
                throw new ErroValidacao('Produto não encontrado.', 404);
            }

            const { produto, detalhes } = validar(req.body);

            db.transaction(() => {
                db.prepare(`
                    UPDATE produtos
                    SET id_categoria_produto = ?,
                        nome = ?,
                        descricao = ?,
                        preco = ?,
                        estoque = ?,
                        status = ?,
                        data_atualizacao = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(
                    produto.id_categoria_produto,
                    produto.nome,
                    produto.descricao,
                    produto.preco,
                    produto.estoque,
                    produto.status,
                    id
                );

                salvarDetalhes(id, detalhes);
            })();

            // Nome mudou: renomeia o arquivo da imagem também.
            if (atual.imagem) {
                const extensao = path.extname(atual.imagem).slice(1).toLowerCase() || 'png';
                const novoNome = nomeDaImagemDoProduto({ id, nome: produto.nome }, extensao);

                if (novoNome.toLowerCase() !== atual.imagem.toLowerCase()) {
                    const origem = caminhoDaImagem(atual.imagem);

                    if (fs.existsSync(origem)) {
                        fs.renameSync(origem, caminhoDaImagem(novoNome));
                        db.transaction(() => trocarNomeDaImagem(id, atual.imagem, novoNome))();
                    }
                }
            }

            return res.json({
                sucesso: true,
                mensagem: 'Produto atualizado com sucesso.',
                dados: buscarProduto(id)
            });
        } catch (erro) {
            return responder(res, erro, 'Erro ao atualizar o produto.');
        }
    });

    // ----- ENVIAR IMAGEM -----
    // Corpo da requisição = o próprio arquivo (Content-Type: image/...).

    app.put(
        '/api/admin/produtos/:id/imagem',
        ...protegido,
        podeMexerNaImagem,
        express.raw({ type: 'image/*', limit: TAMANHO_MAXIMO_IMAGEM }),
        (req, res) => {
            try {
                const id = idDaRota(req);
                const atual = buscarProduto(id);

                if (!atual) {
                    throw new ErroValidacao('Produto não encontrado.', 404);
                }

                const extensao = extensaoDaImagem(req.body);

                if (!extensao) {
                    throw new ErroValidacao('Envie uma imagem PNG, JPG, WEBP ou GIF.');
                }

                const nomeArquivo = nomeDaImagemDoProduto(atual, extensao);

                // Grava num arquivo temporário e só depois troca (não deixa
                // imagem pela metade se algo falhar).
                const temporario = caminhoDaImagem(`.envio-${id}-${Date.now()}.tmp`);
                fs.writeFileSync(temporario, req.body);
                fs.renameSync(temporario, caminhoDaImagem(nomeArquivo));

                // Imagem antiga com outro nome/extensão: apaga.
                if (
                    atual.imagem &&
                    atual.imagem.toLowerCase() !== nomeArquivo.toLowerCase() &&
                    !imagemUsadaPorOutro(atual.imagem, id)
                ) {
                    apagarArquivo(atual.imagem);
                }

                db.transaction(() => {
                    if (atual.imagem) {
                        trocarNomeDaImagem(id, atual.imagem, nomeArquivo);
                    } else {
                        db.prepare(`
                            UPDATE produtos SET imagem = ? WHERE id = ?
                        `).run(nomeArquivo, id);
                    }
                })();

                return res.json({
                    sucesso: true,
                    mensagem: 'Imagem salva com sucesso.',
                    dados: buscarProduto(id)
                });
            } catch (erro) {
                return responder(res, erro, 'Erro ao salvar a imagem.');
            }
        }
    );

    // ----- REMOVER IMAGEM -----

    app.delete('/api/admin/produtos/:id/imagem', ...protegido, podeMexerNaImagem, (req, res) => {
        try {
            const id = idDaRota(req);
            const atual = buscarProduto(id);

            if (!atual) {
                throw new ErroValidacao('Produto não encontrado.', 404);
            }

            if (atual.imagem) {
                db.prepare(`UPDATE produtos SET imagem = NULL WHERE id = ?`).run(id);

                // Pedidos antigos ainda podem mostrar a imagem: só apaga o
                // arquivo se nenhum pedido usar.
                const usadoEmPedido = db.prepare(`
                    SELECT 1 FROM itens_pedido WHERE imagem = ? LIMIT 1
                `).get(atual.imagem);

                if (!usadoEmPedido && !imagemUsadaPorOutro(atual.imagem, id)) {
                    apagarArquivo(atual.imagem);
                }
            }

            return res.json({
                sucesso: true,
                mensagem: 'Imagem removida.',
                dados: buscarProduto(id)
            });
        } catch (erro) {
            return responder(res, erro, 'Erro ao remover a imagem.');
        }
    });

    // Imagem maior que o limite (express.raw).
    app.use('/api/admin/produtos', (erro, req, res, next) => {
        if (erro?.type === 'entity.too.large') {
            return res.status(413).json({
                sucesso: false,
                mensagem: 'A imagem deve ter no máximo 5 MB.'
            });
        }

        return next(erro);
    });

    console.log('Área administrativa: produtos disponíveis em /api/admin/produtos');
}
