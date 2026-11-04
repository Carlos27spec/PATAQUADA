import { Link } from 'react-router-dom'

function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-container">

                <div className="footer-main">

                    <div className="footer-brand">
                        <div className="footer-brand-content">
                            <Link to="/" className="footer-logo">
                                <img src="/images/logo-pataquada.png" alt="Logo PataQuada" />
                                <span>Pata<span className="logo-destaque">Quada</span></span>
                            </Link>

                            <p className="footer-description">
                                Tudo o que seu pet precisa, em um só lugar!
                            </p>
                        </div>
                    </div>

                    <div className="footer-content">
                        <nav className="footer-nav" aria-label="Navegação do rodapé">
                            <Link to="/">Home</Link>
                            <Link to="/servicos">Serviços</Link>
                            <Link to="/shop">Shop</Link>
                            <Link to="/sobre">Sobre</Link>
                            <Link to="/contato">Contato</Link>
                        </nav>

                        <div className="footer-social">
                            <a href="https://www.instagram.com/" target="_blank"
                                rel="noopener noreferrer" aria-label="Instagram">◎</a>
                            <a href="https://www.facebook.com/" target="_blank"
                                rel="noopener noreferrer" aria-label="Facebook">f</a>
                            <a href="https://www.youtube.com/" target="_blank"
                                rel="noopener noreferrer" aria-label="YouTube">▶</a>
                        </div>
                    </div>

                </div>

                <div className="footer-bottom">
                    <span>♥</span>
                    <p>Site desenvolvido por Synthex</p>
                </div>

            </div>
        </footer>
    )
}

export default Footer