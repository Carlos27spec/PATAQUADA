
import { useState } from 'react'
import { Link } from 'react-router-dom'
import './login.css'
import { PawIcon } from "../components/Icons.jsx"
import mascoteGrande from '../assets/cachorro-cartoon-card.png'

/* ---------- Ícones ---------- */

function IconUsuario() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
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
    const [usuario, setUsuario] = useState('')
    const [senha, setSenha] = useState('')
    const [erro, setErro] = useState('')
    const [enviando, setEnviando] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()

        if (!usuario.trim() || !senha) {
            setErro('Preencha o nome e a senha para entrar.')
            return
        }

        setErro('')
        setEnviando(true)

        try {
            // TODO: chamar a API de login aqui
        } catch {
            setErro('Não foi possível entrar agora. Tente novamente.')
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
                {/* Mascote mantido */}
                <img
                    className="login-mascote"
                    src={mascoteGrande}
                    alt=""
                />

                <section className="login-card" aria-label="Entrar na conta">
                    <form className="login-form" onSubmit={handleSubmit} noValidate>

                        <div className="login-campo">
                            <label htmlFor="login-usuario" className="sr-only">
                                Nome
                            </label>

                            <IconUsuario />

                            <input
                                id="login-usuario"
                                type="text"
                                placeholder="Nome"
                                autoComplete="username"
                                value={usuario}
                                onChange={(e) => setUsuario(e.target.value)}
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
                            Entrar
                        </button>

                        <p className="login-status" aria-live="polite">
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
