
import { Link, useOutletContext } from 'react-router-dom'

import './usuario.css'

import mascote from '../../assets/cachorro-cartoon-card.png'

function UsuarioInicio() {
    const { usuario } = useOutletContext()

    const primeiroNome = String(usuario?.nome)
        .trim()
        .split(' ')[0]

    return (
        <div className="cli-inicio">

            {/* SAUDAÇÃO */}
            <header className="cli-pagina-titulo">

                <div>
                    <h1>Olá, {primeiroNome}!</h1>

                    <p>Que bom ter você por aqui!</p>
                </div>

                <span className="cli-saudacao-icone">
                    <i className="fa-solid fa-paw" />
                </span>

            </header>

            {/* BANNER PRINCIPAL */}
            <section className="cli-banner">

                <div className="cli-banner-texto">

                    <span className="cli-banner-etiqueta">
                        <i className="fa-solid fa-heart" />
                        PataQuada
                    </span>

                    <h2>
                        Tudo o que seu pet precisa,
                        em um só lugar!
                    </h2>

                    <p>
                        Amor, cuidado e tudo de melhor para
                        seu melhor amigo.
                    </p>

                    <Link to="/shop" className="cli-banner-botao">
                        Conhecer a loja
                        <i className="fa-solid fa-arrow-right" />
                    </Link>

                </div>

                <div className="cli-banner-ilustracao" aria-label="Ilustração de um cachorro e um gato">

                    <span className="cli-coracao cli-coracao-1">♥</span>
                    <span className="cli-coracao cli-coracao-2">♥</span>
                    <span className="cli-coracao cli-coracao-3">♥</span>

                    <img
                        src={mascote}
                        alt="Cachorro sorridente"
                    />

                    <span className="cli-gato" role="img" aria-label="Gato rajado">
                        🐈
                    </span>

                </div>

            </section>

            {/* PEDIDOS RECENTES */}
            <section
                className="cli-secao"
                aria-labelledby="cli-pedidos-titulo"
            >

                <div className="cli-secao-cabecalho">

                    <div>
                        <h2 id="cli-pedidos-titulo">
                            Seus pedidos recentes
                        </h2>

                        <p>Acompanhe suas últimas compras.</p>
                    </div>

                    <Link
                        to="/usuarios/pedidos"
                        className="cli-ver-todos"
                    >
                        Ver todos
                        <i className="fa-solid fa-arrow-right" />
                    </Link>

                </div>

                {/* PEDIDO DEMONSTRATIVO */}
                <article className="cli-pedido">

                    <div className="cli-pedido-informacoes">

                        <div className="cli-pedido-titulo">
                            <strong>#1048</strong>

                            <span className="cli-status-entregue">
                                <i className="fa-solid fa-circle-check" />
                                Entregue
                            </span>
                        </div>

                        <p className="cli-pedido-data">
                            03/11/2026
                        </p>

                        <span className="cli-pedido-descricao">
                            3 produtos
                        </span>

                    </div>

                    <div className="cli-pedido-produtos">

                        <div
                            className="cli-produto-mini cli-produto-racao"
                            title="Pacote de ração"
                        >
                            <i className="fa-solid fa-bone" />
                        </div>

                        <div
                            className="cli-produto-mini cli-produto-brinquedo"
                            title="Brinquedo para cachorro"
                        >
                            <i className="fa-solid fa-dog" />
                        </div>

                        <div
                            className="cli-produto-mini cli-produto-comedouro"
                            title="Comedouro"
                        >
                            <i className="fa-solid fa-bowl-food" />
                        </div>

                    </div>

                    <Link
                        to="/usuarios/pedido/1048"
                        className="cli-pedido-botao"
                    >
                        Ver pedido
                        <i className="fa-solid fa-arrow-right" />
                    </Link>

                </article>

            </section>

            {/* ATALHOS */}
            <section
                className="cli-secao cli-atalhos-secao"
                aria-labelledby="cli-atalhos-titulo"
            >

                <div className="cli-secao-cabecalho">
                    <div>
                        <h2 id="cli-atalhos-titulo">
                            Acesso rápido
                        </h2>

                        <p>Encontre facilmente o que você precisa.</p>
                    </div>
                </div>

                <div className="cli-atalhos">

                    <Link
                        to="/usuarios/pedidos"
                        className="cli-atalho"
                    >
                        <span className="cli-atalho-icone">
                            <i className="fa-solid fa-box-open" />
                        </span>

                        <strong>Meus Pedidos</strong>

                        <span>
                            Acompanhe suas compras
                        </span>

                        <i className="fa-solid fa-arrow-right cli-atalho-seta" />
                    </Link>

                    <Link
                        to="/usuarios/endereco"
                        className="cli-atalho"
                    >
                        <span className="cli-atalho-icone">
                            <i className="fa-solid fa-location-dot" />
                        </span>

                        <strong>Meu Endereço</strong>

                        <span>
                            Confira ou altere seu endereço
                        </span>

                        <i className="fa-solid fa-arrow-right cli-atalho-seta" />
                    </Link>

                    <Link
                        to="/usuarios/ajuda"
                        className="cli-atalho"
                    >
                        <span className="cli-atalho-icone">
                            <i className="fa-solid fa-headset" />
                        </span>

                        <strong>Suporte</strong>

                        <span>
                            Precisa de ajuda?
                        </span>

                        <i className="fa-solid fa-arrow-right cli-atalho-seta" />
                    </Link>

                </div>

            </section>

        </div>
    )
}

export default UsuarioInicio

