import nodemailer from 'nodemailer';
import process from 'node:process';
import { db } from '../config/database.js';

// =====================================================
// ENVIO DE E-MAIL (NODEMAILER)
// =====================================================
// A conta que envia é a configuração "email_envio" (Configurações da loja);
// vazia, usa o e-mail da empresa em Dados da empresa. O servidor SMTP é
// descoberto pelo domínio do e-mail. Só a senha fica no .env (EMAIL_PASS),
// porque ela não deve ir para o banco. EMAIL_USER, EMAIL_HOST, EMAIL_PORT e
// EMAIL_FROM ainda funcionam no .env, se precisar sobrepor.

// Cria a configuração na primeira vez que o servidor sobe.
db.prepare(`
    INSERT OR IGNORE INTO configuracoes_pataquada (chave, valor, descricao, categoria)
    VALUES ('email_envio', NULL,
            'Conta de e-mail que envia a redefinição de senha e o contato. Vazio = e-mail de Dados da empresa. A senha de app dessa conta fica no .env (EMAIL_PASS).',
            'EMAIL')
`).run();

const SERVIDORES_SMTP = {
    'gmail.com': 'smtp.gmail.com',
    'googlemail.com': 'smtp.gmail.com',
    'outlook.com': 'smtp-mail.outlook.com',
    'outlook.com.br': 'smtp-mail.outlook.com',
    'hotmail.com': 'smtp-mail.outlook.com',
    'live.com': 'smtp-mail.outlook.com',
    'yahoo.com': 'smtp.mail.yahoo.com',
    'yahoo.com.br': 'smtp.mail.yahoo.com'
};

export function configuracaoEmail() {
    const empresa = db.prepare(`
        SELECT nome_fantasia, email FROM dados_pataquada WHERE id = 1
    `).get() ?? {};

    const contaEnvio = db.prepare(`
        SELECT valor FROM configuracoes_pataquada WHERE LOWER(chave) = 'email_envio'
    `).get()?.valor;

    const usuario = String(process.env.EMAIL_USER || contaEnvio || empresa.email || '').trim();
    const senha = process.env.EMAIL_PASS || '';
    const dominio = usuario.split('@')[1]?.toLowerCase() ?? '';
    const host = process.env.EMAIL_HOST || SERVIDORES_SMTP[dominio] || '';
    const porta = Number(process.env.EMAIL_PORT || 587);

    const remetente =
        process.env.EMAIL_FROM ||
        (usuario ? { name: empresa.nome_fantasia || 'PataQuada', address: usuario } : '');

    return {
        usuario,
        senha,
        host,
        porta,
        remetente,
        configurado: Boolean(usuario && senha && host)
    };
}

let emCache = { chave: '', transportador: null };

// Devolve o transportador pronto, ou null se faltar a senha, o e-mail
// da empresa ou um servidor SMTP conhecido para o domínio.
export function obterTransportadorEmail() {
    const config = configuracaoEmail();

    if (!config.configurado) {
        return null;
    }

    const chave = [config.host, config.porta, config.usuario, config.senha].join('|');

    if (emCache.chave !== chave) {
        emCache = {
            chave,
            transportador: nodemailer.createTransport({
                host: config.host,
                port: config.porta,
                secure: config.porta === 465,
                auth: { user: config.usuario, pass: config.senha }
            })
        };
    }

    return emCache.transportador;
}
