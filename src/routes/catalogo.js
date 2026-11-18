// =====================================================
// ROTAS - CATÁLOGO (produtos, serviços, planos...)
// Montadas no server.js com app.use(...). Os caminhos completos
// (/api/...) ficam aqui mesmo.
// =====================================================

import express from 'express';
import { db } from '../config/database.js';
import { responderErro, consultarTabela } from '../utils/helpers.js';


export default function criarRotasCatalogo() {
    const router = express.Router();

    // =====================================================

    // SERVIÇOS / PET CARE

    // Tabela: servicos

    // =====================================================


    function listarServicos(req, res) {

        try {

            const dados = consultarTabela('servicos');


            return res.json({

                sucesso: true,

                dados

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar serviços de Pet Care.'

            );

        }

    }


    router.get('/api/pet-care', listarServicos);

    router.get('/api/servicos', listarServicos);


    // =====================================================

    // CONSULTAS

    // Tabela: tipos_consulta

    // =====================================================


    router.get('/api/consultas', (req, res) => {

        try {

            const consultas = consultarTabela('tipos_consulta');


            return res.json({

                sucesso: true,

                dados: consultas

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar tipos de consulta.'

            );

        }

    });


    // =====================================================

    // PLANOS

    // Tabela: plano

    // =====================================================


    router.get('/api/planos', (req, res) => {

        try {

            const planos = consultarTabela('plano');


            return res.json({

                sucesso: true,

                dados: planos

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar planos.'

            );

        }

    });


    // =====================================================

    // PRODUTOS

    // =====================================================


    // CONSULTAR TODOS OS PRODUTOS


    router.get('/api/produtos', (req, res) => {

        try {

            const produtos = consultarTabela('produtos');


            return res.json({

                sucesso: true,

                dados: produtos

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar produtos.'

            );

        }

    });


    // PRODUTOS ALEATÓRIOS


    router.get('/api/produtos/aleatorios', (req, res) => {

        try {

            const quantidadeDisponivel = db.prepare(`

                SELECT COUNT(*) AS total

                FROM produtos

                WHERE status = 1

                AND estoque > 0

            `).get();


            const total = quantidadeDisponivel.total;


            if (total === 0) {

                return res.json({

                    sucesso: true,

                    dados: []

                });

            }


            const quantidadeAleatoria =

                Math.floor(Math.random() * 6) + 5;


            const limite = Math.min(

                quantidadeAleatoria,

                total

            );


            const produtos = db.prepare(`

                SELECT

                    id,

                    nome,

                    descricao,

                    preco,

                    estoque,

                    imagem,

                    status

                FROM produtos

                WHERE status = 1

                AND estoque > 0

                ORDER BY RANDOM()

                LIMIT ?

            `).all(limite);


            return res.json({

                sucesso: true,

                total: produtos.length,

                dados: produtos

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar produtos aleatórios.'

            );

        }

    });


    // =====================================================

    // CATEGORIAS DE PRODUTOS

    // =====================================================


    router.get('/api/categorias-produto', (req, res) => {

        try {

            const categorias = consultarTabela(

                'categorias_produto',

                false

            );


            return res.json({

                sucesso: true,

                dados: categorias

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar categorias.'

            );

        }

    });


    // =====================================================

    // PROFISSIONAIS

    // =====================================================


    router.get('/api/profissionais', (req, res) => {

        try {

            const profissionais = consultarTabela(

                'profissionais'

            );


            return res.json({

                sucesso: true,

                dados: profissionais

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar profissionais.'

            );

        }

    });


    // =====================================================

    // TIPOS DE USUÁRIO

    // =====================================================


    router.get('/api/tipos-usuario', (req, res) => {

        try {

            const tipos = consultarTabela(

                'tipo_usuario',

                false

            );


            return res.json({

                sucesso: true,

                dados: tipos

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar tipos de usuário.'

            );

        }

    });


    // =====================================================

    // SITUAÇÕES

    // =====================================================


    router.get('/api/situacoes', (req, res) => {

        try {

            const situacoes = consultarTabela(

                'situacao',

                false

            );


            return res.json({

                sucesso: true,

                dados: situacoes

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao consultar situações.'

            );

        }

    });


    // =====================================================

    // DEBUG - DADOS DAS TABELAS DE SERVIÇOS

    // =====================================================


    router.get('/api/debug/dados-servicos', (req, res) => {

        const tabelasDebug = [

            'servicos',

            'tipos_consulta',

            'plano'

        ];


        const resultado = {};


        try {

            for (const tabela of tabelasDebug) {

                try {

                    const colunas = db.prepare(`

                        PRAGMA table_info("${tabela}")

                    `).all();


                    const dados = db.prepare(`

                        SELECT *

                        FROM "${tabela}"

                    `).all();


                    resultado[tabela] = {

                        total: dados.length,

                        colunas: colunas.map(

    coluna => coluna.name

                        ),

                        dados

                    };


                } catch (erro) {

                    resultado[tabela] = {

                        erro: erro.message

                    };

                }

            }


            return res.json(resultado);


        } catch (erro) {

            console.error(

                'Erro ao consultar tabelas:',

                erro

            );


            return res.status(500).json({

                erro: erro.message

            });

        }

    });


    return router;
}
