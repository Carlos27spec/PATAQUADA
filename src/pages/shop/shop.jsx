
import { useEffect, useMemo, useRef, useState } from 'react'

import CartaoProduto from '../../components/CartaoProduto.jsx'

import {
    FRETE_GRATIS_A_PARTIR_DE,
    formatarPreco,
    localizarImagem,
    normalizarTexto,
    useShop
} from './shop.js'

import './shop.css'

import patinha from '../../assets/paw.png'

// Imagens opcionais em src/assets:
// - shop-banner, banner-shop ou cachorro-gato
// - frete, cachorro-frete ou dog-frete

const imagemBanner = localizarImagem([
    'dog-cat-1'
])

const imagemFrete = localizarImagem([
    'frete',
    'cachorro-frete',
    'dog-frete'
])

const FILTROS_INICIAIS = {
    ordenacao: 'relevancia',
    precoMinimo: '',
    precoMaximo: '',
    somenteEstoque: false
}

// "12,50" ou "12.50" (reais) -> 1250 (centavos). Vazio = null.
function reaisParaCentavos(valor) {
    const texto = String(valor).trim().replace(',', '.')

    if (texto === '') {
        return null
    }

    const numero = Number(texto)

    return Number.isFinite(numero) ? Math.round(numero * 100) : null
}

function Shop() {
    const { produtos, categorias, carregando, erro } = useShop()

    const [busca, setBusca] = useState('')
    const [categoriaAtiva, setCategoriaAtiva] = useState(null)
    const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
    const [painelAberto, setPainelAberto] = useState(false)

    const categoriasRef = useRef(null)
    const arrastandoRef = useRef(false)
    const inicioArrasteRef = useRef(0)
    const scrollInicialRef = useRef(0)
    const houveArrasteRef = useRef(false)

    // Rolagem pelas setas
    function moverCategorias(direcao) {
        if (!categoriasRef.current) return

        categoriasRef.current.scrollBy({
            left: direcao * 300,
            behavior: 'smooth'
        })
    }

    // Inicia o arraste com o botão esquerdo do mouse
    function iniciarArraste(evento) {
        if (evento.button !== 0) return

        arrastandoRef.current = true
        houveArrasteRef.current = false
        inicioArrasteRef.current = evento.pageX
        scrollInicialRef.current = categoriasRef.current.scrollLeft
    }

    // Movimenta as categorias durante o arraste
    function arrastarCategorias(evento) {
        if (!arrastandoRef.current) return

        const distancia = evento.pageX - inicioArrasteRef.current

        if (Math.abs(distancia) > 5) {
            houveArrasteRef.current = true
        }

        if (houveArrasteRef.current) {
            categoriasRef.current.scrollLeft =
                scrollInicialRef.current - distancia
        }
    }

    // Finaliza o arraste
    function finalizarArraste() {
        arrastandoRef.current = false
    }

    // Impede que o arraste acione o clique de uma categoria
    function bloquearCliqueAposArraste(evento) {
        if (houveArrasteRef.current) {
            evento.preventDefault()
            evento.stopPropagation()
            houveArrasteRef.current = false
        }
    }

    // Rolagem horizontal usando a roda do mouse.
    // O listener passivo é desativado para permitir preventDefault().
    useEffect(() => {
        const elemento = categoriasRef.current

        if (!elemento) return

        function rolarCategorias(evento) {
            if (Math.abs(evento.deltaY) > Math.abs(evento.deltaX)) {
                evento.preventDefault()
                elemento.scrollLeft += evento.deltaY
            }
        }

        elemento.addEventListener('wheel', rolarCategorias, {
            passive: false
        })

        return () => {
            elemento.removeEventListener('wheel', rolarCategorias)
        }
    }, [categorias])

    // Altera um filtro específico
    function alterarFiltro(campo, valor) {
        setFiltros(atual => ({
            ...atual,
            [campo]: valor
        }))
    }

    // Limpa todos os filtros
    function limparFiltros() {
        setBusca('')
        setCategoriaAtiva(null)
        setFiltros(FILTROS_INICIAIS)
    }

    // Filtragem e ordenação dos produtos
    const produtosFiltrados = useMemo(() => {
        const termo = normalizarTexto(busca.trim())
        const minimo = reaisParaCentavos(filtros.precoMinimo)
        const maximo = reaisParaCentavos(filtros.precoMaximo)

        const lista = produtos.filter(produto => {
            if (
                categoriaAtiva !== null &&
                produto.categoriaId !== categoriaAtiva
            ) {
                return false
            }

            if (
                termo &&
                !normalizarTexto(
                    `${produto.nome} ${produto.descricao} ${produto.categoriaNome}`
                ).includes(termo)
            ) {
                return false
            }

            if (minimo !== null && produto.preco < minimo) {
                return false
            }

            if (maximo !== null && produto.preco > maximo) {
                return false
            }

            if (filtros.somenteEstoque && !produto.disponivel) {
                return false
            }

            return true
        })

        if (filtros.ordenacao === 'menor-preco') {
            lista.sort((a, b) => a.preco - b.preco)
        }

        if (filtros.ordenacao === 'maior-preco') {
            lista.sort((a, b) => b.preco - a.preco)
        }

        if (filtros.ordenacao === 'nome') {
            lista.sort((a, b) =>
                a.nome.localeCompare(b.nome, 'pt-BR')
            )
        }

        return lista
    }, [produtos, busca, categoriaAtiva, filtros])

    const filtrosAtivos =
        busca.trim() !== '' ||
        categoriaAtiva !== null ||
        filtros.ordenacao !== FILTROS_INICIAIS.ordenacao ||
        filtros.precoMinimo !== '' ||
        filtros.precoMaximo !== '' ||
        filtros.somenteEstoque

    return (
        <main className="shop-pagina">
            <div className="shop-container">

                {/* BANNER */}
                <section className="shop-banner">

                    <div className="shop-banner-patinhas" aria-hidden="true">
                        <img src={patinha} alt="" />
                        <img src={patinha} alt="" />
                        <img src={patinha} alt="" />
                        <img src={patinha} alt="" />
                    </div>

                    <div className="shop-banner-texto">
                        <h1>
                            Shop

                            <svg
                                viewBox="0 0 60 48"
                                aria-hidden="true"
                                className="shop-banner-faiscas"
                            >
                                <path
                                    d="M10 40 L22 6 M26 22 L58 10 M30 36 L58 32"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </h1>

                        <blockquote>
                            “Tudo para deixar os momentos com seu pet
                            ainda mais especiais.”
                        </blockquote>

                        <p>
                            Rações, acessórios, brinquedos, higiene e muito
                            mais para o bem-estar do seu melhor amigo.
                        </p>
                    </div>

                    {imagemBanner && (
                        <img
                            src={imagemBanner}
                            alt="Cachorro e gato"
                            className="shop-banner-imagem"
                        />
                    )}

                    <img
                        src={patinha}
                        alt=""
                        className="shop-banner-patinha shop-banner-patinha--meio"
                    />

                    <img
                        src={patinha}
                        alt=""
                        className="shop-banner-patinha shop-banner-patinha--canto"
                    />

                    <span className="shop-banner-coracao" aria-hidden="true">
                        ♡
                    </span>
                </section>

                {/* CATEGORIAS */}
                {categorias.length > 0 && (
                    <div className="shop-categorias-wrapper">

                        <button
                            type="button"
                            className="shop-categorias-seta shop-categorias-seta--esquerda"
                            aria-label="Categorias anteriores"
                            onClick={() => moverCategorias(-1)}
                        >
                            <i className="fa-solid fa-chevron-left" />
                        </button>

                        <nav
                            ref={categoriasRef}
                            className="shop-categorias"
                            aria-label="Categorias de produtos"
                            onMouseDown={iniciarArraste}
                            onMouseMove={arrastarCategorias}
                            onMouseUp={finalizarArraste}
                            onMouseLeave={finalizarArraste}
                            onClickCapture={bloquearCliqueAposArraste}
                        >
                            {categorias.map(categoria => {
                                const ativa = categoriaAtiva === categoria.id

                                return (
                                    <button
                                        type="button"
                                        key={categoria.id}
                                        className={
                                            'shop-categoria' +
                                            (ativa ? ' ativa' : '')
                                        }
                                        aria-pressed={ativa}
                                        onClick={() =>
                                            setCategoriaAtiva(
                                                ativa ? null : categoria.id
                                            )
                                        }
                                    >
                                        <span className="shop-categoria-circulo">
                                            <img
                                                src={categoria.imagem}
                                                alt=""
                                            />
                                        </span>

                                        <span className="shop-categoria-nome">
                                            {categoria.nome}
                                        </span>
                                    </button>
                                )
                            })}
                        </nav>

                        <button
                            type="button"
                            className="shop-categorias-seta shop-categorias-seta--direita"
                            aria-label="Próximas categorias"
                            onClick={() => moverCategorias(1)}
                        >
                            <i className="fa-solid fa-chevron-right" />
                        </button>

                    </div>
                )}

                {/* BUSCA E FILTROS */}
                <div className="shop-busca">

                    <form
                        className="shop-busca-campo"
                        role="search"
                        onSubmit={evento => evento.preventDefault()}
                    >
                        <input
                            type="search"
                            value={busca}
                            onChange={evento => setBusca(evento.target.value)}
                            placeholder="Pesquise seu produto aqui"
                            aria-label="Pesquisar produto"
                        />

                        <button type="submit" aria-label="Pesquisar">
                            <i className="fa-solid fa-magnifying-glass" />
                        </button>
                    </form>

                    <button
                        type="button"
                        className="shop-filtros-botao"
                        aria-expanded={painelAberto}
                        aria-controls="shop-filtros-painel"
                        onClick={() => setPainelAberto(aberto => !aberto)}
                    >
                        Filtros
                    </button>

                </div>

                {/* PAINEL DE FILTROS */}
                {painelAberto && (
                    <div
                        className="shop-filtros-painel"
                        id="shop-filtros-painel"
                    >

                        <label>
                            Ordenar por

                            <select
                                value={filtros.ordenacao}
                                onChange={evento =>
                                    alterarFiltro(
                                        'ordenacao',
                                        evento.target.value
                                    )
                                }
                            >
                                <option value="relevancia">Relevância</option>
                                <option value="menor-preco">Menor preço</option>
                                <option value="maior-preco">Maior preço</option>
                                <option value="nome">Nome (A-Z)</option>
                            </select>
                        </label>

                        <label>
                            Preço mínimo (R$)

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={filtros.precoMinimo}
                                onChange={evento =>
                                    alterarFiltro(
                                        'precoMinimo',
                                        evento.target.value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Preço máximo (R$)

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={filtros.precoMaximo}
                                onChange={evento =>
                                    alterarFiltro(
                                        'precoMaximo',
                                        evento.target.value
                                    )
                                }
                            />
                        </label>

                        <label className="shop-filtros-check">
                            <input
                                type="checkbox"
                                checked={filtros.somenteEstoque}
                                onChange={evento =>
                                    alterarFiltro(
                                        'somenteEstoque',
                                        evento.target.checked
                                    )
                                }
                            />

                            Somente com estoque
                        </label>

                        <button
                            type="button"
                            className="btn shop-filtros-limpar"
                            onClick={limparFiltros}
                            disabled={!filtrosAtivos}
                        >
                            Limpar filtros
                        </button>

                    </div>
                )}

                {/* MENSAGENS */}
                {carregando && (
                    <p className="shop-mensagem">
                        Carregando produtos...
                    </p>
                )}

                {erro && (
                    <p className="shop-mensagem shop-mensagem--erro">
                        {erro}
                    </p>
                )}

                {!carregando && !erro && produtos.length === 0 && (
                    <p className="shop-mensagem">
                        Nenhum produto disponível no momento.
                    </p>
                )}

                {!carregando &&
                    !erro &&
                    produtos.length > 0 &&
                    produtosFiltrados.length === 0 && (
                        <p className="shop-mensagem">
                            Nenhum produto encontrado com esses filtros.{' '}

                            <button
                                type="button"
                                className="shop-link-botao"
                                onClick={limparFiltros}
                            >
                                Limpar filtros
                            </button>
                        </p>
                    )}

                {/* PRODUTOS */}
                {!carregando && !erro && produtosFiltrados.length > 0 && (
                    <div className="shop-grid shop-grid--catalogo">
                        {produtosFiltrados.map(produto => (
                            <CartaoProduto
                                key={produto.id}
                                produto={produto}
                            />
                        ))}
                    </div>
                )}

                {/* FRETE GRÁTIS */}
                <section className="shop-frete">

                    <img
                        src={patinha}
                        alt=""
                        className="shop-frete-patinha shop-frete-patinha--esq"
                    />

                    <img
                        src={patinha}
                        alt=""
                        className="shop-frete-patinha shop-frete-patinha--dir"
                    />

                    <svg
                        viewBox="0 0 120 64"
                        aria-hidden="true"
                        className="shop-frete-caminhao"
                    >
                        <path
                            d="M4 14h26M0 26h24M8 38h18"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />

                        <path
                            d="M34 8h44v40H34zM78 20h20l14 14v14H78z"
                            fill="currentColor"
                        />

                        <circle cx="52" cy="52" r="8" fill="currentColor" />
                        <circle cx="98" cy="52" r="8" fill="currentColor" />

                        <circle
                            cx="52"
                            cy="52"
                            r="3"
                            className="shop-frete-roda"
                        />

                        <circle
                            cx="98"
                            cy="52"
                            r="3"
                            className="shop-frete-roda"
                        />
                    </svg>

                    <div className="shop-frete-texto">
                        <h2>
                            Frete Grátis nas compras a partir de{' '}
                            {formatarPreco(FRETE_GRATIS_A_PARTIR_DE)}
                        </h2>

                        <p>
                            Garantindo o melhor para você e seu pet
                        </p>
                    </div>

                    {imagemFrete && (
                        <img
                            src={imagemFrete}
                            alt=""
                            className="shop-frete-imagem"
                        />
                    )}

                </section>

            </div>
        </main>
    )
}

export default Shop
