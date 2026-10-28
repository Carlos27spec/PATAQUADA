import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

import Home from './pages/home.jsx'
import Servicos from './pages/servicos.jsx'
import Shop from './pages/shop.jsx'
import Sobre from './pages/home.jsx'
import Contato from './pages/home.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/servicos" element={<Servicos />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/contato" element={<Contato />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App