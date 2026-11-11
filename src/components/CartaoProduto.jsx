
import { Link } from 'react-router-dom'

// Card de produto: o card inteiro abre a página do produto.
function CartaoProduto({ produto, compacto = false }) {
    return (
        <Link
            to={`/produto/${produto.id}`}
            className={`shop-card${compacto ? ' shop-card--compacto' : ''}`}
            aria-label={`Ver ${produto.nome}`}
        >

            {!produto.disponivel && (
                <span className="shop-card-esgotado">
                    Esgotado
                </span>
            )}

            <div className="shop-card-imagem">
                <img
                    src={produto.imagem}
                    alt={produto.nome}
                    loading="lazy"
                />
            </div>

            <h3>{produto.nome}</h3>

            <p>{produto.descricao}</p>

            <strong className="shop-card-preco">
                {produto.precoFormatado}
            </strong>

            <span className="btn shop-card-botao">
                {produto.disponivel ? 'Comprar Agora' : 'Ver produto'}
            </span>

        </Link>
    )
}

export default CartaoProduto
