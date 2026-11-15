import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { GRUPOS_MENU } from './menuAdmin.js'
import { chamarApi } from '../shop/carrinho.js'
import './admin.css'

import patinha from '../../assets/paw.png'

function plural(quantidade, singular, pluralTexto) {
    return `${quantidade} ${quantidade === 1 ? singular : pluralTexto}`
}

function AdminInicio() {
    const { usuario } = useOutletContext()

    const [versao, setVersao] = useState(0)

    const [estado, setEstado] = useState({
        carregando: true,
        cartoes: [],
        erro: null
    })

    useEffect(() => {
        let vivo = true

        async function carregar() {
            try {
                const resposta = await chamarApi('/api/admin/resumo')

                if (vivo) {
                    setEstado({
                        carregando: false,
                        cartoes: resposta.dados,
                        erro: null
                    })
                }

            } catch (erro) {
                if (vivo) {
                    setEstado({
                        carregando: false,
                        cartoes: [],
                        erro: erro.message
                    })
                }
            }
        }

        carregar()

        return () => {
            vivo = false
        }
    }, [versao])

    function recarregar() {
        setEstado(anterior => ({ ...anterior, carregando: true, erro: null }))
        setVersao(atual => atual + 1)
    }

    const { carregando, cartoes, erro } = estado

    const primeiroNome = String(usuario.nome ?? '').split(' ')[0]

    const valorDe = chave => cartoes.find(c => c.chave === chave)?.valor ?? 0

    const estoqueBaixo = valorDe('estoque-baixo')
    const pedidosPendentes = valorDe('pedidos')

    return (
        <>
            <header className="adm-pagina-titulo">
                <img src={patinha} alt="" />

                <div>
                    <h1>Painel Administrativo</h1>

                    <p>
                        Olá, {primeiroNome}! Acompanhe a loja e acesse as
                        áreas de gerenciamento.
                    </p>
                </div>
            </header>

            {/* ALERTAS */}
            {!carregando && !erro && (estoqueBaixo > 0 || pedidosPendentes > 0) && (
                <section
                    className="adm-alertas"
                    aria-label="Pontos de atenção"
                >
                    {estoqueBaixo > 0 && (
                        <Link to="/admin/produtos" className="adm-alerta">
                            <i className="fa-solid fa-triangle-exclamation" />

                            <span>
                                {plural(
                                    estoqueBaixo,
                                    'produto com estoque baixo ou zerado',
                                    'produtos com estoque baixo ou zerado'
                                )}
                            </span>

                            <strong>Ver produtos</strong>
                        </Link>
                    )}

                    {pedidosPendentes > 0 && (
                        <Link to="/admin/pedidos" className="adm-alerta">
                            <i className="fa-solid fa-hourglass-half" />

                            <span>
                                {plural(
                                    pedidosPendentes,
                                    'pedido aguardando pagamento',
                                    'pedidos aguardando pagamento'
                                )}
                            </span>

                            <strong>Ver pedidos</strong>
                        </Link>
                    )}
                </section>
            )}

            {/* RESUMO */}
            <section aria-labelledby="adm-resumo-titulo">
                <h2 id="adm-resumo-titulo" className="adm-secao-titulo">
                    Resumo
                </h2>

                {erro && (
                    <div className="adm-erro" role="alert">
                        <p>{erro}</p>

                        <button
                            type="button"
                            className="btn"
                            onClick={recarregar}
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {carregando && (
                    <div className="adm-cartoes" aria-busy="true">
                        {[1, 2, 3, 4].map(numero => (
                            <div key={numero} className="adm-cartao adm-esqueleto" />
                        ))}
                    </div>
                )}

                {!carregando && !erro && (
                    <div className="adm-cartoes">
                        {cartoes.map(cartao => (
                            <Link
                                key={cartao.chave}
                                to={`/admin/${cartao.rota}`}
                                className="adm-cartao"
                            >
                                <span className="adm-cartao-icone">
                                    <i className={`fa-solid ${cartao.icone}`} />
                                </span>

                                <span className="adm-cartao-texto">
                                    <strong>{cartao.valor}</strong>
                                    <span>{cartao.rotulo}</span>
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* ACESSOS RÁPIDOS */}
            <section aria-labelledby="adm-areas-titulo">
                <h2 id="adm-areas-titulo" className="adm-secao-titulo">
                    Áreas de gerenciamento
                </h2>

                <div className="adm-areas">
                    {GRUPOS_MENU.map(grupo => (
                        <article key={grupo.chave} className="adm-area">
                            <h3>
                                <i className={`fa-solid ${grupo.icone}`} />
                                {grupo.titulo}
                            </h3>

                            <ul>
                                {grupo.itens.map(item => (
                                    <li key={item.rota}>
                                        <Link to={`/admin/${item.rota}`}>
                                            {item.titulo}
                                            <i className="fa-solid fa-arrow-right" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </div>
            </section>
        </>
    )
}

export default AdminInicio
