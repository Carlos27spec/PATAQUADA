import { useState } from 'react'
import { Link } from 'react-router-dom'
import './esqueci_senha.css'
import { PawIcon } from '../components/Icons'
import dogCat from '../assets/dog-cat-3.png'

/* ---------- Ícones ---------- */

function IconEmail() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="m3.5 7.5 8.5 6 8.5-6" />
        </svg>
    )
}

function IconEnviar() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
    )
}

function IconSetaEsquerda() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    )
}

function Brilhos() {
    return (
        <svg
            className="esqueci-brilhos"
            viewBox="0 0 48 44"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <path d="M12 6 9 18" />
            <path d="M24 9c5 2 11 6 16 13" />
            <path d="M22 18c6 1 12 4 18 9" />
        </svg>
    )
}

/* ---------- Página ---------- */

const MENSAGEM_SUCESSO =
    'Pronto! Se esse e-mail estiver cadastrado, você vai receber o link em instantes. Confira também a caixa de spam.'

export default function EsqueciSenha() {
    const [email, setEmail] = useState('')
    const [erro, setErro] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [enviado, setEnviado] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setEnviado(false)

        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setErro('Informe um e-mail válido.')
            document.getElementById('esqueci-email')?.focus()
            return
        }

        setErro('')
        setEnviando(true)

        try {
            const resposta = await fetch('/api/usuarios/solicitar-redefinicao-senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email.trim()
                })
            })

            const dados = await resposta.json().catch(() => ({}))

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(
                    dados.mensagem || 'Não foi possível enviar o link agora.'
                )
            }

            setEnviado(true)
        } catch (erroRequisicao) {
            setErro(
                erroRequisicao.message ||
                'Não foi possível enviar agora. Tente novamente em instantes.'
            )
        } finally {
            setEnviando(false)
        }
    }

    const mensagem = erro || (enviado ? MENSAGEM_SUCESSO : '')
    const classeStatus = erro
        ? 'esqueci-status esqueci-status--erro'
        : enviado
            ? 'esqueci-status esqueci-status--ok'
            : 'esqueci-status'

    return (
        <main className="esqueci">
            <PawIcon className="esqueci-pata pata-esqueci-1" aria-hidden="true" />
            <PawIcon className="esqueci-pata pata-esqueci-2" aria-hidden="true" />
            <PawIcon className="esqueci-pata pata-esqueci-3" aria-hidden="true" />
            <PawIcon className="esqueci-pata pata-esqueci-4" aria-hidden="true" />
            <PawIcon className="esqueci-pata pata-esqueci-5" aria-hidden="true" />
            <PawIcon className="esqueci-pata pata-esqueci-6" aria-hidden="true" />
            <PawIcon className="esqueci-pata pata-esqueci-7" aria-hidden="true" />

            <section className="esqueci-card" aria-labelledby="esqueci-titulo">
                <header className="esqueci-topo">
                    <h1 id="esqueci-titulo" className="esqueci-titulo">
                        <PawIcon className="esqueci-titulo-pata" aria-hidden="true" />
                        Esqueci minha senha
                        <Brilhos />
                    </h1>
                    <p className="esqueci-subtitulo">
                        Não se preocupe! Informe seu e-mail e enviaremos um link para redefinir sua senha.
                    </p>
                </header>

                <div className="esqueci-corpo">
                    <div className="esqueci-imagem">
                        <span className="esqueci-mancha" aria-hidden="true" />
                        <img src={dogCat} alt="" />
                    </div>

                    <form className="esqueci-form" onSubmit={handleSubmit} noValidate>
                        <label htmlFor="esqueci-email" className="esqueci-label">
                            <IconEmail />
                            Seu e-mail <span aria-hidden="true">*</span>
                        </label>

                        <div className={erro ? 'esqueci-campo esqueci-campo--erro' : 'esqueci-campo'}>
                            <IconEmail />
                            <input
                                id="esqueci-email"
                                type="email"
                                placeholder="Digite seu e-mail cadastrado"
                                autoComplete="email"
                                aria-required="true"
                                aria-invalid={Boolean(erro)}
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (erro) setErro('')
                                }}
                            />
                        </div>

                        <button type="submit" className="btn esqueci-enviar" disabled={enviando}>
                            <IconEnviar />
                            {enviando ? 'Enviando...' : 'Enviar link'}
                        </button>

                        <p className={classeStatus} aria-live="polite">
                            {mensagem}
                        </p>

                        <p className="esqueci-ou">ou</p>

                        <Link to="/login" className="esqueci-voltar">
                            <IconSetaEsquerda />
                            Voltar para o login
                        </Link>
                    </form>
                </div>
            </section>
        </main>
    )
}