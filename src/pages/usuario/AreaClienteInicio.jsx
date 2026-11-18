import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { BASE_CONTA, linkSuporte } from './menuConta.js'
import { useEmpresa } from '../../utils/empresa.js'
import { chamarApi } from '../shop/carrinho.js'
import { localizarImagem } from '../shop/shop.js'
import CartaoPedido from './CartaoPedido.jsx'
import './conta.css'

import patinha from '../../assets/paw.png'

// Ilustração opcional (cachorro e gato) em src/assets: o nome do arquivo
// precisa conter "area-cliente", "cachorro-gato", "shop-banner" ou
// "pedido-confirmado". Sem ela, o banner aparece sem a imagem.
const ilustracao = localizarImagem([
    'area-cliente',
    'cachorro-gato',
    'shop-banner',
    'pedido-confirmado'
])

function AreaClienteInicio() {
    const { usuario } = useOutletContext()
    const empresa = useEmpresa()

    const [versao, setVersao] = useState(0)

    const [estado, setEstado] = useState({
        carregando: true,
        pedidos: [],
        total: 0,
        erro: null
    })

    useEffect(() => {
        let vivo = true

        async function carregar() {
            try {
                const resposta = await chamarApi('/api/cliente/inicio')

                if (vivo) {
                    setEstado({
                        carregando: false,
                        pedidos: resposta.pedidosRecentes,
                        total: resposta.totalPedidos,
                        erro: null
                    })
                }

            } catch (erro) {
                if (vivo) {
                    setEstado({
                        carregando: false,
                        pedidos: [],
                        total: 0,
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

    const { carregando, pedidos, total, erro } = estado

    const primeiroNome = String(usuario.nome ?? '').split(' ')[0]
    const suporte = linkSuporte(empresa?.whatsapp)

    const atalhoSuporte = (
        <>
            <i className="fa-solid fa-headset" aria-hidden="true" />
            <strong>Suporte</strong>
            <span>Precisa de ajuda?</span>
        </>
    )

    return (
        <>
            {/* BOAS-VINDAS */}
            <section className="cta-hero" aria-labelledby="cta-ola">

                <div className="cta-saudacao">
                    <h1 id="cta-ola">Olá, {primeiroNome}!</h1>
                    <p>Que bom ter você por aqui!</p>
                </div>

                <div className="cta-banner">
                    <p>
                        Tudo o que seu pet precisa,
                        <br />
                        em um só lugar!
                    </p>

                    <img src={patinha} alt="" className="cta-banner-pata" />
                </div>

                {ilustracao && (
                    <img src={ilustracao} alt="" className="cta-ilustracao" />
                )}

                <span className="cta-coracao" aria-hidden="true">♡</span>

            </section>

            {/* PEDIDOS RECENTES */}
            <section className="cta-secao" aria-labelledby="cta-recentes">

                <header className="cta-secao-topo">
                    <h2 id="cta-recentes">Seus pedidos recentes</h2>

                    {total > 0 && (
                        <Link to={`${BASE_CONTA}/pedidos`} className="cta-ver-todos">
                            Ver todos
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    )}
                </header>

                {carregando && (
                    <p className="cta-mensagem" role="status">
                        Carregando seus pedidos...
                    </p>
                )}

                {erro && (
                    <div className="cta-mensagem cta-mensagem--erro" role="alert">
                        <p>{erro}</p>

                        <button type="button" className="btn" onClick={recarregar}>
                            Tentar novamente
                        </button>
                    </div>
                )}

                {!carregando && !erro && pedidos.length === 0 && (
                    <div className="cta-mensagem">
                        <img src={patinha} alt="" className="cta-mensagem-pata" />

                        <p>Você ainda não fez nenhum pedido.</p>

                        <Link to="/shop" className="btn">
                            Ir para a loja
                        </Link>
                    </div>
                )}

                {!carregando && !erro && pedidos.length > 0 && (
                    <ul className="cta-pedidos">
                        {pedidos.map(pedido => (
                            <CartaoPedido key={pedido.id} pedido={pedido} />
                        ))}
                    </ul>
                )}

            </section>

            {/* ATALHOS */}
            <section className="cta-atalhos" aria-label="Atalhos">

                <Link to={`${BASE_CONTA}/pedidos`} className="cta-atalho">
                    <i className="fa-solid fa-clipboard-list" aria-hidden="true" />
                    <strong>Meus Pedidos</strong>
                    <span>Acompanhe suas compras</span>
                </Link>

                <Link to={`${BASE_CONTA}/endereco`} className="cta-atalho">
                    <i className="fa-solid fa-house-chimney-user" aria-hidden="true" />
                    <strong>Meu Endereço</strong>
                    <span>Confira ou altere seu endereço</span>
                </Link>

                {suporte ? (
                    <a
                        href={suporte}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cta-atalho"
                    >
                        {atalhoSuporte}
                    </a>
                ) : (
                    <Link to="/#contato" className="cta-atalho">
                        {atalhoSuporte}
                    </Link>
                )}

            </section>
        </>
    )
}

export default AreaClienteInicio
