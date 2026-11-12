import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import ResumoPedido from './ResumoPedido.jsx'
import {
    FORMAS_PAGAMENTO,
    ROTA_LOGIN,
    buscarCep,
    criarPagamento,
    formatarCep,
    formatarTelefone,
    lerEntregaSalva,
    salvarEntrega,
    useCarrinho
} from './checkout.js'
import './checkout.css'

const PASSOS = ['Entrega', 'Pagamento', 'Confirmação']

// ----- ícones das formas de pagamento -----

function IconePix() {
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true" className="ck-icone-pix">
            <rect x="3" y="17" width="14" height="14" rx="3" transform="rotate(45 10 24)" />
            <rect x="17" y="3" width="14" height="14" rx="3" transform="rotate(45 24 10)" />
            <rect x="31" y="17" width="14" height="14" rx="3" transform="rotate(45 38 24)" />
            <rect x="17" y="31" width="14" height="14" rx="3" transform="rotate(45 24 38)" />
        </svg>
    )
}

function iconeDaForma(codigo) {
    if (codigo === 'PIX') {
        return <IconePix />
    }

    if (codigo === 'BOLETO') {
        return <i className="fa-solid fa-barcode ck-icone-boleto" />
    }

    return <i className="fa-solid fa-credit-card ck-icone-cartao" />
}

// ----- etapas -----

function Passos({ atual }) {
    return (
        <ol className="ck-passos" aria-label="Etapas da compra">
            {PASSOS.map((nome, indice) => {
                const numero = indice + 1

                const estado =
                    numero < atual
                        ? 'concluido'
                        : numero === atual
                            ? 'ativo'
                            : ''

                return (
                    <li
                        key={nome}
                        className={`ck-passo ${estado}`}
                        aria-current={numero === atual ? 'step' : undefined}
                    >
                        <span className="ck-passo-numero">
                            {numero < atual
                                ? <i className="fa-solid fa-check" />
                                : numero}
                        </span>

                        <span className="ck-passo-nome">{nome}</span>
                    </li>
                )
            })}
        </ol>
    )
}

// ----- validação do endereço (o servidor valida de novo) -----

function validarEntrega(entrega) {
    if (entrega.destinatario.trim().length < 3) {
        return 'Informe o nome de quem vai receber o pedido.'
    }

    if (entrega.telefone.replace(/\D/g, '').length < 10) {
        return 'Informe um telefone com DDD.'
    }

    if (entrega.cep.replace(/\D/g, '').length !== 8) {
        return 'Informe um CEP válido.'
    }

    if (!entrega.logradouro.trim()) {
        return 'Informe a rua.'
    }

    if (!entrega.numero.trim()) {
        return 'Informe o número.'
    }

    if (!entrega.bairro.trim()) {
        return 'Informe o bairro.'
    }

    if (!entrega.cidade.trim()) {
        return 'Informe a cidade.'
    }

    if (!/^[A-Za-z]{2}$/.test(entrega.uf.trim())) {
        return 'Informe a sigla do estado (UF).'
    }

    return null
}

function Pagamento() {
    const navigate = useNavigate()

    const { itens, logado, carregando, erro, totais } = useCarrinho()

    const [passo, setPasso] = useState(1)
    const [entrega, setEntrega] = useState(lerEntregaSalva)
    const [forma, setForma] = useState('PIX')
    const [buscandoCep, setBuscandoCep] = useState(false)
    const [erroEntrega, setErroEntrega] = useState(null)
    const [erroPagamento, setErroPagamento] = useState(null)
    const [enviando, setEnviando] = useState(false)

    function alterarCampo(campo, valor) {
        setEntrega(atual => ({ ...atual, [campo]: valor }))
    }

    async function preencherPeloCep() {
        if (entrega.cep.replace(/\D/g, '').length !== 8) {
            return
        }

        setBuscandoCep(true)

        const dados = await buscarCep(entrega.cep)

        setBuscandoCep(false)

        if (dados) {
            setEntrega(atual => ({
                ...atual,
                logradouro: dados.logradouro || atual.logradouro,
                bairro: dados.bairro || atual.bairro,
                cidade: dados.cidade || atual.cidade,
                uf: dados.uf || atual.uf
            }))
        }
    }

    function continuarParaPagamento(evento) {
        evento.preventDefault()

        const problema = validarEntrega(entrega)

        if (problema) {
            setErroEntrega(problema)
            return
        }

        salvarEntrega(entrega)
        setErroEntrega(null)
        setPasso(2)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function pagar() {
        setEnviando(true)
        setErroPagamento(null)

        try {
            const resposta = await criarPagamento({ forma, entrega })

            // Vai para a página segura do Mercado Pago.
            window.location.assign(resposta.init_point)

        } catch (falha) {
            if (falha.status === 401) {
                navigate(ROTA_LOGIN, { state: { de: '/pagamento' } })
                return
            }

            setErroPagamento(falha.message)
            setEnviando(false)
        }
    }

    // ----- estados da página -----

    if (!carregando && !logado && !erro) {
        return (
            <Navigate
                to={ROTA_LOGIN}
                state={{ de: '/pagamento' }}
                replace
            />
        )
    }

    const semItens = !carregando && !erro && itens.length === 0

    const comProblema = itens.some(
        item => !item.disponivel || item.quantidade > item.estoque
    )

    return (
        <main className="ck-pagina">
            <div className="ck-container">

                <header className="ck-titulo">
                    {passo === 2 ? (
                        <button
                            type="button"
                            className="ck-voltar"
                            aria-label="Voltar para a entrega"
                            onClick={() => setPasso(1)}
                            disabled={enviando}
                        >
                            <i className="fa-solid fa-arrow-left" />
                        </button>
                    ) : (
                        <Link
                            to="/carrinho"
                            className="ck-voltar"
                            aria-label="Voltar para o carrinho"
                        >
                            <i className="fa-solid fa-arrow-left" />
                        </Link>
                    )}

                    <h1>Pagamento</h1>
                </header>

                {carregando && (
                    <p className="ck-mensagem">Carregando...</p>
                )}

                {erro && (
                    <div className="ck-mensagem ck-mensagem--erro">
                        <p>{erro}</p>

                        <Link to="/carrinho" className="btn">
                            Voltar para o carrinho
                        </Link>
                    </div>
                )}

                {semItens && (
                    <div className="ck-mensagem">
                        <p>Seu carrinho está vazio.</p>

                        <Link to="/shop" className="btn ck-botao">
                            Ir para a loja
                        </Link>
                    </div>
                )}

                {!carregando && !erro && itens.length > 0 && (
                    <>
                        <Passos atual={passo} />

                        <div className="ck-layout">

                            <section className="ck-painel">

                                {comProblema && (
                                    <p className="ck-aviso ck-aviso--erro" role="alert">
                                        Algum item do carrinho está sem
                                        estoque.{' '}
                                        <Link to="/carrinho">
                                            Revise o carrinho
                                        </Link>
                                        .
                                    </p>
                                )}

                                {/* ETAPA 1 - ENTREGA */}
                                {passo === 1 && (
                                    <form
                                        onSubmit={continuarParaPagamento}
                                        noValidate
                                    >
                                        <h2>Endereço de entrega</h2>

                                        <div className="ck-form">

                                            <label className="ck-campo ck-campo--6">
                                                Nome de quem recebe
                                                <input
                                                    type="text"
                                                    autoComplete="name"
                                                    value={entrega.destinatario}
                                                    onChange={evento =>
                                                        alterarCampo(
                                                            'destinatario',
                                                            evento.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label className="ck-campo ck-campo--3">
                                                Telefone com DDD
                                                <input
                                                    type="tel"
                                                    inputMode="tel"
                                                    autoComplete="tel"
                                                    placeholder="(11) 98765-4321"
                                                    value={entrega.telefone}
                                                    onChange={evento =>
                                                        alterarCampo(
                                                            'telefone',
                                                            formatarTelefone(
                                                                evento.target.value
                                                            )
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label className="ck-campo ck-campo--3">
                                                CEP
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="postal-code"
                                                    placeholder="00000-000"
                                                    value={entrega.cep}
                                                    onChange={evento =>
                                                        alterarCampo(
                                                            'cep',
                                                            formatarCep(
                                                                evento.target.value
                                                            )
                                                        )
                                                    }
                                                    onBlur={preencherPeloCep}
                                                />
                                                {buscandoCep && (
                                                    <small>Buscando endereço...</small>
                                                )}
                                            </label>

                                            <label className="ck-campo ck-campo--4">
                                                Rua
                                                <input
                                                    type="text"
                                                    autoComplete="address-line1"
                                                    value={entrega.logradouro}
                                                    onChange={evento =>
                                                        alterarCampo(
                                                            'logradouro',
                                                            evento.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label className="ck-campo ck-campo--2">
                                                Número
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={entrega.numero}
                                                    onChange={evento =>
                                                        alterarCampo(
                                                            'numero',
                                                            evento.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label className="ck-campo ck-campo--3">
                                                Complemento
                                                <input
                                                    type="text"
                                                    autoComplete="address-line2"
                                                    placeholder="Apto, bloco... (opcional)"
                                                    value={entrega.complemento}
                                                    onChange={evento =>
                                                        alterarCampo(
                                                            'complemento',
                                                            evento.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label className="ck-campo ck-campo--3">
                                                Bairro
                                                <input
                                                    type="text"
                                                    value={entrega.bairro}
                                                    onChange={evento =>
                                                        alterarCampo(
                                                            'bairro',
                                                            evento.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label className="ck-campo ck-campo--4">
                                                Cidade
                                                <input
                                                    type="text"
                                                    autoComplete="address-level2"
                                                    value={entrega.cidade}
                                                    onChange={evento =>
                                                        alterarCampo(
                                                            'cidade',
                                                            evento.target.value
                                                        )
                                                    }
                                                />
                                            </label>

                                            <label className="ck-campo ck-campo--2">
                                                UF
                                                <input
                                                    type="text"
                                                    maxLength={2}
                                                    autoComplete="address-level1"
                                                    placeholder="SP"
                                                    value={entrega.uf}
                                                    onChange={evento =>
                                                        alterarCampo(
                                                            'uf',
                                                            evento.target.value
                                                                .toUpperCase()
                                                        )
                                                    }
                                                />
                                            </label>

                                        </div>

                                        {erroEntrega && (
                                            <p className="ck-aviso ck-aviso--erro" role="alert">
                                                {erroEntrega}
                                            </p>
                                        )}

                                        <button
                                            type="submit"
                                            className="btn ck-botao ck-botao--grande"
                                            disabled={comProblema}
                                        >
                                            Continuar
                                            <i className="fa-solid fa-arrow-right" />
                                        </button>
                                    </form>
                                )}

                                {/* ETAPA 2 - FORMA DE PAGAMENTO */}
                                {passo === 2 && (
                                    <div>

                                        <div className="ck-entrega-resumo">
                                            <i className="fa-solid fa-location-dot" />

                                            <p>
                                                <strong>
                                                    {entrega.destinatario}
                                                </strong>
                                                <br />
                                                {entrega.logradouro},{' '}
                                                {entrega.numero}
                                                {entrega.complemento
                                                    ? ` - ${entrega.complemento}`
                                                    : ''}
                                                {' · '}
                                                {entrega.bairro}
                                                <br />
                                                {entrega.cidade}/{entrega.uf}
                                                {' · CEP '}
                                                {entrega.cep}
                                            </p>

                                            <button
                                                type="button"
                                                className="ck-link"
                                                onClick={() => setPasso(1)}
                                                disabled={enviando}
                                            >
                                                Alterar
                                            </button>
                                        </div>

                                        <h2>Escolha a forma de pagamento</h2>

                                        <div
                                            className="ck-formas"
                                            role="radiogroup"
                                            aria-label="Forma de pagamento"
                                        >
                                            {FORMAS_PAGAMENTO.map(opcao => (
                                                <label
                                                    key={opcao.codigo}
                                                    className={
                                                        'ck-forma' +
                                                        (forma === opcao.codigo
                                                            ? ' selecionada'
                                                            : '')
                                                    }
                                                >
                                                    <input
                                                        type="radio"
                                                        name="forma-pagamento"
                                                        value={opcao.codigo}
                                                        checked={forma === opcao.codigo}
                                                        onChange={() =>
                                                            setForma(opcao.codigo)
                                                        }
                                                        disabled={enviando}
                                                        className="ck-forma-input"
                                                    />

                                                    <span
                                                        className="ck-radio"
                                                        aria-hidden="true"
                                                    />

                                                    <span className="ck-forma-icone">
                                                        {iconeDaForma(opcao.codigo)}
                                                    </span>

                                                    <span className="ck-forma-texto">
                                                        <strong>{opcao.nome}</strong>
                                                        <small>{opcao.descricao}</small>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>

                                        <p className="ck-seguro">
                                            <i className="fa-solid fa-shield-halved" />
                                            Você será levado ao Mercado Pago para
                                            concluir o pagamento com segurança.
                                            Seus dados de cartão não passam
                                            pelo nosso site.
                                        </p>

                                        {erroPagamento && (
                                            <p className="ck-aviso ck-aviso--erro" role="alert">
                                                {erroPagamento}
                                            </p>
                                        )}

                                        <button
                                            type="button"
                                            className="btn ck-botao ck-botao--grande"
                                            onClick={pagar}
                                            disabled={enviando || comProblema}
                                        >
                                            {enviando
                                                ? 'Redirecionando para o Mercado Pago...'
                                                : (
                                                    <>
                                                        Continuar
                                                        <i className="fa-solid fa-arrow-right" />
                                                    </>
                                                )}
                                        </button>

                                    </div>
                                )}

                            </section>

                            <ResumoPedido
                                itens={itens}
                                totais={totais}
                                mostrarItens
                            />

                        </div>
                    </>
                )}

            </div>
        </main>
    )
}

export default Pagamento
