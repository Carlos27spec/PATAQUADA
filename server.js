import 'dotenv/config';



import express from 'express';
import { db, arquivoBanco } from './src/config/database.js';
import { gerarToken, criarMiddlewareAutenticacao } from './src/middlewares/auth.js';
import { configuracaoPagamento, ErroPagamento } from './src/services/mercadoPagoConfig.js';
import criarRotasContato from './src/routes/contato.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';








// =====================================================

// CONFIGURAÇÕES INICIAIS

// =====================================================





const app = express();

const PORT = process.env.PORT || 4000;



const MP_API = (

    process.env.MP_API || 'https://api.mercadopago.com'

).replace(/\/$/, '');



// =====================================================

// CORS

// =====================================================



app.use((req, res, next) => {

    res.header(

        'Access-Control-Allow-Origin',

        'http://localhost:5173'

    );



    res.header(

        'Access-Control-Allow-Methods',

        'GET, POST, PUT, DELETE, OPTIONS'

    );



    res.header(

        'Access-Control-Allow-Headers',

        'Content-Type, Authorization'

    );



    if (req.method === 'OPTIONS') {

        return res.sendStatus(204);

    }



    next();

});



app.use(express.json());

app.use(express.urlencoded({ extended: true }));



// =====================================================

// CONEXÃO COM O BANCO DE DADOS

// =====================================================




if (!process.env.JWT_SECRET) {

    console.warn(

        'AVISO: JWT_SECRET não configurado. Utilize uma chave própria no .env.'

    );

}



// =====================================================

// FUNÇÕES AUXILIARES

// =====================================================



function responderErro(

res,

erro,

mensagem = 'Erro interno do servidor.'

) {

    console.error(mensagem, erro);



    return res.status(500).json({

        sucesso: false,

        mensagem,

        erro: erro.message

    });

}



function consultarTabela(tabela, statusAtivo = true) {

    const existe = db.prepare(`

        SELECT name

        FROM sqlite_master

        WHERE type = 'table'

        AND name = ?

    `).get(tabela);



    if (!existe) {

        throw new Error(`Tabela ${tabela} não encontrada no banco.`);

    }



    const colunas = db.prepare(`

        PRAGMA table_info("${tabela}")

    `).all();



    const possuiStatus = colunas.some(

coluna => coluna.name === 'status'

    );



    const possuiNome = colunas.some(

coluna => coluna.name === 'nome'

    );



    const possuiId = colunas.some(

coluna => coluna.name === 'id'

    );



    let sql = `SELECT * FROM "${tabela}"`;



    if (statusAtivo && possuiStatus) {

        sql += `

            WHERE UPPER(TRIM(CAST(status AS TEXT)))

            IN ('A', 'ATIVO', '1')

        `;

    }



    if (possuiNome) {

        sql += ' ORDER BY nome';

    } else if (possuiId) {

        sql += ' ORDER BY id';

    }



    return db.prepare(sql).all();

}



function somenteDigitos(valor) {

    return String(valor ?? '').replace(/\D/g, '');

}



function limitar(valor, tamanho) {

    return String(valor ?? '').trim().slice(0, tamanho);

}



// =====================================================

// AUTENTICAÇÃO POR TOKEN

// =====================================================



const autenticar = criarMiddlewareAutenticacao(db);

// =====================================================

// FUNÇÕES DO CARRINHO

// =====================================================



function obterOuCriarCarrinho(idUsuario) {

    let carrinho = db.prepare(`

        SELECT id

        FROM carrinho

        WHERE id_usuario_cliente = ?

        AND status = 'ABERTO'

    `).get(idUsuario);



    if (!carrinho) {

        const resultado = db.prepare(`

            INSERT INTO carrinho (

                id_usuario_cliente

            )

            VALUES (?)

        `).run(idUsuario);



        carrinho = {

            id: resultado.lastInsertRowid

        };

    }



    return carrinho.id;

}



function consultarCarrinho(idUsuario) {

    const carrinho = db.prepare(`

        SELECT

            id,

            data_criacao,

            data_atualizacao,

            status

        FROM carrinho

        WHERE id_usuario_cliente = ?

        AND status = 'ABERTO'

    `).get(idUsuario);



    if (!carrinho) {

        return {

            id: null,

            itens: [],

            quantidade_itens: 0,

            total: 0

        };

    }



    const itens = db.prepare(`

        SELECT

            ic.id,

            ic.id_produto,

            ic.quantidade,

            ic.data_adicao,

            p.nome,

            p.descricao,

            p.preco,

            p.estoque,

            p.imagem,

            p.status AS status_produto,

            (p.preco * ic.quantidade) AS subtotal

        FROM itens_carrinho ic

        INNER JOIN produtos p

            ON p.id = ic.id_produto

        WHERE ic.id_carrinho = ?

        ORDER BY ic.data_adicao DESC

    `).all(carrinho.id);



    const quantidadeItens = itens.reduce(

        (total, item) => total + item.quantidade,

        0

    );



    const total = itens.reduce(

        (soma, item) => soma + item.subtotal,

        0

    );



    return {

        ...carrinho,

        itens,

        quantidade_itens: quantidadeItens,

        total

    };

}



function adicionarItemCarrinho(

idCarrinho,

idProduto,

quantidade

) {

    const produto = db.prepare(`

        SELECT id, preco, estoque, status

        FROM produtos

        WHERE id = ?

        AND status = 1

    `).get(idProduto);



    if (!produto) {

        throw new Error('Produto não encontrado ou indisponível.');

    }



    const itemExistente = db.prepare(`

        SELECT quantidade

        FROM itens_carrinho

        WHERE id_carrinho = ?

        AND id_produto = ?

    `).get(idCarrinho, idProduto);



    const quantidadeFinal =

        (itemExistente?.quantidade || 0) + quantidade;



    if (quantidadeFinal > produto.estoque) {

        throw new Error(

            `Estoque insuficiente. Disponível: ${produto.estoque}.`

        );

    }



    db.prepare(`

        INSERT INTO itens_carrinho (

            id_carrinho,

            id_produto,

            quantidade

        )

        VALUES (?, ?, ?)

        ON CONFLICT(id_carrinho, id_produto)

        DO UPDATE SET

            quantidade = excluded.quantidade

    `).run(

        idCarrinho,

        idProduto,

        quantidadeFinal

    );



    db.prepare(`

        UPDATE carrinho

        SET data_atualizacao = CURRENT_TIMESTAMP

        WHERE id = ?

    `).run(idCarrinho);

}



// =====================================================

// MERCADO PAGO - CONFIGURAÇÕES

// =====================================================



// =====================================================

// MERCADO PAGO - TABELAS DE PEDIDOS

// =====================================================



const SQL_TABELAS_PEDIDOS = `

CREATE TABLE IF NOT EXISTS pedidos (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    id_usuario_cliente INTEGER NOT NULL,

    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),

    frete INTEGER NOT NULL DEFAULT 0 CHECK (frete >= 0),

    total INTEGER NOT NULL CHECK (total >= 0),

    forma_pagamento TEXT NOT NULL DEFAULT 'TODAS',



    status TEXT NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO'

        CHECK (status IN (

            'AGUARDANDO_PAGAMENTO',

            'PAGO',

            'EM_SEPARACAO',

            'ENVIADO',

            'ENTREGUE',

            'CANCELADO',

            'FALHOU'

        )),



    mp_preference_id TEXT,

    mp_payment_id TEXT,

    mp_status TEXT,



    estoque_baixado INTEGER NOT NULL DEFAULT 0

        CHECK (estoque_baixado IN (0, 1)),



    entrega_destinatario TEXT NOT NULL,

    entrega_telefone TEXT NOT NULL,

    entrega_cep TEXT NOT NULL,

    entrega_logradouro TEXT NOT NULL,

    entrega_numero TEXT NOT NULL,

    entrega_complemento TEXT,

    entrega_bairro TEXT NOT NULL,

    entrega_cidade TEXT NOT NULL,

    entrega_uf TEXT NOT NULL,



    data_criacao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    data_atualizacao TEXT,



    FOREIGN KEY (id_usuario_cliente)

        REFERENCES usuarios(id)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) STRICT;



CREATE TABLE IF NOT EXISTS itens_pedido (

    id INTEGER PRIMARY KEY AUTOINCREMENT,

    id_pedido INTEGER NOT NULL,

    id_produto INTEGER NOT NULL,

    nome TEXT NOT NULL,

    preco_unitario INTEGER NOT NULL CHECK (preco_unitario >= 0),

    quantidade INTEGER NOT NULL CHECK (quantidade > 0),

    imagem TEXT,



    FOREIGN KEY (id_pedido)

        REFERENCES pedidos(id)

        ON UPDATE CASCADE

        ON DELETE CASCADE,



    FOREIGN KEY (id_produto)

        REFERENCES produtos(id)

        ON UPDATE CASCADE

        ON DELETE RESTRICT

) STRICT;



CREATE INDEX IF NOT EXISTS idx_pedidos_usuario

    ON pedidos (id_usuario_cliente);



CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido

    ON itens_pedido (id_pedido);

`;



db.exec(SQL_TABELAS_PEDIDOS);



// =====================================================

// MERCADO PAGO - CÁLCULO DOS VALORES

// =====================================================



function reais(centavos) {

    return Number((centavos / 100).toFixed(2));

}



function calcularTotais(itens) {

    const {

        fretePadrao,

        freteGratisAPartirDe

    } = configuracaoPagamento();



    const subtotal = itens.reduce(

        (soma, item) => soma + item.preco * item.quantidade,

        0

    );



    const frete =

        itens.length === 0 ||

        subtotal >= freteGratisAPartirDe

            ? 0

            : fretePadrao;



    return {

        subtotal,

        frete,

        total: subtotal + frete

    };

}



// =====================================================

// MERCADO PAGO - VALIDAÇÃO DA ENTREGA

// =====================================================



function validarEntrega(entrega = {}) {

    const dados = {

        destinatario: limitar(entrega.destinatario, 120),

        telefone: somenteDigitos(entrega.telefone).slice(0, 11),

        cep: somenteDigitos(entrega.cep).slice(0, 8),

        logradouro: limitar(entrega.logradouro, 150),

        numero: limitar(entrega.numero, 15),

        complemento: limitar(entrega.complemento, 80),

        bairro: limitar(entrega.bairro, 80),

        cidade: limitar(entrega.cidade, 80),

        uf: limitar(entrega.uf, 2).toUpperCase()

    };



    const erros = [];



    if (dados.destinatario.length < 3) {

        erros.push(

            'Informe o nome de quem vai receber o pedido.'

        );

    }



    if (dados.telefone.length < 10) {

        erros.push('Informe um telefone com DDD.');

    }



    if (dados.cep.length !== 8) {

        erros.push('Informe um CEP válido.');

    }



    if (!dados.logradouro) {

        erros.push('Informe a rua do endereço de entrega.');

    }



    if (!dados.numero) {

        erros.push('Informe o número do endereço de entrega.');

    }



    if (!dados.bairro) {

        erros.push('Informe o bairro.');

    }



    if (!dados.cidade) {

        erros.push('Informe a cidade.');

    }



    if (!/^[A-Z]{2}$/.test(dados.uf)) {

        erros.push('Informe a sigla do estado (UF).');

    }



    return { dados, erros };

}



// =====================================================

// MERCADO PAGO - FORMAS DE PAGAMENTO

// =====================================================



const TIPOS_PAGAMENTO = [

    'account_money',

    'ticket',

    'atm',

    'bank_transfer',

    'credit_card',

    'debit_card',

    'prepaid_card'

];



const TIPO_POR_FORMA = {

    PIX: 'bank_transfer',

    CREDITO: 'credit_card',

    DEBITO: 'debit_card',

    BOLETO: 'ticket'

};



function metodosDePagamento(forma) {

    const permitido = TIPO_POR_FORMA[forma];



    if (!permitido) {

        return undefined;

    }



    const metodos = {

        excluded_payment_types: TIPOS_PAGAMENTO

            .filter(tipo => tipo !== permitido)

            .map(id => ({ id }))

    };



    if (forma === 'CREDITO') {

        metodos.installments = 12;

        metodos.default_installments = 1;

    }



    return metodos;

}



// =====================================================

// MERCADO PAGO - COMUNICAÇÃO COM A API

// =====================================================



async function chamarMercadoPago(

caminho,

    { metodo = 'GET', corpo } = {}

) {

    const { token } = configuracaoPagamento();



    if (!token) {

        throw new ErroPagamento(

            'Pagamento indisponível no momento. Tente novamente mais tarde.',

            503

        );

    }



    let resposta;



    try {

        resposta = await fetch(`${MP_API}${caminho}`, {

            method: metodo,

            headers: {

                Authorization: `Bearer ${token}`,

                'Content-Type': 'application/json'

            },

            body: corpo ? JSON.stringify(corpo) : undefined

        });



    } catch (erro) {

        console.error(

            'Falha de rede ao falar com o Mercado Pago:',

            erro

        );



        throw new ErroPagamento(

            'Não foi possível conectar ao Mercado Pago.',

            502

        );

    }



    const dados = await resposta.json().catch(() => ({}));



    if (!resposta.ok) {

        console.error(

            'Mercado Pago respondeu com erro:',

            resposta.status,

            JSON.stringify(dados)

        );



        throw new ErroPagamento(

            'O Mercado Pago não aceitou a requisição. Tente novamente.',

            502

        );

    }



    return dados;

}



// =====================================================

// MERCADO PAGO - CRIAÇÃO DA PREFERÊNCIA

// =====================================================



async function criarPreferenciaMercadoPago({

pedidoId,

usuario,

entrega,

itens,

frete,

forma

}) {

    const {

        frontendUrl,

        backendUrl

    } = configuracaoPagamento();



    const itensMP = itens.map(item => ({

        id: String(item.id_produto),

        title: String(item.nome).slice(0, 250),

        quantity: item.quantidade,

        currency_id: 'BRL',

        unit_price: reais(item.preco)

    }));



    if (frete > 0) {

        itensMP.push({

            id: 'frete',

            title: 'Frete',

            quantity: 1,

            currency_id: 'BRL',

            unit_price: reais(frete)

        });

    }



    const preferencia = {

        items: itensMP,



        payer: {

            name: usuario.nome,

            email: usuario.email,

            phone: {

                area_code: entrega.telefone.slice(0, 2),

                number: entrega.telefone.slice(2)

            }

        },



        back_urls: {

            success: `${frontendUrl}/pedido/sucesso`,

            pending: `${frontendUrl}/pedido/pendente`,

            failure: `${frontendUrl}/pedido/falha`

        },



        external_reference: String(pedidoId),



        statement_descriptor: 'PATAQUADA',



        metadata: {

            pedido_id: pedidoId

        }

    };



    if (frontendUrl.startsWith('https://')) {

        preferencia.auto_return = 'approved';

    }



    if (backendUrl.startsWith('https://')) {

        preferencia.notification_url =

            `${backendUrl}/api/pagamentos/webhook`;

    }



    const metodos = metodosDePagamento(forma);



    if (metodos) {

        preferencia.payment_methods = metodos;

    }



    return chamarMercadoPago('/checkout/preferences', {

        metodo: 'POST',

        corpo: preferencia

    });

}



// =====================================================

// MERCADO PAGO - CRIAÇÃO DO PEDIDO

// =====================================================



function criarPedido(

db,

    { usuarioId, forma, entrega, itens, totais }

) {

    const criar = db.transaction(() => {

        const resultado = db.prepare(`

            INSERT INTO pedidos (

                id_usuario_cliente,

                subtotal,

                frete,

                total,

                forma_pagamento,

                entrega_destinatario,

                entrega_telefone,

                entrega_cep,

                entrega_logradouro,

                entrega_numero,

                entrega_complemento,

                entrega_bairro,

                entrega_cidade,

                entrega_uf

            )

            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

        `).run(

            usuarioId,

            totais.subtotal,

            totais.frete,

            totais.total,

            forma,

            entrega.destinatario,

            entrega.telefone,

            entrega.cep,

            entrega.logradouro,

            entrega.numero,

            entrega.complemento || null,

            entrega.bairro,

            entrega.cidade,

            entrega.uf

        );



        const pedidoId = Number(resultado.lastInsertRowid);



        const inserirItem = db.prepare(`

            INSERT INTO itens_pedido (

                id_pedido,

                id_produto,

                nome,

                preco_unitario,

                quantidade,

                imagem

            )

            VALUES (?, ?, ?, ?, ?, ?)

        `);



        for (const item of itens) {

            inserirItem.run(

                pedidoId,

                item.id_produto,

                item.nome,

                item.preco,

                item.quantidade,

                item.imagem ?? null

            );

        }



        return pedidoId;

    });



    return criar();

}



// =====================================================

// MERCADO PAGO - CONSULTA DO PEDIDO

// =====================================================



function buscarPedidoCompleto(db, pedidoId) {

    const pedido = db.prepare(`

        SELECT

            id,

            id_usuario_cliente,

            subtotal,

            frete,

            total,

            forma_pagamento,

            status,

            mp_payment_id,

            mp_status,

            entrega_destinatario,

            entrega_telefone,

            entrega_cep,

            entrega_logradouro,

            entrega_numero,

            entrega_complemento,

            entrega_bairro,

            entrega_cidade,

            entrega_uf,

            data_criacao,

            data_atualizacao

        FROM pedidos

        WHERE id = ?

    `).get(pedidoId);



    if (!pedido) {

        return null;

    }



    pedido.itens = db.prepare(`

        SELECT

            id_produto,

            nome,

            preco_unitario,

            quantidade,

            imagem

        FROM itens_pedido

        WHERE id_pedido = ?

        ORDER BY id

    `).all(pedidoId);



    return pedido;

}



// =====================================================

// MERCADO PAGO - ATUALIZAÇÃO DO PAGAMENTO

// =====================================================



const ANTES_DO_PAGAMENTO = [

    'AGUARDANDO_PAGAMENTO',

    'FALHOU',

    'CANCELADO'

];



const PAGAMENTO_EM_ANALISE = [

    'pending',

    'in_process',

    'authorized'

];



function aplicarPagamento(db, pagamento) {

    const pedidoId = Number(pagamento.external_reference);



    if (!Number.isInteger(pedidoId) || pedidoId <= 0) {

        return null;

    }



    const aplicar = db.transaction(() => {

        const pedido = db.prepare(`

            SELECT *

            FROM pedidos

            WHERE id = ?

        `).get(pedidoId);



        if (!pedido) {

            return null;

        }



        const valorConfere =

            Math.round(

                Number(pagamento.transaction_amount) * 100

            ) === pedido.total;



        let novoStatus = pedido.status;



        switch (pagamento.status) {

            case 'approved':



                if (!valorConfere) {

                    console.warn(

                        `Pagamento ${pagamento.id} aprovado com valor ` +

                        `diferente do pedido ${pedidoId}. Pedido não alterado.`

                    );



                } else if (

                    ANTES_DO_PAGAMENTO.includes(pedido.status)

                ) {

                    novoStatus = 'PAGO';

                }



                break;



            case 'rejected':



                if (pedido.status === 'AGUARDANDO_PAGAMENTO') {

                    novoStatus = 'FALHOU';

                }



                break;



            case 'cancelled':



                if (pedido.status === 'AGUARDANDO_PAGAMENTO') {

                    novoStatus = 'CANCELADO';

                }



                break;



            case 'refunded':

            case 'charged_back':



                if (pedido.status === 'PAGO') {

                    novoStatus = 'CANCELADO';

                }



                break;



            default:

                break;

        }



        const jaPagoEAvisoDeOutroPagamento =

            pedido.status === 'PAGO' &&

            novoStatus === 'PAGO' &&

            pagamento.status !== 'approved';



        if (!jaPagoEAvisoDeOutroPagamento) {

            db.prepare(`

                UPDATE pedidos

                SET status = ?,

                    mp_payment_id = ?,

                    mp_status = ?,

                    data_atualizacao = CURRENT_TIMESTAMP

                WHERE id = ?

            `).run(

                novoStatus,

                String(pagamento.id),

                String(pagamento.status),

                pedidoId

            );

        }



        // Baixa o estoque apenas uma vez.

        if (

            novoStatus === 'PAGO' &&

            !pedido.estoque_baixado

        ) {

            const itens = db.prepare(`

                SELECT

                    id_produto,

                    quantidade

                FROM itens_pedido

                WHERE id_pedido = ?

            `).all(pedidoId);



            const baixar = db.prepare(`

                UPDATE produtos

                SET estoque = MAX(estoque - ?, 0),

                    data_atualizacao = CURRENT_TIMESTAMP

                WHERE id = ?

            `);



            for (const item of itens) {

                baixar.run(

                    item.quantidade,

                    item.id_produto

                );

            }



            db.prepare(`

                UPDATE pedidos

                SET estoque_baixado = 1

                WHERE id = ?

            `).run(pedidoId);

        }



        // Esvazia o carrinho quando o pagamento é aprovado

        // ou está em análise.

        if (

            novoStatus === 'PAGO' ||

            PAGAMENTO_EM_ANALISE.includes(pagamento.status)

        ) {

            db.prepare(`

                DELETE FROM itens_carrinho

                WHERE id_carrinho IN (

                    SELECT id

                    FROM carrinho

                    WHERE id_usuario_cliente = ?

                    AND status = 'ABERTO'

                )

            `).run(pedido.id_usuario_cliente);

        }



        return pedidoId;

    });



    return aplicar();

}



// =====================================================

// MERCADO PAGO - SINCRONIZAÇÃO

// =====================================================



async function sincronizarPagamento(db, paymentId) {

    const pagamento = await chamarMercadoPago(

        `/v1/payments/${encodeURIComponent(paymentId)}`

    );



    return aplicarPagamento(db, pagamento);

}



async function sincronizarPorPedido(db, pedidoId) {

    const resultado = await chamarMercadoPago(

        `/v1/payments/search?external_reference=${pedidoId}` +

        '&sort=date_created&criteria=desc&limit=1'

    );



    const pagamento = resultado?.results?.[0];



    if (!pagamento) {

        return null;

    }



    return aplicarPagamento(db, pagamento);

}



function responderErroPagamento(

res,

erro,

mensagemPadrao

) {

    if (erro instanceof ErroPagamento) {

        return res.status(erro.status).json({

            sucesso: false,

            mensagem: erro.message

        });

    }



    console.error(mensagemPadrao, erro);



    return res.status(500).json({

        sucesso: false,

        mensagem: mensagemPadrao

    });

}



// =====================================================

// ROTA DE TESTE DO SERVIDOR

// =====================================================



app.get('/', (req, res) => {

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



app.get('/api/status', (req, res) => {

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



// =====================================================

// USUÁRIOS


// =====================================================



// CADASTRO

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

app.post('/api/usuarios/cadastro', async (req, res) => {
    try {
        const nomeCompleto = limitar(req.body.nome, 120);
        const email = limitar(req.body.email, 160).toLowerCase();
        const cpf = somenteDigitos(req.body.cpf);
        const senha = String(req.body.senha ?? '');

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

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        const resultado = db.prepare(`
            INSERT INTO usuarios (
                nome,
                sobrenome,
                cpf,
                email,
                id_tipo_usuario,
                senha
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            nome,
            sobrenome,
            cpf,
            email,
            tipoCliente.id,
            senhaCriptografada
        );

        const novoUsuario = {
            id: resultado.lastInsertRowid,
            nome,
            email,
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
            const campo = /cpf/i.test(erro.message) ? 'cpf' : 'email';

            return res.status(409).json({
                sucesso: false,
                campo,
                mensagem: campo === 'cpf'
                    ? 'Este CPF já está cadastrado.'
                    : 'Este e-mail já está cadastrado.'
            });
        }

        return responderErro(
            res,
            erro,
            'Erro ao cadastrar usuário.'
        );
    }
});






// LOGIN



app.post('/api/usuarios/login', async (req, res) => {

    try {

        const { email, senha } = req.body;



        if (!email || !senha) {

            return res.status(400).json({

                sucesso: false,

                mensagem: 'Informe o e-mail e a senha.'

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

            WHERE email = ?

            AND status = 1

        `).get(email);



        if (!usuario) {

            return res.status(401).json({

                sucesso: false,

                mensagem: 'E-mail ou senha inválidos.'

            });

        }



        const senhaValida = await bcrypt.compare(

            senha,

            usuario.senha

        );



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

        return responderErro(

            res,

            erro,

            'Erro ao realizar login.'

        );

    }

});

// =====================================================
// RECUPERAÇÃO DE SENHA - TABELA DE TOKENS
// =====================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS tokens_redefinicao_senha (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_usuario INTEGER NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        expira_em INTEGER NOT NULL,
        criado_em INTEGER NOT NULL,

        FOREIGN KEY (id_usuario)
            REFERENCES usuarios(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_token_redefinicao_usuario
        ON tokens_redefinicao_senha(id_usuario);
`);


// =====================================================
// RECUPERAÇÃO DE SENHA - NODEMAILER
// =====================================================

const emailTransporter =
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS
        ? nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT || 587),
            secure: Number(process.env.EMAIL_PORT || 587) === 465,

            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        })
        : null;


// =====================================================
// RECUPERAÇÃO DE SENHA - ROTAS
// =====================================================

const TEMPO_TOKEN_REDEFINICAO = 30 * 60 * 1000;

app.post('/api/usuarios/solicitar-redefinicao-senha', async (req, res) => {
    try {
        const email = String(req.body?.email ?? '').trim().toLowerCase();

        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um e-mail válido.'
            });
        }

        if (!emailTransporter) {
            console.error(
                'Recuperação de senha indisponível: configure EMAIL_HOST, EMAIL_USER e EMAIL_PASS no .env.'
            );

            return res.status(503).json({
                sucesso: false,
                mensagem: 'O envio de e-mails está temporariamente indisponível. Tente novamente mais tarde.'
            });
        }

        const usuario = db.prepare(`
            SELECT id, nome, email
            FROM usuarios
            WHERE LOWER(email) = ?
              AND status = 1
        `).get(email);

        // Resposta genérica para não revelar se o e-mail está cadastrado.
        const respostaGenerica = {
            sucesso: true,
            mensagem: 'Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha.'
        };

        if (!usuario) {
            return res.json(respostaGenerica);
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const agora = Date.now();
        const expiraEm = agora + TEMPO_TOKEN_REDEFINICAO;

        const salvarToken = db.transaction(() => {
            db.prepare(`
                DELETE FROM tokens_redefinicao_senha
                WHERE id_usuario = ?
            `).run(usuario.id);

            db.prepare(`
                INSERT INTO tokens_redefinicao_senha (
                    id_usuario,
                    token_hash,
                    expira_em,
                    criado_em
                )
                VALUES (?, ?, ?, ?)
            `).run(usuario.id, tokenHash, expiraEm, agora);
        });

        salvarToken();

        const urlFrontend = (
            process.env.FRONTEND_URL || 'http://localhost:5173'
        ).replace(/\/$/, '');

        const linkRedefinicao =
            `${urlFrontend}/redefinir-senha?token=${encodeURIComponent(token)}`;

        try {
            await emailTransporter.sendMail({
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: usuario.email,
                subject: 'Redefinição de senha - PataQuada',
                text:
                    `Olá${usuario.nome ? `, ${usuario.nome}` : ''}!\n\n` +
                    'Recebemos uma solicitação para redefinir a senha da sua conta PataQuada.\n\n' +
                    `Acesse o link para criar uma nova senha: ${linkRedefinicao}\n\n` +
                    'Este link expira em 30 minutos e só pode ser utilizado uma vez. ' +
                    'Se você não solicitou a alteração, ignore este e-mail.',
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                        <h2>Redefinição de senha - PataQuada</h2>
                        <p>Olá!</p>
                        <p>Recebemos uma solicitação para redefinir a senha da sua conta PataQuada.</p>
                        <p>
                            <a href="${linkRedefinicao}"
                               style="display:inline-block;padding:12px 22px;background:#e87935;color:#fff;text-decoration:none;border-radius:24px;">
                                Criar nova senha
                            </a>
                        </p>
                        <p>Este link expira em 30 minutos e só pode ser utilizado uma vez.</p>
                        <p>Se você não solicitou a alteração, ignore este e-mail.</p>
                    </div>
                `
            });
        } catch (erroEnvio) {
            db.prepare(`
                DELETE FROM tokens_redefinicao_senha
                WHERE token_hash = ?
            `).run(tokenHash);

            console.error('Erro ao enviar e-mail de redefinição:', erroEnvio);

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Não foi possível enviar o e-mail agora. Tente novamente mais tarde.'
            });
        }

        return res.json(respostaGenerica);
    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao solicitar redefinição de senha.'
        );
    }
});


app.post('/api/usuarios/redefinir-senha', async (req, res) => {
    try {
        const token = String(req.body?.token ?? '').trim();
        const senha = String(req.body?.senha ?? '');

        if (!token) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Link inválido ou expirado. Solicite uma nova recuperação.'
            });
        }

        if (
            senha.length < 8 ||
            !/[A-Za-zÀ-ÿ]/.test(senha) ||
            !/\d/.test(senha)
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A senha deve ter pelo menos 8 caracteres, uma letra e um número.'
            });
        }

        // O bcrypt considera no máximo 72 bytes da senha.
        if (Buffer.byteLength(senha, 'utf8') > 72) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'A senha é muito longa. Utilize até 72 bytes.'
            });
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const agora = Date.now();

        const registroToken = db.prepare(`
            SELECT id_usuario
            FROM tokens_redefinicao_senha
            WHERE token_hash = ?
              AND expira_em > ?
        `).get(tokenHash, agora);

        if (!registroToken) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Link inválido ou expirado. Solicite uma nova recuperação.'
            });
        }

        const usuario = db.prepare(`
            SELECT id
            FROM usuarios
            WHERE id = ?
              AND status = 1
        `).get(registroToken.id_usuario);

        if (!usuario) {
            db.prepare(`
                DELETE FROM tokens_redefinicao_senha
                WHERE token_hash = ?
            `).run(tokenHash);

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não foi possível redefinir a senha desta conta.'
            });
        }

        const senhaCriptografada = await bcrypt.hash(senha, 10);

        // Revalida o token dentro da transação e garante uso único.
        const redefinirSenha = db.transaction(() => {
            const tokenAtual = db.prepare(`
                SELECT id_usuario
                FROM tokens_redefinicao_senha
                WHERE token_hash = ?
                  AND expira_em > ?
            `).get(tokenHash, Date.now());

            if (!tokenAtual || tokenAtual.id_usuario !== usuario.id) {
                return false;
            }

            db.prepare(`
                UPDATE usuarios
                SET senha = ?,
                    data_atualizacao = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(senhaCriptografada, usuario.id);

            db.prepare(`
                DELETE FROM tokens_redefinicao_senha
                WHERE id_usuario = ?
            `).run(usuario.id);

            return true;
        });

        if (!redefinirSenha()) {
            return res.status(400).json({
                sucesso: false,
                mensagem: 'Link inválido ou expirado. Solicite uma nova recuperação.'
            });
        }

        return res.json({
            sucesso: true,
            mensagem: 'Senha redefinida com sucesso!'
        });
    } catch (erro) {
        return responderErro(
            res,
            erro,
            'Erro ao redefinir senha.'
        );
    }
});


// CONSULTAR USUÁRIOS



app.get('/api/usuarios', autenticar, (req, res) => {

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

        return responderErro(

            res,

            erro,

            'Erro ao consultar usuários.'

        );

    }

});



// =====================================================

// CARRINHO

// =====================================================



// CONSULTAR CARRINHO



app.get('/api/carrinho', autenticar, (req, res) => {

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



app.post('/api/carrinho/itens', autenticar, (req, res) => {

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



app.put(

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



app.delete(

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



app.delete('/api/carrinho', autenticar, (req, res) => {

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



app.post('/api/carrinho/sincronizar', autenticar, (req, res) => {

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



// =====================================================

// MERCADO PAGO - ROTAS DE PAGAMENTO

// =====================================================



// CRIAR PEDIDO E PREFERÊNCIA DE PAGAMENTO



app.post(

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



            const {

                dados: entrega,

                erros

            } = validarEntrega(req.body?.entrega);



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



            const totais = calcularTotais(carrinho.itens);



            pedidoId = criarPedido(db, {

                usuarioId: req.usuario.id,

                forma,

                entrega,

                itens: carrinho.itens,

                totais

            });



            const preferencia = await criarPreferenciaMercadoPago({

                pedidoId,

                usuario: req.usuario,

                entrega,

                itens: carrinho.itens,

                frete: totais.frete,

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



app.post(

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



app.post(

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



// =====================================================

// PEDIDOS DO CLIENTE

// =====================================================



// LISTAR PEDIDOS



app.get('/api/pedidos', autenticar, (req, res) => {

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



app.get('/api/pedidos/:id', autenticar, (req, res) => {

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



app.get('/api/pet-care', listarServicos);

app.get('/api/servicos', listarServicos);



// =====================================================

// CONSULTAS

// Tabela: tipos_consulta

// =====================================================



app.get('/api/consultas', (req, res) => {

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



app.get('/api/planos', (req, res) => {

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



app.get('/api/produtos', (req, res) => {

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



app.get('/api/produtos/aleatorios', (req, res) => {

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



app.get('/api/categorias-produto', (req, res) => {

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



app.get('/api/profissionais', (req, res) => {

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



app.get('/api/tipos-usuario', (req, res) => {

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



app.get('/api/situacoes', (req, res) => {

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



app.get('/api/debug/dados-servicos', (req, res) => {

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



// =====================================================

// CONTATO - ENVIO DE E-MAIL

// =====================================================



app.use('/api/contato', criarRotasContato(limitar));

// =====================================================

// TRATAMENTO DE ROTAS NÃO ENCONTRADAS

// =====================================================



app.use((req, res) => {

    return res.status(404).json({

        sucesso: false,

        mensagem: 'Rota não encontrada.',

        rota: req.originalUrl

    });

});



// =====================================================

// TRATAMENTO DE ERROS

// =====================================================



app.use((erro, req, res, next) => {

    console.error('Erro não tratado:', erro);



    return res.status(500).json({

        sucesso: false,

        mensagem: 'Erro interno do servidor.'

    });

});



// =====================================================

// INICIALIZAÇÃO DO SERVIDOR

// =====================================================



const servidor = app.listen(PORT, () => {

    console.log(`Servidor PataQuada iniciado na porta ${PORT}`);

    console.log(`Acesse: http://localhost:${PORT}`);

    console.log(`Banco utilizado: ${arquivoBanco}`);



    if (!process.env.MP_ACCESS_TOKEN) {

        console.warn(

            'AVISO: MP_ACCESS_TOKEN não configurado. ' +

            'O pagamento pelo Mercado Pago ficará indisponível.'

        );

    }

});



// =====================================================

// ENCERRAMENTO SEGURO

// =====================================================



function encerrarServidor() {

    console.log('Encerrando servidor...');



    servidor.close(() => {

        db.close();



        console.log(

            'Conexão com o banco de dados encerrada.'

        );



        process.exit(0);

    });

}



process.on('SIGINT', encerrarServidor);

process.on('SIGTERM', encerrarServidor);