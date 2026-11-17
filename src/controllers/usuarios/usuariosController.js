import { db } from '../../config/database.js';
import { responderErro } from '../../utils/helpers.js';

// =====================================================
// USUÁRIO LOGADO (restaura a sessão ao recarregar a página)
// Rota: GET /api/me
// =====================================================

export function buscarUsuarioLogado(req, res) {
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
}

// =====================================================
// CONSULTAR USUÁRIOS
// Rota: GET /api/usuarios
// =====================================================

export function listarUsuarios(req, res) {
    try {
        const usuarios = db.prepare(`
            SELECT
                id,
                nome,
                cpf,
                email,
                id_tipo_usuario,
                usuario,
                telefone,
                data_cadastro,
                data_atualizacao,
                status
            FROM usuarios
            ORDER BY nome
        `).all();

        return res.json({
            sucesso: true,
            dados: usuarios
        });
    } catch (erro) {
        return responderErro(res, erro, 'Erro ao consultar usuários.');
    }
}
