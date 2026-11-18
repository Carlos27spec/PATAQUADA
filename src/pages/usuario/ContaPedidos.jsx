import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import CartaoPedido from './CartaoPedido.jsx'
import { chamarApi } from '../shop/carrinho.js'
import './conta.css'

import patinha from '../../assets/paw.png'

const FILTROS = [
    { valor: '', rotulo: 'Todos' },
    { valor: 'pendente', rotulo: 'Aguardando pagamento' },
    { valor: 'andamento', rotulo: 'Em andamento' },
    { valor: 'entregue', rotulo: 'Entregues' },
    { valor: 'cancelado', rotulo: 'Cancelados' }
]

// Meus Pedidos: todos os pedidos do cliente, com filtro por situação.
function ContaPedidos() {
    const [estado, setEstado] = useState({ carregando: true, pedidos: [], erro: null })
    const [versao, setVersao] = useState(0)
    const [filtro, setFiltro] = useState('')

    useEffect(() => {
        let vivo = true

        chamarApi('/api/cliente/pedidos')
            .then(resposta => {
                if (vivo) setEstado({ carregando: false, pedidos: resposta.dados ?? [], erro: null })
            })
            .catch(erro => {
                if (vivo) setEstado({ carregando: false, pedidos: [], erro: erro.message })
            })

        return () => {
            vivo = false
        }
    }, [versao])

    const filtrados = useMemo(
        () => estado.pedidos.filter(pedido => !filtro || pedido.grupo === filtro),
        [estado.pedidos, filtro]
    )

    // Só mostra os filtros que têm pedidos.
    const filtrosComPedidos = FILTROS.filter(
        item => !item.valor || estado.pedidos.some(pedido => pedido.grupo === item.valor)
    )

    function recarregar() {
        setEstado(anterior => ({ ...anterior, carregando: true, erro: null }))
        setVersao(atual => atual + 1)
    }

    return (
        <section className="cta-secao" aria-labelledby="cta-titulo-pedidos">
            <header className="cta-titulo-pagina">
                <h1 id="cta-titulo-pedidos">Meus Pedidos</h1>
                <p>Acompanhe suas compras na PataQuada.</p>
            </header>

            {estado.carregando && (
                <p className="cta-mensagem" role="status">Carregando seus pedidos...</p>
            )}

            {estado.erro && (
                <div className="cta-mensagem cta-mensagem--erro" role="alert">
                    <p>{estado.erro}</p>
                    <button type="button" className="btn" onClick={recarregar}>Tentar novamente</button>
                </div>
            )}

            {!estado.carregando && !estado.erro && estado.pedidos.length === 0 && (
                <div className="cta-mensagem">
                    <img src={patinha} alt="" className="cta-mensagem-pata" />
                    <p>Você ainda não fez nenhum pedido.</p>
                    <Link to="/shop" className="btn">Ir para a loja</Link>
                </div>
            )}

            {!estado.carregando && !estado.erro && estado.pedidos.length > 0 && (
                <>
                    {filtrosComPedidos.length > 2 && (
                        <div className="cta-filtros" role="group" aria-label="Filtrar pedidos">
                            {filtrosComPedidos.map(item => (
                                <button
                                    key={item.valor || 'todos'}
                                    type="button"
                                    className={'cta-filtro' + (filtro === item.valor ? ' ativo' : '')}
                                    aria-pressed={filtro === item.valor}
                                    onClick={() => setFiltro(item.valor)}
                                >
                                    {item.rotulo}
                                </button>
                            ))}
                        </div>
                    )}

                    <ul className="cta-pedidos">
                        {filtrados.map(pedido => (
                            <CartaoPedido key={pedido.id} pedido={pedido} />
                        ))}
                    </ul>
                </>
            )}
        </section>
    )
}

export default ContaPedidos
