// =====================================================
// ROTAS - PAGAMENTOS (Mercado Pago)
// Montadas no server.js com app.use(...). Os caminhos completos
// (/api/...) ficam aqui mesmo.
// =====================================================

import express from 'express';
import { db } from '../config/database.js';
import { ErroPagamento } from '../services/mercadoPagoConfig.js';
import { calcularOpcoesFrete, buscarEnderecoDoUsuario, salvarEndereco } from '../services/frete.js';
import { consultarCarrinho } from '../services/carrinho.js';
import { validarEntrega, TIPO_POR_FORMA, chamarMercadoPago, criarPreferenciaMercadoPago, criarPedido, buscarPedidoCompleto, aplicarPagamento, sincronizarPagamento, sincronizarPorPedido, responderErroPagamento } from '../services/pedidos.js';


export default function criarRotasPagamentos({ autenticar }) {
    const router = express.Router();

    // =====================================================

    // MERCADO PAGO - ROTAS DE PAGAMENTO

    // =====================================================


    // CRIAR PEDIDO E PREFERÊNCIA DE PAGAMENTO


    router.post(

        '/api/pagamentos/preferencia',

        autenticar,

        async (req, res) => {

            let pedidoId = null;


            try {

                const forma = String(

                    req.body?.forma ?? 'TODAS'

                ).toUpperCase();


                if (

                    forma !== 'TODAS' &&

                    !TIPO_POR_FORMA[forma]

                ) {

                    throw new ErroPagamento(

                        'Forma de pagamento inválida.'

                    );

                }


                // Endereço: um salvo na conta (id_endereco) ou digitado.
                const idEndereco = Number(req.body?.id_endereco);
                let dadosEntrega = req.body?.entrega ?? {};

                if (Number.isInteger(idEndereco) && idEndereco > 0) {
                    const salvo = buscarEnderecoDoUsuario(
                        db,
                        req.usuario.id,
                        idEndereco
                    );

                    if (!salvo) {
                        throw new ErroPagamento(
                            'Endereço de entrega não encontrado.',
                            404
                        );
                    }

                    dadosEntrega = {
                        ...salvo,
                        destinatario: dadosEntrega.destinatario,
                        telefone: dadosEntrega.telefone
                    };
                }

                const {
                    dados: entrega,
                    erros
                } = validarEntrega(dadosEntrega);

                if (erros.length > 0) {
                    return res.status(400).json({
                        sucesso: false,
                        mensagem: erros[0],
                        erros
                    });
                }

                const carrinho = consultarCarrinho(req.usuario.id);

                if (carrinho.itens.length === 0) {
                    throw new ErroPagamento(
                        'Seu carrinho está vazio.'
                    );
                }

                for (const item of carrinho.itens) {
                    if (Number(item.status_produto) !== 1) {
                        throw new ErroPagamento(
                            `O produto "${item.nome}" não está mais disponível.`
                        );
                    }

                    if (item.quantidade > item.estoque) {
                        throw new ErroPagamento(
                            `Estoque insuficiente para "${item.nome}". ` +
                            `Disponível: ${item.estoque}.`
                        );
                    }
                }

                // O frete é sempre recalculado aqui no servidor.
                const calculo = await calcularOpcoesFrete(db, {
                    cep: entrega.cep,
                    itens: carrinho.itens
                });

                const codigoFrete = String(
                    req.body?.frete_opcao ?? 'NORMAL'
                ).toUpperCase();

                const opcaoFrete = calculo.opcoes.find(
                    opcao => opcao.codigo === codigoFrete
                );

                if (!opcaoFrete) {
                    throw new ErroPagamento(
                        'Escolha uma opção de envio válida.'
                    );
                }

                const subtotal = carrinho.itens.reduce(
                    (soma, item) => soma + item.preco * item.quantidade,
                    0
                );

                const totais = {
                    subtotal,
                    frete: opcaoFrete.valor,
                    total: subtotal + opcaoFrete.valor
                };

                // Guarda o endereço digitado na conta do cliente.
                if (
                    req.body?.salvar_endereco &&
                    !(Number.isInteger(idEndereco) && idEndereco > 0)
                ) {
                    try {
                        salvarEndereco(db, req.usuario.id, entrega);
                    } catch (erroEndereco) {
                        console.warn(
                            'Não foi possível salvar o endereço:',
                            erroEndereco.message
                        );
                    }
                }

                pedidoId = criarPedido(db, {
                    usuarioId: req.usuario.id,
                    forma,
                    entrega,
                    itens: carrinho.itens,
                    totais,
                    frete: opcaoFrete
                });

                const preferencia = await criarPreferenciaMercadoPago({
                    pedidoId,
                    usuario: req.usuario,
                    entrega,
                    itens: carrinho.itens,
                    frete: totais.frete,
                    freteNome: opcaoFrete.nome,
                    forma
                });


                if (!preferencia.init_point) {

                    throw new ErroPagamento(

                        'O Mercado Pago não devolveu o link de pagamento.',

                        502

                    );

                }


                db.prepare(`

                    UPDATE pedidos

                    SET mp_preference_id = ?,

                        data_atualizacao = CURRENT_TIMESTAMP

                    WHERE id = ?

                `).run(

                    String(preferencia.id),

                    pedidoId

                );

                // Como no Mercado Livre: ao ir para o pagamento, os itens saem
                // do carrinho. Se o pagamento falhar, o cliente paga de novo o
                // mesmo pedido (link_pagamento em /api/pedidos/:id).
                db.prepare(`
                    DELETE FROM itens_carrinho
                    WHERE id_carrinho IN (
                        SELECT id
                        FROM carrinho
                        WHERE id_usuario_cliente = ?
                        AND status = 'ABERTO'
                    )
                `).run(req.usuario.id);


                return res.status(201).json({

                    sucesso: true,

                    pedido_id: pedidoId,

                    init_point: preferencia.init_point

                });


            } catch (erro) {

                if (pedidoId) {

                    db.prepare(`

                        UPDATE pedidos

                        SET status = 'CANCELADO',

                            data_atualizacao = CURRENT_TIMESTAMP

                        WHERE id = ?

                        AND status = 'AGUARDANDO_PAGAMENTO'

                    `).run(pedidoId);

                }


                return responderErroPagamento(

                    res,

                    erro,

                    'Erro ao iniciar o pagamento.'

                );

            }

        }

    );


    // CONFIRMAR PAGAMENTO QUANDO O CLIENTE RETORNA


    router.post(

        '/api/pagamentos/confirmar',

        autenticar,

        async (req, res) => {

            try {

                const paymentId = String(

                    req.body?.payment_id ?? ''

                ).trim();


                let pedidoId = Number(req.body?.pedido_id);


                if (paymentId && /^\d+$/.test(paymentId)) {

                    const pagamento = await chamarMercadoPago(

                        `/v1/payments/${paymentId}`

                    );


                    pedidoId = Number(

                        pagamento.external_reference

                    );


                    const dono = db.prepare(`

                        SELECT id_usuario_cliente

                        FROM pedidos

                        WHERE id = ?

                    `).get(pedidoId);


                    if (

                        !dono ||

                        dono.id_usuario_cliente !== req.usuario.id

                    ) {

                        throw new ErroPagamento(

                            'Pedido não encontrado.',

                            404

                        );

                    }


                    aplicarPagamento(db, pagamento);


                } else if (

                    Number.isInteger(pedidoId) &&

                    pedidoId > 0

                ) {

                    const dono = db.prepare(`

                        SELECT id_usuario_cliente

                        FROM pedidos

                        WHERE id = ?

                    `).get(pedidoId);


                    if (

                        !dono ||

                        dono.id_usuario_cliente !== req.usuario.id

                    ) {

                        throw new ErroPagamento(

                            'Pedido não encontrado.',

                            404

                        );

                    }


                    await sincronizarPorPedido(db, pedidoId);


                } else {

                    throw new ErroPagamento(

                        'Informe o pedido ou o pagamento.'

                    );

                }


                return res.json({

                    sucesso: true,

                    dados: buscarPedidoCompleto(db, pedidoId)

                });


            } catch (erro) {

                return responderErroPagamento(

                    res,

                    erro,

                    'Erro ao confirmar o pagamento.'

                );

            }

        }

    );


    // WEBHOOK DO MERCADO PAGO


    router.post(

        '/api/pagamentos/webhook',

        async (req, res) => {

            // Confirma o recebimento do aviso.

            res.sendStatus(200);


            try {

                const tipo =

                    req.body?.type ||

                    req.query.type ||

                    req.query.topic;


                if (tipo !== 'payment') {

                    return;

                }


                const id =

                    req.body?.data?.id ||

                    req.query['data.id'] ||

                    req.query.id;


                if (

                    !id ||

                    !/^\d+$/.test(String(id))

                ) {

                    return;

                }


                await sincronizarPagamento(

                    db,

                    String(id)

                );


            } catch (erro) {

                console.error(

                    'Erro ao processar webhook:',

                    erro.message

                );

            }

        }

    );


    return router;
}
