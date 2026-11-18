import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './login.css'
import { PawIcon } from "../components/Icons.jsx"
import mascoteGrande from '../assets/cachorro-cartoon-card.png'

const API = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/* ---------- Ícones ---------- */

function IconEmail() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
    )
}

function IconCadeado() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
        </svg>
    )
}

/* ---------- Página ---------- */

export default function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')
    const [erro, setErro] = useState('')
    const [enviando, setEnviando] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()

        if (!email.trim() || !senha) {
            setErro('Preencha o e-mail (ou usuário) e a senha para entrar.')
            return
        }

        setErro('')
        setEnviando(true)

        try {
            const resposta = await fetch(`${API}/api/usuarios/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // O cadastro grava o e-mail em minúsculas, então o login envia igual
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    senha
                })
            })

            const dados = await resposta.json().catch(() => ({}))

            if (!resposta.ok || !dados.sucesso) {
                setErro(dados.mensagem || 'Não foi possível entrar agora. Tente novamente.')
                return
            }

            localStorage.setItem('token', dados.token)
            localStorage.setItem('usuario', JSON.stringify(dados.usuario))
            navigate('/usuarios', { replace: true })
        } catch {
            setErro('Não foi possível conectar ao servidor. Tente novamente.')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <main className="login">
            <PawIcon className="login-pata pata-login-1" aria-hidden="true" />
            <PawIcon className="login-pata pata-login-2" aria-hidden="true" />
            <PawIcon className="login-pata pata-login-3" aria-hidden="true" />
            <PawIcon className="login-pata pata-login-4" aria-hidden="true" />

            <h1 className="login-titulo">
                Seja Bem-Vindo PetLover &lt;3
            </h1>

            <div className="login-area">
                <img
                    className="login-mascote"
                    src={mascoteGrande}
                    alt=""
                />

                <section className="login-card" aria-label="Entrar na conta">
                    <form className="login-form" onSubmit={handleSubmit} noValidate>

                        <div className="login-campo">
                            <label htmlFor="login-email" className="sr-only">
                                E-mail ou usuário
                            </label>

                            <IconEmail />

                            <input
                                id="login-email"
                                type="text"
                                placeholder="E-mail ou usuário"
                                autoComplete="username"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="login-campo">
                            <label htmlFor="login-senha" className="sr-only">
                                Senha
                            </label>

                            <IconCadeado />

                            <input
                                id="login-senha"
                                type="password"
                                placeholder="Senha"
                                autoComplete="current-password"
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                            />
                        </div>

                        <Link className="login-esqueci" to="/recuperar-senha">
                            Esqueci minha senha
                        </Link>

                        <button
                            type="submit"
                            className="btn login-entrar"
                            disabled={enviando}
                        >
                            {enviando ? 'Entrando...' : 'Entrar'}
                        </button>

                        <p className="login-status" role="alert">
                            {erro}
                        </p>

                        <p className="login-cadastro">
                            Ainda não tem conta?{' '}
                            <Link to="/cadastro">Cadastre-se</Link>
                        </p>

                    </form>
                </section>
            </div>
        </main>
    )
}