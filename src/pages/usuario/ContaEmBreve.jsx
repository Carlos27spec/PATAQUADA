import { Link } from 'react-router-dom'

import { BASE_CONTA } from './menuConta.js'
import './conta.css'

import patinha from '../../assets/paw.png'

// Mostrada nas telas do menu que ainda serão feitas.
function ContaEmBreve() {
    return (
        <div className="cta-mensagem">
            <img src={patinha} alt="" className="cta-mensagem-pata" />

            <h1>Em construção</h1>

            <p>Esta tela será liberada em breve.</p>

            <Link to={BASE_CONTA} className="btn">
                Voltar para o início
            </Link>
        </div>
    )
}

export default ContaEmBreve
