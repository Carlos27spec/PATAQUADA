
import { Link } from 'react-router-dom'
import { useDadosPagina } from './servicos.js'
import './servicos.css'

import patinha from '../../assets/paw.png'

function Consultas() {
    const { dados, carregando, erro } = useDadosPagina('consultas')

    return (
        <section className="servicos-conteudo">

            <div className="servicos-apresentacao">

                <div className="apresentacao-texto">
                    <h1>Consultas</h1>
                    <p>
                        Cuidado e atenção para a saúde do seu melhor amigo.
                    </p>
                </div>

                <span className="apresentacao-coracao">♡</span>

            </div>

            {carregando && (
                <p className="servicos-mensagem">
                    Carregando consultas...
                </p>
            )}

            {erro && (
                <p className="servicos-mensagem servicos-erro">
                    {erro}
                </p>
            )}

            {!carregando && !erro && dados.length === 0 && (
                <p className="servicos-mensagem">
                    Nenhuma consulta disponível no momento.
                </p>
            )}

            {!carregando && !erro && dados.length > 0 && (
                <div className="servicos-grid">

                    {dados.map(consulta => (
                        <article
                            className="servico-card"
                            key={consulta.id}
                        >

                            <div className="card-imagem">
                                <img
                                    src={consulta.imagem || patinha}
                                    alt={consulta.nome}
                                />
                            </div>

                            <h3>
                                <img src={patinha} alt="" />
                                {consulta.nome}
                            </h3>

                            <p>{consulta.descricao}</p>

                            <div className="card-informacoes">

                                <div>
                                    <span>◷</span>
                                    <small>Duração média:</small>
                                    <strong>
                                        {consulta.duracaoFormatada}
                                    </strong>
                                </div>

                                <div>
                                    <span>R$</span>
                                    <small>Valor:</small>
                                    <strong>
                                        {consulta.precoFormatado}
                                    </strong>
                                </div>

                            </div>

                            <Link
                                to={`/agendamento?consulta=${consulta.id}`}
                                className="btn servico-agendar"
                            >
                                Agendar consulta →
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
                    <h2>A saúde do seu pet merece atenção!</h2>
                    <p>
                        Agende uma consulta e conte com profissionais
                        preparados para cuidar dele.
                    </p>
                </div>

                <span className="chamada-coracao">♡</span>

            </section>

        </section>
    )
}

export default Consultas
