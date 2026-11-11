
import 'dotenv/config';

import express from 'express';
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

const JWT_SECRET =
    process.env.JWT_SECRET || 'pataquada-chave-desenvolvimento-altere';

const TEMPO_TOKEN = 7 * 24 * 60 * 60;

// =====================================================
// CONFIGURAÇÕES E CORS
// =====================================================

app.use((req, res, next) => {
    res.header(
        'Access-Control-Allow-Origin',
        'http://localhost:5173'
    );

    res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
    );

    res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================
// CONEXÃO COM O BANCO DE DADOS
// =====================================================

const databasePath = path.join(__dirname, 'database');
const databaseName = process.env.DB_NAME;
const arquivoBanco = path.join(databasePath, databaseName);

const db = new Database(arquivoBanco);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('\n========== BANCO DE DADOS ==========');
console.log('Arquivo utilizado:', arquivoBanco);

const tabelas = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
`).all();

console.log('Tabelas encontradas:', tabelas);
console.log('====================================\n');

if (!process.env.JWT_SECRET) {
    console.warn(
        'AVISO: JWT_SECRET não configurado. Utilize uma chave própria no .env.'
    );
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function responderErro(
    res,
    erro,
    mensagem = 'Erro interno do servidor.'
) {
    console.error(mensagem, erro);

    return res.status(500).json({
        sucesso: false,
        mensagem,
        erro: erro.message
    });
}

function consultarTabela(tabela, statusAtivo = true) {
    const existe = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
        AND name = ?
    `).get(tabela);

    if (!existe) {
        throw new Error(`Tabela ${tabela} não encontrada no banco.`);
    }

    const colunas = db.prepare(`
        PRAGMA table_info("${tabela}")
    `).all();

    const possuiStatus = colunas.some(
        coluna => coluna.name === 'status'
    );

    const possuiNome = colunas.some(
        coluna => coluna.name === 'nome'
    );

    const possuiId = colunas.some(
        coluna => coluna.name === 'id'
    );

    let sql = `SELECT * FROM "${tabela}"`;

    if (statusAtivo && possuiStatus) {
        sql += `
            WHERE UPPER(TRIM(CAST(status AS TEXT)))
            IN ('A', 'ATIVO', '1')
        `;
    }

    if (possuiNome) {
        sql += ' ORDER BY nome';
    } else if (possuiId) {
        sql += ' ORDER BY id';
    }

    return db.prepare(sql).all();
}

// =====================================================
// AUTENTICAÇÃO POR TOKEN
// =====================================================

function gerarToken(usuario) {
    const payload = {
        id: usuario.id,
        email: usuario.email,
        id_tipo_usuario: usuario.id_tipo_usuario,
        exp: Math.floor(Date.now() / 1000) + TEMPO_TOKEN
    };

    const dados = Buffer
        .from(JSON.stringify(payload))
        .toString('base64url');

    const assinatura = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(dados)
        .digest('base64url');

    return `${dados}.${assinatura}`;
}

function verificarToken(token) {
    const partes = token.split('.');

    if (partes.length !== 2) {
        return null;
    }

    const [dados, assinaturaRecebida] = partes;

    const assinaturaEsperada = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(dados)
        .digest('base64url');

    const assinaturaBuffer = Buffer.from(assinaturaRecebida);
    const esperadaBuffer = Buffer.from(assinaturaEsperada);

    if (
        assinaturaBuffer.length !== esperadaBuffer.length ||
        !crypto.timingSafeEqual(
            assinaturaBuffer,
            esperadaBuffer
        )
    ) {
        return null;
    }

    const payload = JSON.parse(
        Buffer.from(dados, 'base64url').toString('utf8')
    );

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
    }

    return payload;
}

function autenticar(req, res, next) {
    const autorizacao = req.headers.authorization;

    if (!autorizacao || !autorizacao.startsWith('Bearer ')) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'É necessário entrar na sua conta.'
        });
    }

    try {
        const token = autorizacao.substring(7);
        const payload = verificarToken(token);

        if (!payload) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Sessão inválida ou expirada.'
            });
        }

        const usuario = db.prepare(`
            SELECT id, nome, email, id_tipo_usuario
            FROM usuarios
            WHERE id = ?
            AND status = 1
        `).get(payload.id);

        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'Usuário não encontrado ou inativo.'
            });
        }

        req.usuario = usuario;

        next();

    } catch (erro) {
        return res.status(401).json({
            sucesso: false,
            mensagem: 'Não foi possível validar sua sessão.'
        });
    }
}

// =====================================================
// FUNÇÕES DO CARRINHO
// =====================================================

function obterOuCriarCarrinho(idUsuario) {
    let carrinho = db.prepare(`
        SELECT id
        FROM carrinho
        WHERE id_usuario_cliente = ?
        AND status = 'ABERTO'
    `).get(idUsuario);

    if (!carrinho) {
        const resultado = db.prepare(`
            INSERT INTO carrinho (
                id_usuario_cliente
            )
            VALUES (?)
        `).run(idUsuario);

        carrinho = {
            id: resultado.lastInsertRowid
        };
    }

    return carrinho.id;
}

function consultarCarrinho(idUsuario) {
    const carrinho = db.prepare(`
        SELECT
            id,
            data_criacao,
            data_atualizacao,
            status
        FROM carrinho
        WHERE id_usuario_cliente = ?
        AND status = 'ABERTO'
    `).get(idUsuario);

    if (!carrinho) {
        return {
            id: null,
            itens: [],
            quantidade_itens: 0,
            total: 0
        };
    }

    const itens = db.prepare(`
        SELECT
            ic.id,
            ic.id_produto,
            ic.quantidade,
            ic.data_adicao,
            p.nome,
            p.descricao,
            p.preco,
            p.estoque,
            p.imagem,
            p.status AS status_produto,
            (p.preco * ic.quantidade) AS subtotal
        FROM itens_carrinho ic
        INNER JOIN produtos p
            ON p.id = ic.id_produto
        WHERE ic.id_carrinho = ?
        ORDER BY ic.data_adicao DESC
    `).all(carrinho.id);

    const quantidadeItens = itens.reduce(
        (total, item) => total + item.quantidade,
        0
    );

    const total = itens.reduce(
        (soma, item) => soma + item.subtotal,
        0
    );

    return {
        ...carrinho,
        itens,
        quantidade_itens: quantidadeItens,
        total
    };
}

function adicionarItemCarrinho(
    idCarrinho,
    idProduto,
    quantidade
) {
    const produto = db.prepare(`
        SELECT id, preco, estoque, status
        FROM produtos
        WHERE id = ?
        AND status = 1
    `).get(idProduto);

    if (!produto) {
        throw new Error('Produto não encontrado ou indisponível.');
    }

    const itemExistente = db.prepare(`
        SELECT quantidade
        FROM itens_carrinho
        WHERE id_carrinho = ?
        AND id_produto = ?
    `).get(idCarrinho, idProduto);

    const quantidadeFinal =
        (itemExistente?.quantidade || 0) + quantidade;

    if (quantidadeFinal > produto.estoque) {
        throw new Error(
            `Estoque insuficiente. Disponível: ${produto.estoque}.`
        );
    }

    db.prepare(`
        INSERT INTO itens_carrinho (
            id_carrinho,
            id_produto,
            quantidade
        )
        VALUES (?, ?, ?)
        ON CONFLICT(id_carrinho, id_produto)
        DO UPDATE SET
            quantidade = excluded.quantidade
    `).run(
        idCarrinho,
        idProduto,
        quantidadeFinal
    );

    db.prepare(`
        UPDATE carrinho
        SET data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(idCarrinho);
}

// =====================================================
// ROTA DE TESTE DO SERVIDOR
// =====================================================

app.get('/', (req, res) => {
    return res.json({
        sucesso: true,
        mensagem: 'API PataQuada funcionando!',
        banco: arquivoBanco,
        tabelas: tabelas.map(t => t.name)
    });
});

// =====================================================
// VERIFICAR CONEXÃO COM O BANCO
// =====================================================

app.get('/api/status', (req, res) => {
    try {
        const resultado = db.prepare(`
            SELECT 1 AS conectado
        `).get();

        return res.json({
            sucesso: true,
            conectado: resultado.conectado === 1,
            banco: arquivoBanco
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao verificar conexão com o banco.'
        );
    }
});

// =====================================================
// USUÁRIOS
// Tabela: usuarios
// =====================================================

// CADASTRO

app.post('/api/usuarios/cadastro', async (req, res) => {
    try {
        const {
            nome,
            email,
            senha,
            id_tipo_usuario,
            cpf,
            usuario,
            telefone
        } = req.body;

        if (!nome || !email || !senha || !id_tipo_usuario) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nome, e-mail, senha e tipo de usuário são obrigatórios.'
            });
        }

        const tipoUsuario = db.prepare(`
            SELECT id
            FROM tipo_usuario
            WHERE id = ?
        `).get(id_tipo_usuario);

        if (!tipoUsuario) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Tipo de usuário inválido.'
            });
        }

        const usuarioExistente = db.prepare(`
            SELECT id
            FROM usuarios
            WHERE email = ?
        `).get(email);

        if (usuarioExistente) {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este e-mail já está cadastrado.'
            });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        const resultado = db.prepare(`
            INSERT INTO usuarios (
                nome,
                cpf,
                email,
                id_tipo_usuario,
                usuario,
                senha,
                telefone
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            nome,
            cpf || null,
            email,
            id_tipo_usuario,
            usuario || null,
            senhaCriptografada,
            telefone || null
        );

        const novoUsuario = {
            id: resultado.lastInsertRowid,
            nome,
            email,
            id_tipo_usuario
        };

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Usuário cadastrado com sucesso.',
            token: gerarToken(novoUsuario),
            usuario: novoUsuario
        });

    } catch (erro) {
        if (erro.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({
                sucesso: false,
                mensagem: 'E-mail, CPF ou nome de usuário já cadastrado.'
            });
        }

        return responderErro(
            res,
            erro,
            'Erro ao cadastrar usuário.'
        );
    }
});

// LOGIN

app.post('/api/usuarios/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe o e-mail e a senha.'
            });
        }

        const usuario = db.prepare(`
            SELECT
                id,
                nome,
                email,
                senha,
                id_tipo_usuario
            FROM usuarios
            WHERE email = ?
            AND status = 1
        `).get(email);

        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'E-mail ou senha inválidos.'
            });
        }

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaValida) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'E-mail ou senha inválidos.'
            });
        }

        const dadosUsuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            id_tipo_usuario: usuario.id_tipo_usuario
        };

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Login realizado com sucesso.',
            token: gerarToken(dadosUsuario),
            usuario: dadosUsuario
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao realizar login.'
        );
    }
});

// CONSULTAR USUÁRIOS

app.get('/api/usuarios', autenticar, (req, res) => {
    try {
        const usuarios = db.prepare(`
            SELECT
                id,
                nome,
                cpf,
                email,
                id_tipo_usuario,
                usuario,
                telefone,
                data_cadastro,
                data_atualizacao,
                status
            FROM usuarios
            ORDER BY nome
        `).all();

        return res.json({
            sucesso: true,
            dados: usuarios
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar usuários.'
        );
    }
});

// =====================================================
// CARRINHO
// Tabelas: carrinho e itens_carrinho
// Todas as rotas exigem autenticação.
// O carrinho de visitantes fica no localStorage.
// =====================================================

// CONSULTAR CARRINHO

app.get('/api/carrinho', autenticar, (req, res) => {
    try {
        const carrinho = consultarCarrinho(req.usuario.id);

        return res.json({
            sucesso: true,
            dados: carrinho
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar carrinho.'
        );
    }
});

// ADICIONAR ITEM

app.post('/api/carrinho/itens', autenticar, (req, res) => {
    try {
        const { id_produto, quantidade = 1 } = req.body;

        if (
            !Number.isInteger(Number(id_produto)) ||
            Number(id_produto) <= 0 ||
            !Number.isInteger(Number(quantidade)) ||
            Number(quantidade) <= 0
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um produto e uma quantidade válidos.'
            });
        }

        const idCarrinho = obterOuCriarCarrinho(req.usuario.id);

        adicionarItemCarrinho(
            idCarrinho,
            Number(id_produto),
            Number(quantidade)
        );

        return res.json({
            sucesso: true,
            mensagem: 'Produto adicionado ao carrinho.',
            dados: consultarCarrinho(req.usuario.id)
        });

    } catch (erro) {
        if (
            erro.message.includes('Produto não encontrado') ||
            erro.message.includes('Estoque insuficiente')
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: erro.message
            });
        }

        return responderErro(
            res,
            erro,
            'Erro ao adicionar produto ao carrinho.'
        );
    }
});

// ATUALIZAR QUANTIDADE

app.put('/api/carrinho/itens/:idProduto', autenticar, (req, res) => {
    try {
        const idProduto = Number(req.params.idProduto);
        const quantidade = Number(req.body.quantidade);

        if (
            !Number.isInteger(idProduto) ||
            idProduto <= 0 ||
            !Number.isInteger(quantidade) ||
            quantidade <= 0
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe uma quantidade válida.'
            });
        }

        const carrinho = db.prepare(`
            SELECT id
            FROM carrinho
            WHERE id_usuario_cliente = ?
            AND status = 'ABERTO'
        `).get(req.usuario.id);

        if (!carrinho) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Carrinho não encontrado.'
            });
        }

        const produto = db.prepare(`
            SELECT estoque
            FROM produtos
            WHERE id = ?
            AND status = 1
        `).get(idProduto);

        if (!produto) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Produto não encontrado ou indisponível.'
            });
        }

        if (quantidade > produto.estoque) {
            return res.status(400).json({
                sucesso: false,
                mensagem: `Estoque insuficiente. Disponível: ${produto.estoque}.`
            });
        }

        const resultado = db.prepare(`
            UPDATE itens_carrinho
            SET quantidade = ?
            WHERE id_carrinho = ?
            AND id_produto = ?
        `).run(quantidade, carrinho.id, idProduto);

        if (resultado.changes === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Item não encontrado no carrinho.'
            });
        }

        db.prepare(`
            UPDATE carrinho
            SET data_atualizacao = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(carrinho.id);

        return res.json({
            sucesso: true,
            mensagem: 'Quantidade atualizada.',
            dados: consultarCarrinho(req.usuario.id)
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao atualizar quantidade.'
        );
    }
});

// REMOVER ITEM

app.delete('/api/carrinho/itens/:idProduto', autenticar, (req, res) => {
    try {
        const idProduto = Number(req.params.idProduto);

        const carrinho = db.prepare(`
            SELECT id
            FROM carrinho
            WHERE id_usuario_cliente = ?
            AND status = 'ABERTO'
        `).get(req.usuario.id);

        if (!carrinho) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Carrinho não encontrado.'
            });
        }

        const resultado = db.prepare(`
            DELETE FROM itens_carrinho
            WHERE id_carrinho = ?
            AND id_produto = ?
        `).run(carrinho.id, idProduto);

        if (resultado.changes === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: 'Item não encontrado no carrinho.'
            });
        }

        db.prepare(`
            UPDATE carrinho
            SET data_atualizacao = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(carrinho.id);

        return res.json({
            sucesso: true,
            mensagem: 'Produto removido do carrinho.',
            dados: consultarCarrinho(req.usuario.id)
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao remover produto do carrinho.'
        );
    }
});

// ESVAZIAR CARRINHO

app.delete('/api/carrinho', autenticar, (req, res) => {
    try {
        const carrinho = db.prepare(`
            SELECT id
            FROM carrinho
            WHERE id_usuario_cliente = ?
            AND status = 'ABERTO'
        `).get(req.usuario.id);

        if (carrinho) {
            db.prepare(`
                DELETE FROM itens_carrinho
                WHERE id_carrinho = ?
            `).run(carrinho.id);

            db.prepare(`
                UPDATE carrinho
                SET data_atualizacao = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(carrinho.id);
        }

        return res.json({
            sucesso: true,
            mensagem: 'Carrinho esvaziado.',
            dados: consultarCarrinho(req.usuario.id)
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao esvaziar carrinho.'
        );
    }
});

// SINCRONIZAR CARRINHO LOCAL COM A CONTA

app.post('/api/carrinho/sincronizar', autenticar, (req, res) => {
    try {
        const { itens } = req.body;

        if (!Array.isArray(itens)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A lista de itens do carrinho é inválida.'
            });
        }

        const sincronizar = db.transaction(() => {
            const idCarrinho = obterOuCriarCarrinho(req.usuario.id);

            for (const item of itens) {
                const idProduto = Number(item.id_produto);
                const quantidade = Number(item.quantidade);

                if (
                    !Number.isInteger(idProduto) ||
                    idProduto <= 0 ||
                    !Number.isInteger(quantidade) ||
                    quantidade <= 0
                ) {
                    throw new Error('Um ou mais itens possuem dados inválidos.');
                }

                adicionarItemCarrinho(
                    idCarrinho,
                    idProduto,
                    quantidade
                );
            }
        });

        sincronizar();

        return res.json({
            sucesso: true,
            mensagem: 'Carrinho sincronizado com sucesso.',
            dados: consultarCarrinho(req.usuario.id)
        });

    } catch (erro) {
        if (
            erro.message.includes('Produto não encontrado') ||
            erro.message.includes('Estoque insuficiente') ||
            erro.message.includes('dados inválidos')
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: erro.message
            });
        }

        return responderErro(
            res,
            erro,
            'Erro ao sincronizar carrinho.'
        );
    }
});

// =====================================================
// SERVIÇOS / PET CARE
// Tabela: servicos
// =====================================================

function listarServicos(req, res) {
    try {
        const dados = consultarTabela('servicos');

        return res.json({
            sucesso: true,
            dados
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar serviços de Pet Care.'
        );
    }
}

app.get('/api/pet-care', listarServicos);
app.get('/api/servicos', listarServicos);

// =====================================================
// CONSULTAS
// Tabela: tipos_consulta
// =====================================================

app.get('/api/consultas', (req, res) => {
    try {
        const consultas = consultarTabela('tipos_consulta');

        return res.json({
            sucesso: true,
            dados: consultas
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar tipos de consulta.'
        );
    }
});

// =====================================================
// PLANOS
// Tabela: plano
// =====================================================

app.get('/api/planos', (req, res) => {
    try {
        const planos = consultarTabela('plano');

        return res.json({
            sucesso: true,
            dados: planos
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar planos.'
        );
    }
});

// =====================================================
// PRODUTOS
// Tabela: produtos
// =====================================================

// CONSULTAR TODOS OS PRODUTOS

app.get('/api/produtos', (req, res) => {
    try {
        const produtos = consultarTabela('produtos');

        return res.json({
            sucesso: true,
            dados: produtos
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar produtos.'
        );
    }
});

// CONSULTAR PRODUTOS ALEATÓRIOS PARA A PÁGINA INICIAL

app.get('/api/produtos/aleatorios', (req, res) => {
    try {
        const quantidadeDisponivel = db.prepare(`
            SELECT COUNT(*) AS total
            FROM produtos
            WHERE status = 1
            AND estoque > 0
        `).get();

        const total = quantidadeDisponivel.total;

        if (total === 0) {
            return res.json({
                sucesso: true,
                dados: []
            });
        }

        // Sorteia uma quantidade entre 5 e 10.
        // Se houver menos produtos, utiliza todos os disponíveis.
        const quantidadeAleatoria = Math.floor(
            Math.random() * 6
        ) + 5;

        const limite = Math.min(
            quantidadeAleatoria,
            total
        );

        const produtos = db.prepare(`
            SELECT
                id,
                nome,
                descricao,
                preco,
                estoque,
                imagem,
                status
            FROM produtos
            WHERE status = 1
            AND estoque > 0
            ORDER BY RANDOM()
            LIMIT ?
        `).all(limite);

        return res.json({
            sucesso: true,
            total: produtos.length,
            dados: produtos
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar produtos aleatórios.'
        );
    }
});


// =====================================================
// CATEGORIAS DE PRODUTOS
// Tabela: categorias_produto
// =====================================================

app.get('/api/categorias-produto', (req, res) => {
    try {
        const categorias = consultarTabela(
            'categorias_produto',
            false
        );

        return res.json({
            sucesso: true,
            dados: categorias
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar categorias.'
        );
    }
});

// =====================================================
// PROFISSIONAIS
// Tabela: profissionais
// =====================================================

app.get('/api/profissionais', (req, res) => {
    try {
        const profissionais = consultarTabela('profissionais');

        return res.json({
            sucesso: true,
            dados: profissionais
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar profissionais.'
        );
    }
});

// =====================================================
// TIPOS DE USUÁRIO
// Tabela: tipo_usuario
// =====================================================

app.get('/api/tipos-usuario', (req, res) => {
    try {
        const tipos = consultarTabela('tipo_usuario', false);

        return res.json({
            sucesso: true,
            dados: tipos
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar tipos de usuário.'
        );
    }
});

// =====================================================
// SITUAÇÕES
// Tabela: situacao
// =====================================================

app.get('/api/situacoes', (req, res) => {
    try {
        const situacoes = consultarTabela('situacao', false);

        return res.json({
            sucesso: true,
            dados: situacoes
        });

    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao consultar situações.'
        );
    }
});

// =====================================================
// TRATAMENTO DE ROTAS NÃO ENCONTRADAS
// =====================================================

app.use((req, res) => {
    return res.status(404).json({
        sucesso: false,
        mensagem: 'Rota não encontrada.',
        rota: req.originalUrl
    });
});

// =====================================================
// TRATAMENTO DE ERROS
// =====================================================

app.use((erro, res) => {
    console.error('Erro não tratado:', erro);

    return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor.'
    });
});

// =====================================================
// INICIALIZAÇÃO DO SERVIDOR
// =====================================================

const servidor = app.listen(PORT, () => {
    console.log(`Servidor PataQuada iniciado na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    console.log(`Banco utilizado: ${arquivoBanco}`);
});

// =====================================================
// DEBUG - CONSULTAR DADOS DAS TABELAS DA PÁGINA SERVIÇOS
// =====================================================

app.get('/api/debug/dados-servicos', (req, res) => {
    const tabelas = [
        'servicos',
        'tipos_consulta',
        'plano'
    ];

    const resultado = {};

    try {
        for (const tabela of tabelas) {
            try {
                const colunas = db.prepare(`
                    PRAGMA table_info("${tabela}")
                `).all();

                const dados = db.prepare(`
                    SELECT *
                    FROM "${tabela}"
                `).all();

                resultado[tabela] = {
                    total: dados.length,
                    colunas: colunas.map(coluna => coluna.name),
                    dados: dados
                };

            } catch (erro) {
                resultado[tabela] = {
                    erro: erro.message
                };
            }
        }

        return res.json(resultado);

    } catch (erro) {
        console.error('Erro ao consultar tabelas:', erro);

        return res.status(500).json({
            erro: erro.message
        });
    }
});

// =====================================================
// ENCERRAMENTO SEGURO
// =====================================================

function encerrarServidor() {
    console.log('Encerrando servidor...');

    servidor.close(() => {
        db.close();

        console.log('Conexão com o banco de dados encerrada.');

        process.exit(0);
    });
}

process.on('SIGINT', encerrarServidor);
process.on('SIGTERM', encerrarServidor);
