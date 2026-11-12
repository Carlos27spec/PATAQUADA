import { FRETE_GRATIS_A_PARTIR_DE, formatarPreco } from './shop.js'

// Quadro "Resumo do pedido", usado no carrinho e no pagamento.
// Os botões da tela entram como children.
function ResumoPedido({ itens = [], totais, mostrarItens = false, children }) {
    const faltaParaFreteGratis = FRETE_GRATIS_A_PARTIR_DE - totais.subtotal

    return (
        <aside className="ck-painel ck-resumo">

            <h2>Resumo do pedido</h2>

            {mostrarItens && (
                <ul className="ck-resumo-itens">
                    {itens.map(item => (
                        <li key={item.id}>
                            <img
                                src={item.imagem}
                                alt=""
                                loading="lazy"
                            />

                            <span className="ck-resumo-item-nome">
                                {item.nome}
                                <small>
                                    {item.quantidade} ×{' '}
                                    {formatarPreco(item.preco)}
                                </small>
                            </span>

                            <strong>{formatarPreco(item.subtotal)}</strong>
                        </li>
                    ))}
                </ul>
            )}

            <dl className="ck-resumo-linhas">
                <div>
                    <dt>Subtotal</dt>
                    <dd>{formatarPreco(totais.subtotal)}</dd>
                </div>

                <div>
                    <dt>Entrega</dt>
                    <dd>
                        {itens.length > 0 && totais.frete === 0
                            ? 'Grátis'
                            : formatarPreco(totais.frete)}
                    </dd>
                </div>
            </dl>

            <div className="ck-resumo-total">
                <span>Total</span>
                <strong>{formatarPreco(totais.total)}</strong>
            </div>

            {itens.length > 0 && faltaParaFreteGratis > 0 && (
                <p className="ck-resumo-dica">
                    <i className="fa-solid fa-truck-fast" />
                    Faltam {formatarPreco(faltaParaFreteGratis)} para o
                    frete grátis.
                </p>
            )}

            {children}

        </aside>
    )
}

export default ResumoPedido
