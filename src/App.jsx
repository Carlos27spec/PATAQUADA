import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './App.css'

// Componentes
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

// Páginas principais
import Home from './pages/home.jsx'
import Login from './pages/login.jsx'
import Cadastro from './pages/cadastro.jsx'
import EsqueciSenha from './pages/esqueci_senha.jsx'

// Páginas de serviços
import Servicos from './pages/servicos/servicos.jsx'
import Planos from './pages/servicos/planos.jsx'
import Consultas from './pages/servicos/consultas.jsx'
import PetCare from './pages/servicos/pet-care.jsx'

// Loja
import Shop from './pages/shop.jsx'

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
                <Route path="/" element={<Home />} />

                {/* "Sobre" e "Contato" são seções da Home (links do header e do footer) */}
                <Route path="/sobre" element={<Navigate to="/#sobre" replace />} />
                <Route path="/contato" element={<Navigate to="/#contato" replace />} />

                {/* Login, cadastro e recuperação de senha */}
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Cadastro />} />
                <Route path="/recuperar-senha" element={<EsqueciSenha />} />

                {/* Serviços */}
                <Route path="/servicos" element={<Servicos />}>
                    <Route
                        index
                        element={<Navigate to="consultas" replace />}
                    />
                    <Route path="planos" element={<Planos />} />
                    <Route path="consultas" element={<Consultas />} />
                    <Route path="pet-care" element={<PetCare />} />
                </Route>

                {/* Loja */}
                <Route path="/shop" element={<Shop />} />

                {/* Página não encontrada */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Rodapé em todas as páginas */}
            <Footer />
        </BrowserRouter>
    )
}

export default App