import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

import { useDadosPagina } from '../servicos/servicos.js'
import { useShop } from '../shop/shop.js'
import {
    CATEGORIAS_BUSCA,
    FILTROS_PADRAO,
    MINIMO_CARACTERES,
    ORDEM_CATEGORIAS,
    ORDENACOES,
    TITULOS_SECAO,
    listarFiltrosAtivos,
    montarIndice,
    normalizar,
    pesquisar,
    recursosDosDados,
    removerFiltro,
    resumir
} from './busca.js'
import './BuscaGlobal.css'

// Quantos resultados aparecem por categoria antes de "Ver todos".
const LIMITE_TODOS = 5
const LIMITE_CATEGORIA = 20

const SELETOR_FOCAVEIS =
    'a[href], button:not([disabled]), input:not([disabled]), ' +
    'select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// ----- ícones -----

function IconeLupa() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="busca-icone">
            <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path d="M15.5 15.5 21 21" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
    )
}

function IconeX() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="busca-icone">
            <path d="M5 5l14 14M19 5 5 19" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
    )
}

// ----- espera o usuário parar de digitar -----

function useDebounce(valor, atraso = 250) {
    const [debounced, setDebounced] = useState(valor)

    useEffect(() => {
        const temporizador = setTimeout(() => setDebounced(valor), atraso)

        return () => clearTimeout(temporizador)
    }, [valor, atraso])

    return debounced
}

// ----- dados: reaproveita os hooks que as páginas já usam -----
// Com a key, "Tentar novamente" recarrega as quatro fontes.

function DadosBusca({ children }) {
    const planos = useDadosPagina('planos')
    const servicos = useDadosPagina('servicos')
    const consultas = useDadosPagina('consultas')
    const loja = useShop()

    return children({
        planos,
        servicos,
        consultas,
        produtos: {
            dados: loja.produtos,
            carregando: loja.carregando,
            erro: loja.erro
        }
    })
}

// ----- uma linha de resultado (clicável por inteiro) -----

function LinhaResultado({ item, aoNavegar }) {
    const externo = item.destino.tipo === 'externo'

    const beneficiosVisiveis = item.beneficios.slice(0, 3)
    const beneficiosOcultos = item.beneficios.length - beneficiosVisiveis.length

    const rotuloDisponibilidade = item.rotuloDisponibilidade
        ? item.rotuloDisponibilidade[item.disponivel ? 0 : 1]
        : null

    const conteudo = (
        <>
            {item.imagem && (
                <img
                    className="busca-miniatura"
                    src={item.imagem}
                    alt=""
                    loading="lazy"
                />
            )}

            <span className="busca-texto">
                <span className="busca-nome">{item.nome}</span>

                {item.categoria && (
                    <span className="busca-categoria">{item.categoria}</span>
                )}

                {item.descricao && (
                    <span className="busca-descricao">
                        {resumir(item.descricao, 120)}
                    </span>
                )}

                {(beneficiosVisiveis.length > 0 || item.detalhes.length > 0) && (
                    <span className="busca-detalhes">
                        {beneficiosVisiveis.map(beneficio => (
                            <span key={beneficio}>{beneficio}</span>
                        ))}

                        {beneficiosOcultos > 0 && (
                            <span>+{beneficiosOcultos}</span>
                        )}

                        {item.detalhes.map(detalhe => (
                            <span key={detalhe}>{detalhe}</span>
                        ))}
                    </span>
                )}
            </span>

            <span className="busca-lado">
                {item.precoTexto && (
                    <strong className="busca-preco">{item.precoTexto}</strong>
                )}

                {rotuloDisponibilidade && (
                    <span
                        className={
                            'busca-disponibilidade ' +
                            (item.disponivel ? 'sim' : 'nao')
                        }
                    >
                        {rotuloDisponibilidade}
                    </span>
                )}

                {externo && (
                    <span className="busca-acao">
                        <i className="fa-brands fa-whatsapp" />
                        WhatsApp
                    </span>
                )}
            </span>
        </>
    )

    if (externo) {
        return (
            <a
                className="busca-linha"
                href={item.destino.href}
                target="_blank"
                rel="noopener noreferrer"
            >
                {conteudo}
            </a>
        )
    }

    return (
        <Link
            className="busca-linha"
            to={item.destino.href}
            onClick={aoNavegar}
        >
            {conteudo}
        </Link>
    )
}

// ----- filtros + resultados -----

function ConteudoBusca({
    fontes,
    consulta,
    filtros,
    setFiltros,
    expandidas,
    setExpandidas,
    maisFiltros,
    setMaisFiltros,
    aoTentarNovamente,
    aoNavegar
}) {
    const indice = useMemo(
        () =>
            montarIndice({
                planos: fontes.planos.dados,
                servicos: fontes.servicos.dados,
                consultas: fontes.consultas.dados,
                produtos: fontes.produtos.dados
            }),
        [
            fontes.planos.dados,
            fontes.servicos.dados,
            fontes.consultas.dados,
            fontes.produtos.dados
        ]
    )

    const { porTipo, contagens } = useMemo(
        () => pesquisar(indice, consulta, filtros),
        [indice, consulta, filtros]
    )

    const recursos = useMemo(() => recursosDosDados(indice), [indice])

    const pesquisando = normalizar(consulta).length >= MINIMO_CARACTERES
    const carregando = ORDEM_CATEGORIAS.some(tipo => fontes[tipo].carregando)
    const falhas = ORDEM_CATEGORIAS.filter(tipo => fontes[tipo].erro)
    const todasFalharam = falhas.length === ORDEM_CATEGORIAS.length

    const tipos =
        filtros.categoria === 'todos' ? ORDEM_CATEGORIAS : [filtros.categoria]

    const totalVisivel = tipos.reduce(
        (soma, tipo) => soma + porTipo[tipo].length,
        0
    )

    const filtrosAtivos = listarFiltrosAtivos(filtros)
    const limite =
        filtros.categoria === 'todos' ? LIMITE_TODOS : LIMITE_CATEGORIA

    function alterarFiltro(campo, valor) {
        setFiltros(atual => ({ ...atual, [campo]: valor }))
    }

    function contagemDoFiltro(id) {
        if (!pesquisando) {
            return null
        }

        return id === 'todos' ? contagens.total : contagens[id]
    }

    return (
        <>
            {/* FILTROS DE ASSUNTO, ORDENAÇÃO E FILTROS EXTRAS */}
            <div className="busca-filtros">

                <div
                    className="busca-chips"
                    role="group"
                    aria-label="Filtrar por assunto"
                >
                    {CATEGORIAS_BUSCA.map(categoria => {
                        const ativa = filtros.categoria === categoria.id
                        const contagem = contagemDoFiltro(categoria.id)

                        return (
                            <button
                                type="button"
                                key={categoria.id}
                                className={
                                    'busca-chip' + (ativa ? ' ativa' : '')
                                }
                                aria-pressed={ativa}
                                onClick={() =>
                                    alterarFiltro('categoria', categoria.id)
                                }
                            >
                                {categoria.rotulo}
                                {contagem !== null && (
                                    <span className="busca-chip-contagem">
                                        {contagem}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                <div className="busca-opcoes">

                    <label className="busca-ordenar">
                        Ordenar por
                        <select
                            value={filtros.ordenacao}
                            onChange={evento =>
                                alterarFiltro('ordenacao', evento.target.value)
                            }
                        >
                            {ORDENACOES.map(opcao => (
                                <option key={opcao.valor} value={opcao.valor}>
                                    {opcao.rotulo}
                                </option>
                            ))}
                        </select>
                    </label>

                    {(recursos.temPreco || recursos.temDisponibilidade) && (
                        <button
                            type="button"
                            className="busca-mais-filtros"
                            aria-expanded={maisFiltros}
                            onClick={() => setMaisFiltros(aberto => !aberto)}
                        >
                            Mais filtros
                        </button>
                    )}

                </div>

                {maisFiltros && (
                    <div className="busca-extras">

                        {recursos.temPreco && (
                            <>
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
                            </>
                        )}

                        {recursos.temDisponibilidade && (
                            <label className="busca-extras-check">
                                <input
                                    type="checkbox"
                                    checked={filtros.apenasDisponiveis}
                                    onChange={evento =>
                                        alterarFiltro(
                                            'apenasDisponiveis',
                                            evento.target.checked
                                        )
                                    }
                                />
                                Somente disponíveis
                            </label>
                        )}

                    </div>
                )}

                {filtrosAtivos.length > 0 && (
                    <ul className="busca-ativos" aria-label="Filtros ativos">
                        {filtrosAtivos.map(filtro => (
                            <li key={filtro.chave}>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFiltros(atual =>
                                            removerFiltro(atual, filtro.chave)
                                        )
                                    }
                                    aria-label={`Remover filtro: ${filtro.rotulo}`}
                                >
                                    {filtro.rotulo}
                                    <span aria-hidden="true">×</span>
                                </button>
                            </li>
                        ))}

                        <li>
                            <button
                                type="button"
                                className="busca-limpar-filtros"
                                onClick={() => setFiltros(FILTROS_PADRAO)}
                            >
                                Limpar filtros
                            </button>
                        </li>
                    </ul>
                )}

            </div>

            {/* RESULTADOS */}
            <div className="busca-corpo">

                {falhas.length > 0 && !todasFalharam && (
                    <p className="busca-aviso" role="alert">
                        Não foi possível carregar:{' '}
                        {falhas.map(tipo => TITULOS_SECAO[tipo]).join(', ')}.{' '}
                        <button type="button" onClick={aoTentarNovamente}>
                            Tentar novamente
                        </button>
                    </p>
                )}

                {todasFalharam && (
                    <div className="busca-estado" role="alert">
                        <p>Não foi possível realizar a pesquisa agora.</p>

                        <button
                            type="button"
                            className="btn"
                            onClick={aoTentarNovamente}
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                {!todasFalharam && !pesquisando && (
                    <div className="busca-estado">
                        <p>
                            {carregando
                                ? 'Carregando...'
                                : 'O que você procura? Pesquise por planos, ' +
                                  'serviços, consultas e produtos.'}
                        </p>

                        <small>
                            Digite pelo menos {MINIMO_CARACTERES} letras.
                        </small>
                    </div>
                )}

                {!todasFalharam &&
                    pesquisando &&
                    carregando &&
                    totalVisivel === 0 && (
                        <div className="busca-estado" role="status">
                            <p>Buscando...</p>
                        </div>
                    )}

                {!todasFalharam &&
                    pesquisando &&
                    !carregando &&
                    totalVisivel === 0 && (
                        <div className="busca-estado" role="status">
                            <p>
                                Nenhum resultado para “{consulta.trim()}”.
                            </p>

                            <small>
                                Confira a ortografia, tente outra palavra
                                {filtrosAtivos.length > 0
                                    ? ' ou remova algum filtro.'
                                    : '.'}
                            </small>
                        </div>
                    )}

                {pesquisando && totalVisivel > 0 && (
                    <p className="busca-status" role="status">
                        {totalVisivel}{' '}
                        {totalVisivel === 1 ? 'resultado' : 'resultados'} para
                        “{consulta.trim()}”
                    </p>
                )}

                {pesquisando &&
                    tipos.map(tipo => {
                        const lista = porTipo[tipo]

                        if (lista.length === 0) {
                            return null
                        }

                        const expandida = Boolean(expandidas[tipo])
                        const visiveis = expandida
                            ? lista
                            : lista.slice(0, limite)

                        return (
                            <section
                                key={tipo}
                                className="busca-secao"
                                aria-labelledby={`busca-secao-${tipo}`}
                            >
                                <h3 id={`busca-secao-${tipo}`}>
                                    {TITULOS_SECAO[tipo]}
                                    <span className="busca-contagem">
                                        {lista.length}
                                    </span>
                                </h3>

                                <ul className="busca-lista">
                                    {visiveis.map(item => (
                                        <li key={item.chave}>
                                            <LinhaResultado
                                                item={item}
                                                aoNavegar={aoNavegar}
                                            />
                                        </li>
                                    ))}
                                </ul>

                                {lista.length > limite && (
                                    <button
                                        type="button"
                                        className="busca-ver-mais"
                                        aria-expanded={expandida}
                                        onClick={() =>
                                            setExpandidas(atual => ({
                                                ...atual,
                                                [tipo]: !expandida
                                            }))
                                        }
                                    >
                                        {expandida
                                            ? 'Ver menos'
                                            : `Ver todos (${lista.length})`}
                                    </button>
                                )}
                            </section>
                        )
                    })}

                {pesquisando && carregando && totalVisivel > 0 && (
                    <p className="busca-carregando" role="status">
                        Carregando mais resultados...
                    </p>
                )}

            </div>
        </>
    )
}

// ----- janela de pesquisa -----

function BuscaGlobal({ aoFechar }) {
    const [consulta, setConsulta] = useState('')
    const [filtros, setFiltros] = useState(FILTROS_PADRAO)
    const [expandidas, setExpandidas] = useState({})
    const [maisFiltros, setMaisFiltros] = useState(false)
    const [tentativa, setTentativa] = useState(0)

    const painelRef = useRef(null)
    const campoRef = useRef(null)

    // Atualiza os resultados conforme o usuário digita, sem consultar a
    // cada tecla.
    const consultaComAtraso = useDebounce(consulta, 250)

    // Foco no campo ao abrir, bloqueio da rolagem da página e
    // devolução do foco ao ícone quando fechar.
    useEffect(() => {
        const anterior = document.activeElement
        const overflowAnterior = document.body.style.overflow

        document.body.style.overflow = 'hidden'
        campoRef.current?.focus()

        return () => {
            document.body.style.overflow = overflowAnterior
            anterior?.focus?.()
        }
    }, [])

    // ESC fecha. Tab fica preso dentro da janela.
    useEffect(() => {
        function aoTeclar(evento) {
            if (evento.key === 'Escape') {
                evento.preventDefault()
                aoFechar()
                return
            }

            if (evento.key !== 'Tab' || !painelRef.current) {
                return
            }

            const focaveis = painelRef.current.querySelectorAll(SELETOR_FOCAVEIS)

            if (focaveis.length === 0) {
                return
            }

            const primeiro = focaveis[0]
            const ultimo = focaveis[focaveis.length - 1]

            if (evento.shiftKey && document.activeElement === primeiro) {
                evento.preventDefault()
                ultimo.focus()
            } else if (!evento.shiftKey && document.activeElement === ultimo) {
                evento.preventDefault()
                primeiro.focus()
            }
        }

        document.addEventListener('keydown', aoTeclar)

        return () => document.removeEventListener('keydown', aoTeclar)
    }, [aoFechar])

    function limparCampo() {
        setConsulta('')
        campoRef.current?.focus()
    }

    return createPortal(
        <div
            className="busca-fundo"
            onMouseDown={evento => {
                if (evento.target === evento.currentTarget) {
                    aoFechar()
                }
            }}
        >
            <div
                className="busca-painel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="busca-titulo"
                ref={painelRef}
            >

                <h2 id="busca-titulo" className="busca-sr">
                    Pesquisar no PataQuada
                </h2>

                <div className="busca-topo">

                    <div className="busca-campo">
                        <IconeLupa />

                        <input
                            ref={campoRef}
                            type="search"
                            value={consulta}
                            onChange={evento => setConsulta(evento.target.value)}
                            placeholder="Pesquise planos, serviços, consultas e produtos"
                            aria-label="Pesquisar"
                            autoComplete="off"
                            enterKeyHint="search"
                        />

                        {consulta && (
                            <button
                                type="button"
                                className="busca-limpar"
                                aria-label="Limpar pesquisa"
                                onClick={limparCampo}
                            >
                                <IconeX />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        className="busca-fechar"
                        aria-label="Fechar pesquisa"
                        onClick={aoFechar}
                    >
                        <IconeX />
                    </button>

                </div>

                <DadosBusca key={tentativa}>
                    {fontes => (
                        <ConteudoBusca
                            fontes={fontes}
                            consulta={consultaComAtraso}
                            filtros={filtros}
                            setFiltros={setFiltros}
                            expandidas={expandidas}
                            setExpandidas={setExpandidas}
                            maisFiltros={maisFiltros}
                            setMaisFiltros={setMaisFiltros}
                            aoTentarNovamente={() =>
                                setTentativa(atual => atual + 1)
                            }
                            aoNavegar={aoFechar}
                        />
                    )}
                </DadosBusca>

            </div>
        </div>,
        document.body
    )
}

export default BuscaGlobal
