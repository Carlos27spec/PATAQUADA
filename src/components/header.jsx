import { useState } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/Logo.png'

function Header() {
    const [menuAberto, setMenuAberto] = useState(false)

    const fecharMenu = () => setMenuAberto(false)

    return (
        <header className="site-header">
            <div className="header-container">

                <Link
                    to="/"
                    className="header-logo"
                    aria-label="PataQuada - Página inicial"
                    onClick={fecharMenu}
                >
                    <img src={logo} alt="Logo PataQuada" />
                    <span>Pata<span className="logo-destaque">Quada</span></span>
                </Link>

                <button
                    className="header-menu-toggle"
                    type="button"
                    aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
                    aria-expanded={menuAberto}
                    onClick={() => setMenuAberto(!menuAberto)}
                >
                    ☰
                </button>

                <nav
                    className={`header-nav${menuAberto ? ' is-open' : ''}`}
                    aria-label="Navegação principal"
                >
                    <Link to="/" onClick={fecharMenu}>HOME</Link>
                    <Link to="/servicos" onClick={fecharMenu}>SERVIÇOS</Link>
                    <Link to="/shop" onClick={fecharMenu}>SHOP</Link>
                    <Link to="/sobre" onClick={fecharMenu}>SOBRE</Link>
                    <Link to="/contato" onClick={fecharMenu}>CONTATO</Link>
                </nav>

                <div className="header-actions">
                    <Link to="/busca" className="header-action" aria-label="Buscar">
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                            <circle cx="10.8" cy="10.8" r="7.2" />
                            <path d="m16 16 5 5" />
                        </svg>
                    </Link>

                    <Link to="/carrinho" className="header-action" aria-label="Carrinho">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 3h2l2.2 12.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" />
                            <circle cx="10" cy="20" r="1.5" />
                            <circle cx="18" cy="20" r="1.5" />
                        </svg>
                    </Link>

                    <Link to="/cliente" className="header-action" aria-label="Minha conta">
                        <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="7" r="4" />
                            <path d="M4 21v-2a8 8 0 0 1 16 0v2z" />
                        </svg>
                    </Link>
                </div>

            </div>
        </header>
    )
}

export default Header