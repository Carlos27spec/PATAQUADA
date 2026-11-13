import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import './redefinir_senha.css'
import { PawIcon } from '../components/Icons'
import dogCat from '../assets/dog-cat-3.png'

/* ---------- Ícones ---------- */

function IconCadeado() {
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
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        </svg>
    )
}

function IconOlho() {
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
            <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}

function IconOlhoFechado() {
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
            <path d="M3 3l18 18" />
            <path d="M10.6 5.7A10.9 10.9 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17.6 17.6 0 0 1-3.2 3.9" />
            <path d="M6.6 6.7C3.9 8.5 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.3-1" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
        </svg>
    )
}

function IconSalvar() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m5 12.5 4.5 4.5L19 7.5" />
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
            className="redefinir-brilhos"
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

/* ---------- Campo de senha (com botão de mostrar/ocultar) ---------- */

function CampoSenha({ id, label, placeholder, autoComplete, value, onChange, invalido }) {
    const [visivel, setVisivel] = useState(false)

    return (
        <>
            <label htmlFor={id} className="redefinir-label">
                <IconCadeado />
                {label} <span aria-hidden="true">*</span>
            </label>

            <div className={invalido ? 'redefinir-campo redefinir-campo--erro' : 'redefinir-campo'}>
                <IconCadeado />
                <input
                    id={id}
                    type={visivel ? 'text' : 'password'}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    aria-required="true"
                    aria-invalid={invalido}
                    value={value}
                    onChange={onChange}
                />
                <button
                    type="button"
                    className="redefinir-olho"
                    onClick={() => setVisivel((v) => !v)}
                    aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={visivel}
                >
                    {visivel ? <IconOlhoFechado /> : <IconOlho />}
                </button>
            </div>
        </>
    )
}

/* ---------- Página ---------- */

const REQUISITOS = [
    { id: 'tamanho', texto: 'Pelo menos 8 caracteres', ok: (s) => s.length >= 8 },
    { id: 'letra', texto: 'Uma letra', ok: (s) => /[A-Za-zÀ-ÿ]/.test(s) },
    { id: 'numero', texto: 'Um número', ok: (s) => /\d/.test(s) },
]

export default function RedefinirSenha() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    // O link enviado por e-mail deve ter o formato /redefinir-senha?token=XXXX
    const token = searchParams.get('token')

    const [senha, setSenha] = useState('')
    const [confirmar, setConfirmar] = useState('')
    const [erro, setErro] = useState('')
    const [campoErro, setCampoErro] = useState('') // 'senha' | 'confirmar' | ''
    const [enviando, setEnviando] = useState(false)
    const [concluido, setConcluido] = useState(false)

    function limparErro() {
        if (erro) setErro('')
        if (campoErro) setCampoErro('')
    }

    async function handleSubmit(e) {
        e.preventDefault()

        if (!token) {
            setErro('Este link é inválido ou está incompleto. Solicite uma nova recuperação de senha.')
            return
        }

        if (!REQUISITOS.every((r) => r.ok(senha))) {
            setErro('A senha ainda não atende a todos os requisitos.')
            setCampoErro('senha')
            document.getElementById('redefinir-senha')?.focus()
            return
        }

        if (senha !== confirmar) {
            setErro('As senhas não conferem.')
            setCampoErro('confirmar')
            document.getElementById('redefinir-confirmar')?.focus()
            return
        }

        setErro('')
        setCampoErro('')
        setEnviando(true)

        try {
            const resposta = await fetch('/api/usuarios/redefinir-senha', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    senha
                })
            })

            const dados = await resposta.json().catch(() => ({}))

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(
                    dados.mensagem ||
                    'Não foi possível redefinir a senha. Solicite um novo link.'
                )
            }

            setConcluido(true)
        } catch (erroRequisicao) {
            setErro(
                erroRequisicao.message ||
                'Não foi possível salvar agora. Tente novamente em instantes.'
            )
        } finally {
            setEnviando(false)
        }
    }

    return (
        <main className="redefinir">
            <PawIcon className="redefinir-pata pata-redefinir-1" aria-hidden="true" />
            <PawIcon className="redefinir-pata pata-redefinir-2" aria-hidden="true" />
            <PawIcon className="redefinir-pata pata-redefinir-3" aria-hidden="true" />
            <PawIcon className="redefinir-pata pata-redefinir-4" aria-hidden="true" />
            <PawIcon className="redefinir-pata pata-redefinir-5" aria-hidden="true" />
            <PawIcon className="redefinir-pata pata-redefinir-6" aria-hidden="true" />
            <PawIcon className="redefinir-pata pata-redefinir-7" aria-hidden="true" />

            <section className="redefinir-card" aria-labelledby="redefinir-titulo">
                <header className="redefinir-topo">
                    <h1 id="redefinir-titulo" className="redefinir-titulo">
                        <PawIcon className="redefinir-titulo-pata" aria-hidden="true" />
                        Redefinir senha
                        <Brilhos />
                    </h1>
                    <p className="redefinir-subtitulo">
                        {concluido
                            ? 'Tudo certo! Sua senha foi alterada.'
                            : 'Escolha uma nova senha para acessar sua conta.'}
                    </p>
                </header>

                <div className="redefinir-corpo">
                    <div className="redefinir-imagem">
                        <span className="redefinir-mancha" aria-hidden="true" />
                        <img src={dogCat} alt="" />
                    </div>

                    {concluido ? (
                        <div className="redefinir-sucesso" role="status">
                            <p className="redefinir-sucesso-texto">
                                Agora é só entrar com a sua nova senha.
                            </p>
                            <button
                                type="button"
                                className="btn redefinir-enviar"
                                onClick={() => navigate('/login')}
                            >
                                <IconSalvar />
                                Ir para o login
                            </button>
                        </div>
                    ) : (
                        <form className="redefinir-form" onSubmit={handleSubmit} noValidate>
                            <CampoSenha
                                id="redefinir-senha"
                                label="Nova senha"
                                placeholder="Digite a nova senha"
                                autoComplete="new-password"
                                value={senha}
                                invalido={campoErro === 'senha'}
                                onChange={(e) => {
                                    setSenha(e.target.value)
                                    limparErro()
                                }}
                            />

                            <ul className="redefinir-requisitos" aria-label="Requisitos da senha">
                                {REQUISITOS.map((r) => {
                                    const atendido = r.ok(senha)
                                    return (
                                        <li
                                            key={r.id}
                                            className={
                                                atendido
                                                    ? 'redefinir-requisito redefinir-requisito--ok'
                                                    : 'redefinir-requisito'
                                            }
                                        >
                                            <span className="redefinir-requisito-marca" aria-hidden="true">
                                                {atendido ? '✓' : ''}
                                            </span>
                                            {r.texto}
                                            <span className="redefinir-sr">
                                                {atendido ? ' (atendido)' : ' (pendente)'}
                                            </span>
                                        </li>
                                    )
                                })}
                            </ul>

                            <CampoSenha
                                id="redefinir-confirmar"
                                label="Confirmar nova senha"
                                placeholder="Digite a senha novamente"
                                autoComplete="new-password"
                                value={confirmar}
                                invalido={campoErro === 'confirmar'}
                                onChange={(e) => {
                                    setConfirmar(e.target.value)
                                    limparErro()
                                }}
                            />

                            <button type="submit" className="btn redefinir-enviar" disabled={enviando}>
                                <IconSalvar />
                                {enviando ? 'Salvando...' : 'Salvar nova senha'}
                            </button>

                            <p
                                className={
                                    erro
                                        ? 'redefinir-status redefinir-status--erro'
                                        : 'redefinir-status'
                                }
                                aria-live="polite"
                            >
                                {erro}
                            </p>

                            <p className="redefinir-ou">ou</p>

                            <Link to="/login" className="redefinir-voltar">
                                <IconSetaEsquerda />
                                Voltar para o login
                            </Link>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
