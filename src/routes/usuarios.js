// =====================================================
// ROTAS - USUÁRIOS (cadastro, login e senha)
// Montadas no server.js com app.use(...). Os caminhos completos
// (/api/...) ficam aqui mesmo.
// =====================================================

import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import process from 'node:process';
import { configuracaoEmail, obterTransportadorEmail } from '../services/emailService.js';
import { db } from '../config/database.js';
import { gerarToken } from '../middlewares/auth.js';
import { responderErro, somenteDigitos, limitar } from '../utils/helpers.js';
import {
    MENSAGEM_SENHA,
    MENSAGEM_SENHA_LONGA,
    MENSAGEM_USUARIO,
    REGEX_USUARIO,
    senhaAtendeRequisitos,
    senhaLongaDemais
} from '../utils/regrasCadastro.js';


export default function criarRotasUsuarios({ autenticar }) {
    const router = express.Router();

    // =====================================================

    // USUÁRIOS


    // =====================================================


    // CADASTRO

    function cpfValido(cpf) {
        const d = somenteDigitos(cpf);
        if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

        const digito = (base) => {
            let soma = 0;
            for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
            const resto = (soma * 10) % 11;
            return resto === 10 ? 0 : resto;
        };

        return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
    }

    // Em alguns bancos a tabela usuarios tem a coluna "sobrenome";
    // em outros, o nome completo é gravado inteiro em "nome".
    const usuariosTemSobrenome = db
        .prepare('PRAGMA table_info(usuarios)')
        .all()
        .some((coluna) => coluna.name === 'sobrenome');

    function usuarioEmUso(usuario) {
        return Boolean(db.prepare(`
            SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER(?)
        `).get(usuario));
    }

    // Consulta rápida usada pela tela de cadastro enquanto a pessoa digita.
    router.get('/api/usuarios/disponibilidade', (req, res) => {
        try {
            const usuario = limitar(req.query.usuario, 60);

            if (!REGEX_USUARIO.test(usuario)) {
                return res.json({ sucesso: true, disponivel: false, mensagem: MENSAGEM_USUARIO });
            }

            const disponivel = !usuarioEmUso(usuario);

            return res.json({
                sucesso: true,
                disponivel,
                mensagem: disponivel ? 'Nome de usuário disponível.' : 'Este nome de usuário já está em uso.'
            });
        } catch (erro) {
            return responderErro(res, erro, 'Erro ao consultar o nome de usuário.');
        }
    });

    router.post('/api/usuarios/cadastro', async (req, res) => {
        try {
            const nomeCompleto = limitar(req.body.nome, 120).replace(/\s+/g, ' ');
            const email = limitar(req.body.email, 160).toLowerCase();
            const cpf = somenteDigitos(req.body.cpf);
            const senha = String(req.body.senha ?? '');

            // Campos opcionais.
            const usuario = limitar(req.body.usuario, 60).toLowerCase();
            const telefone = somenteDigitos(req.body.telefone);

            // Separa primeiro nome e sobrenome (usado só se a coluna existir).
            const partesNome = nomeCompleto.split(' ').filter(Boolean);
            const primeiroNome = partesNome[0] ?? '';
            const sobrenome = partesNome.slice(1).join(' ');

            const erro = (status, campo, mensagem) =>
                res.status(status).json({
                    sucesso: false,
                    campo,
                    mensagem
                });

            if (partesNome.length < 2) {
                return erro(400, 'nome', 'Informe seu nome completo.');
            }

            if (!/^\S+@\S+\.\S+$/.test(email)) {
                return erro(400, 'email', 'Informe um e-mail válido.');
            }

            if (!cpfValido(cpf)) {
                return erro(400, 'cpf', 'Informe um CPF válido.');
            }

            // O nome de usuário é obrigatório e único (sem diferenciar maiúsculas).
            if (!REGEX_USUARIO.test(usuario)) {
                return erro(400, 'usuario', MENSAGEM_USUARIO);
            }

            if (telefone && !/^\d{10,11}$/.test(telefone)) {
                return erro(
                    400,
                    'telefone',
                    'Informe o telefone com DDD (10 ou 11 dígitos).'
                );
            }

            if (!senhaAtendeRequisitos(senha)) {
                return erro(400, 'senha', MENSAGEM_SENHA);
            }

            if (senhaLongaDemais(senha)) {
                return erro(400, 'senha', MENSAGEM_SENHA_LONGA);
            }

            // Todo cadastro público é obrigatoriamente de cliente.
            const tipoCliente = db.prepare(`
                SELECT id
                FROM tipo_usuario
                WHERE UPPER(TRIM(tipo)) = 'CLIENTE'
            `).get();

            if (!tipoCliente) {
                throw new Error(
                    "Tipo de usuário 'CLIENTE' não existe na tabela tipo_usuario."
                );
            }

            if (db.prepare(`
                SELECT id FROM usuarios WHERE email = ?
            `).get(email)) {
                return erro(409, 'email', 'Este e-mail já está cadastrado.');
            }

            if (db.prepare(`
                SELECT id FROM usuarios WHERE cpf = ?
            `).get(cpf)) {
                return erro(409, 'cpf', 'Este CPF já está cadastrado.');
            }

            if (usuarioEmUso(usuario)) {
                return erro(409, 'usuario', 'Este nome de usuário já está em uso.');
            }

            const senhaCriptografada = await bcrypt.hash(senha, 10);

            const colunas = [
                'nome',
                'cpf',
                'email',
                'id_tipo_usuario',
                'usuario',
                'senha',
                'telefone'
            ];

            const valores = [
                usuariosTemSobrenome ? primeiroNome : nomeCompleto,
                cpf,
                email,
                tipoCliente.id,
                usuario || null,
                senhaCriptografada,
                telefone || null
            ];

            if (usuariosTemSobrenome) {
                colunas.splice(1, 0, 'sobrenome');
                valores.splice(1, 0, sobrenome);
            }

            const resultado = db.prepare(`
                INSERT INTO usuarios (${colunas.join(', ')})
                VALUES (${colunas.map(() => '?').join(', ')})
            `).run(...valores);

            const novoUsuario = {
                id: Number(resultado.lastInsertRowid),
                nome: nomeCompleto,
                email,
                usuario: usuario || null,
                id_tipo_usuario: tipoCliente.id
            };

            return res.status(201).json({
                sucesso: true,
                mensagem: 'Usuário cadastrado com sucesso.',
                token: gerarToken(novoUsuario),
                usuario: novoUsuario
            });

        } catch (erro) {
            if (erro.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                const campo = /cpf/i.test(erro.message)
                    ? 'cpf'
                    : /usuarios\.usuario/i.test(erro.message)
                        ? 'usuario'
                        : 'email';

                const mensagens = {
                    cpf: 'Este CPF já está cadastrado.',
                    usuario: 'Este nome de usuário já está em uso.',
                    email: 'Este e-mail já está cadastrado.'
                };

                return res.status(409).json({
                    sucesso: false,
                    campo,
                    mensagem: mensagens[campo]
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


    router.post('/api/usuarios/login', async (req, res) => {

        try {

            const { email, senha } = req.body;
            const identificador = String(email ?? '').trim();

            if (!identificador || !senha) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem: 'Informe o e-mail (ou usuário) e a senha.'

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

                WHERE (LOWER(email) = LOWER(?) OR LOWER(usuario) = LOWER(?))

                AND status = 1

            `).get(identificador, identificador);


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

    // =====================================================
    // RECUPERAÇÃO DE SENHA - TABELA DE TOKENS
    // =====================================================

    db.exec(`
        CREATE TABLE IF NOT EXISTS tokens_redefinicao_senha (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            expira_em INTEGER NOT NULL,
            criado_em INTEGER NOT NULL,

            FOREIGN KEY (id_usuario)
                REFERENCES usuarios(id)
                ON UPDATE CASCADE
                ON DELETE CASCADE
        ) STRICT;

        CREATE INDEX IF NOT EXISTS idx_token_redefinicao_usuario
            ON tokens_redefinicao_senha(id_usuario);
    `);


    // =====================================================
    // RECUPERAÇÃO DE SENHA - ROTAS
    // =====================================================

    const TEMPO_TOKEN_REDEFINICAO = 30 * 60 * 1000;

    // Fora de produção, o link de redefinição aparece no terminal quando o
    // e-mail não pode ser enviado.
    const EM_PRODUCAO = process.env.NODE_ENV === 'production';

    router.post('/api/usuarios/solicitar-redefinicao-senha', async (req, res) => {
        try {
            const email = String(req.body?.email ?? '').trim().toLowerCase();

            if (!/^\S+@\S+\.\S+$/.test(email)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Informe um e-mail válido.'
                });
            }

            const emailTransporter = obterTransportadorEmail();

            if (!emailTransporter && EM_PRODUCAO) {

                console.error(

                    'Recuperação de senha indisponível: cadastre o e-mail da empresa em Dados da empresa e o EMAIL_PASS no .env.'

                );

                return res.status(503).json({

                    sucesso: false,

                    mensagem: 'O envio de e-mails está temporariamente indisponível. Tente novamente mais tarde.'

                });

            }


            const usuario = db.prepare(`
                SELECT id, nome, email
                FROM usuarios
                WHERE LOWER(email) = ?
                  AND status = 1
            `).get(email);

            // Resposta genérica para não revelar se o e-mail está cadastrado.
            const respostaGenerica = {
                sucesso: true,
                mensagem: 'Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.'
            };

            if (!usuario) {
                return res.json(respostaGenerica);
            }

            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const agora = Date.now();
            const expiraEm = agora + TEMPO_TOKEN_REDEFINICAO;

            const salvarToken = db.transaction(() => {
                db.prepare(`
                    DELETE FROM tokens_redefinicao_senha
                    WHERE id_usuario = ?
                `).run(usuario.id);

                db.prepare(`
                    INSERT INTO tokens_redefinicao_senha (
                        id_usuario,
                        token_hash,
                        expira_em,
                        criado_em
                    )
                    VALUES (?, ?, ?, ?)
                `).run(usuario.id, tokenHash, expiraEm, agora);
            });

            salvarToken();

            const urlFrontend = (
                process.env.FRONTEND_URL || 'http://localhost:5173'
            ).replace(/\/$/, '');

            const linkRedefinicao =
                `${urlFrontend}/redefinir-senha?token=${encodeURIComponent(token)}`;

            try {

                if (!emailTransporter) {

                    throw new Error('e-mail da empresa ou EMAIL_PASS não configurados');

                }

                await emailTransporter.sendMail({
                    from: configuracaoEmail().remetente,
                    to: usuario.email,
                    subject: 'Redefinição de senha - PataQuada',
                    text:
                        `Olá${usuario.nome ? `, ${usuario.nome}` : ''}!\n\n` +
                        'Recebemos uma solicitação para redefinir a senha da sua conta PataQuada.\n\n' +
                        `Acesse o link para criar uma nova senha: ${linkRedefinicao}\n\n` +
                        'Este link expira em 30 minutos e só pode ser utilizado uma vez. ' +
                        'Se você não solicitou a alteração, ignore este e-mail.',
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                            <h2>Redefinição de senha - PataQuada</h2>
                            <p>Olá!</p>
                            <p>Recebemos uma solicitação para redefinir a senha da sua conta PataQuada.</p>
                            <p>
                                <a href="${linkRedefinicao}"
                                   style="display:inline-block;padding:12px 22px;background:#e87935;color:#fff;text-decoration:none;border-radius:24px;">
                                    Criar nova senha
                                </a>
                            </p>
                            <p>Este link expira em 30 minutos e só pode ser utilizado uma vez.</p>
                            <p>Se você não solicitou a alteração, ignore este e-mail.</p>
                        </div>
                    `
                });
            } catch (erroEnvio) {

                // Em desenvolvimento, sem e-mail funcionando, mostra o link no
                // terminal para o fluxo poder ser testado.
                if (!EM_PRODUCAO) {

                    console.warn(
                        '\n[DESENVOLVIMENTO] Não foi possível enviar o e-mail de redefinição ' +
                        `(${erroEnvio.code || erroEnvio.message}).\n` +
                        `Link de redefinição para ${usuario.email}:\n${linkRedefinicao}\n`
                    );

                    return res.json(respostaGenerica);

                }

                db.prepare(`

                    DELETE FROM tokens_redefinicao_senha

                    WHERE token_hash = ?

                `).run(tokenHash);

                console.error('Erro ao enviar e-mail de redefinição:', erroEnvio);

                return res.status(500).json({
                    sucesso: false,
                    mensagem: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.'
                });
            }

            return res.json(respostaGenerica);
        } catch (erro) {
            return responderErro(
                res,
                erro,
                'Erro ao solicitar redefinição de senha.'
            );
        }
    });


    router.post('/api/usuarios/redefinir-senha', async (req, res) => {
        try {
            const token = String(req.body?.token ?? '').trim();
            const senha = String(req.body?.senha ?? '');

            if (!token) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Link inválido ou expirado. Solicite uma nova recuperação.'
                });
            }

            if (!senhaAtendeRequisitos(senha)) {
                return res.status(400).json({ sucesso: false, mensagem: MENSAGEM_SENHA });
            }

            if (senhaLongaDemais(senha)) {
                return res.status(400).json({ sucesso: false, mensagem: MENSAGEM_SENHA_LONGA });
            }

            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const agora = Date.now();

            const registroToken = db.prepare(`
                SELECT id_usuario
                FROM tokens_redefinicao_senha
                WHERE token_hash = ?
                  AND expira_em > ?
            `).get(tokenHash, agora);

            if (!registroToken) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Link inválido ou expirado. Solicite uma nova recuperação.'
                });
            }

            const usuario = db.prepare(`
                SELECT id
                FROM usuarios
                WHERE id = ?
                  AND status = 1
            `).get(registroToken.id_usuario);

            if (!usuario) {
                db.prepare(`
                    DELETE FROM tokens_redefinicao_senha
                    WHERE token_hash = ?
                `).run(tokenHash);

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Não foi possível redefinir a senha desta conta.'
                });
            }

            const senhaCriptografada = await bcrypt.hash(senha, 10);

            // Revalida o token dentro da transação e garante uso único.
            const redefinirSenha = db.transaction(() => {
                const tokenAtual = db.prepare(`
                    SELECT id_usuario
                    FROM tokens_redefinicao_senha
                    WHERE token_hash = ?
                      AND expira_em > ?
                `).get(tokenHash, Date.now());

                if (!tokenAtual || tokenAtual.id_usuario !== usuario.id) {
                    return false;
                }

                db.prepare(`
                    UPDATE usuarios
                    SET senha = ?,
                        data_atualizacao = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(senhaCriptografada, usuario.id);

                db.prepare(`
                    DELETE FROM tokens_redefinicao_senha
                    WHERE id_usuario = ?
                `).run(usuario.id);

                return true;
            });

            if (!redefinirSenha()) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Link inválido ou expirado. Solicite uma nova recuperação.'
                });
            }

            return res.json({
                sucesso: true,
                mensagem: 'Senha redefinida com sucesso!'
            });
        } catch (erro) {
            return responderErro(
                res,
                erro,
                'Erro ao redefinir senha.'
            );
        }
    });


    // CONSULTAR USUÁRIOS


    router.get('/api/usuarios', autenticar, (req, res) => {

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


    return router;
}
