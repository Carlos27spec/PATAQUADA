import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { confirmarPagamento } from './checkout.js'
import { formatarPreco, localizarImagem } from './shop.js'
import './checkout.css'

// Imagem opcional (cachorro e gato) em src/assets: o nome do arquivo
// precisa conter "pedido-confirmado", "shop-banner" ou "cachorro-gato".
const imagemConfirmacao = localizarImagem([
    'pedido-confirmado',
    'shop-banner',
    'cachorro-gato'
])

const STATUS_PAGOS = ['PAGO', 'EM_SEPARACAO', 'ENVIADO', 'ENTREGUE']
const STATUS_FALHA = ['FALHOU', 'CANCELADO']

// A situação mostrada vem do PEDIDO confirmado no servidor,
// nunca apenas do endereço da página (que qualquer um pode digitar).
function situacaoDoPedido(pedido, resultadoDaUrl) {
    if (STATUS_PAGOS.includes(pedido.status)) {
        return 'aprovado'
    }

    if (STATUS_FALHA.includes(pedido.status)) {
        return 'falha'
    }

    // Voltou sem pagar (clicou em "voltar ao site" no Mercado Pago).
    if (!pedido.mp_status && resultadoDaUrl === 'falha') {
        return 'falha'
    }

    return 'pendente'
}

const CONTEUDO = {
    aprovado: {
        icone: 'fa-solid fa-check',
        titulo: 'Pedido Confirmado!',
        subtitulo: 'Seu pedido foi realizado com sucesso!',
        detalhe:
            'O Mercado Pago envia o comprovante do pagamento para o ' +
            'seu e-mail.'
    },
    pendente: {
        icone: 'fa-regular fa-clock',
        titulo: 'Pagamento pendente',
        subtitulo: 'Estamos aguardando a confirmação do pagamento.',
        detalhe:
            'Pix e cartões costumam confirmar em poucos minutos, e o ' +
            'boleto pode levar até 2 dias úteis. Assim que o pagamento ' +
            'for aprovado, seu pedido será atualizado.'
    },
    falha: {
        icone: 'fa-solid fa-xmark',
        titulo: 'Pagamento não concluído',
        subtitulo: 'Não foi possível concluir o pagamento.',
        detalhe:
            'Nenhum valor foi cobrado e o seu carrinho foi mantido. ' +
            'Você pode tentar novamente com outra forma de pagamento.'
    }
}

function PedidoRetorno({ resultado }) {
    const [parametros] = useSearchParams()

    // O Mercado Pago devolve estes dados no endereço da página.
    const pedidoId = parametros.get('external_reference')
    const paymentId =
        parametros.get('payment_id') || parametros.get('collection_id')

    const semDados = !pedidoId && !paymentId

    const [estado, setEstado] = useState({
        carregando: !semDados,
        pedido: null,
        erro: null
    })

    const [versao, setVersao] = useState(0)

    useEffect(() => {
        if (semDados) {
            return undefined
        }

        let ativo = true

        async function confirmar() {
            try {
                const resposta = await confirmarPagamento({
                    pedidoId,
                    paymentId
                })

                if (ativo) {
                    setEstado({
                        carregando: false,
                        pedido: resposta.dados,
                        erro: null
                    })
                }

            } catch (erro) {
                if (ativo) {
                    setEstado({
                        carregando: false,
                        pedido: null,
                        erro: erro.message
                    })
                }
            }
        }

        confirmar()

        return () => {
            ativo = false
        }
    }, [semDados, pedidoId, paymentId, versao])

    function atualizarStatus() {
        setEstado(anterior => ({ ...anterior, carregando: true }))
        setVersao(atual => atual + 1)
    }

    const { carregando, pedido, erro } = estado

    const situacao = pedido ? situacaoDoPedido(pedido, resultado) : null
    const conteudo = situacao ? CONTEUDO[situacao] : null

    return (
        <main className="ck-pagina">
            <div className="ck-container">

                {carregando && (
                    <p className="ck-mensagem">
                        Confirmando o seu pagamento...
                    </p>
                )}

                {!carregando && (semDados || erro) && (
                    <div className="ck-mensagem ck-mensagem--erro">
                        <p>
                            {semDados
                                ? 'Não encontramos os dados do pedido.'
                                : erro}
                        </p>

                        <p>
                            Se você já pagou, o pedido será atualizado
                            automaticamente em instantes.
                        </p>

                        <Link to="/shop" className="btn ck-botao">
                            Voltar para a loja
                        </Link>
                    </div>
                )}

                {!carregando && pedido && conteudo && (
                    <section
                        className={`ck-painel ck-retorno ck-retorno--${situacao}`}
                    >

                        {situacao === 'aprovado' && (
                            <div className="ck-confetes" aria-hidden="true">
                                <span /><span /><span /><span />
                                <span /><span /><span /><span />
                                <span /><span /><span /><span />
                            </div>
                        )}

                        <span className="ck-retorno-icone" aria-hidden="true">
                            <i className={conteudo.icone} />
                        </span>

                        <h1>{conteudo.titulo}</h1>

                        <p className="ck-retorno-subtitulo">
                            {conteudo.subtitulo}
                        </p>

                        <p className="ck-retorno-numero">
                            Pedido nº <strong>#{pedido.id}</strong>
                        </p>

                        <p className="ck-retorno-detalhe">
                            {conteudo.detalhe}
                        </p>

                        <ul className="ck-retorno-itens">
                            {pedido.itens.map(item => (
                                <li key={item.id_produto}>
                                    <span>
                                        {item.quantidade} × {item.nome}
                                    </span>

                                    <strong>
                                        {formatarPreco(
                                            item.preco_unitario *
                                            item.quantidade
                                        )}
                                    </strong>
                                </li>
                            ))}

                            <li>
                                <span>Entrega</span>

                                <strong>
                                    {pedido.frete === 0
                                        ? 'Grátis'
                                        : formatarPreco(pedido.frete)}
                                </strong>
                            </li>

                            <li className="ck-retorno-total">
                                <span>Total</span>
                                <strong>{formatarPreco(pedido.total)}</strong>
                            </li>
                        </ul>

                        <p className="ck-retorno-endereco">
                            <i className="fa-solid fa-location-dot" />
                            {pedido.entrega_logradouro},{' '}
                            {pedido.entrega_numero} ·{' '}
                            {pedido.entrega_bairro} ·{' '}
                            {pedido.entrega_cidade}/{pedido.entrega_uf}
                        </p>

                        <div className="ck-retorno-botoes">

                            {situacao === 'pendente' && (
                                <button
                                    type="button"
                                    className="btn ck-botao ck-botao--contorno"
                                    onClick={atualizarStatus}
                                >
                                    <i className="fa-solid fa-rotate" />
                                    Atualizar status
                                </button>
                            )}

                            {situacao === 'falha' && (
                                <Link
                                    to="/pagamento"
                                    className="btn ck-botao"
                                >
                                    Tentar novamente
                                </Link>
                            )}

                            <Link
                                to={situacao === 'falha' ? '/carrinho' : '/shop'}
                                className={
                                    'btn ck-botao' +
                                    (situacao === 'aprovado'
                                        ? ''
                                        : ' ck-botao--contorno')
                                }
                            >
                                <i
                                    className={
                                        situacao === 'falha'
                                            ? 'fa-solid fa-cart-shopping'
                                            : 'fa-solid fa-house'
                                    }
                                />
                                {situacao === 'falha'
                                    ? 'Voltar ao carrinho'
                                    : 'Voltar para a loja'}
                            </Link>

                        </div>

                        {situacao === 'aprovado' && imagemConfirmacao && (
                            <img
                                src={imagemConfirmacao}
                                alt=""
                                className="ck-retorno-imagem"
                            />
                        )}

                    </section>
                )}

            </div>
        </main>
    )
}

export default PedidoRetorno
