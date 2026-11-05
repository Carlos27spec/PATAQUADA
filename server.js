
import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// =====================================================
// CONFIGURAÇÕES
// =====================================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================================
// CONEXÃO COM O BANCO DE DADOS
// =====================================================

const databasePath = path.join(__dirname, 'database');

if (!fs.existsSync(databasePath)) {
    fs.mkdirSync(databasePath, { recursive: true });
}

const databaseName = process.env.DB_NAME || 'pataquada';
const db = new Database(
    path.join(databasePath, `${databaseName}.db`)
);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function responderErro(res, erro, mensagem = 'Erro interno do servidor.') {
    console.error(mensagem, erro);

    return res.status(500).json({
        sucesso: false,
        mensagem
    });
}

// =====================================================
// TABELA DE USUÁRIOS
// =====================================================

// Mantém a criação da tabela de usuários conforme a estrutura
// já utilizada no seu projeto.
db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha TEXT NOT NULL,
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// =====================================================
// CADASTRO DE USUÁRIO
// =====================================================

app.post('/api/usuarios/cadastro', async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Preencha todos os campos.'
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
                email,
                senha
            )
            VALUES (?, ?, ?)
        `).run(nome, email, senhaCriptografada);

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Usuário cadastrado com sucesso.',
            id: resultado.lastInsertRowid
        });

    } catch (erro) {
        return responderErro(res, erro, 'Erro ao cadastrar usuário.');
    }
});

// =====================================================
// LOGIN DE USUÁRIO
// =====================================================

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
            SELECT *
            FROM usuarios
            WHERE email = ?
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

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Login realizado com sucesso.',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (erro) {
        return responderErro(res, erro, 'Erro ao realizar login.');
    }
});

// =====================================================
// CONSULTAR USUÁRIOS
// =====================================================

app.get('/api/usuarios', (req, res) => {
    try {
        const usuarios = db.prepare(`
            SELECT
                id,
                nome,
                email,
                data_cadastro
            FROM usuarios
            ORDER BY nome
        `).all();

        return res.json({
            sucesso: true,
            dados: usuarios
        });

    } catch (erro) {
        return responderErro(res, erro, 'Erro ao consultar usuários.');
    }
});

// =====================================================
// PET CARE
// Tabela: servicos
// =====================================================

app.get('/api/pet-care', (req, res) => {
    try {
        const petCare = db.prepare(`
            SELECT
                id,
                id_categoria_produto,
                nome,
                descricao,
                preco,
                duracao_media,
                imagem,
                status
            FROM servicos
            WHERE status = 'A'
            ORDER BY nome
        `).all();

        return res.json({
            sucesso: true,
            dados: petCare
        });

    } catch (erro) {
        return responderErro(res, erro, 'Erro ao consultar serviços de Pet Care.');
    }
});

// =====================================================
// CONSULTAS
// Tabela: tipos_consulta
// =====================================================

app.get('/api/consultas', (req, res) => {
    try {
        const consultas = db.prepare(`
            SELECT
                id,
                id_categoria_produto,
                nome,
                descricao,
                preco_minimo,
                preco_maximo,
                duracao_media,
                status
            FROM tipos_consulta
            WHERE status = 'A'
            ORDER BY nome
        `).all();

        return res.json({
            sucesso: true,
            dados: consultas
        });

    } catch (erro) {
        return responderErro(res, erro, 'Erro ao consultar tipos de consulta.');
    }
});

// =====================================================
// PLANOS
// Tabela: plano
// =====================================================

app.get('/api/planos', (req, res) => {
    try {
        const planos = db.prepare(`
            SELECT
                id,
                id_categoria_produto,
                nome,
                descricao,
                preco,
                tipo_cobranca,
                intervalo_cobranca_meses,
                duracao_meses,
                permite_renovacao,
                imagem,
                status
            FROM plano
            WHERE status = 'A'
            ORDER BY nome
        `).all();

        return res.json({
            sucesso: true,
            dados: planos
        });

    } catch (erro) {
        return responderErro(res, erro, 'Erro ao consultar planos.');
    }
});

// =====================================================
// ROTA INICIAL
// =====================================================

app.get('/', (req, res) => {
    return res.json({
        sucesso: true,
        mensagem: 'API PataQuada funcionando!'
    });
});

// =====================================================
// TRATAMENTO DE ROTAS NÃO ENCONTRADAS
// =====================================================

app.use((req, res) => {
    return res.status(404).json({
        sucesso: false,
        mensagem: 'Rota não encontrada.'
    });
});

// =====================================================
// INICIALIZAÇÃO DO SERVIDOR
// =====================================================

const servidor = app.listen(PORT, () => {
    console.log(`Servidor PataQuada iniciado na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
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
