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

        ).replace(/\/$/, ''),



        fretePadrao: Number(

            process.env.FRETE_PADRAO ?? 1500

        ),



        freteGratisAPartirDe: Number(

            process.env.FRETE_GRATIS_A_PARTIR_DE ?? 10000

        )

    };

}



export class ErroPagamento extends Error {

    constructor(mensagem, status = 400) {

super(mensagem);

this.status = status;

    }

}



