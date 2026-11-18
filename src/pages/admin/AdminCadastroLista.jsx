import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import { CADASTROS } from './cadastrosConfig.js'
import { pode } from './permissoesAdmin.js'
import {
    CHAVE_AVISO,
    excluir,
    formatarDataHora,
    imagemDaPasta,
    listar,
    mascaraCpfCnpj,
    mascaraTelefone
} from './cadastrosTela.js'
import { formatarReais } from './produtosAdmin.js'
import './admin.css'

import patinha from '../../assets/paw.png'

function normalizar(texto) {
    return String(texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
}

function Celula({ coluna, registro, config }) {
    const valor = registro[coluna.campo]

    switch (coluna.tipo) {
        case 'imagem':
            return (
                <img
                    className="adm-miniatura"
                    src={imagemDaPasta(config.imagem.pasta, valor)}
                    alt=""
                    loading="lazy"
                />
            )

        case 'status':
            return (
                <span className={`adm-selo ${valor === 1 ? 'adm-selo--ativo' : 'adm-selo--inativo'}`}>
                    {valor === 1 ? 'Ativo' : 'Inativo'}
                </span>
            )

        case 'simNao':
            return valor === 1
                ? <span className="adm-selo adm-selo--ativo">Sim</span>
                : <span className="adm-sub">Não</span>

        case 'tipoMovimentacao':
            return (
                <span className={`adm-selo ${valor === 'ENTRADA' ? 'adm-selo--ativo' : 'adm-selo--inativo'}`}>
                    <i className={`fa-solid ${valor === 'ENTRADA' ? 'fa-arrow-down' : 'fa-arrow-up'}`} />{' '}
                    {valor === 'ENTRADA' ? 'Entrada' : 'Saída'}
                </span>
            )

        case 'dinheiro':
            return valor === null || valor === undefined ? '—' : formatarReais(valor)

        case 'telefone':
            return valor ? mascaraTelefone(valor) : '—'

        case 'cpfCnpj':
            return valor ? mascaraCpfCnpj(valor) : '—'

        case 'dataHora':
            return formatarDataHora(valor, { local: coluna.local })

        case 'data': {
            const [ano, mes, dia] = String(valor ?? '').slice(0, 10).split('-')
            return ano && mes && dia ? `${dia}/${mes}/${ano}` : '—'
        }

        // Código em maiúsculas ("AGUARDANDO_PAGAMENTO") vira texto legível.
        case 'rotulo': {
            if (valor === null || valor === undefined || valor === '') return '—'
            const texto = /^[A-Z_]+$/.test(String(valor))
                ? String(valor).toLowerCase().replace(/_/g, ' ').replace(/^./, letra => letra.toUpperCase())
                : String(valor)
            return <span className="adm-selo adm-selo--neutro">{texto}</span>
        }

        default:
            if (coluna.destaque) {
                return (
                    <>
                        <strong>{valor || '—'}</strong>
                        {coluna.sub && registro[coluna.sub] && (
                            <small className="adm-sub">{registro[coluna.sub]}</small>
                        )}
                    </>
                )
            }

            return valor === null || valor === undefined || valor === '' ? '—' : String(valor)
    }
}

// Lista genérica: busca, filtro de situação, editar e (se permitido) excluir.
function AdminCadastroLista({ tipo }) {
    const config = CADASTROS[tipo]
    const { permissoes } = useOutletContext()
    const temStatus = config.campos.some(campo => campo.tipo === 'status')

    const [estado, setEstado] = useState({ carregando: true, dados: [], erro: null })
    const [versao, setVersao] = useState(0)
    const [busca, setBusca] = useState('')
    const [situacao, setSituacao] = useState('')
    const [erroAcao, setErroAcao] = useState(null)

    const [aviso, setAviso] = useState(() => {
        try {
            const texto = sessionStorage.getItem(CHAVE_AVISO(tipo))
            sessionStorage.removeItem(CHAVE_AVISO(tipo))
            return texto
        } catch {
            return null
        }
    })

    useEffect(() => {
        let vivo = true

        listar(tipo)
            .then(resposta => {
                if (vivo) setEstado({ carregando: false, dados: resposta.dados ?? [], erro: null })
            })
            .catch(erro => {
                if (vivo) setEstado({ carregando: false, dados: [], erro: erro.message })
            })

        return () => {
            vivo = false
        }
    }, [tipo, versao])

    const filtrados = useMemo(() => {
        const termo = normalizar(busca.trim())

        return estado.dados.filter(registro => {
            if (situacao && String(registro.status) !== situacao) return false
            if (!termo) return true

            return config.busca.some(campo => normalizar(registro[campo]).includes(termo))
        })
    }, [estado.dados, busca, situacao, config])

    function recarregar() {
        setEstado(anterior => ({ ...anterior, carregando: true, erro: null }))
        setVersao(atual => atual + 1)
    }

    async function confirmarExclusao(registro) {
        const nome = registro[config.colunas.find(coluna => coluna.destaque)?.campo] ?? `#${registro.id}`

        if (!window.confirm(`Excluir "${nome}"? Essa ação não pode ser desfeita.`)) {
            return
        }

        setErroAcao(null)

        try {
            await excluir(tipo, registro.id)
            setAviso('Registro excluído.')
            recarregar()
        } catch (erro) {
            setErroAcao(erro.message)
        }
    }

    // Botões conforme as permissões do tipo de usuário.
    const podeEditar = pode(permissoes, tipo, 'editar')
    const podeExcluir = pode(permissoes, tipo, 'excluir')
    const temAcoes = !config.somenteLeitura && (!config.somenteInclusao || (config.permiteExcluir && podeExcluir))
    const podeIncluir = !config.somenteLeitura && !config.semInclusao && pode(permissoes, tipo, 'criar')

    return (
        <div>
            <header className="adm-pagina-titulo adm-pagina-titulo--acoes">
                <img src={patinha} alt="" />

                <div>
                    <h1>{config.titulo}</h1>
                    <p>{config.descricao}</p>
                </div>

                {podeIncluir && (
                    <Link to={`/admin/${tipo}/novo`} className="btn adm-botao-principal">
                        <i className="fa-solid fa-plus" />
                        {config.novo}
                    </Link>
                )}
            </header>

            {aviso && (
                <p className="adm-mensagem adm-mensagem--ok" role="status">
                    <i className="fa-solid fa-circle-check" />
                    {aviso}
                    <button type="button" className="adm-mensagem-fechar" aria-label="Fechar aviso" onClick={() => setAviso(null)}>
                        <i className="fa-solid fa-xmark" />
                    </button>
                </p>
            )}

            {erroAcao && (
                <p className="adm-mensagem adm-mensagem--erro" role="alert">
                    <i className="fa-solid fa-circle-exclamation" />
                    {erroAcao}
                </p>
            )}

            <div className="adm-filtros">
                <label className="adm-campo adm-campo--busca">
                    <span className="sr-only">Buscar</span>
                    <i className="fa-solid fa-magnifying-glass" />
                    <input
                        type="search"
                        placeholder="Buscar..."
                        value={busca}
                        onChange={evento => setBusca(evento.target.value)}
                    />
                </label>

                {temStatus && (
                    <label className="adm-campo">
                        <span className="sr-only">Situação</span>
                        <select value={situacao} onChange={evento => setSituacao(evento.target.value)}>
                            <option value="">Ativos e inativos</option>
                            <option value="1">Somente ativos</option>
                            <option value="0">Somente inativos</option>
                        </select>
                    </label>
                )}
            </div>

            {estado.carregando && <p className="adm-carregando" role="status">Carregando...</p>}

            {estado.erro && (
                <div className="adm-erro">
                    <p>{estado.erro}</p>
                    <button type="button" className="btn" onClick={recarregar}>Tentar novamente</button>
                </div>
            )}

            {!estado.carregando && !estado.erro && (
                <>
                    <p className="adm-contagem">
                        {filtrados.length === estado.dados.length
                            ? `${estado.dados.length} registro(s)`
                            : `${filtrados.length} de ${estado.dados.length} registro(s)`}
                    </p>

                    {filtrados.length === 0 ? (
                        <p className="adm-vazio">
                            {estado.dados.length === 0
                                ? `Nenhum(a) ${config.singular} cadastrado(a) ainda.`
                                : 'Nada encontrado com esses filtros.'}
                        </p>
                    ) : (
                        <div className="adm-tabela-rolagem">
                            <table className="adm-tabela">
                                <thead>
                                    <tr>
                                        {config.colunas.map(coluna => (
                                            <th
                                                key={coluna.campo}
                                                scope="col"
                                                className={['numero', 'dinheiro'].includes(coluna.tipo) ? 'adm-num' : ''}
                                            >
                                                {coluna.rotulo || <span className="sr-only">Imagem</span>}
                                            </th>
                                        ))}
                                        {temAcoes && <th scope="col"><span className="sr-only">Ações</span></th>}
                                    </tr>
                                </thead>

                                <tbody>
                                    {filtrados.map(registro => (
                                        <tr key={registro.id}>
                                            {config.colunas.map(coluna => (
                                                <td
                                                    key={coluna.campo}
                                                    className={['numero', 'dinheiro'].includes(coluna.tipo) ? 'adm-num' : ''}
                                                >
                                                    <Celula coluna={coluna} registro={registro} config={config} />
                                                </td>
                                            ))}

                                            {temAcoes && (
                                                <td className="adm-acoes-linha">
                                                    {!config.somenteInclusao && (
                                                        <Link to={`/admin/${tipo}/${registro.id}`} className="adm-link-acao">
                                                            <i className={`fa-solid ${podeEditar ? 'fa-pen' : 'fa-eye'}`} />
                                                            {podeEditar ? 'Editar' : 'Ver'}
                                                        </Link>
                                                    )}

                                                    {config.permiteExcluir && podeExcluir && (
                                                        <button
                                                            type="button"
                                                            className="adm-link-acao adm-link-acao--perigo"
                                                            onClick={() => confirmarExclusao(registro)}
                                                        >
                                                            <i className="fa-solid fa-trash" />
                                                            Excluir
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AdminCadastroLista
