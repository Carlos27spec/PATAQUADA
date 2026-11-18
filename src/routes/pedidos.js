// =====================================================
// ROTAS - PEDIDOS DO CLIENTE
// Montadas no server.js com app.use(...). Os caminhos completos
// (/api/...) ficam aqui mesmo.
// =====================================================

import express from 'express';
import { db } from '../config/database.js';
import { buscarPedidoCompleto, responderErroPagamento } from '../services/pedidos.js';


export default function criarRotasPedidos({ autenticar }) {
    const router = express.Router();

    // =====================================================

    // PEDIDOS DO CLIENTE

    // =====================================================


    // LISTAR PEDIDOS


    router.get('/api/pedidos', autenticar, (req, res) => {

        try {

            const ids = db.prepare(`

                SELECT id

                FROM pedidos

                WHERE id_usuario_cliente = ?

                ORDER BY id DESC

            `).all(req.usuario.id);


            return res.json({

                sucesso: true,

                dados: ids.map(

                    ({ id }) => buscarPedidoCompleto(db, id)

                )

            });


        } catch (erro) {

            return responderErroPagamento(

                res,

                erro,

                'Erro ao consultar pedidos.'

            );

        }

    });


    // CONSULTAR PEDIDO ESPECÍFICO


    router.get('/api/pedidos/:id', autenticar, (req, res) => {

        try {

            const pedido = buscarPedidoCompleto(

                db,

                Number(req.params.id)

            );


            if (

                !pedido ||

                pedido.id_usuario_cliente !== req.usuario.id

            ) {

                return res.status(404).json({

                    sucesso: false,

                    mensagem: 'Pedido não encontrado.'

                });

            }


            return res.json({

                sucesso: true,

                dados: pedido

            });


        } catch (erro) {

            return responderErroPagamento(

                res,

                erro,

                'Erro ao consultar pedido.'

            );

        }

    });


    return router;
}
