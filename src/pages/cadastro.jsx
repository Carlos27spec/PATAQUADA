import { useState } from 'react'
import { Link } from 'react-router-dom'
import './cadastro.css'
import { PawIcon } from '../components/Icons'
import mascotes from '../assets/arte-cadastro-mascotes-v2.png'

/* ---------- Ícones ---------- */

function IconUsuario() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
    )
}

function IconCadeadoCirculo() {
    return (
        <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="24" fill="#111" />
            <g transform="translate(12 12)">
                <path
                    fill="#fff"
                    d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                />
            </g>
        </svg>
    )
}

/* ---------- Funções de apoio ---------- */

function formatarCpf(valor) {
    return valor
        .replace(/\D/g, '')
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function cpfValido(cpf) {
    const d = cpf.replace(/\D/g, '')
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false

    const digito = (base) => {
        let soma = 0
        for (let i = 0; i < base; i++) soma += Number(d[i]) * (base + 1 - i)
        const resto = (soma * 10) % 11
        return resto === 10 ? 0 : resto
    }

    return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

function validar(dados) {
    const erros = {}
    if (dados.nome.trim().split(/\s+/).length < 2) erros.nome = 'Informe seu nome completo.'
    if (!/^\S+@\S+\.\S+$/.test(dados.email.trim())) erros.email = 'Informe um e-mail válido.'
    if (!cpfValido(dados.cpf)) erros.cpf = 'Informe um CPF válido.'
    if (dados.senha.length < 8) erros.senha = 'A senha precisa ter pelo menos 8 caracteres.'
    if (dados.confirmar !== dados.senha) erros.confirmar = 'As senhas não conferem.'
    if (!dados.aceite) erros.aceite = 'Aceite os termos para continuar.'
    return erros
}

const ORDEM_CAMPOS = ['nome', 'email', 'cpf', 'senha', 'confirmar', 'aceite']

const DADOS_INICIAIS = {
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    confirmar: '',
    aceite: false,
}

/* ---------- Campo reutilizável (label em cima + erro embaixo) ---------- */

function Campo({ name, label, erro, ...props }) {
    const id = `cad-${name}`
    return (
        <div className="cadastro-campo">
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                name={name}
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? `${id}-erro` : undefined}
                {...props}
            />
            {erro && (
                <p className="cadastro-erro" id={`${id}-erro`}>
                    {erro}
                </p>
            )}
        </div>
    )
}

/* ---------- Página ---------- */

export default function Cadastro() {
    const [dados, setDados] = useState(DADOS_INICIAIS)
    const [erros, setErros] = useState({})
    const [enviando, setEnviando] = useState(false)

    function atualizar(e) {
        const { name, type, value, checked } = e.target
        const novoValor =
            type === 'checkbox' ? checked : name === 'cpf' ? formatarCpf(value) : value

        setDados((atual) => ({ ...atual, [name]: novoValor }))
        if (erros[name]) setErros((atual) => ({ ...atual, [name]: undefined }))
    }

    async function handleSubmit(e) {
        e.preventDefault()

        const novosErros = validar(dados)
        setErros(novosErros)

        const primeiroComErro = ORDEM_CAMPOS.find((campo) => novosErros[campo])
        if (primeiroComErro) {
            document.getElementById(`cad-${primeiroComErro}`)?.focus()
            return
        }

        setEnviando(true)
        try {
            // TODO: enviar os dados para a API de cadastro aqui
            // (ex.: await fetch('/api/cadastro', { method: 'POST', body: JSON.stringify(dados) }))
        } finally {
            setEnviando(false)
        }
    }

    return (
        <main className="cadastro">
            <PawIcon className="cadastro-pata pata-cadastro-1" aria-hidden="true" />
            <PawIcon className="cadastro-pata pata-cadastro-2" aria-hidden="true" />
            <PawIcon className="cadastro-pata pata-cadastro-3" aria-hidden="true" />
            <PawIcon className="cadastro-pata pata-cadastro-4" aria-hidden="true" />
            <PawIcon className="cadastro-pata pata-cadastro-5" aria-hidden="true" />
            <PawIcon className="cadastro-pata pata-cadastro-6" aria-hidden="true" />

            <div className="cadastro-area">
                <section className="cadastro-card" aria-labelledby="cadastro-titulo">
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="cadastro-coluna">
                            <h1 id="cadastro-titulo" className="cadastro-titulo">
                                Cadastro na PATAQUADA
                            </h1>

                            <Campo
                                name="nome"
                                label="Nome Completo"
                                type="text"
                                autoComplete="name"
                                value={dados.nome}
                                onChange={atualizar}
                                erro={erros.nome}
                            />
                            <Campo
                                name="email"
                                label="E-Mail"
                                type="email"
                                autoComplete="email"
                                value={dados.email}
                                onChange={atualizar}
                                erro={erros.email}
                            />
                            <Campo
                                name="cpf"
                                label="CPF"
                                type="text"
                                inputMode="numeric"
                                placeholder="000.000.000-00"
                                maxLength={14}
                                value={dados.cpf}
                                onChange={atualizar}
                                erro={erros.cpf}
                            />
                        </div>

                        <section className="cadastro-senha" aria-labelledby="cadastro-senha-titulo">
                            <h2 id="cadastro-senha-titulo" className="cadastro-senha-titulo cadastro-coluna">
                                <IconCadeadoCirculo />
                                Crie sua senha
                            </h2>

                            <div className="cadastro-coluna">
                                <Campo
                                    name="senha"
                                    label="Senha"
                                    type="password"
                                    autoComplete="new-password"
                                    value={dados.senha}
                                    onChange={atualizar}
                                    erro={erros.senha}
                                />
                                <Campo
                                    name="confirmar"
                                    label="Confirmar Senha"
                                    type="password"
                                    autoComplete="new-password"
                                    value={dados.confirmar}
                                    onChange={atualizar}
                                    erro={erros.confirmar}
                                />
                            </div>

                            <div className="cadastro-aceite">
                                <input
                                    id="cad-aceite"
                                    name="aceite"
                                    type="checkbox"
                                    checked={dados.aceite}
                                    onChange={atualizar}
                                    aria-invalid={Boolean(erros.aceite)}
                                    aria-describedby={erros.aceite ? 'cad-aceite-erro' : undefined}
                                />
                                <label htmlFor="cad-aceite">
                                    Eu concordo com os <Link to="/termos">Termos de Uso</Link> e{' '}
                                    <Link to="/privacidade">Política de Privacidade</Link>
                                </label>
                            </div>
                            {erros.aceite && (
                                <p className="cadastro-erro cadastro-erro--centro" id="cad-aceite-erro">
                                    {erros.aceite}
                                </p>
                            )}

                            <div className="cadastro-acoes">
                                <button type="submit" className="btn cadastro-btn" disabled={enviando}>
                                    <IconUsuario />
                                    Cadastrar
                                </button>
                                <span className="cadastro-ou">ou</span>
                                <Link to="/login" className="btn cadastro-btn">
                                    ← Voltar para o login
                                </Link>
                            </div>
                        </section>
                    </form>
                </section>

                <img className="cadastro-mascote" src={mascotes} alt="" />
            </div>
        </main>
    )
}