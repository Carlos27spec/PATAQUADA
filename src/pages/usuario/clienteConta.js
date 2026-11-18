// =====================================================
// ÁREA DO CLIENTE — PEDIDOS, MINHA CONTA E ENDEREÇOS
//
// Rotas (exigem login; cada cliente só vê e altera os próprios dados):
//   GET    /api/cliente/pedidos
//   GET    /api/cliente/pedidos/:id
//   GET    /api/cliente/dados
//   PUT    /api/cliente/dados
//   PUT    /api/cliente/senha
//   GET    /api/cliente/enderecos
//   POST   /api/cliente/enderecos
//   PUT    /api/cliente/enderecos/:id
//   PUT    /api/cliente/enderecos/:id/principal
//   DELETE /api/cliente/enderecos/:id
// =====================================================

import { MENSAGEM_SENHA, MENSAGEM_SENHA_LONGA, senhaAtendeRequisitos, senhaLongaDemais } from '../../utils/regrasCadastro.js';
import bcrypt from 'bcrypt';

import { STATUS_DO_PEDIDO } from './clienteInicio.js';
import { listarEnderecos, validarEndereco } from '../../services/frete.js';

class ErroCliente extends Error {
    constructor(mensagem, status = 400, campo = null) {
        super(mensagem);
        this.status = status;
        this.campo = campo;
    }
}

// Pedidos que falharam antes de existir o pagamento não aparecem.
const PEDIDO_VISIVEL = `
    id_usuario_cliente = ?
    AND NOT (status = 'CANCELADO' AND mp_preference_id IS NULL)
`;

const NOME_DA_FORMA = {
    PIX: 'Pix',
    CREDITO: 'Cartão de crédito',
    DEBITO: 'Cartão de débito',
    BOLETO: 'Boleto',
    TODAS: 'Mercado Pago'
};

const NOME_DO_ENVIO = {
    NORMAL: 'Envio Normal',
    EXPRESSO: 'Envio Expresso'
};

function digitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
}

function cpfValido(cpf) {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

    const digito = tamanho => {
        let soma = 0;
        for (let i = 0; i < tamanho; i += 1) soma += Number(cpf[i]) * (tamanho + 1 - i);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };

    return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

function situacao(status) {
    return STATUS_DO_PEDIDO[status] ?? { grupo: 'pendente', rotulo: status, detalhe: null };
}

export function registrarContaCliente({ app, db, autenticar }) {

    function responder(res, erro, mensagemPadrao) {
        if (erro instanceof ErroCliente) {
            return res.status(erro.status).json({
                sucesso: false,
                mensagem: erro.message,
                campo: erro.campo
            });
        }

        console.error(mensagemPadrao, erro);

        return res.status(500).json({ sucesso: false, mensagem: mensagemPadrao });
    }

    function idDaRota(req) {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new ErroCliente('Não encontrado.', 404);
        }

        return id;
    }

    // =================================================
    // PEDIDOS
    // =================================================

    app.get('/api/cliente/pedidos', autenticar, (req, res) => {
        try {
            const pedidos = db.prepare(`
                SELECT id, status, subtotal, frete, total, forma_pagamento, data_criacao
                FROM pedidos
                WHERE ${PEDIDO_VISIVEL}
                ORDER BY id DESC
            `).all(req.usuario.id);

            const itens = db.prepare(`
                SELECT nome, imagem, quantidade
                FROM itens_pedido
                WHERE id_pedido = ?
                ORDER BY id
            `);

            const dados = pedidos.map(pedido => {
                const lista = itens.all(pedido.id);

                return {
                    ...pedido,
                    ...situacao(pedido.status),
                    quantidade_itens: lista.reduce((soma, item) => soma + item.quantidade, 0),
                    itens: lista.slice(0, 4)
                };
            });

            return res.json({ sucesso: true, dados });
        } catch (erro) {
            return responder(res, erro, 'Não foi possível carregar seus pedidos.');
        }
    });

    app.get('/api/cliente/pedidos/:id', autenticar, (req, res) => {
        try {
            const pedido = db.prepare(`
                SELECT *
                FROM pedidos
                WHERE id = ? AND ${PEDIDO_VISIVEL}
            `).get(idDaRota(req), req.usuario.id);

            if (!pedido) {
                throw new ErroCliente('Pedido não encontrado.', 404);
            }

            const itens = db.prepare(`
                SELECT id_produto, nome, preco_unitario, quantidade, imagem
                FROM itens_pedido
                WHERE id_pedido = ?
                ORDER BY id
            `).all(pedido.id);

            // Pagar de novo: recusado, ou ainda sem nenhuma tentativa.
            const podePagar =
                pedido.mp_preference_id &&
                (pedido.status === 'FALHOU' ||
                    (pedido.status === 'AGUARDANDO_PAGAMENTO' && !pedido.mp_status));

            return res.json({
                sucesso: true,
                dados: {
                    id: pedido.id,
                    status: pedido.status,
                    ...situacao(pedido.status),
                    data_criacao: pedido.data_criacao,
                    data_atualizacao: pedido.data_atualizacao,
                    subtotal: pedido.subtotal,
                    frete: pedido.frete,
                    total: pedido.total,
                    forma_pagamento: NOME_DA_FORMA[pedido.forma_pagamento] ?? pedido.forma_pagamento,
                    envio: NOME_DO_ENVIO[pedido.frete_opcao] ?? null,
                    prazo_dias: pedido.frete_prazo_dias ?? null,
                    entrega: {
                        destinatario: pedido.entrega_destinatario,
                        telefone: pedido.entrega_telefone,
                        cep: pedido.entrega_cep,
                        logradouro: pedido.entrega_logradouro,
                        numero: pedido.entrega_numero,
                        complemento: pedido.entrega_complemento,
                        bairro: pedido.entrega_bairro,
                        cidade: pedido.entrega_cidade,
                        uf: pedido.entrega_uf
                    },
                    link_pagamento: podePagar
                        ? `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${encodeURIComponent(pedido.mp_preference_id)}`
                        : null,
                    itens
                }
            });
        } catch (erro) {
            return responder(res, erro, 'Não foi possível carregar o pedido.');
        }
    });

    // =================================================
    // MINHA CONTA
    // =================================================

    function dadosDaConta(id) {
        return db.prepare(`
            SELECT id, nome, email, cpf, usuario, telefone, data_cadastro
            FROM usuarios
            WHERE id = ?
        `).get(id);
    }

    app.get('/api/cliente/dados', autenticar, (req, res) => {
        try {
            return res.json({ sucesso: true, dados: dadosDaConta(req.usuario.id) });
        } catch (erro) {
            return responder(res, erro, 'Não foi possível carregar seus dados.');
        }
    });

    app.put('/api/cliente/dados', autenticar, (req, res) => {
        try {
            const atual = dadosDaConta(req.usuario.id);

            const nome = String(req.body?.nome ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
            const email = String(req.body?.email ?? '').trim().toLowerCase().slice(0, 160);
            const usuario = String(req.body?.usuario ?? '').trim().toLowerCase().slice(0, 60);
            const telefone = digitos(req.body?.telefone);
            const cpfInformado = digitos(req.body?.cpf);

            if (nome.split(' ').filter(Boolean).length < 2) {
                throw new ErroCliente('Informe seu nome completo.', 400, 'nome');
            }

            if (!/^\S+@\S+\.\S+$/.test(email)) {
                throw new ErroCliente('Informe um e-mail válido.', 400, 'email');
            }

            if (usuario && !/^[a-z0-9_.]{3,30}$/.test(usuario)) {
                throw new ErroCliente(
                    'O usuário deve ter de 3 a 30 caracteres, usando letras, números, ponto ou _.',
                    400,
                    'usuario'
                );
            }

            if (telefone && !/^\d{10,11}$/.test(telefone)) {
                throw new ErroCliente('Informe o telefone com DDD (10 ou 11 dígitos).', 400, 'telefone');
            }

            // O CPF não muda depois de cadastrado; só pode ser informado
            // por quem ainda não tem.
            let cpf = atual.cpf;

            if (!atual.cpf && cpfInformado) {
                if (!cpfValido(cpfInformado)) {
                    throw new ErroCliente('Informe um CPF válido.', 400, 'cpf');
                }
                cpf = cpfInformado;
            }

            const repetido = (coluna, valor) =>
                valor && db.prepare(`SELECT 1 FROM usuarios WHERE ${coluna} = ? AND id <> ?`)
                    .get(valor, req.usuario.id);

            if (repetido('email', email)) {
                throw new ErroCliente('Este e-mail já está cadastrado em outra conta.', 409, 'email');
            }

            if (repetido('usuario', usuario)) {
                throw new ErroCliente('Este nome de usuário já está em uso.', 409, 'usuario');
            }

            if (cpf !== atual.cpf && repetido('cpf', cpf)) {
                throw new ErroCliente('Este CPF já está cadastrado.', 409, 'cpf');
            }

            db.prepare(`
                UPDATE usuarios
                SET nome = ?, email = ?, usuario = ?, telefone = ?, cpf = ?,
                    data_atualizacao = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(nome, email, usuario || null, telefone || null, cpf, req.usuario.id);

            return res.json({
                sucesso: true,
                mensagem: 'Dados atualizados com sucesso.',
                dados: dadosDaConta(req.usuario.id)
            });
        } catch (erro) {
            return responder(res, erro, 'Não foi possível salvar seus dados.');
        }
    });

    app.put('/api/cliente/senha', autenticar, async (req, res) => {
        try {
            const senhaAtual = String(req.body?.senha_atual ?? '');
            const novaSenha = String(req.body?.nova_senha ?? '');

            if (!senhaAtual) {
                throw new ErroCliente('Informe a sua senha atual.', 400, 'senha_atual');
            }

            if (!senhaAtendeRequisitos(novaSenha)) {
                throw new ErroCliente(MENSAGEM_SENHA, 400, 'nova_senha');
            }

            if (senhaLongaDemais(novaSenha)) {
                throw new ErroCliente(MENSAGEM_SENHA_LONGA, 400, 'nova_senha');
            }

            const { senha } = db.prepare('SELECT senha FROM usuarios WHERE id = ?').get(req.usuario.id);

            if (!(await bcrypt.compare(senhaAtual, senha))) {
                throw new ErroCliente('A senha atual está incorreta.', 400, 'senha_atual');
            }

            if (await bcrypt.compare(novaSenha, senha)) {
                throw new ErroCliente('A nova senha deve ser diferente da atual.', 400, 'nova_senha');
            }

            db.prepare(`
                UPDATE usuarios
                SET senha = ?, data_atualizacao = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(await bcrypt.hash(novaSenha, 10), req.usuario.id);

            return res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso.' });
        } catch (erro) {
            return responder(res, erro, 'Não foi possível alterar a senha.');
        }
    });

    // =================================================
    // ENDEREÇOS
    // =================================================

    function lerEndereco(corpo) {
        const { endereco, erro } = validarEndereco(corpo);

        if (erro) {
            throw new ErroCliente(erro);
        }

        endereco.referencia = String(corpo?.referencia ?? '').trim().slice(0, 150) || null;

        return endereco;
    }

    function enderecoDoCliente(id, idUsuario) {
        const endereco = db.prepare(`
            SELECT id, endereco_principal
            FROM enderecos_usuario
            WHERE id = ? AND id_usuario = ? AND status = 1
        `).get(id, idUsuario);

        if (!endereco) {
            throw new ErroCliente('Endereço não encontrado.', 404);
        }

        return endereco;
    }

    const tornarPrincipal = db.transaction((id, idUsuario) => {
        db.prepare('UPDATE enderecos_usuario SET endereco_principal = 0 WHERE id_usuario = ?')
            .run(idUsuario);
        db.prepare('UPDATE enderecos_usuario SET endereco_principal = 1 WHERE id = ?')
            .run(id);
    });

    const responderLista = (res, status, mensagem, idUsuario) =>
        res.status(status).json({
            sucesso: true,
            mensagem,
            dados: listarEnderecos(db, idUsuario)
        });

    app.get('/api/cliente/enderecos', autenticar, (req, res) => {
        try {
            return res.json({ sucesso: true, dados: listarEnderecos(db, req.usuario.id) });
        } catch (erro) {
            return responder(res, erro, 'Não foi possível carregar seus endereços.');
        }
    });

    app.post('/api/cliente/enderecos', autenticar, (req, res) => {
        try {
            const endereco = lerEndereco(req.body);

            db.transaction(() => {
                const { total } = db.prepare(`
                    SELECT COUNT(*) AS total FROM enderecos_usuario
                    WHERE id_usuario = ? AND status = 1
                `).get(req.usuario.id);

                const resultado = db.prepare(`
                    INSERT INTO enderecos_usuario (
                        id_usuario, apelido, cep, logradouro, numero, complemento,
                        bairro, cidade, uf, referencia, endereco_principal
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                `).run(
                    req.usuario.id, endereco.apelido || null, endereco.cep, endereco.logradouro,
                    endereco.numero, endereco.complemento || null, endereco.bairro,
                    endereco.cidade, endereco.uf, endereco.referencia
                );

                // O primeiro endereço (ou um marcado como principal) vira o principal.
                if (total === 0 || req.body?.principal) {
                    tornarPrincipal(Number(resultado.lastInsertRowid), req.usuario.id);
                }
            })();

            return responderLista(res, 201, 'Endereço adicionado.', req.usuario.id);
        } catch (erro) {
            return responder(res, erro, 'Não foi possível salvar o endereço.');
        }
    });

    app.put('/api/cliente/enderecos/:id', autenticar, (req, res) => {
        try {
            const { id } = enderecoDoCliente(idDaRota(req), req.usuario.id);
            const endereco = lerEndereco(req.body);

            db.transaction(() => {
                db.prepare(`
                    UPDATE enderecos_usuario
                    SET apelido = ?, cep = ?, logradouro = ?, numero = ?, complemento = ?,
                        bairro = ?, cidade = ?, uf = ?, referencia = ?
                    WHERE id = ?
                `).run(
                    endereco.apelido || null, endereco.cep, endereco.logradouro, endereco.numero,
                    endereco.complemento || null, endereco.bairro, endereco.cidade, endereco.uf,
                    endereco.referencia, id
                );

                if (req.body?.principal) {
                    tornarPrincipal(id, req.usuario.id);
                }
            })();

            return responderLista(res, 200, 'Endereço atualizado.', req.usuario.id);
        } catch (erro) {
            return responder(res, erro, 'Não foi possível salvar o endereço.');
        }
    });

    app.put('/api/cliente/enderecos/:id/principal', autenticar, (req, res) => {
        try {
            const { id } = enderecoDoCliente(idDaRota(req), req.usuario.id);
            tornarPrincipal(id, req.usuario.id);
            return responderLista(res, 200, 'Endereço principal alterado.', req.usuario.id);
        } catch (erro) {
            return responder(res, erro, 'Não foi possível alterar o endereço principal.');
        }
    });

    // Exclui só da lista do cliente (status = 0). Os pedidos guardam uma
    // cópia do endereço, então nada se perde no histórico.
    app.delete('/api/cliente/enderecos/:id', autenticar, (req, res) => {
        try {
            const endereco = enderecoDoCliente(idDaRota(req), req.usuario.id);

            db.transaction(() => {
                db.prepare(`
                    UPDATE enderecos_usuario
                    SET status = 0, endereco_principal = 0
                    WHERE id = ?
                `).run(endereco.id);

                // Era o principal: o mais recente que sobrou assume.
                if (endereco.endereco_principal) {
                    const proximo = db.prepare(`
                        SELECT id FROM enderecos_usuario
                        WHERE id_usuario = ? AND status = 1
                        ORDER BY id DESC LIMIT 1
                    `).get(req.usuario.id);

                    if (proximo) {
                        tornarPrincipal(proximo.id, req.usuario.id);
                    }
                }
            })();

            return responderLista(res, 200, 'Endereço excluído.', req.usuario.id);
        } catch (erro) {
            return responder(res, erro, 'Não foi possível excluir o endereço.');
        }
    });

    console.log('Área do cliente: pedidos, conta e endereços disponíveis em /api/cliente/*');
}
