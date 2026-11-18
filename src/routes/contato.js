import express from 'express';
import nodemailer from 'nodemailer';
import process from 'node:process';

// =====================================================
// CONTATO - ENVIO DE E-MAIL
//
// POST /api/contato  { nome, email, telefone, mensagem }
//
// Destinatário: e-mail da empresa cadastrado em dados_pataquada (id = 1).
//
// Como a mensagem chega (nada é gravado no banco):
//   1. Se o .env tiver uma conta SMTP que funcione (EMAIL_HOST,
//      EMAIL_USER, EMAIL_PASS), envia por ela.
//   2. Se não tiver, ou se o login for recusado, envia pelo FormSubmit
//      (https://formsubmit.co), que não precisa de senha.
//      Na primeira vez o FormSubmit manda um e-mail de ativação para a
//      empresa: é preciso clicar em "Activate Form" uma única vez.
// =====================================================

function escaparHtml(valor) {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatarTelefone(digitos) {
    if (digitos.length === 11) {
        return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
    }

    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// E-mail da empresa (quem recebe as mensagens).
function emailDaEmpresa(db) {
    const empresa = db.prepare(`
        SELECT email
        FROM dados_pataquada
        WHERE id = 1
    `).get();

    const email = String(empresa?.email ?? '').trim();

    return EMAIL_VALIDO.test(email) ? email : null;
}

// =====================================================
// ENVIO 1: SMTP DO .env
// =====================================================

let transportador = null;

// Depois de um login recusado, não tenta mais o SMTP até reiniciar
// o servidor (evita esperar a recusa a cada mensagem).
let smtpRecusado = false;

function obterTransportador() {
    if (
        smtpRecusado ||
        !process.env.EMAIL_HOST ||
        !process.env.EMAIL_USER ||
        !process.env.EMAIL_PASS
    ) {
        return null;
    }

    if (!transportador) {
        const porta = Number(process.env.EMAIL_PORT || 587);

        transportador = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: porta,
            secure: porta === 465,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }

    return transportador;
}

async function enviarPorSmtp({ destinatario, nome, email, telefoneFormatado, mensagem }) {
    const envio = obterTransportador();

    if (!envio) {
        return false;
    }

    try {
        await envio.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: destinatario,
            replyTo: { name: nome, address: email },
            subject: `Solicitação de Contato do Cliente - ${nome}`,
            text: [
                `Nome: ${nome}`,
                `E-mail: ${email}`,
                `Telefone: ${telefoneFormatado}`,
                '',
                'Mensagem:',
                mensagem
            ].join('\n'),
            html: `
                <h2>Nova solicitação de contato</h2>
                <p><strong>Nome:</strong> ${escaparHtml(nome)}</p>
                <p>
                    <strong>E-mail:</strong>
                    <a href="mailto:${escaparHtml(email)}">${escaparHtml(email)}</a>
                </p>
                <p><strong>Telefone:</strong> ${escaparHtml(telefoneFormatado)}</p>
                <p><strong>Mensagem:</strong></p>
                <p>${escaparHtml(mensagem).replace(/\n/g, '<br>')}</p>
            `
        });

        return true;

    } catch (erro) {
        if (erro.code === 'EAUTH') {
            smtpRecusado = true;
            console.warn(
                'Contato: login SMTP recusado (confira EMAIL_USER/EMAIL_PASS). ' +
                'Usando o FormSubmit.'
            );
        } else {
            console.warn('Contato: falha no SMTP, usando o FormSubmit:', erro.message);
        }

        return false;
    }
}

// =====================================================
// ENVIO 2: FORMSUBMIT (sem senha)
// =====================================================

// Devolve 'ENVIADO' ou 'AGUARDANDO_ATIVACAO'. Lança erro se falhar.
async function enviarPorFormSubmit({ destinatario, nome, email, telefoneFormatado, mensagem }) {
    const site = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

    const resposta = await fetch(
        `https://formsubmit.co/ajax/${encodeURIComponent(destinatario)}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Origin: site,
                Referer: `${site}/`
            },
            body: JSON.stringify({
                Nome: nome,
                'E-mail': email,
                Telefone: telefoneFormatado,
                Mensagem: mensagem,
                _subject: `Solicitação de Contato do Cliente - ${nome}`,
                _replyto: email,
                _template: 'table',
                _captcha: 'false'
            }),
            signal: AbortSignal.timeout(15000)
        }
    );

    const dados = await resposta.json().catch(() => ({}));
    const texto = String(dados.message ?? '');

    if (/activat/i.test(texto)) {
        console.warn(
            'Contato: o FormSubmit enviou um e-mail de ativação para ' +
            `${destinatario}. Abra esse e-mail e clique em "Activate Form" ` +
            'para começar a receber as mensagens.'
        );

        return 'AGUARDANDO_ATIVACAO';
    }

    if (resposta.ok && String(dados.success) === 'true') {
        return 'ENVIADO';
    }

    throw new Error(`FormSubmit respondeu ${resposta.status}: ${texto || 'sem detalhes'}`);
}

// =====================================================
// ROTA
// =====================================================

export default function criarRotasContato(limitar, db) {
    const router = express.Router();

    router.post('/', async (req, res) => {
        try {
            const nome = limitar(req.body?.nome, 120);
            const email = limitar(req.body?.email, 254);
            const telefone = String(req.body?.telefone ?? '').replace(/\D/g, '');
            const mensagem = limitar(req.body?.mensagem, 5000);

            if (!nome || !email || !telefone || !mensagem) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Preencha todos os campos do formulário.'
                });
            }

            if (!EMAIL_VALIDO.test(email)) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Informe um endereço de e-mail válido.'
                });
            }

            if (telefone.length < 10 || telefone.length > 11) {
                return res.status(400).json({
                    sucesso: false,
                    erro: 'Informe um telefone válido com DDD.'
                });
            }

            const destinatario = emailDaEmpresa(db);

            if (!destinatario) {
                console.error(
                    'Contato indisponível: cadastre o e-mail da empresa em dados_pataquada.'
                );

                return res.status(500).json({
                    sucesso: false,
                    erro: 'O serviço de contato não está configurado.'
                });
            }

            const dados = {
                destinatario,
                nome,
                email,
                telefoneFormatado: formatarTelefone(telefone),
                mensagem
            };

            // 1. SMTP do .env, se estiver funcionando.
            if (await enviarPorSmtp(dados)) {
                return res.json({ sucesso: true, mensagem: 'Mensagem enviada com sucesso.' });
            }

            // 2. FormSubmit.
            try {
                await enviarPorFormSubmit(dados);
            } catch (erroEnvio) {
                console.error('Contato: não foi possível enviar o e-mail:', erroEnvio.message);

                return res.status(502).json({
                    sucesso: false,
                    erro: 'Não foi possível enviar sua mensagem. Tente novamente.'
                });
            }

            return res.json({ sucesso: true, mensagem: 'Mensagem enviada com sucesso.' });

        } catch (erro) {
            console.error('Erro ao enviar mensagem de contato:', erro);

            return res.status(500).json({
                sucesso: false,
                erro: 'Não foi possível enviar sua mensagem. Tente novamente.'
            });
        }
    });

    return router;
}
