
import { Link } from 'react-router-dom'
import './404.css'

function Erro404() {
    return (
        <main className="pagina-404">
            <div className="erro404-conteudo">
                <span className="erro404-numero">404</span>

                <h1>Ops! Página não encontrada.</h1>

                <p>
                    Parece que essa página saiu para passear e não
                    conseguiu encontrar o caminho de volta.
                </p>

                <Link to="/" className="erro404-botao">
                    Voltar para o início
                </Link>
            </div>
        </main>
    )
}

export default Erro404
