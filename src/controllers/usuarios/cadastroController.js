import bcrypt from 'bcrypt';
import { db } from '../../config/database.js';
import { gerarToken } from '../../middlewares/auth.js';
import { responderErro, somenteDigitos, limitar } from '../../utils/helpers.js';
import { Buffer } from 'node:buffer';

// =====================================================
// CADASTRO DE USUÁRIO
// =====================================================

function cpfValido(cpf) {
    const d = somenteDigitos(cpf);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

    const digito = (base) => {
        let soma = 0;
        for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export async function cadastrarUsuario(req, res) {
    try {
        const nomeCompleto = limitar(req.body.nome, 120);
        const email = limitar(req.body.email, 160).toLowerCase();
        const cpf = somenteDigitos(req.body.cpf);
        const senha = String(req.body.senha ?? '');

        // Campos opcionais: nome de usuário e telefone.
        // Se vierem preenchidos, são validados e gravados; se vierem vazios, ficam NULL no banco.
        const usuario = limitar(req.body.usuario, 60).toLowerCase();
        const telefone = somenteDigitos(req.body.telefone);

        // A tabela usuarios tem "nome" e "sobrenome" (os dois obrigatórios).
        // O formulário envia o nome completo: a primeira palavra vira nome e o resto, sobrenome.
        const [nome, ...resto] = nomeCompleto.split(/\s+/);
        const sobrenome = limitar(req.body.sobrenome, 120) || resto.join(' ');

        const erro = (status, campo, mensagem) =>
            res.status(status).json({ sucesso: false, campo, mensagem });

        if (!nome || !sobrenome) {
            return erro(400, 'nome', 'Informe seu nome completo.');
        }

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return erro(400, 'email', 'Informe um e-mail válido.');
        }

        if (!cpfValido(cpf)) {
            return erro(400, 'cpf', 'Informe um CPF válido.');
        }

        if (usuario && !/^[a-z0-9_.]{3,30}$/.test(usuario)) {
            return erro(
                400,
                'usuario',
                'O usuário deve ter de 3 a 30 caracteres, usando letras, números, ponto ou _.'
            );
        }

        if (telefone && !/^\d{10,11}$/.test(telefone)) {
            return erro(400, 'telefone', 'Informe o telefone com DDD (10 ou 11 dígitos).');
        }

        if (senha.length < 8) {
            return erro(400, 'senha', 'A senha precisa ter pelo menos 8 caracteres.');
        }

        // O bcrypt só considera os primeiros 72 bytes da senha.
        if (Buffer.byteLength(senha, 'utf8') > 72) {
            return erro(400, 'senha', 'A senha pode ter no máximo 72 caracteres.');
        }

        // O tipo de usuário NUNCA vem do front: quem se cadastra pelo site é sempre cliente.
        // (se o front pudesse mandar id_tipo_usuario, qualquer pessoa criaria uma conta de administrador)
        const tipoCliente = db.prepare(`
            SELECT id
            FROM tipo_usuario
            WHERE UPPER(tipo) = 'CLIENTE'
        `).get();

        if (!tipoCliente) {
            throw new Error("Tipo de usuário 'CLIENTE' não existe na tabela tipo_usuario.");
        }

        if (db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email)) {
            return erro(409, 'email', 'Este e-mail já está cadastrado.');
        }

        if (db.prepare('SELECT id FROM usuarios WHERE cpf = ?').get(cpf)) {
            return erro(409, 'cpf', 'Este CPF já está cadastrado.');
        }

        if (usuario && db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario)) {
            return erro(409, 'usuario', 'Este nome de usuário já está em uso.');
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        const resultado = db.prepare(`
            INSERT INTO usuarios (
                nome,
                sobrenome,
                cpf,
                email,
                id_tipo_usuario,
                usuario,
                senha,
                telefone
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            nome,
            sobrenome,
            cpf,
            email,
            tipoCliente.id,
            usuario || null,
            senhaCriptografada,
            telefone || null
        );

        const novoUsuario = {
            id: resultado.lastInsertRowid,
            nome,
            email,
            usuario: usuario || null,
            id_tipo_usuario: tipoCliente.id
        };

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Usuário cadastrado com sucesso.',
            token: gerarToken(novoUsuario),
            usuario: novoUsuario
        });
    } catch (erro) {
        // Dois cadastros ao mesmo tempo podem passar pelas checagens acima;
        // o banco (UNIQUE) é a garantia final.
        if (erro.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            const campo = /cpf/i.test(erro.message)
                ? 'cpf'
                : /usuarios\.usuario/i.test(erro.message)
                    ? 'usuario'
                    : 'email';

            const mensagens = {
                cpf: 'Este CPF já está cadastrado.',
                usuario: 'Este nome de usuário já está em uso.',
                email: 'Este e-mail já está cadastrado.'
            };

            return res.status(409).json({
                sucesso: false,
                campo,
                mensagem: mensagens[campo]
            });
        }

        return responderErro(res, erro, 'Erro ao cadastrar usuário.');
    }
}
