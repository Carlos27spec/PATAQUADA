
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

// Componentes
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

// Páginas principais
import Home from './pages/home.jsx'
import Login from './pages/login.jsx'
import Cadastro from './pages/cadastro.jsx'

// Páginas de serviços
import Servicos from './pages/servicos/servicos.jsx'
import Planos from './pages/servicos/planos.jsx'
import Consultas from './pages/servicos/consultas.jsx'
import PetCare from './pages/servicos/pet-care.jsx'

// Loja
import Shop from './pages/shop.jsx'

function App() {
    return (
        <BrowserRouter>

            {/* Cabeçalho em todas as páginas */}
            <Header />

            <Routes>
                {/* Página inicial */}
                <Route path="/" element={<Home />} />

                {/* Login e Cadastro */}
                <Route path="/login" element={<Login />} />
                <Route path="/cadastro" element={<Cadastro />} />

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
