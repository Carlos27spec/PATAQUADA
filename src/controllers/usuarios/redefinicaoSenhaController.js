import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { db } from '../../config/database.js';
import { emailTransporter } from '../../services/emailService.js';
import { responderErro } from '../../utils/helpers.js';
import process from 'node:process';
import { Buffer } from 'node:buffer';

// =====================================================
// RECUPERAÇÃO DE SENHA - TABELA DE TOKENS
// =====================================================
// Roda uma vez, quando o arquivo é importado pelo server.js.

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

const TEMPO_TOKEN_REDEFINICAO = 30 * 60 * 1000;

function gerarHash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// =====================================================
// SOLICITAR REDEFINIÇÃO (envia o e-mail com o link)
// =====================================================

export async function solicitarRedefinicaoSenha(req, res) {
    try {
        const email = String(req.body?.email ?? '').trim().toLowerCase();

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um e-mail válido.'
            });
        }

        if (!emailTransporter) {
            console.error(
                'Recuperação de senha indisponível: configure EMAIL_HOST, EMAIL_USER e EMAIL_PASS no .env.'
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
        const tokenHash = gerarHash(token);

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
            await emailTransporter.sendMail({
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
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
        return responderErro(res, erro, 'Erro ao solicitar redefinição de senha.');
    }
}

// =====================================================
// REDEFINIR SENHA (usa o token recebido por e-mail)
// =====================================================

export async function redefinirSenha(req, res) {
    try {
        const token = String(req.body?.token ?? '').trim();
        const senha = String(req.body?.senha ?? '');

        if (!token) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Link inválido ou expirado. Solicite uma nova recuperação.'
            });
        }

        if (
            senha.length < 8 ||
            !/[A-Za-zÀ-ÿ]/.test(senha) ||
            !/\d/.test(senha)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A senha deve ter pelo menos 8 caracteres, uma letra e um número.'
            });
        }

        // O bcrypt considera no máximo 72 bytes da senha.
        if (Buffer.byteLength(senha, 'utf8') > 72) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A senha é muito longa. Utilize até 72 bytes.'
            });
        }

        const tokenHash = gerarHash(token);
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
        const trocarSenha = db.transaction(() => {
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

        if (!trocarSenha()) {
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
        return responderErro(res, erro, 'Erro ao redefinir senha.');
    }
}
