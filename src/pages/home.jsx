import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import './home.css'
import racao from '../assets/racao.png'

/* ---------- Dados (troque pelas informações reais / API depois) ---------- */

const slides = [
    {
        id: 1,
        titulo: 'Tudo o que seu pet precisa, em um só lugar!',
        botao: 'Conheça nossos serviços',
        link: '/servicos',
        imagem: '/images/banner-pets.png',
    },
    {
        id: 2,
        titulo: 'Rações, petiscos e brinquedos para todos os dias.',
        botao: 'Ver produtos',
        link: '/shop',
        imagem: '/images/banner-pets.png',
    },
    {
        id: 3,
        titulo: 'Cuidado veterinário com carinho e atenção.',
        botao: 'Marcar consulta',
        link: '/contato',
        imagem: '/images/banner-pets.png',
    },
]

const servicos = [
    {
        id: 1,
        titulo: 'Banho e Tosa',
        texto: 'Seu pet bonito e cheiroso para qualquer ocasião',
        link: '/servicos',
        cta: 'Saiba mais',
        cor: 'amarelo',
        icone: (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <ellipse cx="6.2" cy="10" rx="2.1" ry="2.8" />
                <ellipse cx="10.2" cy="5.8" rx="2.1" ry="2.8" />
                <ellipse cx="15.2" cy="5.8" rx="2.1" ry="2.8" />
                <ellipse cx="19" cy="10" rx="2.1" ry="2.8" />
                <path d="M12.6 11c-3 0-6 3.2-6 5.9 0 1.9 1.4 2.8 3 2.8 1.3 0 2-.5 3-.5s1.7.5 3 .5c1.6 0 3-.9 3-2.8 0-2.7-3-5.9-6-5.9z" />
            </svg>
        ),
    },
    {
        id: 2,
        titulo: 'Produtos',
        texto: 'Rações, brinquedos e tudo quanto o seu pet precisa',
        link: '/shop',
        cta: 'Ver produtos',
        cor: 'rosa',
        icone: (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M5 7h14l1.2 13H3.8L5 7z" />
                <path d="M8.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8.5 13.5a3.5 3.5 0 0 0 7 0" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
        ),
    },
    {
        id: 3,
        titulo: 'Veterinário',
        texto: 'Mais saúde e bem-estar para o seu pet.',
        link: '/contato',
        cta: 'Marcar consulta',
        cor: 'verde',
        icone: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 3v6a4 4 0 0 0 8 0V3" />
                <path d="M5 3h2M13 3h2" />
                <path d="M10 13v2a5 5 0 0 0 10 0v-1" />
                <circle cx="20" cy="11.5" r="2" />
            </svg>
        ),
    },
]

const produtos = [
    { id: 1, nome: 'Ração Pataquada 5kg', preco: 90, imagem: racao },
    { id: 2, nome: 'Ração Pataquada 5kg', preco: 90, imagem: racao },
    { id: 3, nome: 'Ração Pataquada 5kg', preco: 90, imagem: racao },
    { id: 4, nome: 'Ração Pataquada 5kg', preco: 90, imagem: racao },
    { id: 5, nome: 'Ração Pataquada 5kg', preco: 90, imagem: racao },
    { id: 6, nome: 'Ração Pataquada 5kg', preco: 90, imagem: racao },
]

const valores = [
    { id: 1, titulo: 'Cuidado', texto: 'Tudo pensado para o bem-estar do seu pet.', cor: 'amarelo' },
    { id: 2, titulo: 'Carinho', texto: 'Porque cada pet merece atenção especial.', cor: 'rosa' },
    { id: 3, titulo: 'Praticidade', texto: 'Serviços e informações em um só lugar.', cor: 'verde' },
]

const formatarPreco = (valor) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/* ---------- Pequenos componentes ---------- */

function Pata({ className = '' }) {
    return (
        <svg className={`home-pata ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <ellipse cx="6.2" cy="10" rx="2.1" ry="2.8" />
            <ellipse cx="10.2" cy="5.8" rx="2.1" ry="2.8" />
            <ellipse cx="15.2" cy="5.8" rx="2.1" ry="2.8" />
            <ellipse cx="19" cy="10" rx="2.1" ry="2.8" />
            <path d="M12.6 11c-3 0-6 3.2-6 5.9 0 1.9 1.4 2.8 3 2.8 1.3 0 2-.5 3-.5s1.7.5 3 .5c1.6 0 3-.9 3-2.8 0-2.7-3-5.9-6-5.9z" />
        </svg>
    )
}

function SetaEsquerda() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 5-7 7 7 7" />
        </svg>
    )
}

function SetaDireita() {
    return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 5 7 7-7 7" />
        </svg>
    )
}

/* ---------- 1. Carrossel principal (banner) ---------- */

function CarrosselBanner() {
    const [atual, setAtual] = useState(0)
    const [pausado, setPausado] = useState(false)

    useEffect(() => {
        if (pausado) return
        const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduzir) return
        const timer = setInterval(() => {
            setAtual((i) => (i + 1) % slides.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [pausado])

    const anterior = () => setAtual((i) => (i - 1 + slides.length) % slides.length)
    const proximo = () => setAtual((i) => (i + 1) % slides.length)

    return (
        <section
            className="home-banner"
            aria-roledescription="carrossel"
            aria-label="Destaques"
            onMouseEnter={() => setPausado(true)}
            onMouseLeave={() => setPausado(false)}
            onFocus={() => setPausado(true)}
            onBlur={() => setPausado(false)}
        >
            <div className="banner-janela">
                <div
                    className="banner-trilho"
                    style={{ transform: `translateX(-${atual * 100}%)` }}
                >
                    {slides.map((slide, i) => (
                        <article
                            key={slide.id}
                            className="banner-slide"
                            aria-hidden={i !== atual}
                            aria-label={`Slide ${i + 1} de ${slides.length}`}
                        >
                            <Pata className="pata-banner-1" />
                            <Pata className="pata-banner-2" />
                            <Pata className="pata-banner-3" />

                            <div className="banner-texto">
                                <p className="banner-pre">BEM-VINDO À</p>
                                <p className="banner-marca">
                                    Pata<span>Quada</span>
                                </p>
                                <h1 className="banner-titulo">{slide.titulo}</h1>
                                <Link
                                    to={slide.link}
                                    className="banner-botao"
                                    tabIndex={i === atual ? 0 : -1}
                                >
                                    {slide.botao}
                                    <SetaDireita />
                                </Link>
                            </div>

                            <div className="banner-imagem">
                                <span className="banner-mancha" aria-hidden="true" />
                                <img src={slide.imagem} alt="Cachorro e gato juntos" />
                            </div>
                        </article>
                    ))}
                </div>

                <button type="button" className="carrossel-seta seta-esq" onClick={anterior} aria-label="Slide anterior">
                    <SetaEsquerda />
                </button>
                <button type="button" className="carrossel-seta seta-dir" onClick={proximo} aria-label="Próximo slide">
                    <SetaDireita />
                </button>

                <div className="banner-pontos">
                    {slides.map((slide, i) => (
                        <button
                            key={slide.id}
                            type="button"
                            className={`banner-ponto${i === atual ? ' ativo' : ''}`}
                            onClick={() => setAtual(i)}
                            aria-label={`Ir para o slide ${i + 1}`}
                            aria-current={i === atual}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ---------- 2. Serviços ---------- */

function SecaoServicos() {
    return (
        <section className="home-servicos">
            <Pata className="pata-servicos-1" />
            <Pata className="pata-servicos-2" />

            <div className="home-container">
                <p className="secao-pre">SERVIÇOS</p>
                <h2 className="secao-titulo">Tudo para o bem estar do seu pet</h2>

                <div className="servicos-grade">
                    {servicos.map((item) => (
                        <article key={item.id} className="servico-item">
                            <div className={`servico-icone cor-${item.cor}`}>{item.icone}</div>
                            <h3>{item.titulo}</h3>
                            <p>{item.texto}</p>
                            <Link to={item.link} className="servico-link">
                                {item.cta} →
                            </Link>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ---------- 3. Mais vendidos (carrossel de produtos) ---------- */

function useItensPorVista() {
    const calcular = () =>
        window.innerWidth <= 600 ? 1 : window.innerWidth <= 900 ? 2 : 3
    const [itens, setItens] = useState(calcular)

    useEffect(() => {
        const aoRedimensionar = () => setItens(calcular())
        window.addEventListener('resize', aoRedimensionar)
        return () => window.removeEventListener('resize', aoRedimensionar)
    }, [])

    return itens
}

function CarrosselProdutos() {
    const itensPorVista = useItensPorVista()
    const [pagina, setPagina] = useState(0)
    const [pausado, setPausado] = useState(false)

    // agrupa os produtos em "slides" (3, 2 ou 1 por vez, conforme a tela)
    const slidesProdutos = []
    for (let i = 0; i < produtos.length; i += itensPorVista) {
        slidesProdutos.push(produtos.slice(i, i + itensPorVista))
    }
    const total = slidesProdutos.length
    const atual = Math.min(pagina, total - 1)

    useEffect(() => {
        if (pausado) return
        const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (reduzir) return
        const timer = setInterval(() => {
            setPagina((p) => (Math.min(p, total - 1) + 1) % total)
        }, 6000)
        return () => clearInterval(timer)
    }, [pausado, total])

    const anterior = () => setPagina((atual - 1 + total) % total)
    const proximo = () => setPagina((atual + 1) % total)

    return (
        <section className="home-produtos">
            <Pata className="pata-produtos-1" />
            <Pata className="pata-produtos-2" />
            <Pata className="pata-produtos-3" />
            <span className="mancha-produtos mancha-1" aria-hidden="true" />
            <span className="mancha-produtos mancha-2" aria-hidden="true" />

            <div className="home-container">
                <h2 className="produtos-titulo">Nossos Produtos mais vendidos</h2>

                <div
                    className="produtos-carrossel"
                    aria-roledescription="carrossel"
                    aria-label="Produtos mais vendidos"
                    onMouseEnter={() => setPausado(true)}
                    onMouseLeave={() => setPausado(false)}
                    onFocus={() => setPausado(true)}
                    onBlur={() => setPausado(false)}
                >
                    <div className="produtos-janela">
                        <div
                            className="produtos-trilho"
                            style={{ transform: `translateX(-${atual * 100}%)` }}
                        >
                            {slidesProdutos.map((grupo, i) => (
                                <div
                                    key={i}
                                    className="produtos-slide"
                                    style={{ '--colunas': itensPorVista }}
                                    aria-hidden={i !== atual}
                                    aria-label={`Slide ${i + 1} de ${total}`}
                                >
                                    {grupo.map((produto) => (
                                        <article key={produto.id} className="produto-card">
                                            <img src={produto.imagem} alt={produto.nome} />
                                            <h3>{produto.nome}</h3>
                                            <p className="produto-preco">{formatarPreco(produto.preco)}</p>
                                            <button
                                                type="button"
                                                className="produto-botao"
                                                tabIndex={i === atual ? 0 : -1}
                                            >
                                                Comprar Agora
                                            </button>
                                        </article>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="button" className="carrossel-seta seta-esq" onClick={anterior} aria-label="Produtos anteriores">
                        <SetaEsquerda />
                    </button>
                    <button type="button" className="carrossel-seta seta-dir" onClick={proximo} aria-label="Próximos produtos">
                        <SetaDireita />
                    </button>
                </div>

                <div className="produtos-pontos">
                    {slidesProdutos.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`banner-ponto${i === atual ? ' ativo' : ''}`}
                            onClick={() => setPagina(i)}
                            aria-label={`Ir para o slide ${i + 1} de produtos`}
                            aria-current={i === atual}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}

/* ---------- 4. Sobre ---------- */

function SecaoSobre() {
    return (
        <section className="home-sobre">
            <Pata className="pata-sobre-1" />
            <Pata className="pata-sobre-2" />

            <div className="sobre-imagem">
                <img src="/images/sobre-pets.png" alt="Cachorro e gato sorrindo" />
            </div>

            <div className="sobre-conteudo">
                <p className="secao-pre">SOBRE A PATAQUADA</p>
                <h2 className="sobre-titulo">
                    Cuidar do seu pet pode ser mais simples, divertido e cheio de carinho
                </h2>
                <p className="sobre-texto">
                    A Pataquada nasceu para reunir tudo o que seu pet precisa em um só lugar.
                    Aqui você encontra serviços, produtos, informações e conteúdos pensados
                    para proporcionar mais cuidado, saúde e bem-estar aos nossos companheiros.
                </p>

                <ul className="sobre-valores">
                    {valores.map((v) => (
                        <li key={v.id}>
                            <span className={`valor-icone cor-${v.cor}`} aria-hidden="true">
                                <Pata />
                            </span>
                            <div>
                                <h3>{v.titulo}</h3>
                                <p>{v.texto}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}

/* ---------- 5. Contato (formulário) ---------- */

function SecaoContato() {
    const [form, setForm] = useState({ nome: '', email: '', mensagem: '' })
    const [status, setStatus] = useState('') // '', 'enviando', 'ok', 'erro'

    const atualizar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const enviar = async (e) => {
        e.preventDefault()
        setStatus('enviando')
        try {
            // TODO: trocar pela rota do seu back-end, ex.:
            // await fetch('http://localhost:3333/contato', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(form),
            // })
            await new Promise((r) => setTimeout(r, 600))
            setStatus('ok')
            setForm({ nome: '', email: '', mensagem: '' })
        } catch {
            setStatus('erro')
        }
    }

    return (
        <section className="home-contato">
            <Pata className="pata-contato-1" />
            <Pata className="pata-contato-2" />
            <Pata className="pata-contato-3" />

            <div className="contato-texto">
                <p className="secao-pre">VAMOS CONVERSAR?</p>
                <h2>Tem alguma dúvida, sugestão ou precisa de ajuda?</h2>
                <p>Entre em contato com a Pataquada!</p>
            </div>

            <div className="contato-caixa">
                <img className="contato-imagem" src="/images/contato-pets.png" alt="" />

                <form className="contato-form" onSubmit={enviar}>
                    <label className="campo">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <circle cx="12" cy="7" r="4" />
                            <path d="M4 21v-2a8 8 0 0 1 16 0v2z" />
                        </svg>
                        <input type="text" name="nome" placeholder="Nome" value={form.nome} onChange={atualizar} required />
                    </label>

                    <label className="campo">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M3 5h18a1 1 0 0 1 1 1v.6l-10 6.4L2 6.6V6a1 1 0 0 1 1-1z" />
                            <path d="M2 9l10 6.4L22 9v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V9z" />
                        </svg>
                        <input type="email" name="email" placeholder="E-mail" value={form.email} onChange={atualizar} required />
                    </label>

                    <label className="campo campo-mensagem">
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                        </svg>
                        <textarea name="mensagem" placeholder="Mensagem" rows="3" value={form.mensagem} onChange={atualizar} required />
                    </label>

                    <button type="submit" className="contato-enviar" disabled={status === 'enviando'}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                            <path d="M2 21 23 12 2 3v7l15 2-15 2z" />
                        </svg>
                        {status === 'enviando' ? 'Enviando...' : 'Enviar'}
                    </button>

                    <p className="contato-status" role="status">
                        {status === 'ok' && 'Mensagem enviada! Responderemos em breve.'}
                        {status === 'erro' && 'Não foi possível enviar. Tente novamente.'}
                    </p>
                </form>
            </div>
        </section>
    )
}

/* ---------- Página ---------- */

function Home() {
    return (
        <main className="home">
            <CarrosselBanner />
            <SecaoServicos />
            <CarrosselProdutos />
            <SecaoSobre />
            <SecaoContato />
        </main>
    )
}

export default Home