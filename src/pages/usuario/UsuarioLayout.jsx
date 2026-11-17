
import { useState } from 'react'
import {
    Link,
    Navigate,
    NavLink,
    Outlet,
    useLocation,
    useNavigate
} from 'react-router-dom'

import { CHAVES_TOKEN, obterToken } from '../shop/carrinho.js'
import './usuario.css'

import insignea from '../../assets/Insignea-mini.png'
import patinha from '../../assets/paw.png'

function obterUsuario() {
    try {
        const dados = localStorage.getItem('usuario')
        return dados ? JSON.parse(dados) : null
    } catch {
        return null
    }
}

function UsuarioLayout() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const [menuAberto, setMenuAberto] = useState(false)

    const usuario = obterUsuario()
    const token = obterToken()

    // A área do cliente exige uma sessão autenticada.
    if (!token || !usuario) {
        return (
            <Navigate
                to="/login"
                state={{ de: pathname }}
                replace
            />
        )
    }

    const fecharMenu = () => setMenuAberto(false)

    function sair() {
        for (const chave of CHAVES_TOKEN) {
            localStorage.removeItem(chave)
            sessionStorage.removeItem(chave)
        }

        localStorage.removeItem('usuario')
        sessionStorage.removeItem('usuario')

        navigate('/login', { replace: true })
    }

    const classeLink = ({ isActive }) =>
        'cli-link' + (isActive ? ' ativo' : '')

    return (
        <div className="cli-app">

            {/* HEADER */}
            <header className="cli-topo">

                <button
                    type="button"
                    className="cli-menu-botao"
                    aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
                    aria-expanded={menuAberto}
                    aria-controls="cli-menu-lateral"
                    onClick={() => setMenuAberto(atual => !atual)}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <Link
                    to="/usuarios"
                    className="cli-logo"
                    onClick={fecharMenu}
                >
                    <img src={insignea} alt="" />

                    <span>
                        Pata<span className="cli-logo-destaque">Quada</span>
                    </span>
                </Link>

                <div className="cli-topo-acoes">

                    <Link
                        to="/usuarios/notificacoes"
                        className="cli-notificacao"
                        aria-label="Notificações"
                        title="Notificações"
                    >
                        <i className="fa-regular fa-bell" />
                    </Link>

                    <span className="cli-usuario-nome">
                        <i className="fa-solid fa-circle-user" />
                        {usuario.nome?.split(' ')[0] || 'Cliente'}
                    </span>

                </div>

            </header>

            {/* SIDEBAR */}
            <aside
                id="cli-menu-lateral"
                className={
                    'cli-menu' + (menuAberto ? ' aberto' : '')
                }
            >

                <div className="cli-menu-identificacao">
                    <span className="cli-avatar">
                        <i className="fa-solid fa-paw" />
                    </span>

                    <div>
                        <strong>
                            Olá, {usuario.nome?.split(' ')[0] || 'Cliente'}!
                        </strong>

                        <span>Bem-vindo à PataQuada</span>
                    </div>
                </div>

                <nav aria-label="Menu do cliente">

                    <NavLink
                        to="/usuarios"
                        end
                        className={classeLink}
                        onClick={fecharMenu}
                    >
                        <i className="fa-solid fa-house" />
                        Início
                    </NavLink>

                    <NavLink
                        to="/usuarios/pedidos"
                        className={classeLink}
                        onClick={fecharMenu}
                    >
                        <i className="fa-solid fa-box" />
                        Meus Pedidos
                    </NavLink>

                    <NavLink
                        to="/usuarios/carrinho"
                        className={classeLink}
                        onClick={fecharMenu}
                    >
                        <i className="fa-solid fa-cart-shopping" />
                        Carrinho
                    </NavLink>

                    <NavLink
                        to="/usuarios/conta"
                        className={classeLink}
                        onClick={fecharMenu}
                    >
                        <i className="fa-solid fa-user" />
                        Minha Conta
                    </NavLink>

                    <NavLink
                        to="/usuarios/endereco"
                        className={classeLink}
                        onClick={fecharMenu}
                    >
                        <i className="fa-solid fa-location-dot" />
                        Endereço
                    </NavLink>

                    <NavLink
                        to="/usuarios/ajuda"
                        className={classeLink}
                        onClick={fecharMenu}
                    >
                        <i className="fa-solid fa-circle-question" />
                        Ajuda
                    </NavLink>

                    <div className="cli-menu-separador" />

                    <button
                        type="button"
                        className="cli-link cli-sair"
                        onClick={sair}
                    >
                        <i className="fa-solid fa-right-from-bracket" />
                        Sair
                    </button>

                </nav>

                {/* DECORAÇÃO DO MENU */}
                <div className="cli-menu-decoracao" aria-hidden="true">

                    <img
                        src={patinha}
                        alt=""
                        className="cli-pata cli-pata-1"
                    />

                    <img
                        src={patinha}
                        alt=""
                        className="cli-pata cli-pata-2"
                    />

                    <img
                        src={patinha}
                        alt=""
                        className="cli-pata cli-pata-3"
                    />

                </div>

            </aside>

            {/* FUNDO DO MENU MOBILE */}
            {menuAberto && (
                <button
                    type="button"
                    className="cli-fundo-menu"
                    aria-label="Fechar menu"
                    onClick={fecharMenu}
                />
            )}

            {/* CONTEÚDO */}
            <main className="cli-conteudo">
                <Outlet context={{ usuario }} />
            </main>

            {/* RODAPÉ */}
            <footer className="cli-rodape">
                <img src={patinha} alt="" />
                PataQuada · Cuidando de quem faz parte da família
            </footer>

        </div>
    )
}

export default UsuarioLayout
