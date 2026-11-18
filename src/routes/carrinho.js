// =====================================================
// ROTAS - CARRINHO
// Montadas no server.js com app.use(...). Os caminhos completos
// (/api/...) ficam aqui mesmo.
// =====================================================

import express from 'express';
import { db } from '../config/database.js';
import { responderErro } from '../utils/helpers.js';
import { obterOuCriarCarrinho, consultarCarrinho, adicionarItemCarrinho } from '../services/carrinho.js';


export default function criarRotasCarrinho({ autenticar }) {
    const router = express.Router();

    // =====================================================

    // CARRINHO

    // =====================================================


    // CONSULTAR CARRINHO


    router.get('/api/carrinho', autenticar, (req, res) => {

        try {

            const carrinho = consultarCarrinho(req.usuario.id);


            return res.json({

                sucesso: true,

                dados: carrinho

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar carrinho.'

            );

        }

    });


    // ADICIONAR ITEM


    router.post('/api/carrinho/itens', autenticar, (req, res) => {

        try {

            const {

                id_produto,

                quantidade = 1

            } = req.body;


            if (

                !Number.isInteger(Number(id_produto)) ||

                Number(id_produto) <= 0 ||

                !Number.isInteger(Number(quantidade)) ||

                Number(quantidade) <= 0

            ) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem: 'Informe um produto e uma quantidade válidos.'

                });

            }


            const idCarrinho = obterOuCriarCarrinho(req.usuario.id);


            adicionarItemCarrinho(

                idCarrinho,

                Number(id_produto),

                Number(quantidade)

            );


            return res.json({

                sucesso: true,

                mensagem: 'Produto adicionado ao carrinho.',

                dados: consultarCarrinho(req.usuario.id)

            });


        } catch (erro) {

            if (

                erro.message.includes('Produto não encontrado') ||

                erro.message.includes('Estoque insuficiente')

            ) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem: erro.message

                });

            }


            return responderErro(

                res,

                erro,

                'Erro ao adicionar produto ao carrinho.'

            );

        }

    });


    // ATUALIZAR QUANTIDADE


    router.put(

        '/api/carrinho/itens/:idProduto',

        autenticar,

        (req, res) => {

            try {

                const idProduto = Number(req.params.idProduto);

                const quantidade = Number(req.body.quantidade);


                if (

                    !Number.isInteger(idProduto) ||

                    idProduto <= 0 ||

                    !Number.isInteger(quantidade) ||

                    quantidade <= 0

                ) {

                    return res.status(400).json({

                        sucesso: false,

                        mensagem: 'Informe uma quantidade válida.'

                    });

                }


                const carrinho = db.prepare(`

                    SELECT id

                    FROM carrinho

                    WHERE id_usuario_cliente = ?

                    AND status = 'ABERTO'

                `).get(req.usuario.id);


                if (!carrinho) {

                    return res.status(404).json({

                        sucesso: false,

                        mensagem: 'Carrinho não encontrado.'

                    });

                }


                const produto = db.prepare(`

                    SELECT estoque

                    FROM produtos

                    WHERE id = ?

                    AND status = 1

                `).get(idProduto);


                if (!produto) {

                    return res.status(404).json({

                        sucesso: false,

                        mensagem: 'Produto não encontrado ou indisponível.'

                    });

                }


                if (quantidade > produto.estoque) {

                    return res.status(400).json({

                        sucesso: false,

                        mensagem: `Estoque insuficiente. Disponível: ${produto.estoque}.`

                    });

                }


                const resultado = db.prepare(`

                    UPDATE itens_carrinho

                    SET quantidade = ?

                    WHERE id_carrinho = ?

                    AND id_produto = ?

                `).run(

                    quantidade,

                    carrinho.id,

                    idProduto

                );


                if (resultado.changes === 0) {

                    return res.status(404).json({

                        sucesso: false,

                        mensagem: 'Item não encontrado no carrinho.'

                    });

                }


                db.prepare(`

                    UPDATE carrinho

                    SET data_atualizacao = CURRENT_TIMESTAMP

                    WHERE id = ?

                `).run(carrinho.id);


                return res.json({

                    sucesso: true,

                    mensagem: 'Quantidade atualizada.',

                    dados: consultarCarrinho(req.usuario.id)

                });


            } catch (erro) {

                return responderErro(

                    res,

                    erro,

                    'Erro ao atualizar quantidade.'

                );

            }

        }

    );


    // REMOVER ITEM


    router.delete(

        '/api/carrinho/itens/:idProduto',

        autenticar,

        (req, res) => {

            try {

                const idProduto = Number(req.params.idProduto);


                const carrinho = db.prepare(`

                    SELECT id

                    FROM carrinho

                    WHERE id_usuario_cliente = ?

                    AND status = 'ABERTO'

                `).get(req.usuario.id);


                if (!carrinho) {

                    return res.status(404).json({

                        sucesso: false,

                        mensagem: 'Carrinho não encontrado.'

                    });

                }


                const resultado = db.prepare(`

                    DELETE FROM itens_carrinho

                    WHERE id_carrinho = ?

                    AND id_produto = ?

                `).run(carrinho.id, idProduto);


                if (resultado.changes === 0) {

                    return res.status(404).json({

                        sucesso: false,

                        mensagem: 'Item não encontrado no carrinho.'

                    });

                }


                db.prepare(`

                    UPDATE carrinho

                    SET data_atualizacao = CURRENT_TIMESTAMP

                    WHERE id = ?

                `).run(carrinho.id);


                return res.json({

                    sucesso: true,

                    mensagem: 'Produto removido do carrinho.',

                    dados: consultarCarrinho(req.usuario.id)

                });


            } catch (erro) {

                return responderErro(

                    res,

                    erro,

                    'Erro ao remover produto do carrinho.'

                );

            }

        }

    );


    // ESVAZIAR CARRINHO


    router.delete('/api/carrinho', autenticar, (req, res) => {

        try {

            const carrinho = db.prepare(`

                SELECT id

                FROM carrinho

                WHERE id_usuario_cliente = ?

                AND status = 'ABERTO'

            `).get(req.usuario.id);


            if (carrinho) {

                db.prepare(`

                    DELETE FROM itens_carrinho

                    WHERE id_carrinho = ?

                `).run(carrinho.id);


                db.prepare(`

                    UPDATE carrinho

                    SET data_atualizacao = CURRENT_TIMESTAMP

                    WHERE id = ?

                `).run(carrinho.id);

            }


            return res.json({

                sucesso: true,

                mensagem: 'Carrinho esvaziado.',

                dados: consultarCarrinho(req.usuario.id)

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao esvaziar carrinho.'

            );

        }

    });


    // SINCRONIZAR CARRINHO LOCAL COM A CONTA


    router.post('/api/carrinho/sincronizar', autenticar, (req, res) => {

        try {

            const { itens } = req.body;


            if (!Array.isArray(itens)) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem: 'A lista de itens do carrinho é inválida.'

                });

            }


            const sincronizar = db.transaction(() => {

                const idCarrinho = obterOuCriarCarrinho(req.usuario.id);


                for (const item of itens) {

                    const idProduto = Number(item.id_produto);

                    const quantidade = Number(item.quantidade);


                    if (

                        !Number.isInteger(idProduto) ||

                        idProduto <= 0 ||

                        !Number.isInteger(quantidade) ||

                        quantidade <= 0

                    ) {

                        throw new Error(

                            'Um ou mais itens possuem dados inválidos.'

                        );

                    }


                    adicionarItemCarrinho(

                        idCarrinho,

                        idProduto,

                        quantidade

                    );

                }

            });


            sincronizar();


            return res.json({

                sucesso: true,

                mensagem: 'Carrinho sincronizado com sucesso.',

                dados: consultarCarrinho(req.usuario.id)

            });


        } catch (erro) {

            if (

                erro.message.includes('Produto não encontrado') ||

                erro.message.includes('Estoque insuficiente') ||

                erro.message.includes('dados inválidos')

            ) {

                return res.status(400).json({

                    sucesso: false,

                    mensagem: erro.message

                });

            }


            return responderErro(

                res,

                erro,

                'Erro ao sincronizar carrinho.'

            );

        }

    });


    return router;
}
