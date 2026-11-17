import { Router } from 'express';
import { cadastrarUsuario } from '../controllers/usuarios/cadastroController.js';
import { login } from '../controllers/usuarios/loginController.js';
import {
    solicitarRedefinicaoSenha,
    redefinirSenha
} from '../controllers/usuarios/redefinicaoSenhaController.js';
import { listarUsuarios } from '../controllers/usuarios/usuariosController.js';

// =====================================================
// ROTAS DE USUÁRIOS
// Montadas em /api/usuarios no server.js
// =====================================================

export default function criarRotasUsuarios(autenticar) {
    const router = Router();

    router.post('/cadastro', cadastrarUsuario);
    router.post('/login', login);
    router.post('/solicitar-redefinicao-senha', solicitarRedefinicaoSenha);
    router.post('/redefinir-senha', redefinirSenha);
    router.get('/', autenticar, listarUsuarios);

    return router;
}
