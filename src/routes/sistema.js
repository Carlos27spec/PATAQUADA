// =====================================================
// ROTAS - SISTEMA (teste, status e usuário logado)
// Montadas no server.js com app.use(...). Os caminhos completos
// (/api/...) ficam aqui mesmo.
// =====================================================

import express from 'express';
import { db, arquivoBanco } from '../config/database.js';
import { responderErro } from '../utils/helpers.js';


export default function criarRotasSistema({ autenticar }) {
    const router = express.Router();

    // =====================================================

    // ROTA DE TESTE DO SERVIDOR

    // =====================================================


    router.get('/', (req, res) => {

        return res.json({

            sucesso: true,

            mensagem: 'API PataQuada funcionando!',

            banco: arquivoBanco,

            tabelas: db.prepare(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                ORDER BY name
            `).all().map(t => t.name)

        });

    });


    // =====================================================

    // VERIFICAR CONEXÃO COM O BANCO

    // =====================================================


    router.get('/api/status', (req, res) => {

        try {

            const resultado = db.prepare(`

                SELECT 1 AS conectado

            `).get();


            return res.json({

                sucesso: true,

                conectado: resultado.conectado === 1,

                banco: arquivoBanco

            });


        } catch (erro) {

            return responderErro(

                res,

                erro,

                'Erro ao verificar conexão com o banco.'

            );

        }

    });


    // Retorna o usuário logado (para restaurar a sessão ao recarregar a página)
    router.get('/api/me', autenticar, (req, res) => {
        try {
            const usuario = db.prepare(`
                SELECT id, nome, email, id_tipo_usuario
                FROM usuarios
                WHERE id = ?
                AND status = 1
            `).get(req.usuario.id);

            if (!usuario) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: 'Usuário não encontrado.'
                });
            }

            return res.json({ sucesso: true, usuario });
        } catch (erro) {
            return responderErro(res, erro, 'Erro ao consultar usuário logado.');
        }
    });


    return router;
}
