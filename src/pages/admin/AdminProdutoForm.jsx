import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'

import {
    TAMANHO_MAXIMO_IMAGEM,
    TIPOS_IMAGEM_ACEITOS,
    UNIDADES_MEDIDA,
    buscarProduto,
    centavosParaTexto,
    enviarImagem,
    extensaoDoArquivo,
    imagemDoProduto,
    listarCategorias,
    nomeParaArquivo,
    removerImagem,
    salvarProduto,
    textoParaCentavos
} from './produtosAdmin.js'
import { pode } from './permissoesAdmin.js'
import './admin.css'

import patinha from '../../assets/paw.png'

const CHAVE_AVISO = 'adm-produtos-aviso'

const VAZIO = {
    nome: '',
    id_categoria_produto: '',
    descricao: '',
    preco: '',
    estoque: '0',
    status: 1,
    sku: '',
    codigo_barras: '',
    peso: '',
    unidade_medida: 'UN',
    estoque_minimo: '0',
    custo_aquisicao: ''
}

// Produto do servidor -> campos do formulário (tudo como texto).
function paraFormulario(produto) {
    return {
        nome: produto.nome ?? '',
        id_categoria_produto: String(produto.id_categoria_produto ?? ''),
        descricao: produto.descricao ?? '',
        preco: centavosParaTexto(produto.preco),
        estoque: String(produto.estoque ?? 0),
        status: Number(produto.status) === 0 ? 0 : 1,
        sku: produto.sku ?? '',
        codigo_barras: produto.codigo_barras ?? '',
        peso: produto.peso ? String(produto.peso).replace('.', ',') : '',
        unidade_medida: produto.unidade_medida || 'UN',
        estoque_minimo: String(produto.estoque_minimo ?? 0),
        custo_aquisicao: produto.custo_aquisicao ? centavosParaTexto(produto.custo_aquisicao) : ''
    }
}

function validar(campos) {
    if (campos.nome.trim().length < 3) {
        return 'Informe o nome do produto (mínimo 3 letras).'
    }

    if (!campos.id_categoria_produto) {
        return 'Escolha a categoria.'
    }

    if (textoParaCentavos(campos.preco) === null) {
        return 'Informe um preço válido (ex.: 159,90).'
    }

    if (!/^\d+$/.test(String(campos.estoque).trim())) {
        return 'O estoque deve ser um número inteiro (0 ou mais).'
    }

    if (!/^\d+$/.test(String(campos.estoque_minimo).trim() || '0')) {
        return 'O estoque mínimo deve ser um número inteiro (0 ou mais).'
    }

    if (campos.custo_aquisicao && textoParaCentavos(campos.custo_aquisicao) === null) {
        return 'Informe um custo válido (ex.: 89,90).'
    }

    if (campos.peso) {
        const peso = Number(String(campos.peso).replace(',', '.'))

        if (!Number.isFinite(peso) || peso <= 0) {
            return 'O peso deve ser maior que zero (em kg, ex.: 10 ou 0,5).'
        }
    }

    return null
}

// Campos do formulário -> corpo enviado ao servidor.
function paraEnvio(campos) {
    return {
        nome: campos.nome.trim(),
        id_categoria_produto: Number(campos.id_categoria_produto),
        descricao: campos.descricao.trim(),
        preco: textoParaCentavos(campos.preco),
        estoque: Number(campos.estoque),
        status: campos.status,
        sku: campos.sku.trim(),
        codigo_barras: campos.codigo_barras.trim(),
        peso: campos.peso ? Number(String(campos.peso).replace(',', '.')) : null,
        unidade_medida: campos.unidade_medida,
        estoque_minimo: Number(campos.estoque_minimo || 0),
        custo_aquisicao: textoParaCentavos(campos.custo_aquisicao) ?? 0
    }
}

function Campo({ rotulo, largura = 'meia', dica, children }) {
    return (
        <label className={`adm-form-campo adm-form-campo--${largura}`}>
            <span className="adm-form-rotulo">{rotulo}</span>
            {children}
            {dica && <small className="adm-form-dica">{dica}</small>}
        </label>
    )
}

function AdminProdutoForm() {
    const { id } = useParams()
    const navigate = useNavigate()
    const editando = Boolean(id)

    // Salvar exige a permissão de cadastrar (novo) ou editar.
    const { permissoes } = useOutletContext()
    const podeSalvar = pode(permissoes, 'produtos', editando ? 'editar' : 'criar')

    const [carregando, setCarregando] = useState(true)
    const [erroCarregar, setErroCarregar] = useState(null)
    const [categorias, setCategorias] = useState([])
    const [campos, setCampos] = useState(VAZIO)
    const [imagemAtual, setImagemAtual] = useState(null)

    const [arquivo, setArquivo] = useState(null)
    const [removerAtual, setRemoverAtual] = useState(false)
    const entradaArquivo = useRef(null)

    const [salvando, setSalvando] = useState(false)
    const [erro, setErro] = useState(null)

    // ----- carrega categorias e (na edição) o produto -----

    useEffect(() => {
        let vivo = true

        Promise.all([
            listarCategorias(),
            editando ? buscarProduto(id) : Promise.resolve(null)
        ])
            .then(([respostaCategorias, respostaProduto]) => {
                if (!vivo) {
                    return
                }

                setCategorias(respostaCategorias.dados ?? [])

                if (respostaProduto) {
                    setCampos(paraFormulario(respostaProduto.dados))
                    setImagemAtual(respostaProduto.dados.imagem)
                } else {
                    setCampos(VAZIO)
                    setImagemAtual(null)
                }

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
    }, [id, editando])

    // Prévia local do arquivo escolhido (liberada ao trocar de arquivo).
    const previa = useMemo(
        () => (arquivo ? URL.createObjectURL(arquivo) : null),
        [arquivo]
    )

    useEffect(() => {
        return () => {
            if (previa) {
                URL.revokeObjectURL(previa)
            }
        }
    }, [previa])

    function alterar(campo, valor) {
        setCampos(atual => ({ ...atual, [campo]: valor }))
    }

    function escolherArquivo(evento) {
        const escolhido = evento.target.files?.[0] ?? null

        if (!escolhido) {
            return
        }

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

    function descartarArquivo() {
        setArquivo(null)

        if (entradaArquivo.current) {
            entradaArquivo.current.value = ''
        }
    }

    // Nome que o arquivo terá na pasta src/images/produtos/.
    const extensao = arquivo
        ? extensaoDoArquivo(arquivo)
        : imagemAtual && !removerAtual
            ? imagemAtual.split('.').pop()
            : null

    const nomeFinal = extensao && campos.nome.trim()
        ? `${nomeParaArquivo(campos.nome)}.${extensao}`
        : null

    const imagemMostrada = previa
        ? previa
        : imagemAtual && !removerAtual
            ? imagemDoProduto(imagemAtual)
            : null

    async function salvar(evento) {
        evento.preventDefault()

        const problema = validar(campos)

        if (problema) {
            setErro(problema)
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
        }

        setSalvando(true)
        setErro(null)

        try {
            const resposta = await salvarProduto(editando ? id : null, paraEnvio(campos))
            const idSalvo = resposta.dados.id

            // Produto novo: a URL passa a ser a da edição. Se a página
            // recarregar ao salvar a imagem (o Vite recarrega quando um
            // arquivo novo entra em src/images), abre o produto já salvo.
            if (!editando) {
                navigate(`/admin/produtos/${idSalvo}`, { replace: true })
            }

            let aviso = editando
                ? 'Produto atualizado com sucesso.'
                : 'Produto cadastrado com sucesso.'

            try {
                if (arquivo) {
                    await enviarImagem(idSalvo, arquivo)
                } else if (removerAtual && imagemAtual) {
                    await removerImagem(idSalvo)
                }
            } catch (falhaImagem) {
                aviso += ` Mas a imagem não foi salva: ${falhaImagem.message}`
            }

            try {
                sessionStorage.setItem(CHAVE_AVISO, aviso)
            } catch {
                // Sem sessionStorage: segue sem o aviso.
            }

            navigate('/admin/produtos')

        } catch (falha) {
            setErro(falha.message)
            setSalvando(false)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    if (carregando) {
        return <p className="adm-carregando" role="status">Carregando...</p>
    }

    if (erroCarregar) {
        return (
            <div className="adm-erro">
                <p>{erroCarregar}</p>
                <Link to="/admin/produtos" className="btn">Voltar para os produtos</Link>
            </div>
        )
    }

    return (
        <form onSubmit={salvar} noValidate>
            <header className="adm-pagina-titulo">
                <img src={patinha} alt="" />

                <div>
                    <h1>{editando ? 'Editar produto' : 'Novo produto'}</h1>
                    <p>
                        <Link to="/admin/produtos" className="adm-voltar">
                            <i className="fa-solid fa-arrow-left" />
                            Voltar para os produtos
                        </Link>
                    </p>
                </div>
            </header>

            {!podeSalvar && (
                <p className="adm-mensagem adm-mensagem--info">
                    <i className="fa-solid fa-lock" />
                    Você pode ver, mas o seu tipo de usuário não tem permissão para salvar aqui.
                </p>
            )}

            {erro && (
                <p className="adm-mensagem adm-mensagem--erro" role="alert">
                    <i className="fa-solid fa-circle-exclamation" />
                    {erro}
                </p>
            )}

            <div className="adm-form-layout">

                {/* ----- DADOS PRINCIPAIS ----- */}
                <section className="adm-painel">
                    <h2 className="adm-painel-titulo">Dados do produto</h2>

                    <div className="adm-form-grade">
                        <Campo rotulo="Nome do produto *" largura="inteira">
                            <input
                                type="text"
                                maxLength={150}
                                value={campos.nome}
                                onChange={evento => alterar('nome', evento.target.value)}
                            />
                        </Campo>

                        <Campo rotulo="Categoria *">
                            <select
                                value={campos.id_categoria_produto}
                                onChange={evento => alterar('id_categoria_produto', evento.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {categorias.map(categoria => (
                                    <option key={categoria.id} value={categoria.id}>
                                        {categoria.nome}
                                        {categoria.status === 0 ? ' (inativa)' : ''}
                                    </option>
                                ))}
                            </select>
                        </Campo>

                        <Campo rotulo="Situação">
                            <select
                                value={campos.status}
                                onChange={evento => alterar('status', Number(evento.target.value))}
                            >
                                <option value={1}>Ativo (aparece na loja)</option>
                                <option value={0}>Inativo (fora da loja)</option>
                            </select>
                        </Campo>

                        <Campo rotulo="Preço de venda (R$) *">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={campos.preco}
                                onChange={evento => alterar('preco', evento.target.value)}
                            />
                        </Campo>

                        <Campo rotulo="Estoque *">
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={campos.estoque}
                                onChange={evento => alterar('estoque', evento.target.value)}
                            />
                        </Campo>

                        <Campo rotulo="Descrição" largura="inteira">
                            <textarea
                                rows={5}
                                maxLength={2000}
                                value={campos.descricao}
                                onChange={evento => alterar('descricao', evento.target.value)}
                            />
                        </Campo>
                    </div>
                </section>

                {/* ----- IMAGEM ----- */}
                <section className="adm-painel">
                    <h2 className="adm-painel-titulo">Imagem</h2>

                    <div className="adm-imagem-caixa">
                        {imagemMostrada ? (
                            <img src={imagemMostrada} alt="Prévia da imagem do produto" />
                        ) : (
                            <div className="adm-imagem-vazia">
                                <i className="fa-regular fa-image" />
                                <span>Sem imagem</span>
                            </div>
                        )}
                    </div>

                    <input
                        ref={entradaArquivo}
                        id="adm-produto-imagem"
                        type="file"
                        accept={TIPOS_IMAGEM_ACEITOS.join(',')}
                        className="sr-only"
                        onChange={escolherArquivo}
                    />

                    <div className="adm-imagem-acoes">
                        <label htmlFor="adm-produto-imagem" className="btn adm-botao-secundario">
                            <i className="fa-solid fa-upload" />
                            {imagemMostrada ? 'Trocar imagem' : 'Escolher imagem'}
                        </label>

                        {arquivo && (
                            <button type="button" className="adm-link-acao" onClick={descartarArquivo}>
                                Desfazer
                            </button>
                        )}

                        {!arquivo && imagemAtual && !removerAtual && (
                            <button
                                type="button"
                                className="adm-link-acao adm-link-acao--perigo"
                                onClick={() => setRemoverAtual(true)}
                            >
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
                        <div>
                            <dt>Nome do arquivo</dt>
                            <dd>{nomeFinal ?? '—'}</dd>
                        </div>
                        <div>
                            <dt>Pasta</dt>
                            <dd>src/images/produtos/</dd>
                        </div>
                    </dl>

                    <p className="adm-form-dica">
                        PNG, JPG, WEBP ou GIF, até 5 MB. O arquivo é renomeado com o
                        nome do produto e salvo ao clicar em Salvar.
                        {removerAtual && ' A imagem será removida ao salvar.'}
                    </p>
                </section>

                {/* ----- DETALHES ----- */}
                <section className="adm-painel adm-form-layout-largo">
                    <h2 className="adm-painel-titulo">Detalhes e estoque</h2>

                    <div className="adm-form-grade adm-form-grade--3">
                        <Campo rotulo="SKU (código interno)">
                            <input
                                type="text"
                                maxLength={60}
                                value={campos.sku}
                                onChange={evento => alterar('sku', evento.target.value)}
                            />
                        </Campo>

                        <Campo rotulo="Código de barras">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={60}
                                value={campos.codigo_barras}
                                onChange={evento => alterar('codigo_barras', evento.target.value)}
                            />
                        </Campo>

                        <Campo rotulo="Unidade de medida">
                            <select
                                value={campos.unidade_medida}
                                onChange={evento => alterar('unidade_medida', evento.target.value)}
                            >
                                {UNIDADES_MEDIDA.map(unidade => (
                                    <option key={unidade.codigo} value={unidade.codigo}>
                                        {unidade.codigo} - {unidade.nome}
                                    </option>
                                ))}
                            </select>
                        </Campo>

                        <Campo rotulo="Peso (kg)" dica="Usado no cálculo do frete.">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="ex.: 10 ou 0,5"
                                value={campos.peso}
                                onChange={evento => alterar('peso', evento.target.value)}
                            />
                        </Campo>

                        <Campo rotulo="Estoque mínimo" dica="Avisa quando o estoque chegar nesse valor.">
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={campos.estoque_minimo}
                                onChange={evento => alterar('estoque_minimo', evento.target.value)}
                            />
                        </Campo>

                        <Campo rotulo="Custo de aquisição (R$)">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={campos.custo_aquisicao}
                                onChange={evento => alterar('custo_aquisicao', evento.target.value)}
                            />
                        </Campo>
                    </div>
                </section>
            </div>

            <div className="adm-form-botoes">
                <Link to="/admin/produtos" className="btn adm-botao-secundario">
                    Cancelar
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

export default AdminProdutoForm
