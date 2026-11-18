// =====================================================
// CARRINHO - FUNÇÕES DE APOIO
// (separado do server.js)
// =====================================================

import { db } from '../config/database.js';


// =====================================================

// FUNÇÕES DO CARRINHO

// =====================================================


export function obterOuCriarCarrinho(idUsuario) {

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


export function consultarCarrinho(idUsuario) {

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


export function adicionarItemCarrinho(

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
