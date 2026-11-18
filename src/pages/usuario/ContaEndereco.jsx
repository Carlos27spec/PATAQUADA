import { useEffect, useState } from 'react'

import { formatarCep } from './contaFormatos.js'
import { chamarApi } from '../shop/carrinho.js'
import { buscarCep } from '../shop/checkout.js'
import './conta.css'

import patinha from '../../assets/paw.png'

const UFS = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
    'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

const VAZIO = {
    apelido: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    referencia: '',
    principal: false
}

function Campo({ rotulo, largura = 'meia', dica, children }) {
    return (
        <label className={`cta-campo cta-campo--${largura}`}>
            <span>{rotulo}</span>
            {children}
            {dica && <small>{dica}</small>}
        </label>
    )
}

// Formulário de endereço (novo ou edição).
function FormEndereco({ inicial, editando, onSalvar, onCancelar }) {
    const [form, setForm] = useState(inicial)
    const [buscando, setBuscando] = useState(false)
    const [avisoCep, setAvisoCep] = useState(null)
    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState(null)

    function alterar(campo, valor) {
        setForm(atual => ({ ...atual, [campo]: valor }))
    }

    async function trocarCep(valor) {
        const cep = formatarCep(valor)
        alterar('cep', cep)
        setAvisoCep(null)

        if (cep.replace(/\D/g, '').length !== 8) return

        setBuscando(true)
        const resposta = await buscarCep(cep)
        setBuscando(false)

        if (resposta?.encontrado) {
            const { logradouro, bairro, cidade, uf } = resposta.endereco
            setForm(atual => ({
                ...atual,
                logradouro: logradouro || atual.logradouro,
                bairro: bairro || atual.bairro,
                cidade: cidade || atual.cidade,
                uf: uf || atual.uf
            }))
        } else if (resposta && !resposta.encontrado) {
            setAvisoCep('CEP não encontrado. Confira o número.')
        }
    }

    async function enviar(evento) {
        evento.preventDefault()
        setSalvando(true)
        setErro(null)

        try {
            await onSalvar({ ...form, cep: form.cep.replace(/\D/g, '') })
        } catch (falha) {
            setErro(falha.message)
            setSalvando(false)
        }
    }

    return (
        <form className="cta-painel" onSubmit={enviar} noValidate>
            <h2>{editando ? 'Editar endereço' : 'Novo endereço'}</h2>

            <div className="cta-form cta-form--endereco">
                <Campo rotulo="Nome do endereço (opcional)" largura="inteira" dica='Ex.: "Casa", "Trabalho".'>
                    <input type="text" maxLength={40} value={form.apelido}
                        onChange={e => alterar('apelido', e.target.value)} />
                </Campo>

                <Campo rotulo="CEP" dica={buscando ? 'Buscando endereço...' : avisoCep}>
                    <input type="text" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000"
                        value={form.cep} onChange={e => trocarCep(e.target.value)} />
                </Campo>

                <Campo rotulo="Rua" largura="dobro">
                    <input type="text" autoComplete="address-line1" value={form.logradouro}
                        onChange={e => alterar('logradouro', e.target.value)} />
                </Campo>

                <Campo rotulo="Número">
                    <input type="text" value={form.numero} onChange={e => alterar('numero', e.target.value)} />
                </Campo>

                <Campo rotulo="Complemento" largura="dobro">
                    <input type="text" placeholder="Apto, bloco... (opcional)" value={form.complemento}
                        onChange={e => alterar('complemento', e.target.value)} />
                </Campo>

                <Campo rotulo="Bairro">
                    <input type="text" value={form.bairro} onChange={e => alterar('bairro', e.target.value)} />
                </Campo>

                <Campo rotulo="Cidade">
                    <input type="text" autoComplete="address-level2" value={form.cidade}
                        onChange={e => alterar('cidade', e.target.value)} />
                </Campo>

                <Campo rotulo="UF">
                    <select value={form.uf} onChange={e => alterar('uf', e.target.value)}>
                        <option value="">—</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                    </select>
                </Campo>

                <Campo rotulo="Ponto de referência (opcional)" largura="inteira">
                    <input type="text" maxLength={150} value={form.referencia}
                        onChange={e => alterar('referencia', e.target.value)} />
                </Campo>
            </div>

            <label className="cta-check">
                <input type="checkbox" checked={form.principal}
                    onChange={e => alterar('principal', e.target.checked)} />
                Usar como endereço principal
            </label>

            {erro && <p className="cta-retorno cta-retorno--erro" role="alert">{erro}</p>}

            <div className="cta-form-botoes">
                <button type="button" className="cta-botao-suave" onClick={onCancelar} disabled={salvando}>
                    Cancelar
                </button>
                <button type="submit" className="btn" disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Salvar endereço'}
                </button>
            </div>
        </form>
    )
}

// Endereço: lista, adicionar, editar, excluir e escolher o principal.
function ContaEndereco() {
    const [estado, setEstado] = useState({ carregando: true, enderecos: [], erro: null })
    const [edicao, setEdicao] = useState(null) // null | 'novo' | id
    const [aviso, setAviso] = useState(null)
    const [erroAcao, setErroAcao] = useState(null)

    useEffect(() => {
        let vivo = true

        chamarApi('/api/cliente/enderecos')
            .then(resposta => {
                if (vivo) setEstado({ carregando: false, enderecos: resposta.dados ?? [], erro: null })
            })
            .catch(erro => {
                if (vivo) setEstado({ carregando: false, enderecos: [], erro: erro.message })
            })

        return () => {
            vivo = false
        }
    }, [])

    function aplicar(resposta) {
        setEstado({ carregando: false, enderecos: resposta.dados ?? [], erro: null })
        setAviso(resposta.mensagem)
        setErroAcao(null)
    }

    async function salvar(dados) {
        const resposta = edicao === 'novo'
            ? await chamarApi('/api/cliente/enderecos', { metodo: 'POST', corpo: dados })
            : await chamarApi(`/api/cliente/enderecos/${edicao}`, { metodo: 'PUT', corpo: dados })

        aplicar(resposta)
        setEdicao(null)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    async function acao(promessa) {
        try {
            aplicar(await promessa)
        } catch (erro) {
            setErroAcao(erro.message)
            setAviso(null)
        }
    }

    function excluir(endereco) {
        if (window.confirm('Excluir este endereço?')) {
            acao(chamarApi(`/api/cliente/enderecos/${endereco.id}`, { metodo: 'DELETE' }))
        }
    }

    function tornarPrincipal(endereco) {
        acao(chamarApi(`/api/cliente/enderecos/${endereco.id}/principal`, { metodo: 'PUT' }))
    }

    const emEdicao = edicao && edicao !== 'novo'
        ? estado.enderecos.find(item => item.id === edicao)
        : null

    return (
        <section className="cta-secao" aria-labelledby="cta-titulo-endereco">
            <header className="cta-titulo-pagina cta-titulo-pagina--acao">
                <div>
                    <h1 id="cta-titulo-endereco">Meus Endereços</h1>
                    <p>O endereço principal já vem escolhido na hora de pagar.</p>
                </div>

                {!edicao && !estado.carregando && !estado.erro && (
                    <button type="button" className="btn" onClick={() => setEdicao('novo')}>
                        <i className="fa-solid fa-plus" aria-hidden="true" />
                        Novo endereço
                    </button>
                )}
            </header>

            {aviso && <p className="cta-retorno cta-retorno--ok" role="status">{aviso}</p>}
            {erroAcao && <p className="cta-retorno cta-retorno--erro" role="alert">{erroAcao}</p>}

            {estado.carregando && <p className="cta-mensagem" role="status">Carregando seus endereços...</p>}

            {estado.erro && (
                <p className="cta-mensagem cta-mensagem--erro" role="alert">{estado.erro}</p>
            )}

            {edicao && (
                <FormEndereco
                    key={edicao}
                    editando={Boolean(emEdicao)}
                    inicial={
                        emEdicao
                            ? {
                                ...VAZIO,
                                ...Object.fromEntries(
                                    Object.keys(VAZIO).map(chave => [chave, emEdicao[chave] ?? ''])
                                ),
                                cep: formatarCep(emEdicao.cep),
                                principal: Boolean(emEdicao.endereco_principal)
                            }
                            : { ...VAZIO, principal: estado.enderecos.length === 0 }
                    }
                    onSalvar={salvar}
                    onCancelar={() => setEdicao(null)}
                />
            )}

            {!edicao && !estado.carregando && !estado.erro && estado.enderecos.length === 0 && (
                <div className="cta-mensagem">
                    <img src={patinha} alt="" className="cta-mensagem-pata" />
                    <p>Você ainda não tem endereços salvos.</p>
                    <button type="button" className="btn" onClick={() => setEdicao('novo')}>
                        Adicionar endereço
                    </button>
                </div>
            )}

            {!edicao && estado.enderecos.length > 0 && (
                <ul className="cta-enderecos">
                    {estado.enderecos.map(endereco => (
                        <li
                            key={endereco.id}
                            className={'cta-endereco' + (endereco.endereco_principal ? ' principal' : '')}
                        >
                            <i className="fa-solid fa-location-dot cta-endereco-icone" aria-hidden="true" />

                            <div className="cta-endereco-texto">
                                <strong>
                                    {endereco.apelido || 'Endereço'}
                                    {endereco.endereco_principal ? (
                                        <span className="cta-status cta-status--entregue">Principal</span>
                                    ) : null}
                                </strong>
                                <span>
                                    {endereco.logradouro}, {endereco.numero}
                                    {endereco.complemento ? ` - ${endereco.complemento}` : ''}
                                </span>
                                <span>
                                    {endereco.bairro} · {endereco.cidade}/{endereco.uf} · CEP {formatarCep(endereco.cep)}
                                </span>
                                {endereco.referencia && <small>Referência: {endereco.referencia}</small>}
                            </div>

                            <div className="cta-endereco-acoes">
                                {!endereco.endereco_principal && (
                                    <button type="button" className="cta-link-acao" onClick={() => tornarPrincipal(endereco)}>
                                        Tornar principal
                                    </button>
                                )}
                                <button type="button" className="cta-link-acao" onClick={() => setEdicao(endereco.id)}>
                                    <i className="fa-solid fa-pen" aria-hidden="true" /> Editar
                                </button>
                                <button type="button" className="cta-link-acao cta-link-acao--perigo" onClick={() => excluir(endereco)}>
                                    <i className="fa-solid fa-trash" aria-hidden="true" /> Excluir
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

export default ContaEndereco
