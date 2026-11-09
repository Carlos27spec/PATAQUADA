import { Link } from 'react-router-dom'
import { useDadosPagina } from './servicos.js'
import './servicos.css'

import patinha from '../../assets/paw.png'

/* ========================================
   ÍCONES (SVG inline, herdam a cor do CSS)
======================================== */

function IconeRelogio() {
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                d="M24 12v13l8 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function IconeMoeda() {
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="22" fill="currentColor" />
            <text
                className="cifrao"
                x="24"
                y="33"
                textAnchor="middle"
                fontSize="28"
                fontWeight="700"
                fontFamily="Arial, sans-serif"
            >
                $
            </text>
        </svg>
    )
}

function IconeCalendario() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <circle className="furo" cx="8" cy="9" r="1.4" />
            <circle className="furo" cx="12" cy="9" r="1.4" />
            <circle className="furo" cx="16" cy="9" r="1.4" />
            <circle className="furo" cx="8" cy="13" r="1.4" />
            <circle className="furo" cx="12" cy="13" r="1.4" />
            <circle className="furo" cx="16" cy="13" r="1.4" />
            <circle className="furo" cx="8" cy="17" r="1.4" />
            <circle className="furo" cx="12" cy="17" r="1.4" />
            <circle className="furo" cx="16" cy="17" r="1.4" />
        </svg>
    )
}

/* ========================================
   PÁGINA
======================================== */

function PetCare() {
    const { dados, carregando, erro } = useDadosPagina('servicos')

    const servicoPrincipal = dados[0]
    const outrosServicos = dados.slice(1)

    return (
        <section className="servicos-conteudo">

            {/* APRESENTAÇÃO PRINCIPAL */}
            <div className="servicos-apresentacao">

                <img
                    src={patinha}
                    alt=""
                    className="apresentacao-patinha"
                />

                <div className="apresentacao-texto">
                    <h1>
                        Cuidados para o seu pet
                        <img src={patinha} alt="" />
                    </h1>

                    <p>
                        Todo cuidado que seu pet
                        <br />
                        merece, em um só lugar.
                    </p>
                </div>

                <span className="apresentacao-coracao">♡</span>

            </div>


            {/* MENSAGENS */}
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
                    {/* SERVIÇO PRINCIPAL */}
                    <div className="servico-destaque-wrap">

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
                                        <span className="info-icone">
                                            <IconeRelogio />
                                        </span>
                                        <small>Duração média:</small>
                                        <strong>
                                            {servicoPrincipal.duracaoFormatada}
                                        </strong>
                                    </div>

                                    <div>
                                        <span className="info-icone">
                                            <IconeMoeda />
                                        </span>
                                        <small>A partir de:</small>
                                        <strong>
                                            {servicoPrincipal.precoFormatado}
                                        </strong>
                                    </div>

                                </div>

                                <a
                                    href={servicoPrincipal.whatsappUrl || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn servico-agendar"
                                >
                                    <IconeCalendario />
                                    Agendar Serviço →
                                </a>

                            </div>
                        </article>

                        {/* patinha pendurada no canto do card */}
                        <img
                            src={patinha}
                            alt=""
                            className="servico-destaque-patinha"
                        />

                    </div>


                    {/* DEMAIS SERVIÇOS */}
                    {outrosServicos.length > 0 && (
                        <div className="servicos-grid">

                            {outrosServicos.map(servico => (
                                <article
                                    className="servico-card petcare-card"
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

                                    <div className="card-informacoes card-informacoes--icones">

                                        <div>
                                            <span className="info-icone">
                                                <IconeRelogio />
                                            </span>
                                            <small>Duração média:</small>
                                            <strong>
                                                {servico.duracaoFormatada}
                                            </strong>
                                        </div>

                                        <div>
                                            <span className="info-icone">
                                                <IconeMoeda />
                                            </span>
                                            <small>A partir de:</small>
                                            <strong>
                                                {servico.precoFormatado}
                                            </strong>
                                        </div>

                                    </div>

                                    <a
                                        href={servico.whatsappUrl || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn servico-agendar"
                                    >
                                        <IconeCalendario />
                                        Agendar Serviço →
                                    </a>

                                </article>
                            ))}

                        </div>
                    )}
                </>
            )}


            {/* CHAMADA FINAL */}
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
                <span className="chamada-coracao chamada-coracao-2">♡</span>

            </section>

        </section>
    )
}

export default PetCare