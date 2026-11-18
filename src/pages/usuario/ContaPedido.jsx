import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { BASE_CONTA } from './menuConta.js'
import { formatarCep, formatarData, formatarTelefone } from './contaFormatos.js'
import { chamarApi } from '../shop/carrinho.js'
import { formatarPreco, resolverImagem } from '../shop/shop.js'
import './conta.css'

// Etapas mostradas na linha do tempo do pedido.
const ETAPAS = [
    { status: 'AGUARDANDO_PAGAMENTO', titulo: 'Pedido feito', icone: 'fa-receipt' },
    { status: 'PAGO', titulo: 'Pagamento aprovado', icone: 'fa-credit-card' },
    { status: 'EM_SEPARACAO', titulo: 'Em separação', icone: 'fa-box-open' },
    { status: 'ENVIADO', titulo: 'Enviado', icone: 'fa-truck-fast' },
    { status: 'ENTREGUE', titulo: 'Entregue', icone: 'fa-house-circle-check' }
]

function LinhaDoTempo({ status }) {
    if (status === 'CANCELADO' || status === 'FALHOU') {
        return null
    }

    const atual = ETAPAS.findIndex(etapa => etapa.status === status)

    return (
        <ol className="cta-etapas" aria-label="Andamento do pedido">
            {ETAPAS.map((etapa, indice) => (
                <li
                    key={etapa.status}
                    className={
                        'cta-etapa' +
                        (indice < atual ? ' feita' : '') +
                        (indice === atual ? ' atual' : '')
                    }
                    aria-current={indice === atual ? 'step' : undefined}
                >
                    <span className="cta-etapa-icone">
                        <i className={`fa-solid ${indice < atual ? 'fa-check' : etapa.icone}`} aria-hidden="true" />
                    </span>
                    <span className="cta-etapa-nome">{etapa.titulo}</span>
                </li>
            ))}
        </ol>
    )
}

// Detalhe de um pedido do cliente.
function ContaPedido() {
    const { id } = useParams()
    const [estado, setEstado] = useState({ carregando: true, pedido: null, erro: null })

    useEffect(() => {
        let vivo = true

        chamarApi(`/api/cliente/pedidos/${id}`)
            .then(resposta => {
                if (vivo) setEstado({ carregando: false, pedido: resposta.dados, erro: null })
            })
            .catch(erro => {
                if (vivo) setEstado({ carregando: false, pedido: null, erro: erro.message })
            })

        return () => {
            vivo = false
        }
    }, [id])

    const voltar = (
        <Link to={`${BASE_CONTA}/pedidos`} className="cta-ver-todos">
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            Voltar para Meus Pedidos
        </Link>
    )

    if (estado.carregando) {
        return <p className="cta-mensagem" role="status">Carregando o pedido...</p>
    }

    if (estado.erro) {
        return (
            <div className="cta-mensagem cta-mensagem--erro" role="alert">
                <p>{estado.erro}</p>
                {voltar}
            </div>
        )
    }

    const { pedido } = estado
    const { entrega } = pedido

    return (
        <section className="cta-secao" aria-labelledby="cta-titulo-pedido">
            {voltar}

            <header className="cta-titulo-pagina cta-titulo-pagina--pedido">
                <div>
                    <h1 id="cta-titulo-pedido">Pedido #{pedido.id}</h1>
                    <p>Feito em {formatarData(pedido.data_criacao)}</p>
                </div>

                <span className={`cta-status cta-status--${pedido.grupo} cta-status--grande`}>
                    {pedido.rotulo}
                </span>
            </header>

            <LinhaDoTempo status={pedido.status} />

            {pedido.link_pagamento && (
                <div className="cta-aviso-pagamento">
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                    <p>
                        {pedido.status === 'FALHOU'
                            ? 'O pagamento deste pedido foi recusado. Você pode tentar de novo.'
                            : 'Este pedido ainda não foi pago.'}
                    </p>
                    <a
                        href={pedido.link_pagamento}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn"
                    >
                        <i className="fa-solid fa-credit-card" aria-hidden="true" />
                        Pagar agora
                    </a>
                </div>
            )}

            <div className="cta-pedido-detalhes">
                <div className="cta-painel">
                    <h2>Itens</h2>

                    <ul className="cta-itens">
                        {pedido.itens.map((item, indice) => (
                            <li key={`${item.id_produto}-${indice}`} className="cta-item">
                                <img src={resolverImagem(item.imagem)} alt="" loading="lazy" />

                                <span className="cta-item-nome">
                                    <Link to={`/produto/${item.id_produto}`}>{item.nome}</Link>
                                    <small>{item.quantidade} × {formatarPreco(item.preco_unitario)}</small>
                                </span>

                                <strong>{formatarPreco(item.preco_unitario * item.quantidade)}</strong>
                            </li>
                        ))}
                    </ul>

                    <dl className="cta-valores">
                        <div>
                            <dt>Subtotal</dt>
                            <dd>{formatarPreco(pedido.subtotal)}</dd>
                        </div>
                        <div>
                            <dt>Entrega{pedido.envio ? ` (${pedido.envio})` : ''}</dt>
                            <dd>{pedido.frete === 0 ? 'Grátis' : formatarPreco(pedido.frete)}</dd>
                        </div>
                        <div className="cta-valores-total">
                            <dt>Total</dt>
                            <dd>{formatarPreco(pedido.total)}</dd>
                        </div>
                    </dl>
                </div>

                <div className="cta-coluna">
                    <div className="cta-painel">
                        <h2>Entrega</h2>
                        <p className="cta-texto">
                            <strong>{entrega.destinatario}</strong>
                            <br />
                            {formatarTelefone(entrega.telefone)}
                            <br />
                            {entrega.logradouro}, {entrega.numero}
                            {entrega.complemento ? ` - ${entrega.complemento}` : ''}
                            <br />
                            {entrega.bairro} · {entrega.cidade}/{entrega.uf}
                            <br />
                            CEP {formatarCep(entrega.cep)}
                        </p>
                        {pedido.prazo_dias && (
                            <p className="cta-texto cta-texto--suave">
                                <i className="fa-solid fa-truck" aria-hidden="true" />{' '}
                                Prazo: até {pedido.prazo_dias} dia(s) útil(eis) após a aprovação do pagamento.
                            </p>
                        )}
                    </div>

                    <div className="cta-painel">
                        <h2>Pagamento</h2>
                        <p className="cta-texto">
                            {pedido.forma_pagamento} pelo Mercado Pago
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ContaPedido
