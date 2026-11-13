import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

function escaparHtml(valor) {
    return String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export default function criarRotasContato(limitar) {
router.post('/', async (req, res) => {

    try {

        const nome = limitar(req.body?.nome, 120);

        const email = limitar(req.body?.email, 254);

        const mensagem = limitar(req.body?.mensagem, 5000);



        if (!nome || !email || !mensagem) {

            return res.status(400).json({

                sucesso: false,

                erro: 'Preencha todos os campos do formulário.'

            });

        }



        const emailValido = /^[^\s@]+@[^\s@]+\\.[^\s@]+$/.test(email);



        if (!emailValido) {

            return res.status(400).json({

                sucesso: false,

                erro: 'Informe um endereço de e-mail válido.'

            });

        }



        if (

            !process.env.SMTP_HOST ||

            !process.env.SMTP_USER ||

            !process.env.SMTP_PASS ||

            !process.env.EMAIL_DESTINATARIO

        ) {

            console.error(

                'Configurações SMTP incompletas no arquivo .env.'

            );



            return res.status(500).json({

                sucesso: false,

                erro: 'O serviço de contato não está configurado.'

            });

        }



        const transportadorEmail = nodemailer.createTransport({

            host: process.env.SMTP_HOST,

            port: Number(process.env.SMTP_PORT || 587),

            secure: process.env.SMTP_SECURE === 'true',

            auth: {

                user: process.env.SMTP_USER,

                pass: process.env.SMTP_PASS

            }

        });



        await transportadorEmail.sendMail({

            from: {

                name: nome,

                address: email

            },



            to: process.env.EMAIL_DESTINATARIO,



            replyTo: {

                name: nome,

                address: email

            },



            subject: `Solicitação de Contato do Cliente - ${nome}`,



            text: [

                `Nome: ${nome}`,

                `E-mail: ${email}`,

                '',

                'Mensagem:',

                mensagem

            ].join('\n'),



            html: `

                \<h2>Nova solicitação de contato\</h2>



                \<p>

                    \<strong>Nome:\</strong>

                    ${escaparHtml(nome)}

                \</p>



                \<p>

                    \<strong>E-mail:\</strong>

                    ${escaparHtml(email)}

                \</p>



                \<p>\<strong>Mensagem:\</strong>\</p>



                \<p>

                    ${escaparHtml(mensagem).replace(/\n/g, '\<br>')}

                \</p>

            `

        });



        return res.status(200).json({

            sucesso: true,

            mensagem: 'Mensagem enviada com sucesso.'

        });



    } catch (erro) {

        console.error(

            'Erro ao enviar e-mail de contato:',

            erro

        );



        return res.status(500).json({

            sucesso: false,

            erro: 'Não foi possível enviar sua mensagem. Tente novamente.'

        });

    }

});
    return router;
}
