import { Link } from 'react-router-dom'

import { BASE_CONTA } from './menuConta.js'
import { formatarData } from './contaFormatos.js'
import { formatarPreco, resolverImagem } from '../shop/shop.js'

// Cartão de um pedido (tela inicial e "Meus Pedidos").
function CartaoPedido({ pedido }) {
    return (
        <li className="cta-pedido">
            <div className="cta-pedido-dados">
                <strong className="cta-pedido-numero">#{pedido.id}</strong>

                <span className="cta-pedido-linha">
                    {formatarData(pedido.data_criacao)}
                    {' · '}
                    <span className={`cta-status cta-status--${pedido.grupo}`}>
                        {pedido.rotulo}
                    </span>
                </span>

                {pedido.detalhe && (
                    <span className="cta-pedido-detalhe">
                        <i className="fa-solid fa-box-open" aria-hidden="true" />
                        {pedido.detalhe}
                    </span>
                )}
            </div>

            <ul className="cta-miniaturas" aria-label="Itens do pedido">
                {pedido.itens.map((item, indice) => (
                    <li key={`${item.nome}-${indice}`}>
                        <img
                            src={resolverImagem(item.imagem)}
                            alt={item.nome}
                            title={item.nome}
                            loading="lazy"
                        />
                    </li>
                ))}
            </ul>

            <div className="cta-pedido-total">
                <small>Total</small>
                <strong>{formatarPreco(pedido.total)}</strong>
            </div>

            <Link
                to={`${BASE_CONTA}/pedidos/${pedido.id}`}
                className="cta-botao-suave"
                aria-label={`Ver o pedido ${pedido.id}`}
            >
                Ver pedido
            </Link>
        </li>
    )
}

export default CartaoPedido
