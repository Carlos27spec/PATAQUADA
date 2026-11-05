
import { NavLink, Outlet } from 'react-router-dom'
import './servicos.css'
import patinha from '../../assets/paw.png'

function Servicos() {
    return (
        <main className="pagina-servicos">

            <nav className="servicos-submenu">

                <NavLink
                    to="/servicos/planos"
                    className={({ isActive }) => isActive ? 'ativo' : ''}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <i className="fa-solid fa-clipboard-list"></i>
                            )}
                            Planos
                        </>
                    )}
                </NavLink>

                <NavLink
                    to="/servicos/consultas"
                    className={({ isActive }) => isActive ? 'ativo' : ''}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <i className="fa-solid fa-stethoscope"></i>
                            )}
                            Consultas
                        </>
                    )}
                </NavLink>

                <NavLink
                    to="/servicos/pet-care"
                    className={({ isActive }) => isActive ? 'ativo' : ''}
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <img
                                    src={patinha}
                                    alt=""
                                    className="submenu-patinha"
                                />
                            )}
                            Pet Care
                        </>
                    )}
                </NavLink>

            </nav>

            <Outlet />

        </main>
    )
}

export default Servicos
