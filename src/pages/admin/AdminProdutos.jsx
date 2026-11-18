import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'

import {
    formatarReais,
    imagemDoProduto,
    listarCategorias,
    listarProdutos
} from './produtosAdmin.js'
import { pode } from './permissoesAdmin.js'
import './admin.css'

import patinha from '../../assets/paw.png'

function normalizar(texto) {
    return String(texto ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
}

// Lista de produtos: busca, filtros e acesso ao cadastro/edição.
function AdminProdutos() {
    const { permissoes } = useOutletContext()
    const podeCriar = pode(permissoes, 'produtos', 'criar')
    const podeEditar = pode(permissoes, 'produtos', 'editar')

    const [estado, setEstado] = useState({
        carregando: true,
        produtos: [],
        categorias: [],
        erro: null
    })
    const [versao, setVersao] = useState(0)

    const [busca, setBusca] = useState('')
    const [categoria, setCategoria] = useState('')
    const [situacao, setSituacao] = useState('')

    // Mensagem deixada pela tela de cadastro (sobrevive a recarregar).
    const [aviso, setAviso] = useState(() => {
        try {
            const texto = sessionStorage.getItem('adm-produtos-aviso')
            sessionStorage.removeItem('adm-produtos-aviso')
            return texto
        } catch {
            return null
        }
    })

    useEffect(() => {
        let vivo = true

        Promise.all([listarProdutos(), listarCategorias()])
            .then(([produtos, categorias]) => {
                if (vivo) {
                    setEstado({
                        carregando: false,
                        produtos: produtos.dados ?? [],
                        categorias: categorias.dados ?? [],
                        erro: null
                    })
                }
            })
            .catch(erro => {
                if (vivo) {
                    setEstado(anterior => ({
                        ...anterior,
                        carregando: false,
                        erro: erro.message
                    }))
                }
            })

        return () => {
            vivo = false
        }
    }, [versao])

    const filtrados = useMemo(() => {
        const termo = normalizar(busca.trim())

        return estado.produtos.filter(produto => {
            if (categoria && String(produto.id_categoria_produto) !== categoria) {
                return false
            }

            if (situacao && String(produto.status) !== situacao) {
                return false
            }

            if (!termo) {
                return true
            }

            return [produto.nome, produto.sku, produto.categoria_nome]
                .some(valor => normalizar(valor).includes(termo))
        })
    }, [estado.produtos, busca, categoria, situacao])

    function recarregar() {
        setEstado(anterior => ({ ...anterior, carregando: true, erro: null }))
        setVersao(atual => atual + 1)
    }

    return (
        <div>
            <header className="adm-pagina-titulo adm-pagina-titulo--acoes">
                <img src={patinha} alt="" />

                <div>
                    <h1>Produtos</h1>
                    <p>Cadastre e edite os produtos da loja.</p>
                </div>

                {podeCriar && (
                    <Link to="/admin/produtos/novo" className="btn adm-botao-principal">
                        <i className="fa-solid fa-plus" />
                        Novo produto
                    </Link>
                )}
            </header>

            {aviso && (
                <p className="adm-mensagem adm-mensagem--ok" role="status">
                    <i className="fa-solid fa-circle-check" />
                    {aviso}
                    <button
                        type="button"
                        className="adm-mensagem-fechar"
                        aria-label="Fechar aviso"
                        onClick={() => setAviso(null)}
                    >
                        <i className="fa-solid fa-xmark" />
                    </button>
                </p>
            )}

            <div className="adm-filtros">
                <label className="adm-campo adm-campo--busca">
                    <span className="sr-only">Buscar</span>
                    <i className="fa-solid fa-magnifying-glass" />
                    <input
                        type="search"
                        placeholder="Buscar por nome, SKU ou categoria"
                        value={busca}
                        onChange={evento => setBusca(evento.target.value)}
                    />
                </label>

                <label className="adm-campo">
                    <span className="sr-only">Categoria</span>
                    <select
                        value={categoria}
                        onChange={evento => setCategoria(evento.target.value)}
                    >
                        <option value="">Todas as categorias</option>
                        {estado.categorias.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.nome}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="adm-campo">
                    <span className="sr-only">Situação</span>
                    <select
                        value={situacao}
                        onChange={evento => setSituacao(evento.target.value)}
                    >
                        <option value="">Ativos e inativos</option>
                        <option value="1">Somente ativos</option>
                        <option value="0">Somente inativos</option>
                    </select>
                </label>
            </div>

            {estado.carregando && (
                <p className="adm-carregando" role="status">Carregando produtos...</p>
            )}

            {estado.erro && (
                <div className="adm-erro">
                    <p>{estado.erro}</p>
                    <button type="button" className="btn" onClick={recarregar}>
                        Tentar novamente
                    </button>
                </div>
            )}

            {!estado.carregando && !estado.erro && (
                <>
                    <p className="adm-contagem">
                        {filtrados.length === estado.produtos.length
                            ? `${estado.produtos.length} produto(s)`
                            : `${filtrados.length} de ${estado.produtos.length} produto(s)`}
                    </p>

                    {filtrados.length === 0 ? (
                        <p className="adm-vazio">Nenhum produto encontrado.</p>
                    ) : (
                        <div className="adm-tabela-rolagem">
                            <table className="adm-tabela">
                                <thead>
                                    <tr>
                                        <th scope="col"><span className="sr-only">Imagem</span></th>
                                        <th scope="col">Produto</th>
                                        <th scope="col">Categoria</th>
                                        <th scope="col" className="adm-num">Preço</th>
                                        <th scope="col" className="adm-num">Estoque</th>
                                        <th scope="col">Situação</th>
                                        <th scope="col"><span className="sr-only">Ações</span></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filtrados.map(produto => {
                                        const estoqueBaixo =
                                            produto.estoque <= produto.estoque_minimo

                                        return (
                                            <tr key={produto.id}>
                                                <td>
                                                    <img
                                                        className="adm-miniatura"
                                                        src={imagemDoProduto(produto.imagem)}
                                                        alt=""
                                                        loading="lazy"
                                                    />
                                                </td>
                                                <td>
                                                    <strong>{produto.nome}</strong>
                                                    {produto.sku && (
                                                        <small className="adm-sub">SKU {produto.sku}</small>
                                                    )}
                                                </td>
                                                <td>{produto.categoria_nome || '—'}</td>
                                                <td className="adm-num">{formatarReais(produto.preco)}</td>
                                                <td className="adm-num">
                                                    <span className={estoqueBaixo ? 'adm-estoque-baixo' : ''}>
                                                        {produto.estoque}
                                                        {estoqueBaixo && (
                                                            <i
                                                                className="fa-solid fa-triangle-exclamation"
                                                                title="Estoque no mínimo ou abaixo"
                                                            />
                                                        )}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            'adm-selo ' +
                                                            (produto.status === 1
                                                                ? 'adm-selo--ativo'
                                                                : 'adm-selo--inativo')
                                                        }
                                                    >
                                                        {produto.status === 1 ? 'Ativo' : 'Inativo'}
                                                    </span>
                                                </td>
                                                <td className="adm-acoes-linha">
                                                    <Link
                                                        to={`/admin/produtos/${produto.id}`}
                                                        className="adm-link-acao"
                                                    >
                                                        <i className={`fa-solid ${podeEditar ? 'fa-pen' : 'fa-eye'}`} />
                                                        {podeEditar ? 'Editar' : 'Ver'}
                                                    </Link>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AdminProdutos
