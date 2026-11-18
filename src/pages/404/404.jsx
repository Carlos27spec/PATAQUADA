import { Link } from 'react-router-dom'
import './404.css'

import patinha from '../../assets/paw.png'

function Erro404() {
    return (
        <main className="erro404">
            <div className="erro404-cartao">
                <div className="erro404-numero" aria-hidden="true">
                    <span>4</span>
                    <img src={patinha} alt="" className="erro404-pata" />
                    <span>4</span>
                </div>

                <h1 className="erro404-titulo">Ops! Página não encontrada.</h1>

                <p className="erro404-descricao">
                    Parece que essa página saiu para passear e não
                    conseguiu encontrar o caminho de volta.
                </p>

                <div className="erro404-botoes">
                    <Link to="/" className="btn erro404-botao">
                        <i className="fa-solid fa-house" aria-hidden="true" />
                        Voltar para o início
                    </Link>

                    <Link to="/shop" className="btn erro404-botao erro404-botao--suave">
                        <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                        Ir para a loja
                    </Link>
                </div>
            </div>

            <img src={patinha} alt="" className="erro404-decoracao erro404-decoracao--1" aria-hidden="true" />
            <img src={patinha} alt="" className="erro404-decoracao erro404-decoracao--2" aria-hidden="true" />
            <img src={patinha} alt="" className="erro404-decoracao erro404-decoracao--3" aria-hidden="true" />
        </main>
    )
}

export default Erro404
