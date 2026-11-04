import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'

import Home from './pages/home.jsx'
import Servicos from './pages/servicos.jsx'
import Shop from './pages/shop.jsx'
import Sobre from './pages/sobre.jsx'
import Contato from './pages/contato.jsx'

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/servicos" element={<Servicos />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/contato" element={<Contato />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}

export default App