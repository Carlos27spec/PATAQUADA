
import 'dotenv/config';
import express from 'express';
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Configuração de caminhos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Express
const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Criação automática da pasta do banco
const databasePath = path.join(__dirname, 'database');

if (!fs.existsSync(databasePath)) {
    fs.mkdirSync(databasePath, { recursive: true });
}

// Conexão automática com SQLite
const databaseName = process.env.DB_NAME || 'pataquada';
const db = new Database(
    path.join(databasePath, `${databaseName}.db`)
);

// Configurações do SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Criação automática da tabela de usuários
db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        sobrenome TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE UNIQUE,
        senha TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Cadastro de usuário
app.post(['/api/cadastro', '/cadastro'], async (req, res) => {
    try {
        const { nome, sobrenome, email, senha } = req.body;

        if (!nome || !sobrenome || !email || !senha) {
            return res.status(400).json({
                mensagem: 'Preencha todos os campos.'
            });
        }

        if (senha.length < 8) {
            return res.status(400).json({
                mensagem: 'A senha deve ter pelo menos 8 caracteres.'
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const usuarioExistente = db.prepare(`
            SELECT id FROM usuarios WHERE email = ?
        `).get(emailNormalizado);

        if (usuarioExistente) {
            return res.status(409).json({
                mensagem: 'Este e-mail já está cadastrado.'
            });
        }

        const senhaHash = await bcrypt.hash(senha, 12);

        const resultado = db.prepare(`
            INSERT INTO usuarios (nome, sobrenome, email, senha)
            VALUES (?, ?, ?, ?)
        `).run(
            nome.trim(),
            sobrenome.trim(),
            emailNormalizado,
            senhaHash
        );

        return res.status(201).json({
            mensagem: 'Usuário cadastrado com sucesso!',
            id: resultado.lastInsertRowid
        });

    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao cadastrar usuário.'
        });
    }
});

// Login de usuário
app.post(['/api/login', '/login'], async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                mensagem: 'Informe o e-mail e a senha.'
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const usuario = db.prepare(`
            SELECT * FROM usuarios WHERE email = ?
        `).get(emailNormalizado);

        if (!usuario) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha incorretos.'
            });
        }

        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha
        );

        if (!senhaValida) {
            return res.status(401).json({
                mensagem: 'E-mail ou senha incorretos.'
            });
        }

        return res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                sobrenome: usuario.sobrenome,
                email: usuario.email
            }
        });

    } catch (error) {
        console.error('Erro ao realizar login:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao realizar login.'
        });
    }
});

// Listagem de usuários
app.get(['/api/usuarios', '/usuarios'], (req, res) => {
    try {
        const usuarios = db.prepare(`
            SELECT
                id,
                nome,
                sobrenome,
                email,
                created_at,
                updated_at
            FROM usuarios
            ORDER BY created_at DESC
        `).all();

        return res.status(200).json(usuarios);

    } catch (error) {
        console.error('Erro ao listar usuários:', error);

        return res.status(500).json({
            mensagem: 'Erro interno ao listar usuários.'
        });
    }
});

// Inicialização do servidor
const server = app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Banco SQLite conectado: ${databaseName}.db`);
});

// Encerramento seguro
function encerrarServidor() {
    console.log('\nEncerrando servidor...');

    server.close(() => {
        db.close();
        console.log('Conexão com SQLite encerrada.');
        process.exit(0);
    });
}

process.on('SIGINT', encerrarServidor);
process.on('SIGTERM', encerrarServidor);
