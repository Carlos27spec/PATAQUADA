
import { useEffect, useState } from 'react'
import {
    Link,
    Navigate,
    NavLink,
    Outlet,
    useLocation,
    useNavigate
} from 'react-router-dom'

import { ITENS_MENU, ROTA_LOGIN, linkSuporte } from './menuConta.js'
import { useEmpresa } from '../../utils/empresa.js'
import { CHAVES_TOKEN, chamarApi, obterToken } from '../shop/carrinho.js'
import './conta.css'

import patinha from '../../assets/paw.png'

// Área do cliente: só abre com o login feito. A verificação é feita
// no servidor, então um token vencido ou inválido também manda para o login.
function AreaClienteLayout() {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    // verificando | liberado | sem-login | erro
    const [acesso, setAcesso] = useState(() => ({
        situacao: obterToken() ? 'verificando' : 'sem-login',
        usuario: null
    }))

    const [tentativa, setTentativa] = useState(0)
    const empresa = useEmpresa()

    useEffect(() => {
        const token = obterToken()

        if (!token) {
            setAcesso({ situacao: 'sem-login', usuario: null })
            return undefined
        }

        let vivo = true

        async function verificar() {
            try {
                const resposta = await chamarApi('/api/cliente/eu')

                if (vivo) {
                    setAcesso({
                        situacao: 'liberado',
                        usuario: resposta.usuario
                    })
                }

            } catch (erro) {
                if (!vivo) {
                    return
                }

                if (erro.status === 401 || erro.status === 403) {
                    for (const chave of CHAVES_TOKEN) {
                        localStorage.removeItem(chave)
                        sessionStorage.removeItem(chave)
                    }

                    setAcesso({
                        situacao: 'sem-login',
                        usuario: null
                    })

                    return
                }

                setAcesso({
                    situacao: 'erro',
                    usuario: null
                })
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

    if (acesso.situacao === 'sem-login') {
        return <Navigate to={ROTA_LOGIN} state={{ de: pathname }} replace />
    }

    if (acesso.situacao !== 'liberado') {
        return (
            <main className="cta-pagina">
                <div className="cta-container">
                    <div className="cta-aviso-central">
                        <img src={patinha} alt="" />

                        {acesso.situacao === 'verificando' && (
                            <p role="status">Verificando o seu acesso...</p>
                        )}

                        {acesso.situacao === 'erro' && (
                            <>
                                <h1>Não foi possível entrar</h1>

                                <p>
                                    Não conseguimos carregar a sua área agora.
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
                </div>
            </main>
        )
    }

    const suporte = linkSuporte(empresa?.whatsapp)

    const classeLink = ({ isActive }) =>
        'cta-link' + (isActive ? ' ativo' : '')

    return (
        <main className="cta-pagina">
            <div className="cta-container cta-estrutura">

                <aside className="cta-menu">

                    <nav aria-label="Menu da minha conta">
                        <ul>
                            {ITENS_MENU.map(item => (
                                <li key={item.chave}>
                                    <NavLink
                                        to={item.to}
                                        end={item.fim}
                                        className={classeLink}
                                    >
                                        <i className={`fa-solid ${item.icone}`} aria-hidden="true" />
                                        {item.titulo}
                                    </NavLink>
                                </li>
                            ))}

                            <li>
                                {suporte ? (
                                    <a
                                        href={suporte}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cta-link"
                                    >
                                        <i className="fa-solid fa-circle-question" aria-hidden="true" />
                                        Ajuda
                                    </a>
                                ) : (
                                    <Link to="/#contato" className="cta-link">
                                        <i className="fa-solid fa-circle-question" aria-hidden="true" />
                                        Ajuda
                                    </Link>
                                )}
                            </li>

                            {/* Só para quem tem a permissão PAINEL_ACESSAR */}
                            {acesso.usuario?.painel_admin && (
                                <li>
                                    <Link to="/admin" className="cta-link cta-link--admin">
                                        <i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />
                                        Painel administrativo
                                    </Link>
                                </li>
                            )}

                            <li className="cta-menu-sair">
                                <button type="button" className="cta-link" onClick={sair}>
                                    <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
                                    Sair
                                </button>
                            </li>
                        </ul>
                    </nav>

                    <div className="cta-menu-decoracao" aria-hidden="true">
                        <img src={patinha} alt="" className="cta-pata cta-pata--1" />
                        <img src={patinha} alt="" className="cta-pata cta-pata--2" />
                        <img src={patinha} alt="" className="cta-pata cta-pata--3" />
                    </div>

                </aside>

                <section className="cta-conteudo">
                    <Outlet context={{ usuario: acesso.usuario }} />
                </section>

            </div>
        </main>
    )
}

export default AreaClienteLayout
