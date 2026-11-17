import bcrypt from 'bcrypt';
import { db } from '../../config/database.js';
import { gerarToken } from '../../middlewares/auth.js';
import { responderErro } from '../../utils/helpers.js';

// =====================================================
// LOGIN
// =====================================================

export async function login(req, res) {
    try {
        const { email, senha } = req.body;
        const identificador = String(email ?? '').trim();

        if (!identificador || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe o e-mail (ou usuário) e a senha.'
            });
        }

        const usuario = db.prepare(`
            SELECT
                id,
                nome,
                email,
                senha,
                id_tipo_usuario
            FROM usuarios
            WHERE (LOWER(email) = LOWER(?) OR LOWER(usuario) = LOWER(?))
            AND status = 1
        `).get(identificador, identificador);

        if (!usuario) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'E-mail ou senha inválidos.'
            });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({
                sucesso: false,
                mensagem: 'E-mail ou senha inválidos.'
            });
        }

        const dadosUsuario = {
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email,
            id_tipo_usuario: usuario.id_tipo_usuario
        };

        return res.status(200).json({
            sucesso: true,
            mensagem: 'Login realizado com sucesso.',
            token: gerarToken(dadosUsuario),
            usuario: dadosUsuario
        });
    } catch (erro) {
        return responderErro(res, erro, 'Erro ao realizar login.');
    }
}
