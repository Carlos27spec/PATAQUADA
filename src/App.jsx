
import { Component, lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './App.css'

// Componentes
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

// Páginas principais
const Home = lazy(() => import('./pages/home.jsx'))
const Login = lazy(() => import('./pages/login.jsx'))
const Cadastro = lazy(() => import('./pages/cadastro.jsx'))
const EsqueciSenha = lazy(() => import('./pages/esqueci_senha.jsx'))
const RedefinirSenha = lazy(() => import('./pages/redefinir_senha.jsx'))

// Páginas de serviços
const Servicos = lazy(() => import('./pages/servicos/servicos.jsx'))
const Planos = lazy(() => import('./pages/servicos/planos.jsx'))
const Consultas = lazy(() => import('./pages/servicos/consultas.jsx'))
const PetCare = lazy(() => import('./pages/servicos/pet-care.jsx'))

// Loja
const Shop = lazy(() => import('./pages/shop/shop.jsx'))
const Produto = lazy(() => import('./pages/shop/Produto.jsx'))
const Carrinho = lazy(() => import('./pages/shop/Carrinho.jsx'))

// Pagamentos
const PedidoRetorno = lazy(() => import('./pages/shop/PedidoRetorno.jsx'))

// Administração
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminInicio = lazy(() => import('./pages/admin/AdminInicio.jsx'))
const AdminEmBreve = lazy(() => import('./pages/admin/AdminEmBreve.jsx'))

// Usuários
const UsuarioLayout = lazy(() => import('./pages/usuario/UsuarioLayout.jsx'))
const UsuarioInicio = lazy(() => import('./pages/usuario/Usuarios.jsx'))
const UsuarioEmBreve = lazy(() => import('./pages/usuario/UsuarioEmBreve.jsx'))

// Página 404
const Erro404 = lazy(() => import('./pages/404/404.jsx'))

// Tratamento de erros por página

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)

        this.state = {
            hasError: false
        }
    }

    static getDerivedStateFromError() {
        return {
            hasError: true
        }
    }

    componentDidCatch(error, errorInfo) {
        console.error('Erro ao carregar a página:', error)
        console.error('Detalhes do erro:', errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return <Erro404 />
        }

        return this.props.children
    }
}


// Tela de carregamento
function Carregando() {
    return (
        <div className="carregando-pagina">
            <div className="loader"></div>
            <p>Carregando página...</p>
        </div>
    )
}

// Isolamento de erros e carregamento por página
function Pagina({ children }) {
    const { pathname } = useLocation()

    return (
        <ErrorBoundary key={pathname}>
            <Suspense fallback={<Carregando />}>
                {children}
            </Suspense>
        </ErrorBoundary>
    )
}

// Ao trocar de página, volta para o topo (a não ser que o link tenha #âncora)
function ScrollToTop() {
    const { pathname, hash } = useLocation()

    useEffect(() => {
        if (!hash) window.scrollTo(0, 0)
    }, [pathname, hash])

    return null
}

function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />

            {/* Cabeçalho em todas as páginas */}
            <Header />

            <Routes>
                {/* Página inicial */}
                <Route
                    path="/"
                    element={
                        <Pagina>
                            <Home />
                        </Pagina>
                    }
                />
                <Route path="/home" element={<Navigate to="/" replace />} />

                {/* "Sobre" e "Contato" são seções da Home (links do header e do footer) */}
                <Route path="/sobre" element={<Navigate to="/#sobre" replace />} />
                <Route path="/contato" element={<Navigate to="/#contato" replace />} />

                {/* Login, cadastro e recuperação de senha */}
                <Route path="/login" element={<Pagina><Login /></Pagina>} />
                <Route path="/cadastro" element={<Pagina><Cadastro /></Pagina>} />
                <Route path="/recuperar-senha" element={<Pagina><EsqueciSenha /></Pagina>} />
                <Route path="/redefinir-senha" element={<Pagina><RedefinirSenha /></Pagina>} />

                {/* Serviços */}
                <Route
                    path="/servicos"
                    element={
                        <Pagina>
                            <Servicos />
                        </Pagina>
                    }
                >
                    <Route
                        index
                        element={<Navigate to="consultas" replace />}
                    />
                    <Route path="planos" element={<Pagina><Planos /></Pagina>} />
                    <Route path="consultas" element={<Pagina><Consultas /></Pagina>} />
                    <Route path="pet-care" element={<Pagina><PetCare /></Pagina>} />
                </Route>

                {/* Loja */}
                <Route path="/shop" element={<Pagina><Shop /></Pagina>} />
                <Route path="/produto/:id" element={<Pagina><Produto /></Pagina>} />
                <Route path="/carrinho" element={<Pagina><Carrinho /></Pagina>} />

                {/* Pagamentos */}
                <Route path="/pagamento" element={<Pagina><PedidoRetorno /></Pagina>} />
                <Route path="/pedido/sucesso" element={<Pagina><PedidoRetorno resultado="sucesso" /></Pagina>} />
                <Route path="/pedido/pendente" element={<Pagina><PedidoRetorno resultado="pendente" /></Pagina>} />
                <Route path="/pedido/falha" element={<Pagina><PedidoRetorno resultado="falha" /></Pagina>} />

                {/* Administração */}
                <Route
                    path="/admin"
                    element={
                        <Pagina>
                            <AdminLayout />
                        </Pagina>
                    }
                >
                    <Route index element={<Pagina><AdminInicio /></Pagina>} />
                    <Route path="*" element={<Pagina><AdminEmBreve /></Pagina>} />
                </Route>

                {/* ÁREA DO CLIENTE */}
                <Route
                    path="/usuarios"
                    element={
                        <Pagina>
                            <UsuarioLayout />
                        </Pagina>
                    }
                >
                    <Route
                        index
                        element={
                            <Pagina>
                                <UsuarioInicio />
                            </Pagina>
                        }
                    />

                    <Route
                        path="*"
                        element={
                            <Pagina>
                                <UsuarioEmBreve />
                            </Pagina>
                        }
                    />
                </Route>

                {/* ALIAS PARA A ÁREA DO CLIENTE */}
                <Route path="/usuario"
                    element={<Navigate to="/usuarios" replace />}
                />

                {/* Página não encontrada */}
                <Route path="*" element={<Erro404 />} />
            </Routes>

            {/* Rodapé em todas as páginas */}
            <Footer />
        </BrowserRouter>
    )
}

export default App
