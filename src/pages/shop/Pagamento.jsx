import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import ResumoPedido from './ResumoPedido.jsx'
import {
    ENTREGA_VAZIA,
    FORMAS_PAGAMENTO,
    ROTA_LOGIN,
    buscarCep,
    calcularFreteDoCarrinho,
    carregarDadosEntrega,
    criarPagamento,
    formatarCep,
    formatarDataEntrega,
    formatarTelefone,
    totaisDoCarrinho,
    useCarrinho
} from './checkout.js'
import { formatarPreco } from './shop.js'
import './checkout.css'

const PASSOS = ['Entrega', 'Pagamento', 'Confirmação']

// Valor do seletor de endereço quando o cliente digita um novo.
const NOVO_ENDERECO = 'novo'

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

// ----- validação (o servidor valida de novo) -----

function validarContato(entrega) {
    if (entrega.destinatario.trim().length < 3) {
        return 'Informe o nome de quem vai receber o pedido.'
    }

    if (entrega.telefone.replace(/\D/g, '').length < 10) {
        return 'Informe um telefone com DDD.'
    }

    return null
}

function validarEndereco(entrega) {
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

function textoDoEndereco(endereco) {
    return (
        `${endereco.logradouro}, ${endereco.numero}` +
        (endereco.complemento ? ` - ${endereco.complemento}` : '') +
        ` · ${endereco.bairro} · ${endereco.cidade}/${endereco.uf}` +
        ` · CEP ${formatarCep(endereco.cep)}`
    )
}

// ----- campo de texto do formulário -----

function Campo({ largura, rotulo, children }) {
    return (
        <label className={`ck-campo ck-campo--${largura}`}>
            {rotulo}
            {children}
        </label>
    )
}

function Pagamento() {
    const navigate = useNavigate()
    const { itens, logado, carregando, erro } = useCarrinho()

    const [passo, setPasso] = useState(1)

    // Dados da conta (nome, telefone e endereços salvos no banco).
    const [conta, setConta] = useState({
        carregando: true,
        enderecos: [],
        erro: null
    })

    const [selecionado, setSelecionado] = useState(NOVO_ENDERECO)
    const [entrega, setEntrega] = useState(ENTREGA_VAZIA)
    const [salvarNaConta, setSalvarNaConta] = useState(true)

    // Último cálculo de frete recebido (chave = CEP + itens).
    const [freteCalculado, setFreteCalculado] = useState({
        chave: null,
        erro: null,
        resultado: null
    })
    const [freteOpcao, setFreteOpcao] = useState('NORMAL')

    const [forma, setForma] = useState('PIX')
    const [buscandoCep, setBuscandoCep] = useState(false)
    const [avisoCep, setAvisoCep] = useState(null)
    const ultimoCepBuscado = useRef('')
    const [erroEntrega, setErroEntrega] = useState(null)
    const [erroPagamento, setErroPagamento] = useState(null)
    const [enviando, setEnviando] = useState(false)

    // Pagamento aberto em outra aba: { pedidoId, link }.
    const [pagamentoAberto, setPagamentoAberto] = useState(null)

    // ----- carrega os dados do cliente -----

    useEffect(() => {
        if (!logado) {
            return undefined
        }

        let ativo = true

        carregarDadosEntrega()
            .then(dados => {
                if (!ativo) {
                    return
                }

                const enderecos = dados.enderecos ?? []

                setConta({ carregando: false, enderecos, erro: null })

                setEntrega(atual => ({
                    ...atual,
                    destinatario: atual.destinatario || dados.usuario?.nome || '',
                    telefone:
                        atual.telefone ||
                        formatarTelefone(dados.usuario?.telefone || '')
                }))

                const principal =
                    enderecos.find(item => item.endereco_principal) ??
                    enderecos[0]

                setSelecionado(principal ? principal.id : NOVO_ENDERECO)
            })
            .catch(falha => {
                if (ativo) {
                    setConta({
                        carregando: false,
                        enderecos: [],
                        erro: falha.message
                    })
                }
            })

        return () => {
            ativo = false
        }
    }, [logado])

    const enderecoSalvo =
        selecionado === NOVO_ENDERECO
            ? null
            : conta.enderecos.find(item => item.id === selecionado) ?? null

    // Endereço usado no frete e no pedido.
    const enderecoDeEntrega = enderecoSalvo
        ? {
            ...ENTREGA_VAZIA,
            ...enderecoSalvo,
            complemento: enderecoSalvo.complemento || '',
            destinatario: entrega.destinatario,
            telefone: entrega.telefone
        }
        : entrega

    const cepParaFrete = enderecoDeEntrega.cep.replace(/\D/g, '')

    // Muda só quando os produtos ou as quantidades mudam.
    const chaveItens = useMemo(
        () => itens.map(item => `${item.id}x${item.quantidade}`).join(','),
        [itens]
    )

    // ----- calcula o frete sempre que o CEP ou o carrinho mudam -----

    const chaveFrete =
        cepParaFrete.length === 8 && itens.length > 0
            ? `${cepParaFrete}|${chaveItens}`
            : null

    useEffect(() => {
        if (!chaveFrete) {
            return undefined
        }

        let ativo = true

        // Pequena espera para não calcular a cada tecla.
        const espera = setTimeout(async () => {
            try {
                const resultado = await calcularFreteDoCarrinho({
                    cep: cepParaFrete,
                    itens
                })

                if (ativo) {
                    setFreteCalculado({ chave: chaveFrete, erro: null, resultado })
                    setFreteOpcao(atual =>
                        resultado.opcoes.some(opcao => opcao.codigo === atual)
                            ? atual
                            : resultado.opcoes[0]?.codigo ?? null
                    )
                }
            } catch (falha) {
                if (ativo) {
                    setFreteCalculado({
                        chave: chaveFrete,
                        erro: falha.message,
                        resultado: null
                    })
                }
            }
        }, 400)

        return () => {
            ativo = false
            clearTimeout(espera)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chaveFrete])

    // Situação do frete para o CEP atual.
    const frete = !chaveFrete
        ? { carregando: false, erro: null, resultado: null }
        : freteCalculado.chave === chaveFrete
            ? { carregando: false, ...freteCalculado }
            : { carregando: true, erro: null, resultado: null }

    const opcaoEscolhida =
        frete.resultado?.opcoes.find(opcao => opcao.codigo === freteOpcao) ??
        null

    const totais = totaisDoCarrinho(itens, opcaoEscolhida?.valor ?? null)

    // ----- ações -----

    function alterarCampo(campo, valor) {
        setEntrega(atual => ({ ...atual, [campo]: valor }))
    }

    // Busca o endereço quando o CEP fica completo (8 dígitos).
    async function preencherPeloCep(cepDigitado) {
        const digitos = String(cepDigitado).replace(/\D/g, '')

        if (digitos.length !== 8) {
            ultimoCepBuscado.current = ''
            setBuscandoCep(false)
            setAvisoCep(null)
            return
        }

        // Não busca de novo o mesmo CEP (onChange + onBlur).
        if (ultimoCepBuscado.current === digitos) {
            return
        }

        ultimoCepBuscado.current = digitos
        setBuscandoCep(true)
        setAvisoCep(null)

        const resposta = await buscarCep(digitos)

        // O cliente trocou o CEP enquanto buscava: ignora a resposta.
        if (ultimoCepBuscado.current !== digitos) {
            return
        }

        setBuscandoCep(false)

        if (!resposta) {
            ultimoCepBuscado.current = ''
            setAvisoCep(
                'Não foi possível buscar o CEP agora. Preencha o endereço.'
            )
            return
        }

        if (!resposta.encontrado) {
            setAvisoCep('CEP não encontrado. Confira o número digitado.')
            return
        }

        const dados = resposta.endereco

        // Preenche com os dados do CEP. O que o CEP não trouxer
        // (cidade pequena costuma vir sem rua/bairro) fica como estava.
        setEntrega(atual => ({
            ...atual,
            logradouro: dados.logradouro || atual.logradouro,
            bairro: dados.bairro || atual.bairro,
            cidade: dados.cidade || atual.cidade,
            uf: dados.uf || atual.uf
        }))
    }

    function continuarParaPagamento(evento) {
        evento.preventDefault()

        const problema =
            validarContato(entrega) ||
            (enderecoSalvo ? null : validarEndereco(entrega))

        if (problema) {
            setErroEntrega(problema)
            return
        }

        if (frete.carregando) {
            setErroEntrega('Aguarde o cálculo do frete.')
            return
        }

        if (!opcaoEscolhida) {
            setErroEntrega(
                frete.erro || 'Escolha uma opção de envio.'
            )
            return
        }

        setErroEntrega(null)
        setPasso(2)

        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Ao alterar os dados, um novo pagamento será criado.
    function voltarParaEntrega() {
        setPagamentoAberto(null)
        setPasso(1)
    }

    async function pagar() {
        setEnviando(true)
        setErroPagamento(null)

        // A aba precisa ser aberta já no clique: se abrir depois da
        // resposta do servidor, o navegador bloqueia como pop-up.
        const novaAba = window.open('', '_blank')

        if (novaAba) {
            novaAba.opener = null
            novaAba.document.title = 'Redirecionando para o Mercado Pago...'
            novaAba.document.body.innerHTML =
                '<p style="font-family:sans-serif;padding:24px">' +
                'Redirecionando para o Mercado Pago...</p>'
        }

        try {
            const resposta = await criarPagamento({
                forma,
                entrega: enderecoDeEntrega,
                freteOpcao,
                idEndereco: enderecoSalvo?.id ?? null,
                salvarEndereco: !enderecoSalvo && salvarNaConta
            })

            // Navegador bloqueou a nova aba: segue na mesma aba.
            if (!novaAba || novaAba.closed) {
                window.location.assign(resposta.init_point)
                return
            }

            // Vai para a página segura do Mercado Pago na nova aba.
            novaAba.location.href = resposta.init_point

            setPagamentoAberto({
                pedidoId: resposta.pedido_id,
                link: resposta.init_point
            })
            setEnviando(false)

        } catch (falha) {
            novaAba?.close()

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
                            onClick={voltarParaEntrega}
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
                                        <h2>Quem vai receber</h2>

                                        <div className="ck-form">
                                            <Campo largura="3" rotulo="Nome de quem recebe">
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
                                            </Campo>

                                            <Campo largura="3" rotulo="Telefone com DDD">
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
                                            </Campo>
                                        </div>

                                        <h2 className="ck-subtitulo">
                                            Endereço de entrega
                                        </h2>

                                        {conta.carregando && (
                                            <p className="ck-mensagem-curta">
                                                Carregando seus endereços...
                                            </p>
                                        )}

                                        {conta.erro && (
                                            <p className="ck-aviso">
                                                Não foi possível carregar seus
                                                endereços salvos. Digite o
                                                endereço abaixo.
                                            </p>
                                        )}

                                        {conta.enderecos.length > 0 && (
                                            <div
                                                className="ck-formas"
                                                role="radiogroup"
                                                aria-label="Endereço de entrega"
                                            >
                                                {conta.enderecos.map(endereco => (
                                                    <label
                                                        key={endereco.id}
                                                        className={
                                                            'ck-forma' +
                                                            (selecionado === endereco.id
                                                                ? ' selecionada'
                                                                : '')
                                                        }
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="endereco"
                                                            className="ck-forma-input"
                                                            checked={selecionado === endereco.id}
                                                            onChange={() =>
                                                                setSelecionado(endereco.id)
                                                            }
                                                        />

                                                        <span className="ck-radio" aria-hidden="true" />

                                                        <span className="ck-forma-icone">
                                                            <i className="fa-solid fa-location-dot ck-icone-endereco" />
                                                        </span>

                                                        <span className="ck-forma-texto">
                                                            <strong>
                                                                {endereco.apelido ||
                                                                    (endereco.endereco_principal
                                                                        ? 'Endereço principal'
                                                                        : 'Endereço salvo')}
                                                            </strong>
                                                            <small>{textoDoEndereco(endereco)}</small>
                                                        </span>
                                                    </label>
                                                ))}

                                                <label
                                                    className={
                                                        'ck-forma' +
                                                        (selecionado === NOVO_ENDERECO
                                                            ? ' selecionada'
                                                            : '')
                                                    }
                                                >
                                                    <input
                                                        type="radio"
                                                        name="endereco"
                                                        className="ck-forma-input"
                                                        checked={selecionado === NOVO_ENDERECO}
                                                        onChange={() =>
                                                            setSelecionado(NOVO_ENDERECO)
                                                        }
                                                    />

                                                    <span className="ck-radio" aria-hidden="true" />

                                                    <span className="ck-forma-icone">
                                                        <i className="fa-solid fa-plus ck-icone-endereco" />
                                                    </span>

                                                    <span className="ck-forma-texto">
                                                        <strong>Usar outro endereço</strong>
                                                        <small>Digite um novo endereço de entrega</small>
                                                    </span>
                                                </label>
                                            </div>
                                        )}

                                        {!conta.carregando && !enderecoSalvo && (
                                            <>
                                                <div className="ck-form ck-form--espaco">
                                                    <Campo largura="2" rotulo="CEP">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            autoComplete="postal-code"
                                                            placeholder="00000-000"
                                                            value={entrega.cep}
                                                            onChange={evento => {
                                                                const cep = formatarCep(
                                                                    evento.target.value
                                                                )

                                                                alterarCampo('cep', cep)
                                                                preencherPeloCep(cep)
                                                            }}
                                                            onBlur={evento =>
                                                                preencherPeloCep(
                                                                    evento.target.value
                                                                )
                                                            }
                                                        />
                                                        {buscandoCep && (
                                                            <small>Buscando endereço...</small>
                                                        )}
                                                        {!buscandoCep && avisoCep && (
                                                            <small role="alert">{avisoCep}</small>
                                                        )}
                                                    </Campo>

                                                    <Campo largura="4" rotulo="Rua">
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
                                                    </Campo>

                                                    <Campo largura="2" rotulo="Número">
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
                                                    </Campo>

                                                    <Campo largura="4" rotulo="Complemento">
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
                                                    </Campo>

                                                    <Campo largura="2" rotulo="Bairro">
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
                                                    </Campo>

                                                    <Campo largura="2" rotulo="Cidade">
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
                                                    </Campo>

                                                    <Campo largura="2" rotulo="UF">
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
                                                    </Campo>
                                                </div>

                                                <label className="ck-check">
                                                    <input
                                                        type="checkbox"
                                                        checked={salvarNaConta}
                                                        onChange={evento =>
                                                            setSalvarNaConta(
                                                                evento.target.checked
                                                            )
                                                        }
                                                    />
                                                    Salvar este endereço na minha conta
                                                </label>
                                            </>
                                        )}

                                        {/* OPÇÕES DE ENVIO */}
                                        <h2 className="ck-subtitulo">
                                            Opções de envio
                                        </h2>

                                        {cepParaFrete.length !== 8 && (
                                            <p className="ck-mensagem-curta">
                                                Informe o CEP para ver as opções
                                                de envio.
                                            </p>
                                        )}

                                        {cepParaFrete.length === 8 && frete.carregando && (
                                            <p className="ck-mensagem-curta" role="status">
                                                Calculando o frete...
                                            </p>
                                        )}

                                        {cepParaFrete.length === 8 && frete.erro && !frete.carregando && (
                                            <p className="ck-aviso ck-aviso--erro" role="alert">
                                                {frete.erro}
                                            </p>
                                        )}

                                        {frete.resultado && !frete.carregando && (
                                            <>
                                                <p className="ck-envio-destino">
                                                    <i className="fa-solid fa-truck" />
                                                    Enviando de{' '}
                                                    {frete.resultado.origem.cidade}/
                                                    {frete.resultado.origem.uf} para{' '}
                                                    {frete.resultado.destino.cidade}/
                                                    {frete.resultado.destino.uf}
                                                    {' · '}
                                                    {frete.resultado.regiao_nome}
                                                    {' · '}
                                                    {frete.resultado.distancia_estimada ? '~' : ''}
                                                    {frete.resultado.distancia_km.toLocaleString('pt-BR')} km
                                                </p>

                                                <div
                                                    className="ck-formas"
                                                    role="radiogroup"
                                                    aria-label="Opção de envio"
                                                >
                                                    {frete.resultado.opcoes.map(opcao => (
                                                        <label
                                                            key={opcao.codigo}
                                                            className={
                                                                'ck-forma ck-forma--envio' +
                                                                (freteOpcao === opcao.codigo
                                                                    ? ' selecionada'
                                                                    : '')
                                                            }
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="frete"
                                                                className="ck-forma-input"
                                                                checked={freteOpcao === opcao.codigo}
                                                                onChange={() =>
                                                                    setFreteOpcao(opcao.codigo)
                                                                }
                                                            />

                                                            <span className="ck-radio" aria-hidden="true" />

                                                            <span className="ck-forma-icone">
                                                                <i
                                                                    className={
                                                                        opcao.codigo === 'EXPRESSO'
                                                                            ? 'fa-solid fa-truck-fast ck-icone-envio'
                                                                            : 'fa-solid fa-truck ck-icone-envio'
                                                                    }
                                                                />
                                                            </span>

                                                            <span className="ck-forma-texto">
                                                                <strong>{opcao.nome}</strong>
                                                                <small>
                                                                    Chega até{' '}
                                                                    {formatarDataEntrega(opcao.data_prevista)}
                                                                    {' · '}
                                                                    {opcao.prazo_dias}{' '}
                                                                    {opcao.prazo_dias === 1
                                                                        ? 'dia útil'
                                                                        : 'dias úteis'}
                                                                </small>
                                                            </span>

                                                            <span className="ck-envio-preco">
                                                                {opcao.gratis ? (
                                                                    <>
                                                                        <s>{formatarPreco(opcao.valor_original)}</s>
                                                                        <strong className="ck-envio-gratis">
                                                                            Grátis
                                                                        </strong>
                                                                    </>
                                                                ) : (
                                                                    <strong>
                                                                        {formatarPreco(opcao.valor)}
                                                                    </strong>
                                                                )}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        {erroEntrega && (
                                            <p className="ck-aviso ck-aviso--erro" role="alert">
                                                {erroEntrega}
                                            </p>
                                        )}

                                        <button
                                            type="submit"
                                            className="btn ck-botao ck-botao--grande"
                                            disabled={comProblema || frete.carregando}
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
                                                    {enderecoDeEntrega.destinatario}
                                                </strong>
                                                {' · '}
                                                {enderecoDeEntrega.telefone}
                                                <br />
                                                {textoDoEndereco(enderecoDeEntrega)}
                                                {opcaoEscolhida && (
                                                    <>
                                                        <br />
                                                        <i className="fa-solid fa-truck" />{' '}
                                                        {opcaoEscolhida.nome} · chega até{' '}
                                                        {formatarDataEntrega(opcaoEscolhida.data_prevista)}
                                                    </>
                                                )}
                                            </p>

                                            <button
                                                type="button"
                                                className="ck-link"
                                                onClick={voltarParaEntrega}
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

                                        {pagamentoAberto ? (
                                            <div className="ck-pagamento-aberto" role="status">
                                                <i className="fa-solid fa-up-right-from-square" />

                                                <p>
                                                    <strong>
                                                        O pagamento foi aberto em uma nova aba.
                                                    </strong>
                                                    <br />
                                                    Conclua o pagamento no Mercado Pago.
                                                    Depois, volte aqui para ver o seu
                                                    pedido.
                                                </p>

                                                <div className="ck-pagamento-aberto-acoes">
                                                    <Link
                                                        to={`/pedido/pendente?external_reference=${pagamentoAberto.pedidoId}`}
                                                        className="btn ck-botao"
                                                    >
                                                        Já paguei, ver meu pedido
                                                    </Link>

                                                    <a
                                                        href={pagamentoAberto.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="ck-link"
                                                    >
                                                        Abrir o Mercado Pago de novo
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn ck-botao ck-botao--grande"
                                                onClick={pagar}
                                                disabled={enviando || comProblema}
                                            >
                                                {enviando
                                                    ? 'Abrindo o Mercado Pago...'
                                                    : (
                                                        <>
                                                            Continuar
                                                            <i className="fa-solid fa-arrow-right" />
                                                        </>
                                                    )}
                                            </button>
                                        )}

                                    </div>
                                )}

                            </section>

                            <ResumoPedido
                                itens={itens}
                                totais={totais}
                                envio={opcaoEscolhida}
                                freteGratisAPartirDe={
                                    frete.resultado?.frete_gratis_a_partir_de
                                }
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
