
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

import Home from './pages/home.jsx'
import Servicos from './pages/servicos/servicos.jsx'
import Planos from './pages/servicos/planos.jsx'
import Consultas from './pages/servicos/consultas.jsx'
import PetCare from './pages/servicos/pet-care.jsx'
import Shop from './pages/shop.jsx'

function App() {
    return (
        <BrowserRouter>
            <Header />

            <Routes>
                {/* Página inicial */}
                <Route path="/" element={<Home />} />

                {/* Serviços e suas subpáginas */}
                <Route path="/servicos" element={<Servicos />}>
                    <Route index element={<Navigate to="consultas" replace />} />
                    <Route path="planos" element={<Planos />} />
                    <Route path="consultas" element={<Consultas />} />
                    <Route path="pet-care" element={<PetCare />} />
                </Route>

                {/* Loja */}
                <Route path="/shop" element={<Shop />} />

                {/* Redirecionamento de rotas inexistentes */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <Footer />
        </BrowserRouter>
    )
}

export default App
