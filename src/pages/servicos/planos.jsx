import { Link } from 'react-router-dom'
import { useDadosPagina } from './servicos.js'
import './servicos.css'

import patinha from '../../assets/paw.png'
import veterinaria from '../../assets/veterinaria-planos.png'

/* benefícios vêm tratados do servicos.js; sem eles,
   o card mostra cobrança e duração */
function listarBeneficios(plano) {
    if (plano.beneficios?.length > 0) {
        return plano.beneficios
    }

    return [
        plano.cobrancaFormatada && `Cobrança: ${plano.cobrancaFormatada}`,
        plano.duracaoFormatada && `Duração: ${plano.duracaoFormatada}`
    ].filter(Boolean)
}

function Planos() {
    const { dados, carregando, erro } = useDadosPagina('planos')

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
                        <h1>
                            Confira todos os nossos planos
                            <br />
                            disponíveis
                        </h1>

                        <p>
                            Escolha o cuidado ideal para o seu melhor amigo.
                        </p>
                    </div>

                </div>

                {/* BENEFÍCIOS */}
                <div className="consultas-beneficios">

                    <div className="beneficio-item">
                        <span className="beneficio-icone">
                            <svg viewBox="0 0 64 64" aria-hidden="true">
                                <path d="M52 22l4-6-8 3c-3-2-6-3-10-3H26c-9 0-16 7-16 16 0 5 2 9 6 12v8h8v-4h12v4h8v-8c3-2 5-4 6-7h4V30h-4c-1-3-3-6-6-8z" />
                                <rect className="furo" x="25" y="19" width="12" height="3" rx="1.5" />
                                <circle className="furo" cx="45" cy="29" r="2" />
                            </svg>
                        </span>

                        <p>
                            Descontos
                            <br />
                            Exclusivos
                        </p>
                    </div>

                    <div className="beneficio-item">
                        <span className="beneficio-icone">
                            <svg viewBox="0 0 64 64" aria-hidden="true">
                                <rect x="12" y="6" width="40" height="52" rx="6" />
                                <rect className="furo" x="18" y="12" width="28" height="10" rx="2" />
                                <circle className="furo" cx="23" cy="31" r="2.5" />
                                <circle className="furo" cx="32" cy="31" r="2.5" />
                                <circle className="furo" cx="41" cy="31" r="2.5" />
                                <circle className="furo" cx="23" cy="40" r="2.5" />
                                <circle className="furo" cx="32" cy="40" r="2.5" />
                                <circle className="furo" cx="41" cy="40" r="2.5" />
                                <circle className="furo" cx="23" cy="49" r="2.5" />
                                <circle className="furo" cx="32" cy="49" r="2.5" />
                                <circle className="furo" cx="41" cy="49" r="2.5" />
                            </svg>
                        </span>

                        <p>
                            Mais praticidade
                            <br />
                            no seu dia a dia
                        </p>
                    </div>

                    <div className="beneficio-item">
                        <span className="beneficio-icone beneficio-coracao">
                            ♥
                        </span>

                        <p>
                            Pet sempre
                            <br />
                            saudável
                        </p>
                    </div>

                    <div className="beneficio-item">
                        <span className="beneficio-icone">
                            ★
                        </span>

                        <p>
                            Planos flexíveis
                            <br />
                            para cada
                            <br />
                            necessidade
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
                    alt="Veterinária com cachorro"
                    className="consultas-hero-imagem"
                />

            </div>

            {/* TÍTULO DOS PLANOS */}
            <div className="consultas-titulo-secao">

                <img src={patinha} alt="" />

                <div>
                    <h2>Nossos planos</h2>

                    <p>
                        Cuidados completos, do jeitinho que seu pet precisa!
                    </p>
                </div>

            </div>


            {/* MENSAGENS */}
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


            {/* CARDS DOS PLANOS */}
            {!carregando && !erro && dados.length > 0 && (
                <div className="servicos-grid planos-grid">

                    {dados.map((plano, indice) => {
                        /* "Mais escolhido": campo destaque do plano
                           ou, com 3 planos, o do meio */
                        const destaque =
                            plano.destaque ??
                            (dados.length === 3 && indice === 1)

                        return (
                            <article
                                className={
                                    'servico-card plano-card' +
                                    (destaque ? ' plano-destaque' : '')
                                }
                                key={plano.id}
                            >

                                {destaque && (
                                    <span className="plano-selo">
                                        Mais escolhido
                                    </span>
                                )}

                                <h3>
                                    <img src={patinha} alt="" />
                                    {plano.nome}
                                </h3>

                                <p>{plano.descricao}</p>

                                <ul className="plano-beneficios">
                                    {listarBeneficios(plano).map(item => (
                                        <li key={item}>
                                            <img src={patinha} alt="" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>

                                <div className="plano-preco">
                                    <small>Pelo valor de</small>

                                    <strong>
                                        {plano.precoFormatado}{' '}
                                        {plano.periodoPreco && (
                                            <span>{plano.periodoPreco}</span>
                                        )}
                                    </strong>
                                </div>

                                <Link
                                    to={`/contratar-plano?plano=${plano.id}`}
                                    className="btn servico-agendar"
                                >
                                    Quero este plano →
                                </Link>

                            </article>
                        )
                    })}

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