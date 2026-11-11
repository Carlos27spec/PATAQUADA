import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import CartaoProduto from '../../components/CartaoProduto.jsx'
import { adicionarAoCarrinho } from './carrinho.js'
import {
    FRETE_GRATIS_A_PARTIR_DE,
    formatarPreco,
    produtosSemelhantes,
    useShop
} from './shop.js'
import './shop.css'

import patinha from '../../assets/paw.png'

// Rota do carrinho (usada em "Comprar Agora" e no aviso de sucesso).
const ROTA_CARRINHO = '/carrinho'

/* ========================================
   DETALHE DO PRODUTO
   Recebe key={produto.id}: ao abrir outro produto, este componente é
   recriado e a quantidade e os avisos voltam ao início sozinhos.
======================================== */

function DetalheProduto({ produto, semelhantes }) {
    const navigate = useNavigate()

    const [quantidade, setQuantidade] = useState(1)
    const [aviso, setAviso] = useState(null)
    const [enviando, setEnviando] = useState(false)

    function alterarQuantidade(novoValor) {
        const limite = Math.max(produto.estoque, 1)
        const valor = Math.min(Math.max(Number(novoValor) || 1, 1), limite)

        setQuantidade(valor)
    }

    async function comprar(irParaCarrinho) {
        if (enviando) {
            return
        }

        setEnviando(true)
        setAviso(null)

        const resultado = await adicionarAoCarrinho(produto, quantidade)

        setEnviando(false)

        if (resultado.ok && irParaCarrinho) {
            navigate(ROTA_CARRINHO)
            return
        }

        setAviso({
            tipo: resultado.ok ? 'sucesso' : 'erro',
            texto: resultado.mensagem,
            carrinho: resultado.ok
        })
    }

    const paragrafos = String(produto.descricao)
        .split(/\r?\n/)
        .map(texto => texto.trim())
        .filter(Boolean)

    return (
        <main className="shop-pagina">
            <div className="shop-container">

                {/* CAMINHO */}
                <nav className="shop-migalhas" aria-label="Você está em">
                    <Link to="/shop">Shop</Link>

                    {produto.categoriaNome && (
                        <>
                            <span aria-hidden="true">›</span>
                            <span>{produto.categoriaNome}</span>
                        </>
                    )}

                    <span aria-hidden="true">›</span>
                    <span aria-current="page">{produto.nome}</span>
                </nav>


                {/* PRODUTO */}
                <section className="produto-detalhe">

                    <div className="produto-galeria">
                        <img
                            src={patinha}
                            alt=""
                            aria-hidden="true"
                            className="produto-galeria-patinha"
                        />

                        <img
                            src={produto.imagem}
                            alt={produto.nome}
                            className="produto-galeria-imagem"
                        />
                    </div>

                    <div className="produto-info">

                        {produto.categoriaNome && (
                            <span className="produto-categoria">
                                {produto.categoriaNome}
                            </span>
                        )}

                        <h1>{produto.nome}</h1>

                        <p className="produto-preco">
                            {produto.precoFormatado}
                        </p>

                        <p
                            className={
                                'produto-estoque ' +
                                (produto.disponivel
                                    ? 'produto-estoque--disponivel'
                                    : 'produto-estoque--esgotado')
                            }
                        >
                            {produto.disponivel
                                ? `Em estoque: ${produto.estoque} ${produto.estoque === 1
                                    ? 'unidade'
                                    : 'unidades'
                                }`
                                : 'Produto esgotado'}
                        </p>

                        <div className="produto-descricao">
                            <h2>Descrição</h2>

                            {paragrafos.map(texto => (
                                <p key={texto}>{texto}</p>
                            ))}
                        </div>

                        {produto.disponivel && (
                            <div className="produto-compra">

                                <div
                                    className="produto-quantidade"
                                    role="group"
                                    aria-label="Quantidade"
                                >
                                    <button
                                        type="button"
                                        aria-label="Diminuir quantidade"
                                        onClick={() =>
                                            alterarQuantidade(quantidade - 1)
                                        }
                                        disabled={quantidade <= 1}
                                    >
                                        −
                                    </button>

                                    <input
                                        type="number"
                                        min="1"
                                        max={produto.estoque}
                                        value={quantidade}
                                        onChange={evento =>
                                            alterarQuantidade(
                                                evento.target.value
                                            )
                                        }
                                        aria-label="Quantidade"
                                    />

                                    <button
                                        type="button"
                                        aria-label="Aumentar quantidade"
                                        onClick={() =>
                                            alterarQuantidade(quantidade + 1)
                                        }
                                        disabled={
                                            quantidade >= produto.estoque
                                        }
                                    >
                                        +
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="btn produto-botao-comprar"
                                    onClick={() => comprar(true)}
                                    disabled={enviando}
                                >
                                    Comprar Agora
                                </button>

                                <button
                                    type="button"
                                    className="btn produto-botao-carrinho"
                                    onClick={() => comprar(false)}
                                    disabled={enviando}
                                >
                                    <i className="fa-solid fa-cart-shopping" />
                                    Adicionar ao carrinho
                                </button>

                            </div>
                        )}

                        {aviso && (
                            <p
                                className={`produto-aviso produto-aviso--${aviso.tipo}`}
                                role="status"
                            >
                                {aviso.texto}

                                {aviso.carrinho && (
                                    <>
                                        {' '}
                                        <Link to={ROTA_CARRINHO}>
                                            Ver carrinho
                                        </Link>
                                    </>
                                )}
                            </p>
                        )}

                        <ul className="produto-vantagens">
                            <li>
                                <i className="fa-solid fa-truck-fast" />
                                Frete grátis a partir de{' '}
                                {formatarPreco(FRETE_GRATIS_A_PARTIR_DE)}
                            </li>

                            <li>
                                <i className="fa-solid fa-shield-heart" />
                                Compra segura
                            </li>

                            <li>
                                <i className="fa-solid fa-paw" />
                                Escolhido para o seu pet
                            </li>
                        </ul>

                    </div>
                </section>


                {/* SEMELHANTES */}
                {semelhantes.length > 0 && (
                    <section className="produto-semelhantes">

                        <h2>
                            <img src={patinha} alt="" />
                            Você também pode gostar
                        </h2>

                        <div className="shop-grid shop-grid--semelhantes">
                            {semelhantes.map(item => (
                                <CartaoProduto
                                    key={item.id}
                                    produto={item}
                                    compacto
                                />
                            ))}
                        </div>

                    </section>
                )}

            </div>
        </main>
    )
}

/* ========================================
   PÁGINA (carrega os dados e escolhe o que mostrar)
======================================== */

function Produto() {
    const { id } = useParams()

    const { produtos, carregando, erro } = useShop()

    const produto = produtos.find(item => String(item.id) === String(id))

    const semelhantes = useMemo(
        () => (produto ? produtosSemelhantes(produto, produtos, 4) : []),
        [produto, produtos]
    )

    // Ao abrir outro produto (clicando em um semelhante), volta ao topo.
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [id])

    if (carregando) {
        return (
            <main className="shop-pagina">
                <div className="shop-container">
                    <p className="shop-mensagem">Carregando produto...</p>
                </div>
            </main>
        )
    }

    if (erro) {
        return (
            <main className="shop-pagina">
                <div className="shop-container">
                    <p className="shop-mensagem shop-mensagem--erro">
                        {erro}
                    </p>
                </div>
            </main>
        )
    }

    if (!produto) {
        return (
            <main className="shop-pagina">
                <div className="shop-container">
                    <div className="shop-mensagem">
                        <p>Produto não encontrado.</p>

                        <Link to="/shop" className="btn shop-voltar">
                            Voltar para a loja
                        </Link>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <DetalheProduto
            key={produto.id}
            produto={produto}
            semelhantes={semelhantes}
        />
    )
}

export default Produto