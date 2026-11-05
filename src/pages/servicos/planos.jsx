
import { Link } from 'react-router-dom'
import { useDadosPagina } from './servicos.js'
import './servicos.css'

import patinha from '../../assets/paw.png'

function Planos() {
    const { dados, carregando, erro } = useDadosPagina('planos')

    return (
        <section className="servicos-conteudo">

            <div className="servicos-apresentacao">

                <div className="apresentacao-texto">
                    <h1>Nossos Planos</h1>
                    <p>
                        Mais cuidado, carinho e benefícios para o seu pet.
                    </p>
                </div>

                <span className="apresentacao-coracao">♡</span>

            </div>

            {carregando && (
                <p className="servicos-mensagem">
                    Carregando planos...
                </p>
            )}

            {erro && (
                <p className="servicos-mensagem servicos-erro">
                    {erro}
                </p>
            )}

            {!carregando && !erro && dados.length === 0 && (
                <p className="servicos-mensagem">
                    Nenhum plano disponível no momento.
                </p>
            )}

            {!carregando && !erro && dados.length > 0 && (
                <div className="servicos-grid planos-grid">

                    {dados.map(plano => (
                        <article
                            className="servico-card plano-card"
                            key={plano.id}
                        >

                            <div className="card-imagem">
                                <img
                                    src={plano.imagem || patinha}
                                    alt={plano.nome}
                                />
                            </div>

                            <h3>
                                <img src={patinha} alt="" />
                                {plano.nome}
                            </h3>

                            <p>{plano.descricao}</p>

                            <div className="plano-detalhes">

                                <div>
                                    <small>Tipo de cobrança</small>
                                    <strong>
                                        {plano.cobrancaFormatada}
                                    </strong>
                                </div>

                                <div>
                                    <small>Duração</small>
                                    <strong>
                                        {plano.duracaoFormatada}
                                    </strong>
                                </div>

                            </div>

                            <div className="plano-preco">
                                <small>Valor do plano</small>
                                <strong>
                                    {plano.precoFormatado}
                                </strong>
                            </div>

                            <Link
                                to={`/contratar-plano?plano=${plano.id}`}
                                className="btn servico-agendar"
                            >
                                Conhecer plano →
                            </Link>

                        </article>
                    ))}

                </div>
            )}

            <section className="servicos-chamada">

                <img
                    src={patinha}
                    alt=""
                    className="chamada-patinha"
                />

                <div>
                    <h2>
                        O melhor cuidado para quem faz parte da família!
                    </h2>

                    <p>
                        Escolha o plano que combina com as necessidades
                        do seu companheiro.
                    </p>
                </div>

                <span className="chamada-coracao">♡</span>

            </section>

        </section>
    )
}

export default Planos
