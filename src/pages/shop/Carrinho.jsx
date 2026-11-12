import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import ResumoPedido from './ResumoPedido.jsx'
import { ROTA_LOGIN, useCarrinho } from './checkout.js'
import { definirQuantidade, removerDoCarrinho } from './carrinho.js'
import { formatarPreco } from './shop.js'
import './checkout.css'

import patinha from '../../assets/paw.png'

function Carrinho() {
    const navigate = useNavigate()

    const {
        itens,
        logado,
        aviso,
        carregando,
        erro,
        status,
        totais,
        recarregar
    } = useCarrinho()

    const [ocupado, setOcupado] = useState(null)
    const [mensagem, setMensagem] = useState(null)

    // Item sem estoque ou com mais unidades do que o estoque atual.
    const comProblema = itens.some(
        item => !item.disponivel || item.quantidade > item.estoque
    )

    async function executar(item, acao) {
        setOcupado(item.id)
        setMensagem(null)

        try {
            await acao()
            recarregar()
        } catch (falha) {
            setMensagem(falha.message)
        } finally {
            setOcupado(null)
        }
    }

    function alterarQuantidade(item, novaQuantidade) {
        if (novaQuantidade < 1 || novaQuantidade > item.estoque) {
            return
        }

        executar(item, () => definirQuantidade(item.id, novaQuantidade))
    }

    function remover(item) {
        executar(item, () => removerDoCarrinho(item.id))
    }

    function finalizarCompra() {
        if (!logado) {
            navigate(ROTA_LOGIN, { state: { de: '/carrinho' } })
            return
        }

        navigate('/pagamento')
    }

    return (
        <main className="ck-pagina">
            <div className="ck-container">

                <header className="ck-titulo">
                    <Link
                        to="/shop"
                        className="ck-voltar"
                        aria-label="Continuar comprando"
                    >
                        <i className="fa-solid fa-arrow-left" />
                    </Link>

                    <h1>Carrinho</h1>
                </header>

                {carregando && (
                    <p className="ck-mensagem">Carregando carrinho...</p>
                )}

                {erro && (
                    <div className="ck-mensagem ck-mensagem--erro">
                        <p>{erro}</p>

                        {status === 401 && (
                            <Link
                                to={ROTA_LOGIN}
                                state={{ de: '/carrinho' }}
                                className="btn"
                            >
                                Entrar na minha conta
                            </Link>
                        )}
                    </div>
                )}

                {!carregando && !erro && itens.length === 0 && (
                    <div className="ck-mensagem ck-vazio">
                        <img src={patinha} alt="" />

                        <h2>Seu carrinho está vazio</h2>

                        <p>
                            Que tal escolher algo especial para o seu pet?
                        </p>

                        <Link to="/shop" className="btn ck-botao">
                            Ir para a loja
                        </Link>
                    </div>
                )}

                {!carregando && !erro && itens.length > 0 && (
                    <div className="ck-layout">

                        <section className="ck-painel">

                            {aviso && (
                                <p className="ck-aviso ck-aviso--erro" role="alert">
                                    {aviso}
                                </p>
                            )}

                            {mensagem && (
                                <p className="ck-aviso ck-aviso--erro" role="alert">
                                    {mensagem}
                                </p>
                            )}

                            <ul className="ck-lista">
                                {itens.map(item => (
                                    <li
                                        key={item.id}
                                        className="ck-item"
                                        aria-busy={ocupado === item.id}
                                    >

                                        <Link
                                            to={`/shop/${item.id}`}
                                            className="ck-item-imagem"
                                        >
                                            <img
                                                src={item.imagem}
                                                alt={item.nome}
                                            />
                                        </Link>

                                        <div className="ck-item-dados">
                                            <Link to={`/shop/${item.id}`}>
                                                {item.nome}
                                            </Link>

                                            <strong>
                                                {formatarPreco(item.preco)}
                                            </strong>

                                            {!item.disponivel && (
                                                <small className="ck-item-alerta">
                                                    Produto indisponível.
                                                    Remova para continuar.
                                                </small>
                                            )}

                                            {item.disponivel &&
                                                item.quantidade > item.estoque && (
                                                    <small className="ck-item-alerta">
                                                        Só temos {item.estoque}{' '}
                                                        em estoque.
                                                    </small>
                                                )}
                                        </div>

                                        <div
                                            className="ck-qtd"
                                            role="group"
                                            aria-label={`Quantidade de ${item.nome}`}
                                        >
                                            <button
                                                type="button"
                                                aria-label="Diminuir quantidade"
                                                onClick={() =>
                                                    alterarQuantidade(
                                                        item,
                                                        item.quantidade - 1
                                                    )
                                                }
                                                disabled={
                                                    ocupado === item.id ||
                                                    item.quantidade <= 1
                                                }
                                            >
                                                −
                                            </button>

                                            <span>{item.quantidade}</span>

                                            <button
                                                type="button"
                                                aria-label="Aumentar quantidade"
                                                onClick={() =>
                                                    alterarQuantidade(
                                                        item,
                                                        item.quantidade + 1
                                                    )
                                                }
                                                disabled={
                                                    ocupado === item.id ||
                                                    item.quantidade >= item.estoque
                                                }
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className="ck-remover"
                                            aria-label={`Remover ${item.nome}`}
                                            onClick={() => remover(item)}
                                            disabled={ocupado === item.id}
                                        >
                                            <i className="fa-regular fa-trash-can" />
                                        </button>

                                    </li>
                                ))}
                            </ul>

                        </section>

                        <ResumoPedido itens={itens} totais={totais}>

                            {!logado && (
                                <p className="ck-resumo-dica">
                                    <i className="fa-solid fa-circle-info" />
                                    Entre na sua conta para finalizar a compra.
                                </p>
                            )}

                            <button
                                type="button"
                                className="btn ck-botao ck-botao--grande"
                                onClick={finalizarCompra}
                                disabled={comProblema}
                            >
                                <i className="fa-solid fa-lock" />
                                Finalizar Compra
                            </button>

                            <Link to="/shop" className="ck-link">
                                Continuar comprando
                            </Link>

                        </ResumoPedido>

                    </div>
                )}

            </div>
        </main>
    )
}

export default Carrinho
