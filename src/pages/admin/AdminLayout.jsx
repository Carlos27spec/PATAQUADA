import { useEffect, useState } from 'react'
import {
    Link,
    Navigate,
    NavLink,
    Outlet,
    useLocation,
    useNavigate
} from 'react-router-dom'

import { GRUPOS_MENU, ROTA_LOGIN } from './menuAdmin.js'
import { CHAVES_TOKEN, chamarApi, obterToken } from '../shop/carrinho.js'
import { localizarImagem } from '../shop/shop.js'
import './admin.css'

import insignea from '../../assets/Insignea-mini.png'
import patinha from '../../assets/paw.png'

// Ilustração opcional no fim do menu (cachorro e gato). Se não existir
// em src/assets, só as patinhas aparecem.
const ilustracao = localizarImagem([
    'admin-ilustracao',
    'pedido-confirmado',
    'cachorro-gato',
    'shop-banner'
])

function rotaDoItem(item) {
    return `/admin/${item.rota}`
}

function AdminLayout() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    // verificando | liberado | sem-login | negado | erro
    const [acesso, setAcesso] = useState(() => ({
        situacao: obterToken() ? 'verificando' : 'sem-login',
        usuario: null
    }))

    const [tentativa, setTentativa] = useState(0)
    const [menuAberto, setMenuAberto] = useState(false)
    const [gruposAbertos, setGruposAbertos] = useState({})

    // Confirma no servidor que o usuário é administrador.
    useEffect(() => {
        if (!obterToken()) {
            return undefined
        }

        let vivo = true

        async function verificar() {
            try {
                const resposta = await chamarApi('/api/admin/eu')

                if (vivo) {
                    setAcesso({ situacao: 'liberado', usuario: resposta.usuario })
                }

            } catch (erro) {
                if (!vivo) {
                    return
                }

                if (erro.status === 401) {
                    setAcesso({ situacao: 'sem-login', usuario: null })
                } else if (erro.status === 403) {
                    setAcesso({ situacao: 'negado', usuario: null })
                } else {
                    setAcesso({ situacao: 'erro', usuario: null })
                }
            }
        }

        verificar()

        return () => {
            vivo = false
        }
    }, [tentativa])

    function tentarNovamente() {
        setAcesso({ situacao: 'verificando', usuario: null })
        setTentativa(atual => atual + 1)
    }

    function sair() {
        for (const chave of CHAVES_TOKEN) {
            localStorage.removeItem(chave)
            sessionStorage.removeItem(chave)
        }

        navigate('/')
    }

    // ----- antes de liberar o painel -----

    if (acesso.situacao === 'sem-login') {
        return (
            <Navigate
                to={ROTA_LOGIN}
                state={{ de: pathname }}
                replace
            />
        )
    }

    if (acesso.situacao !== 'liberado') {
        return (
            <main className="adm-tela-central">
                <div className="adm-aviso-central">

                    <img src={patinha} alt="" />

                    {acesso.situacao === 'verificando' && (
                        <p role="status">Verificando o seu acesso...</p>
                    )}

                    {acesso.situacao === 'negado' && (
                        <>
                            <h1>Acesso restrito</h1>

                            <p>
                                Esta área é exclusiva para administradores
                                da PataQuada.
                            </p>

                            <Link to="/" className="btn">
                                Voltar para o site
                            </Link>
                        </>
                    )}

                    {acesso.situacao === 'erro' && (
                        <>
                            <h1>Não foi possível entrar</h1>

                            <p>
                                Não conseguimos verificar o seu acesso agora.
                                Confira a conexão e tente novamente.
                            </p>

                            <button
                                type="button"
                                className="btn"
                                onClick={tentarNovamente}
                            >
                                Tentar novamente
                            </button>
                        </>
                    )}

                </div>
            </main>
        )
    }

    // ----- painel liberado -----

    const { usuario } = acesso

    function grupoAtivo(grupo) {
        return grupo.itens.some(
            item =>
                pathname === rotaDoItem(item) ||
                pathname.startsWith(`${rotaDoItem(item)}/`)
        )
    }

    function grupoAberto(grupo) {
        return gruposAbertos[grupo.chave] ?? grupoAtivo(grupo)
    }

    function alternarGrupo(grupo) {
        setGruposAbertos(atual => ({
            ...atual,
            [grupo.chave]: !grupoAberto(grupo)
        }))
    }

    const fecharMenu = () => setMenuAberto(false)

    const classeLink = ({ isActive }) =>
        'adm-link' + (isActive ? ' ativo' : '')

    return (
        <div className="adm-app">

            {/* TOPO */}
            <header className="adm-topo">

                <button
                    type="button"
                    className="adm-menu-botao"
                    aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
                    aria-expanded={menuAberto}
                    aria-controls="adm-menu-lateral"
                    onClick={() => setMenuAberto(aberto => !aberto)}
                >
                    <span /><span /><span />
                </button>

                <Link to="/admin" className="adm-logo" onClick={fecharMenu}>
                    <img src={insignea} alt="" />

                    <span>
                        Pata<span className="adm-logo-destaque">Quada</span>
                    </span>
                </Link>

                <span className="adm-topo-titulo">
                    <img src={patinha} alt="" />
                    Painel Administrativo
                </span>

                <div className="adm-usuario">
                    <span className="adm-usuario-nome">
                        <i className="fa-solid fa-circle-user" />
                        {usuario.nome}
                    </span>

                    <Link to="/" className="adm-usuario-acao">
                        Ver site
                    </Link>

                    <button
                        type="button"
                        className="adm-usuario-acao"
                        onClick={sair}
                    >
                        Sair
                    </button>
                </div>

            </header>

            {/* MENU LATERAL */}
            <aside
                id="adm-menu-lateral"
                className={'adm-menu' + (menuAberto ? ' aberto' : '')}
            >
                <nav aria-label="Menu administrativo">

                    <NavLink
                        to="/admin"
                        end
                        className={classeLink}
                        onClick={fecharMenu}
                    >
                        <i className="fa-solid fa-house" />
                        Início
                    </NavLink>

                    {GRUPOS_MENU.map(grupo => {
                        // grupo com um único item vira link direto
                        if (grupo.itens.length === 1) {
                            return (
                                <NavLink
                                    key={grupo.chave}
                                    to={rotaDoItem(grupo.itens[0])}
                                    className={classeLink}
                                    onClick={fecharMenu}
                                >
                                    <i className={`fa-solid ${grupo.icone}`} />
                                    {grupo.titulo}
                                </NavLink>
                            )
                        }

                        const aberto = grupoAberto(grupo)

                        return (
                            <div
                                key={grupo.chave}
                                className={
                                    'adm-grupo' +
                                    (grupoAtivo(grupo) ? ' ativo' : '')
                                }
                            >
                                <button
                                    type="button"
                                    className="adm-grupo-botao"
                                    aria-expanded={aberto}
                                    onClick={() => alternarGrupo(grupo)}
                                >
                                    <i className={`fa-solid ${grupo.icone}`} />
                                    {grupo.titulo}
                                    <i
                                        className={
                                            'fa-solid adm-seta ' +
                                            (aberto
                                                ? 'fa-chevron-up'
                                                : 'fa-chevron-down')
                                        }
                                    />
                                </button>

                                {aberto && (
                                    <ul className="adm-submenu">
                                        {grupo.itens.map(item => (
                                            <li key={item.rota}>
                                                <NavLink
                                                    to={rotaDoItem(item)}
                                                    className={classeLink}
                                                    onClick={fecharMenu}
                                                >
                                                    {item.titulo}
                                                </NavLink>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })}

                </nav>

                <div className="adm-menu-decoracao" aria-hidden="true">
                    <img src={patinha} alt="" className="adm-pata adm-pata--1" />
                    <img src={patinha} alt="" className="adm-pata adm-pata--2" />
                    <img src={patinha} alt="" className="adm-pata adm-pata--3" />

                    {ilustracao && (
                        <img
                            src={ilustracao}
                            alt=""
                            className="adm-ilustracao"
                        />
                    )}
                </div>
            </aside>

            {menuAberto && (
                <button
                    type="button"
                    className="adm-fundo-menu"
                    aria-label="Fechar menu"
                    onClick={fecharMenu}
                />
            )}

            {/* CONTEÚDO */}
            <main className="adm-conteudo">
                <Outlet context={{ usuario }} />
            </main>

            <footer className="adm-rodape">
                <img src={patinha} alt="" />
                PataQuada · Painel Administrativo
            </footer>

        </div>
    )
}

export default AdminLayout
