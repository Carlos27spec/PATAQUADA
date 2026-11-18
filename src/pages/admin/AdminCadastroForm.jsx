import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import { CADASTROS, UFS } from './cadastrosConfig.js'
import { pode } from './permissoesAdmin.js'
import EscolhaPermissoes from './EscolhaPermissoes.jsx'
import {
    CHAVE_AVISO,
    buscar,
    enviarImagemCadastro,
    imagemDaPasta,
    listarReferencia,
    mascaraCep,
    mascaraCpfCnpj,
    mascaraTelefone,
    removerImagemCadastro,
    salvar
} from './cadastrosTela.js'
import {
    TAMANHO_MAXIMO_IMAGEM,
    TIPOS_IMAGEM_ACEITOS,
    centavosParaTexto,
    extensaoDoArquivo,
    nomeParaArquivo,
    textoParaCentavos
} from './produtosAdmin.js'
import { buscarCep } from '../shop/checkout.js'
import './admin.css'

import patinha from '../../assets/paw.png'

// Valor do banco -> texto do campo na tela.
function paraTela(campo, valor) {
    if (campo.tipo === 'permissoes') {
        return Array.isArray(valor) ? valor : []
    }

    if (valor === null || valor === undefined) {
        if (campo.tipo === 'status') return 1
        if (campo.tipo === 'booleano') return 0
        return campo.padrao ?? ''
    }

    switch (campo.tipo) {
        case 'dinheiro': return centavosParaTexto(valor)
        case 'telefone': return mascaraTelefone(valor)
        case 'cpfCnpj': return mascaraCpfCnpj(valor)
        case 'cep': return mascaraCep(valor)
        case 'decimal': return String(valor).replace('.', ',')
        case 'data': return String(valor).slice(0, 10)
        // "2026-11-20 14:30:00" -> "2026-11-20T14:30" (campo datetime-local)
        case 'dataHora': return String(valor).replace(' ', 'T').slice(0, 16)
        case 'senha': return ''
        case 'status':
        case 'booleano': return Number(valor)
        default: return String(valor)
    }
}

// Texto da tela -> valor enviado ao servidor (que valida de novo).
function paraEnvio(campo, valor) {
    switch (campo.tipo) {
        case 'dinheiro': {
            if (String(valor).trim() === '') return null
            const centavos = textoParaCentavos(valor)
            if (centavos === null) throw new Error(`Informe um valor válido em "${campo.rotulo}" (ex.: 89,90).`)
            return centavos
        }
        case 'inteiro': {
            if (String(valor).trim() === '') return null
            if (!/^\d+$/.test(String(valor).trim())) throw new Error(`"${campo.rotulo}" deve ser um número inteiro.`)
            return Number(valor)
        }
        case 'telefone':
        case 'cpfCnpj':
        case 'cep':
            return String(valor).replace(/\D/g, '')
        case 'status':
        case 'booleano':
            return Number(valor) === 1 ? 1 : 0
        case 'senha':
            return String(valor)
        default:
            return typeof valor === 'string' ? valor.trim() : valor
    }
}

function AdminCadastroForm({ tipo }) {
    const config = CADASTROS[tipo]
    const parametros = useParams()
    const navigate = useNavigate()

    // Registro único (ex.: Dados da PataQuada): sempre edita o mesmo id.
    const id = config.registroUnico ? String(config.registroUnico) : parametros.id
    const editando = Boolean(id)

    // Salvar exige a permissão de cadastrar (novo) ou editar.
    const { permissoes } = useOutletContext()
    const podeSalvar = pode(permissoes, tipo, editando ? 'editar' : 'criar')

    const [aviso, setAviso] = useState(null)

    const camposVisiveis = config.campos.filter(campo => campo.tipo !== 'imagem')
    const camposEditaveis = camposVisiveis.filter(campo => !campo.somenteLeitura)
    const referenciasUsadas = useMemo(
        () => [...new Set(config.campos.filter(c => c.tipo === 'referencia' || c.tipo === 'permissoes').map(c => c.referencia))],
        [config]
    )

    const [carregando, setCarregando] = useState(true)
    const [erroCarregar, setErroCarregar] = useState(null)
    const [valores, setValores] = useState({})
    const [referencias, setReferencias] = useState({})
    const [imagemAtual, setImagemAtual] = useState(null)

    const [arquivo, setArquivo] = useState(null)
    const [removerAtual, setRemoverAtual] = useState(false)
    const entradaArquivo = useRef(null)

    const [buscandoCep, setBuscandoCep] = useState(false)
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState(null)

    // ----- carrega listas de seleção e (na edição) o registro -----

    useEffect(() => {
        let vivo = true

        Promise.all([
            Promise.all(referenciasUsadas.map(nome => listarReferencia(nome))),
            editando ? buscar(tipo, id) : Promise.resolve(null)
        ])
            .then(([listas, resposta]) => {
                if (!vivo) return

                setReferencias(Object.fromEntries(
                    referenciasUsadas.map((nome, indice) => [nome, listas[indice].dados ?? []])
                ))

                const registro = resposta?.dados ?? {}

                setValores(Object.fromEntries(
                    config.campos
                        .filter(campo => campo.tipo !== 'imagem')
                        .map(campo => [campo.nome, paraTela(campo, registro[campo.nome])])
                ))

                setImagemAtual(config.imagem ? registro[config.imagem.campo] ?? null : null)
                setCarregando(false)
            })
            .catch(falha => {
                if (vivo) {
                    setErroCarregar(falha.message)
                    setCarregando(false)
                }
            })

        return () => {
            vivo = false
        }
    }, [tipo, id, editando, config, referenciasUsadas])

    const previa = useMemo(() => (arquivo ? URL.createObjectURL(arquivo) : null), [arquivo])

    useEffect(() => () => {
        if (previa) URL.revokeObjectURL(previa)
    }, [previa])

    function alterar(nome, valor) {
        setValores(atual => ({ ...atual, [nome]: valor }))
    }

    async function preencherEndereco(cep) {
        if (String(cep).replace(/\D/g, '').length !== 8) return

        setBuscandoCep(true)
        const resposta = await buscarCep(cep)
        setBuscandoCep(false)

        if (resposta?.encontrado) {
            const { logradouro, bairro, cidade, uf } = resposta.endereco
            setValores(atual => ({
                ...atual,
                ...(logradouro ? { logradouro } : {}),
                ...(bairro ? { bairro } : {}),
                ...(cidade ? { cidade } : {}),
                ...(uf ? { uf } : {})
            }))
        }
    }

    function escolherArquivo(evento) {
        const escolhido = evento.target.files?.[0]

        if (!escolhido) return

        if (!TIPOS_IMAGEM_ACEITOS.includes(escolhido.type)) {
            setErro('Escolha uma imagem PNG, JPG, WEBP ou GIF.')
            evento.target.value = ''
            return
        }

        if (escolhido.size > TAMANHO_MAXIMO_IMAGEM) {
            setErro('A imagem deve ter no máximo 5 MB.')
            evento.target.value = ''
            return
        }

        setErro(null)
        setArquivo(escolhido)
        setRemoverAtual(false)
    }

    async function enviar(evento) {
        evento.preventDefault()
        setErro(null)
        setAviso(null)

        let dados

        try {
            dados = Object.fromEntries(
                camposEditaveis.map(campo => [campo.nome, paraEnvio(campo, valores[campo.nome] ?? '')])
            )

            const faltando = camposEditaveis.find(
                campo => (campo.obrigatorio || (campo.tipo === 'senha' && !editando)) &&
                    (dados[campo.nome] === null || dados[campo.nome] === '')
            )

            if (faltando) {
                throw new Error(`Preencha o campo "${faltando.rotulo}".`)
            }
        } catch (falha) {
            setErro(falha.message)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        setSalvando(true)

        try {
            const resposta = await salvar(tipo, editando ? id : null, dados)
            const idSalvo = resposta.dados.id
            let aviso = resposta.mensagem || 'Salvo com sucesso.'

            if (config.imagem && (arquivo || (removerAtual && imagemAtual))) {
                // Se o Vite recarregar a página ao salvar a imagem, abre o
                // registro já salvo em vez de um formulário vazio.
                if (!editando) {
                    navigate(`/admin/${tipo}/${idSalvo}`, { replace: true })
                }

                try {
                    if (arquivo) {
                        await enviarImagemCadastro(tipo, idSalvo, arquivo)
                    } else {
                        await removerImagemCadastro(tipo, idSalvo)
                    }
                } catch (falhaImagem) {
                    aviso += ` Mas a imagem não foi salva: ${falhaImagem.message}`
                }
            }

            // Registro único: continua na mesma tela, com o aviso.
            if (config.registroUnico) {
                setAviso(aviso)
                setSalvando(false)
                window.scrollTo({ top: 0, behavior: 'smooth' })
                return
            }

            try {
                sessionStorage.setItem(CHAVE_AVISO(tipo), aviso)
            } catch {
                // sem sessionStorage: segue sem o aviso
            }

            navigate(`/admin/${tipo}`)

        } catch (falha) {
            setErro(falha.message)
            setSalvando(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    // ----- campo -----

    function renderizarCampo(campo) {
        const valor = valores[campo.nome] ?? ''
        const largura = campo.largura === 'inteira' || campo.tipo === 'textoLongo' ? 'inteira' : 'meia'
        let entrada

        // Caixas de marcar das telas/permissões (tipo de usuário).
        if (campo.tipo === 'permissoes') {
            return (
                <div key={campo.nome} className="adm-form-campo adm-form-campo--inteira">
                    <span className="adm-form-rotulo">{campo.rotulo}</span>
                    <EscolhaPermissoes
                        valor={valor || []}
                        todas={referencias[campo.referencia] ?? []}
                        onChange={lista => alterar(campo.nome, lista)}
                    />
                </div>
            )
        }

        // Só leitura (ex.: total e endereço do pedido): mostra, não envia.
        if (campo.somenteLeitura) {
            const texto = campo.tipo === 'dinheiro' && valor !== '' ? `R$ ${valor}` : valor

            return (
                <label key={campo.nome} className={`adm-form-campo adm-form-campo--${largura}`}>
                    <span className="adm-form-rotulo">{campo.rotulo}</span>
                    <input type="text" value={texto || '—'} disabled readOnly />
                </label>
            )
        }

        switch (campo.tipo) {
            case 'data':
                entrada = (
                    <input type="date" value={valor} onChange={e => alterar(campo.nome, e.target.value)} />
                )
                break

            case 'dataHora':
                entrada = (
                    <input type="datetime-local" value={valor} onChange={e => alterar(campo.nome, e.target.value)} />
                )
                break

            case 'mes':
                entrada = (
                    <input type="month" value={valor} onChange={e => alterar(campo.nome, e.target.value)} />
                )
                break

            case 'senha':
                entrada = (
                    <input type="password" autoComplete="new-password" value={valor}
                        placeholder={editando ? 'Deixe em branco para manter' : ''}
                        onChange={e => alterar(campo.nome, e.target.value)} />
                )
                break

            case 'textoLongo':
                entrada = (
                    <textarea rows={4} maxLength={campo.max} value={valor}
                        onChange={e => alterar(campo.nome, e.target.value)} />
                )
                break

            case 'selecao':
                entrada = (
                    <select value={valor} onChange={e => alterar(campo.nome, e.target.value)}>
                        {!campo.obrigatorio && !campo.padrao && <option value="">Selecione...</option>}
                        {campo.opcoes.map(opcao => (
                            <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>
                        ))}
                    </select>
                )
                break

            case 'referencia':
                entrada = (
                    <select value={valor} onChange={e => alterar(campo.nome, e.target.value)}>
                        <option value="">{campo.obrigatorio ? 'Selecione...' : 'Nenhum'}</option>
                        {(referencias[campo.referencia] ?? []).map(opcao => (
                            <option key={opcao.id} value={opcao.id}>{opcao.nome}</option>
                        ))}
                    </select>
                )
                break

            case 'status':
                entrada = (
                    <select value={valor} onChange={e => alterar(campo.nome, Number(e.target.value))}>
                        <option value={1}>Ativo</option>
                        <option value={0}>Inativo</option>
                    </select>
                )
                break

            case 'booleano':
                return (
                    <label key={campo.nome} className="adm-form-campo adm-form-campo--inteira adm-form-check">
                        <span>
                            <input type="checkbox" checked={Number(valor) === 1}
                                onChange={e => alterar(campo.nome, e.target.checked ? 1 : 0)} />
                            {' '}{campo.rotulo}
                        </span>
                        {campo.dica && <small className="adm-form-dica">{campo.dica}</small>}
                    </label>
                )

            case 'uf':
                entrada = (
                    <select value={valor} onChange={e => alterar(campo.nome, e.target.value)}>
                        <option value="">—</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                )
                break

            case 'cep':
                entrada = (
                    <input type="text" inputMode="numeric" placeholder="00000-000" value={valor}
                        onChange={e => {
                            const cep = mascaraCep(e.target.value)
                            alterar(campo.nome, cep)
                            if (cep.replace(/\D/g, '').length === 8) preencherEndereco(cep)
                        }} />
                )
                break

            case 'telefone':
                entrada = (
                    <input type="tel" inputMode="tel" placeholder="(11) 98765-4321" value={valor}
                        onChange={e => alterar(campo.nome, mascaraTelefone(e.target.value))} />
                )
                break

            case 'cpfCnpj':
                entrada = (
                    <input type="text" inputMode="numeric" value={valor}
                        onChange={e => alterar(campo.nome, mascaraCpfCnpj(e.target.value))} />
                )
                break

            case 'inteiro':
                entrada = (
                    <input type="number" min={campo.minimo ?? 0} step="1" value={valor}
                        onChange={e => alterar(campo.nome, e.target.value)} />
                )
                break

            case 'dinheiro':
                entrada = (
                    <input type="text" inputMode="decimal" placeholder="0,00" value={valor}
                        onChange={e => alterar(campo.nome, e.target.value)} />
                )
                break

            default:
                entrada = (
                    <input type={campo.tipo === 'email' ? 'email' : 'text'} maxLength={campo.max} value={valor}
                        onChange={e => alterar(campo.nome, e.target.value)} />
                )
        }

        // Estoque: mostra o saldo atual do produto escolhido.
        let dica = campo.dica
        if (tipo === 'movimentacoes-estoque' && campo.nome === 'id_produto' && valor) {
            const produto = (referencias.produtos ?? []).find(item => String(item.id) === String(valor))
            if (produto) dica = `Estoque atual: ${produto.estoque} unidade(s).`
        }
        if (campo.tipo === 'cep' && buscandoCep) dica = 'Buscando endereço...'

        return (
            <label key={campo.nome} className={`adm-form-campo adm-form-campo--${largura}`}>
                <span className="adm-form-rotulo">{campo.rotulo}{campo.obrigatorio ? ' *' : ''}</span>
                {entrada}
                {dica && <small className="adm-form-dica">{dica}</small>}
            </label>
        )
    }

    if (carregando) {
        return <p className="adm-carregando" role="status">Carregando...</p>
    }

    if (erroCarregar) {
        return (
            <div className="adm-erro">
                <p>{erroCarregar}</p>
                <Link to={`/admin/${tipo}`} className="btn">Voltar</Link>
            </div>
        )
    }

    const secoes = config.secoes ?? [null]

    // ----- imagem -----
    const extensao = arquivo
        ? extensaoDoArquivo(arquivo)
        : imagemAtual && !removerAtual ? imagemAtual.split('.').pop() : null
    const baseNome = config.imagem ? String(valores[config.imagem.nomeBase] ?? '').trim() : ''
    const nomeFinal = extensao && baseNome ? `${nomeParaArquivo(baseNome)}.${extensao}` : null
    const imagemMostrada = previa
        ?? (imagemAtual && !removerAtual ? imagemDaPasta(config.imagem?.pasta, imagemAtual) : null)

    return (
        <form onSubmit={enviar} noValidate>
            <header className="adm-pagina-titulo">
                <img src={patinha} alt="" />
                <div>
                    <h1>
                        {config.registroUnico
                            ? config.titulo
                            : editando ? `Editar ${config.singular}` : config.novo}
                    </h1>
                    <p>
                        {config.registroUnico ? config.descricao : (
                            <Link to={`/admin/${tipo}`} className="adm-voltar">
                                <i className="fa-solid fa-arrow-left" />
                                Voltar para {config.titulo.toLowerCase()}
                            </Link>
                        )}
                    </p>
                </div>
            </header>

            {aviso && (
                <p className="adm-mensagem adm-mensagem--ok" role="status">
                    <i className="fa-solid fa-circle-check" />
                    {aviso}
                </p>
            )}

            {erro && (
                <p className="adm-mensagem adm-mensagem--erro" role="alert">
                    <i className="fa-solid fa-circle-exclamation" />
                    {erro}
                </p>
            )}

            {!podeSalvar && (
                <p className="adm-mensagem adm-mensagem--info">
                    <i className="fa-solid fa-lock" />
                    Você pode ver, mas o seu tipo de usuário não tem permissão para salvar aqui.
                </p>
            )}

            {config.somenteInclusao && (
                <p className="adm-mensagem adm-mensagem--info">
                    <i className="fa-solid fa-circle-info" />
                    Depois de salva, a movimentação não pode ser alterada. Para corrigir,
                    lance uma movimentação contrária (ex.: ajuste).
                </p>
            )}

            <div className={config.imagem ? 'adm-form-layout' : 'adm-form-coluna'}>
                {secoes.map(secao => (
                    <section key={secao ?? 'dados'} className="adm-painel">
                        <h2 className="adm-painel-titulo">{secao ?? 'Dados'}</h2>
                        <div className="adm-form-grade">
                            {camposVisiveis
                                .filter(campo => !secao || campo.secao === secao)
                                .map(renderizarCampo)}
                        </div>
                    </section>
                ))}

                {config.imagem && (
                    <section className="adm-painel">
                        <h2 className="adm-painel-titulo">Imagem</h2>

                        <div className="adm-imagem-caixa">
                            {imagemMostrada ? (
                                <img src={imagemMostrada} alt="Prévia da imagem" />
                            ) : (
                                <div className="adm-imagem-vazia">
                                    <i className="fa-regular fa-image" />
                                    <span>Sem imagem</span>
                                </div>
                            )}
                        </div>

                        <input ref={entradaArquivo} id={`adm-imagem-${tipo}`} type="file"
                            accept={TIPOS_IMAGEM_ACEITOS.join(',')} className="sr-only" onChange={escolherArquivo} />

                        <div className="adm-imagem-acoes">
                            <label htmlFor={`adm-imagem-${tipo}`} className="btn adm-botao-secundario">
                                <i className="fa-solid fa-upload" />
                                {imagemMostrada ? 'Trocar imagem' : 'Escolher imagem'}
                            </label>

                            {arquivo && (
                                <button type="button" className="adm-link-acao" onClick={() => {
                                    setArquivo(null)
                                    if (entradaArquivo.current) entradaArquivo.current.value = ''
                                }}>
                                    Desfazer
                                </button>
                            )}

                            {!arquivo && imagemAtual && !removerAtual && (
                                <button type="button" className="adm-link-acao adm-link-acao--perigo"
                                    onClick={() => setRemoverAtual(true)}>
                                    <i className="fa-solid fa-trash" />
                                    Remover
                                </button>
                            )}

                            {removerAtual && (
                                <button type="button" className="adm-link-acao" onClick={() => setRemoverAtual(false)}>
                                    Manter a imagem
                                </button>
                            )}
                        </div>

                        <dl className="adm-imagem-info">
                            <div><dt>Nome do arquivo</dt><dd>{nomeFinal ?? '—'}</dd></div>
                            <div><dt>Pasta</dt><dd>src/images/{config.imagem.pasta}/</dd></div>
                        </dl>

                        <p className="adm-form-dica">
                            PNG, JPG, WEBP ou GIF, até 5 MB. O arquivo é renomeado com o
                            nome e salvo ao clicar em Salvar.
                        </p>
                    </section>
                )}
            </div>

            <div className="adm-form-botoes">
                <Link to={config.registroUnico ? '/admin' : `/admin/${tipo}`} className="btn adm-botao-secundario">
                    {config.registroUnico ? 'Voltar' : 'Cancelar'}
                </Link>
                {podeSalvar && (
                    <button type="submit" className="btn adm-botao-principal" disabled={salvando}>
                        <i className="fa-solid fa-floppy-disk" />
                        {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                )}
            </div>
        </form>
    )
}

export default AdminCadastroForm
