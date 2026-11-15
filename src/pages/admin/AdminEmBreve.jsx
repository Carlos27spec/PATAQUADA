import { Link } from 'react-router-dom'

import './admin.css'

import patinha from '../../assets/paw.png'

// Mostrada nas áreas do menu que ainda serão liberadas.
function AdminEmBreve() {
    return (
        <div className="adm-aviso-central adm-aviso-central--pagina">
            <img src={patinha} alt="" />

            <h1>Em construção</h1>

            <p>Esta área será liberada nas próximas etapas.</p>

            <Link to="/admin" className="btn">
                Voltar para o início
            </Link>
        </div>
    )
}

export default AdminEmBreve
