export function configuracaoPagamento() {

    return {

        token: process.env.MP_ACCESS_TOKEN || '',



        frontendUrl: (

            process.env.FRONTEND_URL ||

            'http\://localhost:5173'

        ).replace(/\/$/, ''),



        backendUrl: (

            process.env.BACKEND_URL ||

            ''

        ).replace(/\/$/, '')

    };

}



export class ErroPagamento extends Error {

    constructor(mensagem, status = 400) {

super(mensagem);

this.status = status;

    }

}



