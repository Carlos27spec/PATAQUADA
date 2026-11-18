// =====================================================
// PEDIDOS E MERCADO PAGO - FUNÇÕES DE APOIO
// (separado do server.js)
// =====================================================

import { db } from '../config/database.js';
import { configuracaoPagamento, ErroPagamento } from '../services/mercadoPagoConfig.js';
import { somenteDigitos, limitar } from '../utils/helpers.js';


export const MP_API = (

    process.env.MP_API || 'https://api.mercadopago.com'

).replace(/\/$/, '');

// =====================================================

// MERCADO PAGO - CONFIGURAÇÕES

// =====================================================


// =====================================================

// MERCADO PAGO - TABELAS DE PEDIDOS

// =====================================================


export const SQL_TABELAS_PEDIDOS = `

CREATE TABLE IF NOT EXISTS pedidos (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    id_usuario_cliente INTEGER NOT NULL,

    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),

    frete INTEGER NOT NULL DEFAULT 0 CHECK (frete >= 0),

    total INTEGER NOT NULL CHECK (total >= 0),

    forma_pagamento TEXT NOT NULL DEFAULT 'TODAS',


    status TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO'

        CHECK (status IN (

            'AGUARDANDO_PAGAMENTO',

            'PAGO',

            'EM_SEPARACAO',

            'ENVIADO',

            'ENTREGUE',

            'CANCELADO',

            'FALHOU'

        )),


    mp_preference_id TEXT,

    mp_payment_id TEXT,

    mp_status TEXT,


    estoque_baixado INTEGER NOT NULL DEFAULT 0

        CHECK (estoque_baixado IN (0, 1)),


    entrega_destinatario TEXT NOT NULL,

    entrega_telefone TEXT NOT NULL,

    entrega_cep TEXT NOT NULL,

    entrega_logradouro TEXT NOT NULL,

    entrega_numero TEXT NOT NULL,

    entrega_complemento TEXT,

    entrega_bairro TEXT NOT NULL,

    entrega_cidade TEXT NOT NULL,

    entrega_uf TEXT NOT NULL,


    data_criacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    data_atualizacao TEXT,


    FOREIGN KEY (id_usuario_cliente)

        REFERENCES usuarios(id)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) STRICT;


CREATE TABLE IF NOT EXISTS itens_pedido (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    id_pedido INTEGER NOT NULL,

    id_produto INTEGER NOT NULL,

    nome TEXT NOT NULL,

    preco_unitario INTEGER NOT NULL CHECK (preco_unitario >= 0),

    quantidade INTEGER NOT NULL CHECK (quantidade > 0),

    imagem TEXT,


    FOREIGN KEY (id_pedido)

        REFERENCES pedidos(id)

        ON UPDATE CASCADE

        ON DELETE CASCADE,


    FOREIGN KEY (id_produto)

        REFERENCES produtos(id)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) STRICT;


CREATE INDEX IF NOT EXISTS idx_pedidos_usuario

    ON pedidos (id_usuario_cliente);


CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido

    ON itens_pedido (id_pedido);

`;


db.exec(SQL_TABELAS_PEDIDOS);

// Colunas do frete (adicionadas em bancos já existentes).
{
    const colunasPedidos = db.prepare('PRAGMA table_info(pedidos)')
        .all()
        .map(coluna => coluna.name);

    if (!colunasPedidos.includes('frete_opcao')) {
        db.exec('ALTER TABLE pedidos ADD COLUMN frete_opcao TEXT');
    }

    if (!colunasPedidos.includes('frete_prazo_dias')) {
        db.exec('ALTER TABLE pedidos ADD COLUMN frete_prazo_dias INTEGER');
    }
}


// =====================================================

// MERCADO PAGO - CÁLCULO DOS VALORES

// =====================================================


export function reais(centavos) {

    return Number((centavos / 100).toFixed(2));

}


// =====================================================

// MERCADO PAGO - VALIDAÇÃO DA ENTREGA

// =====================================================


export function validarEntrega(entrega = {}) {

    const dados = {

        destinatario: limitar(entrega.destinatario, 120),

        telefone: somenteDigitos(entrega.telefone).slice(0, 11),

        cep: somenteDigitos(entrega.cep).slice(0, 8),

        logradouro: limitar(entrega.logradouro, 150),

        numero: limitar(entrega.numero, 15),

        complemento: limitar(entrega.complemento, 80),

        bairro: limitar(entrega.bairro, 80),

        cidade: limitar(entrega.cidade, 80),

        uf: limitar(entrega.uf, 2).toUpperCase()

    };


    const erros = [];


    if (dados.destinatario.length < 3) {

        erros.push(

            'Informe o nome de quem vai receber o pedido.'

        );

    }


    if (dados.telefone.length < 10) {

        erros.push('Informe um telefone com DDD.');

    }


    if (dados.cep.length !== 8) {

        erros.push('Informe um CEP válido.');

    }


    if (!dados.logradouro) {

        erros.push('Informe a rua do endereço de entrega.');

    }


    if (!dados.numero) {

        erros.push('Informe o número do endereço de entrega.');

    }


    if (!dados.bairro) {

        erros.push('Informe o bairro.');

    }


    if (!dados.cidade) {

        erros.push('Informe a cidade.');

    }


    if (!/^[A-Z]{2}$/.test(dados.uf)) {

        erros.push('Informe a sigla do estado (UF).');

    }


    return { dados, erros };

}


// =====================================================

// MERCADO PAGO - FORMAS DE PAGAMENTO

// =====================================================


// Tipos que podem ser escondidos no checkout. O saldo da conta
// Mercado Pago (account_money) fica de fora: o Mercado Pago não
// permite excluí-lo (erro "account_money cannot be excluded").
export const TIPOS_PAGAMENTO = [

    'ticket',

    'atm',

    'bank_transfer',

    'credit_card',

    'debit_card',

    'prepaid_card'

];


export const TIPO_POR_FORMA = {

    PIX: 'bank_transfer',

    CREDITO: 'credit_card',

    DEBITO: 'debit_card'

};


// Boleto (ticket) e pagamento em lotérica (atm) não são aceitos.
export const TIPOS_NAO_ACEITOS = ['ticket', 'atm'];

export function metodosDePagamento(forma) {

    const permitido = TIPO_POR_FORMA[forma];

    // "TODAS": libera tudo, menos os tipos não aceitos.
    if (!permitido) {

        return {

            excluded_payment_types: TIPOS_NAO_ACEITOS.map(id => ({ id }))

        };

    }


    const metodos = {

        excluded_payment_types: TIPOS_PAGAMENTO

            .filter(tipo => tipo !== permitido)

            .map(id => ({ id }))

    };


    if (forma === 'CREDITO') {

        metodos.installments = 12;

        metodos.default_installments = 1;

    }


    return metodos;

}


// =====================================================

// MERCADO PAGO - COMUNICAÇÃO COM A API

// =====================================================


export async function chamarMercadoPago(

caminho,

    { metodo = 'GET', corpo } = {}

) {

    const { token } = configuracaoPagamento();


    if (!token) {

        throw new ErroPagamento(

            'Pagamento indisponível no momento. Tente novamente mais tarde.',

            503

        );

    }


    let resposta;


    try {

        resposta = await fetch(`${MP_API}${caminho}`, {

            method: metodo,

            headers: {

                Authorization: `Bearer ${token}`,

                'Content-Type': 'application/json'

            },

            body: corpo ? JSON.stringify(corpo) : undefined

        });


    } catch (erro) {

        console.error(

            'Falha de rede ao falar com o Mercado Pago:',

            erro

        );


        throw new ErroPagamento(

            'Não foi possível conectar ao Mercado Pago.',

            502

        );

    }


    const dados = await resposta.json().catch(() => ({}));


    if (!resposta.ok) {

        console.error(

            'Mercado Pago respondeu com erro:',

            resposta.status,

            JSON.stringify(dados)

        );


        throw new ErroPagamento(

            'O Mercado Pago não aceitou a requisição. Tente novamente.',

            502

        );

    }


    return dados;

}


// =====================================================

// MERCADO PAGO - CRIAÇÃO DA PREFERÊNCIA

// =====================================================


export async function criarPreferenciaMercadoPago({

pedidoId,

usuario,

entrega,

itens,

frete,

freteNome,

forma

}) {

    const {

        frontendUrl,

        backendUrl

    } = configuracaoPagamento();


    const itensMP = itens.map(item => ({

        id: String(item.id_produto),

        title: String(item.nome).slice(0, 250),

        quantity: item.quantidade,

        currency_id: 'BRL',

        unit_price: reais(item.preco)

    }));


    if (frete > 0) {

        itensMP.push({

            id: 'frete',

            title: freteNome ? `Frete - ${freteNome}` : 'Frete',

            quantity: 1,

            currency_id: 'BRL',

            unit_price: reais(frete)

        });

    }


    const preferencia = {

        items: itensMP,


        payer: {

            name: usuario.nome,

            email: usuario.email,

            phone: {

                area_code: entrega.telefone.slice(0, 2),

                number: entrega.telefone.slice(2)

            }

        },


        back_urls: {

            success: `${frontendUrl}/pedido/sucesso`,

            pending: `${frontendUrl}/pedido/pendente`,

            failure: `${frontendUrl}/pedido/falha`

        },


        external_reference: String(pedidoId),


        statement_descriptor: 'PATAQUADA',


        metadata: {

            pedido_id: pedidoId

        }

    };


    if (frontendUrl.startsWith('https://')) {

        preferencia.auto_return = 'approved';

    }


    if (backendUrl.startsWith('https://')) {

        preferencia.notification_url =

            `${backendUrl}/api/pagamentos/webhook`;

    }


    const metodos = metodosDePagamento(forma);


    if (metodos) {

        preferencia.payment_methods = metodos;

    }


    return chamarMercadoPago('/checkout/preferences', {

        metodo: 'POST',

        corpo: preferencia

    });

}


// =====================================================

// MERCADO PAGO - CRIAÇÃO DO PEDIDO

// =====================================================


export function criarPedido(

db,

    { usuarioId, forma, entrega, itens, totais, frete = null }

) {

    const criar = db.transaction(() => {

        const resultado = db.prepare(`

            INSERT INTO pedidos (

                id_usuario_cliente,

                subtotal,

                frete,

                total,

                forma_pagamento,

                entrega_destinatario,

                entrega_telefone,

                entrega_cep,

                entrega_logradouro,

                entrega_numero,

                entrega_complemento,

                entrega_bairro,

                entrega_cidade,

                entrega_uf,

                frete_opcao,

                frete_prazo_dias

            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

        `).run(

            usuarioId,

            totais.subtotal,

            totais.frete,

            totais.total,

            forma,

            entrega.destinatario,

            entrega.telefone,

            entrega.cep,

            entrega.logradouro,

            entrega.numero,

            entrega.complemento || null,

            entrega.bairro,

            entrega.cidade,

            entrega.uf,

            frete?.codigo ?? null,

            frete?.prazo_dias ?? null

        );


        const pedidoId = Number(resultado.lastInsertRowid);


        const inserirItem = db.prepare(`

            INSERT INTO itens_pedido (

                id_pedido,

                id_produto,

                nome,

                preco_unitario,

                quantidade,

                imagem

            )

            VALUES (?, ?, ?, ?, ?, ?)

        `);


        for (const item of itens) {

            inserirItem.run(

                pedidoId,

                item.id_produto,

                item.nome,

                item.preco,

                item.quantidade,

                item.imagem ?? null

            );

        }


        return pedidoId;

    });


    return criar();

}


// =====================================================

// MERCADO PAGO - CONSULTA DO PEDIDO

// =====================================================


export function buscarPedidoCompleto(db, pedidoId) {

    const pedido = db.prepare(`

        SELECT

            id,

            id_usuario_cliente,

            subtotal,

            frete,

            frete_opcao,

            frete_prazo_dias,

            total,

            forma_pagamento,

            status,

            mp_preference_id,

            mp_payment_id,

            mp_status,

            entrega_destinatario,

            entrega_telefone,

            entrega_cep,

            entrega_logradouro,

            entrega_numero,

            entrega_complemento,

            entrega_bairro,

            entrega_cidade,

            entrega_uf,

            data_criacao,

            data_atualizacao

        FROM pedidos

        WHERE id = ?

    `).get(pedidoId);


    if (!pedido) {

        return null;

    }


    // Link para pagar de novo enquanto o pedido não foi pago.
    pedido.link_pagamento =
        pedido.mp_preference_id &&
        ['AGUARDANDO_PAGAMENTO', 'FALHOU'].includes(pedido.status)
            ? `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${encodeURIComponent(pedido.mp_preference_id)}`
            : null;

    delete pedido.mp_preference_id;

    pedido.itens = db.prepare(`

        SELECT

            id_produto,

            nome,

            preco_unitario,

            quantidade,

            imagem

        FROM itens_pedido

        WHERE id_pedido = ?

        ORDER BY id

    `).all(pedidoId);


    return pedido;

}


// =====================================================

// MERCADO PAGO - ATUALIZAÇÃO DO PAGAMENTO

// =====================================================


export const ANTES_DO_PAGAMENTO = [

    'AGUARDANDO_PAGAMENTO',

    'FALHOU',

    'CANCELADO'

];


export const PAGAMENTO_EM_ANALISE = [

    'pending',

    'in_process',

    'authorized'

];


export function aplicarPagamento(db, pagamento) {

    const pedidoId = Number(pagamento.external_reference);


    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {

        return null;

    }


    const aplicar = db.transaction(() => {

        const pedido = db.prepare(`

            SELECT *

            FROM pedidos

            WHERE id = ?

        `).get(pedidoId);


        if (!pedido) {

            return null;

        }


        const valorConfere =

            Math.round(

                Number(pagamento.transaction_amount) * 100

            ) === pedido.total;


        let novoStatus = pedido.status;


        switch (pagamento.status) {

            case 'approved':


                if (!valorConfere) {

                    console.warn(

                        `Pagamento ${pagamento.id} aprovado com valor ` +

                        `diferente do pedido ${pedidoId}. Pedido não alterado.`

                    );


                } else if (

                    ANTES_DO_PAGAMENTO.includes(pedido.status)

                ) {

                    novoStatus = 'PAGO';

                }


                break;


            case 'rejected':


                if (pedido.status === 'AGUARDANDO_PAGAMENTO') {

                    novoStatus = 'FALHOU';

                }


                break;


            case 'cancelled':


                if (pedido.status === 'AGUARDANDO_PAGAMENTO') {

                    novoStatus = 'CANCELADO';

                }


                break;


            case 'refunded':

            case 'charged_back':


                if (pedido.status === 'PAGO') {

                    novoStatus = 'CANCELADO';

                }


                break;


            default:

                break;

        }


        const jaPagoEAvisoDeOutroPagamento =

            pedido.status === 'PAGO' &&

            novoStatus === 'PAGO' &&

            pagamento.status !== 'approved';


        if (!jaPagoEAvisoDeOutroPagamento) {

            db.prepare(`

                UPDATE pedidos

                SET status = ?,

                    mp_payment_id = ?,

                    mp_status = ?,

                    data_atualizacao = CURRENT_TIMESTAMP

                WHERE id = ?

            `).run(

                novoStatus,

                String(pagamento.id),

                String(pagamento.status),

                pedidoId

            );

        }


        // Baixa o estoque apenas uma vez.

        if (

            novoStatus === 'PAGO' &&

            !pedido.estoque_baixado

        ) {

            const itens = db.prepare(`

                SELECT

                    id_produto,

                    quantidade

                FROM itens_pedido

                WHERE id_pedido = ?

            `).all(pedidoId);


            const baixar = db.prepare(`

                UPDATE produtos

                SET estoque = MAX(estoque - ?, 0),

                    data_atualizacao = CURRENT_TIMESTAMP

                WHERE id = ?

            `);


            for (const item of itens) {

                baixar.run(

                    item.quantidade,

                    item.id_produto

                );

            }


            db.prepare(`

                UPDATE pedidos

                SET estoque_baixado = 1

                WHERE id = ?

            `).run(pedidoId);

        }


        // Esvazia o carrinho quando o pagamento é aprovado

        // ou está em análise.

        if (

            novoStatus === 'PAGO' ||

            PAGAMENTO_EM_ANALISE.includes(pagamento.status)

        ) {

            db.prepare(`

                DELETE FROM itens_carrinho

                WHERE id_carrinho IN (

                    SELECT id

                    FROM carrinho

                    WHERE id_usuario_cliente = ?

                    AND status = 'ABERTO'

                )

            `).run(pedido.id_usuario_cliente);

        }


        return pedidoId;

    });


    return aplicar();

}


// =====================================================

// MERCADO PAGO - SINCRONIZAÇÃO

// =====================================================


export async function sincronizarPagamento(db, paymentId) {

    const pagamento = await chamarMercadoPago(

        `/v1/payments/${encodeURIComponent(paymentId)}`

    );


    return aplicarPagamento(db, pagamento);

}


export async function sincronizarPorPedido(db, pedidoId) {

    const resultado = await chamarMercadoPago(

        `/v1/payments/search?external_reference=${pedidoId}` +

        '&sort=date_created&criteria=desc&limit=1'

    );


    const pagamento = resultado?.results?.[0];


    if (!pagamento) {

        return null;

    }


    return aplicarPagamento(db, pagamento);

}


export function responderErroPagamento(

res,

erro,

mensagemPadrao

) {

    if (erro instanceof ErroPagamento) {

        return res.status(erro.status).json({

            sucesso: false,

            mensagem: erro.message

        });

    }


    console.error(mensagemPadrao, erro);


    return res.status(500).json({

        sucesso: false,

        mensagem: mensagemPadrao

    });

}
