import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'pataquada-chave-desenvolvimento-altere';
const TEMPO_TOKEN = 7 * 24 * 60 * 60;

export function gerarToken(usuario) {


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




export function verificarToken(token) {

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



    if (

        !payload.exp ||

        payload.exp < Math.floor(Date.now() / 1000)

    ) {

        return null;

    }



    return payload;

}




export function criarMiddlewareAutenticacao(db) {
    return function autenticar(req, res, next) {

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

    };
}
