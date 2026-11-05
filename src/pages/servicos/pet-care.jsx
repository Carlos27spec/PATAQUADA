
import { Link } from 'react-router-dom'
import { useDadosPagina } from './servicos.js'
import './servicos.css'

import patinha from '../../assets/paw.png'

function PetCare() {
    const { dados, carregando, erro } = useDadosPagina('servicos')

    const servicoPrincipal = dados[0]
    const outrosServicos = dados.slice(1)

    return (
        <section className="servicos-conteudo">

            <div className="servicos-apresentacao">

                <div className="apresentacao-texto">
                    <h1>Pet Care</h1>
                    <p>Todo cuidado que seu pet merece, em um só lugar.</p>
                </div>

                <span className="apresentacao-coracao">♡</span>
            </div>

            {carregando && (
                <p className="servicos-mensagem">
                    Carregando serviços...
                </p>
            )}

            {erro && (
                <p className="servicos-mensagem servicos-erro">
                    {erro}
                </p>
            )}

            {!carregando && !erro && dados.length === 0 && (
                <p className="servicos-mensagem">
                    Nenhum serviço disponível no momento.
                </p>
            )}

            {!carregando && !erro && servicoPrincipal && (
                <>
                    <article className="servico-destaque">

                        <div className="destaque-imagem">
                            <img
                                src={servicoPrincipal.imagem || patinha}
                                alt={servicoPrincipal.nome}
                            />
                        </div>

                        <div className="destaque-conteudo">

                            <h2>
                                <img src={patinha} alt="" />
                                {servicoPrincipal.nome}
                            </h2>

                            <p>{servicoPrincipal.descricao}</p>

                            <div className="destaque-informacoes">

                                <div>
                                    <span>◷</span>
                                    <small>Duração média:</small>
                                    <strong>
                                        {servicoPrincipal.duracaoFormatada}
                                    </strong>
                                </div>

                                <div>
                                    <span>R$</span>
                                    <small>Valor:</small>
                                    <strong>
                                        {servicoPrincipal.precoFormatado}
                                    </strong>
                                </div>

                            </div>

                            <Link
                                to={`/agendamento?servico=${servicoPrincipal.id}`}
                                className="btn servico-agendar"
                            >
                                Agendar serviço →
                            </Link>

                        </div>
                    </article>

                    {outrosServicos.length > 0 && (
                        <div className="servicos-grid">

                            {outrosServicos.map(servico => (
                                <article
                                    className="servico-card"
                                    key={servico.id}
                                >

                                    <div className="card-imagem">
                                        <img
                                            src={servico.imagem || patinha}
                                            alt={servico.nome}
                                        />
                                    </div>

                                    <h3>
                                        <img src={patinha} alt="" />
                                        {servico.nome}
                                    </h3>

                                    <p>{servico.descricao}</p>

                                    <div className="card-informacoes">

                                        <div>
                                            <span>◷</span>
                                            <small>Duração média:</small>
                                            <strong>
                                                {servico.duracaoFormatada}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>R$</span>
                                            <small>Valor:</small>
                                            <strong>
                                                {servico.precoFormatado}
                                            </strong>
                                        </div>

                                    </div>

                                    <Link
                                        to={`/agendamento?servico=${servico.id}`}
                                        className="btn servico-agendar"
                                    >
                                        Agendar serviço →
                                    </Link>

                                </article>
                            ))}

                        </div>
                    )}
                </>
            )}

            <section className="servicos-chamada">

                <img
                    src={patinha}
                    alt=""
                    className="chamada-patinha"
                />

                <div>
                    <h2>Cuide do seu pet com quem entende!</h2>
                    <p>
                        Encontre o serviço ideal para deixar seu companheiro
                        saudável, limpo e feliz.
                    </p>
                </div>

                <Link to="/servicos/planos" className="btn">
                    Conheça nossos planos →
                </Link>

                <span className="chamada-coracao">♡</span>

            </section>

        </section>
    )
}

export default PetCare
