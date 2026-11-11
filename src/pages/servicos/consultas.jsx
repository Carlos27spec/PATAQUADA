import { Link } from 'react-router-dom'
import { useDadosPagina } from './servicos.js'
import './servicos.css'

import patinha from '../../assets/paw.png'
import veterinaria from '../../assets/veterinaria-consultas.png'

function Consultas() {
    const { dados, carregando, erro } = useDadosPagina('consultas')

    return (
        <section className="servicos-conteudo">

            {/* TOPO: hero + benefícios + foto ancorada no fim da faixa */}
            <div className="consultas-topo">

                {/* APRESENTAÇÃO PRINCIPAL */}
                <div className="consultas-hero">

                    <img
                        src={patinha}
                        alt=""
                        className="consultas-hero-patinha"
                    />

                    <div className="consultas-hero-texto">
                        <h1>Consultas Veterinárias</h1>

                        <p>
                            Na PataQuada, a saúde do seu pet
                            <br />
                            vem em primeiro lugar.
                        </p>
                    </div>

                </div>

                {/* BENEFÍCIOS */}
                <div className="consultas-beneficios">

                    <div className="beneficio-item">
                        <span className="beneficio-icone beneficio-check">
                            ✓
                        </span>

                        <p>
                            Atendimento
                            <br />
                            de qualidade
                        </p>
                    </div>

                    <div className="beneficio-item">
                        <img src={patinha} alt="" />

                        <p>
                            Diagnóstico
                            <br />
                            preciso
                        </p>
                    </div>

                    <div className="beneficio-item">
                        <span className="beneficio-icone beneficio-coracao">
                            ♥
                        </span>

                        <p>
                            Mais saúde e
                            <br />
                            bem-estar
                        </p>
                    </div>

                    <div className="beneficio-item">
                        <span className="beneficio-icone beneficio-relogio">
                            ◷
                        </span>

                        <p>
                            Agendamento
                            <br />
                            fácil e rápido
                        </p>
                    </div>

                </div>

                {/* foto e patinha: base alinhada à base da faixa */}
                {/* patinha grande atrás da veterinária */}
                <img
                    src={patinha}
                    alt=""
                    className="consultas-hero-patona"
                />
                <img
                    src={veterinaria}
                    alt="Atendimento veterinário"
                    className="consultas-hero-imagem"
                />

            </div>

            {/* TÍTULO DOS TIPOS DE CONSULTA */}
            <div className="consultas-titulo-secao">

                <img src={patinha} alt="" />

                <div>
                    <h2>Nossos tipos de consulta</h2>

                    <p>
                        Cuidados de cada fase da vida do seu pet,
                        com atenção e carinho!
                    </p>
                </div>

            </div>


            {/* MENSAGENS */}
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


            {/* CARDS DAS CONSULTAS */}
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


            {/* CHAMADA FINAL */}
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