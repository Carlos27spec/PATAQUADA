import { useState } from 'react'
import { Link } from 'react-router-dom'
import './cadastro.css'
import { PawIcon } from '../components/Icons'
import mascotes from '../assets/arte-cadastro-mascotes-v2.png'
import {
    MENSAGEM_SENHA,
    MENSAGEM_SENHA_LONGA,
    MENSAGEM_USUARIO,
    REGEX_USUARIO,
    REQUISITOS_SENHA,
    senhaAtendeRequisitos,
    senhaLongaDemais,
} from '../utils/regrasCadastro.js'

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

function formatarTelefone(valor) {
    const d = valor.replace(/\D/g, '').slice(0, 11)
    if (d.length === 0) return ''
    if (d.length <= 2) return `(${d}`
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
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
    if (!REGEX_USUARIO.test(dados.usuario.trim())) erros.usuario = MENSAGEM_USUARIO
    const digitosTel = dados.telefone.replace(/\D/g, '')
    if (digitosTel.length < 10 || digitosTel.length > 11)
        erros.telefone = 'Informe um telefone com DDD.'
    if (!senhaAtendeRequisitos(dados.senha)) erros.senha = MENSAGEM_SENHA
    else if (senhaLongaDemais(dados.senha)) erros.senha = MENSAGEM_SENHA_LONGA
    if (dados.confirmar !== dados.senha) erros.confirmar = 'As senhas não conferem.'
    if (!dados.aceite) erros.aceite = 'Aceite os termos para continuar.'
    return erros
}

const ORDEM_CAMPOS = ['nome', 'email', 'cpf', 'telefone', 'usuario', 'senha', 'confirmar', 'aceite']

const DADOS_INICIAIS = {
    nome: '',
    email: '',
    cpf: '',
    usuario: '',
    telefone: '',
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
    const [erroGeral, setErroGeral] = useState('')
    const [concluido, setConcluido] = useState(false)
    // Resultado da consulta do nome de usuário: { usuario, disponivel, mensagem }
    const [disponibilidade, setDisponibilidade] = useState(null)

    // Ao sair do campo, confere no servidor se o nome de usuário está livre.
    async function conferirUsuario() {
        const usuario = dados.usuario.trim()
        if (!REGEX_USUARIO.test(usuario)) return

        try {
            const resposta = await fetch(
                `/api/usuarios/disponibilidade?usuario=${encodeURIComponent(usuario)}`
            )
            const resultado = await resposta.json()
            if (!resposta.ok) return

            setDisponibilidade({ usuario, ...resultado })
            if (!resultado.disponivel) {
                setErros((atual) => ({ ...atual, usuario: resultado.mensagem }))
            }
        } catch {
            // Sem conexão: a conferência final acontece ao cadastrar.
        }
    }

    function atualizar(e) {
        const { name, type, value, checked } = e.target
        let novoValor = value
        if (type === 'checkbox') novoValor = checked
        else if (name === 'cpf') novoValor = formatarCpf(value)
        else if (name === 'telefone') novoValor = formatarTelefone(value)

        setDados((atual) => ({ ...atual, [name]: novoValor }))
        if (erros[name]) setErros((atual) => ({ ...atual, [name]: undefined }))
    }

    async function handleSubmit(e) {
        e.preventDefault()

        const novosErros = validar(dados)
        if (
            !novosErros.usuario &&
            disponibilidade?.usuario.toLowerCase() === dados.usuario.trim().toLowerCase() &&
            !disponibilidade.disponivel
        ) {
            novosErros.usuario = disponibilidade.mensagem
        }
        setErros(novosErros)

        const primeiroComErro = ORDEM_CAMPOS.find((campo) => novosErros[campo])
        if (primeiroComErro) {
            document.getElementById(`cad-${primeiroComErro}`)?.focus()
            return
        }

        setErroGeral('')
        setEnviando(true)
        try {
            // O tipo de usuário (cliente) é definido pelo back end, não enviamos daqui.
            const resposta = await fetch('/api/usuarios/cadastro', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: dados.nome.trim(),
                    email: dados.email.trim(),
                    cpf: dados.cpf,
                    usuario: dados.usuario.trim(),
                    telefone: dados.telefone,
                    senha: dados.senha,
                }),
            })

            const resultado = await resposta.json().catch(() => ({}))

            if (!resposta.ok) {
                // O back end diz qual campo deu problema (ex.: e-mail ou CPF já cadastrado)
                if (resultado.campo && ORDEM_CAMPOS.includes(resultado.campo)) {
                    setErros({ [resultado.campo]: resultado.mensagem })
                    document.getElementById(`cad-${resultado.campo}`)?.focus()
                } else {
                    setErroGeral(resultado.mensagem || 'Não foi possível concluir o cadastro.')
                }
                return
            }

            setConcluido(true)
        } catch {
            setErroGeral('Não foi possível conectar ao servidor. Tente novamente em instantes.')
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
                {concluido ? (
                    <section className="cadastro-card" aria-labelledby="cadastro-titulo">
                        <div className="cadastro-coluna cadastro-sucesso" role="status">
                            <h1 id="cadastro-titulo" className="cadastro-titulo">
                                Cadastro realizado!
                            </h1>
                            <p className="cadastro-sucesso-texto">
                                Sua conta na PATAQUADA foi criada. Agora é só entrar com seu e-mail e sua senha.
                            </p>
                            <Link to="/login" className="btn cadastro-btn">
                                Ir para o login
                            </Link>
                        </div>
                    </section>
                ) : (
                    <form className="cadastro-form" onSubmit={handleSubmit} noValidate>
                        {/* ---------- Card 1: dados pessoais ---------- */}
                        <section
                            className="cadastro-card cadastro-card--dados"
                            aria-labelledby="cadastro-titulo"
                        >
                            <div className="cadastro-coluna">
                                <h1 id="cadastro-titulo" className="cadastro-titulo">
                                    Dados Cadastrais
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
                                <Campo
                                    name="telefone"
                                    label="Telefone de Contato"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    placeholder="(00) 00000-0000"
                                    maxLength={15}
                                    value={dados.telefone}
                                    onChange={atualizar}
                                    erro={erros.telefone}
                                />
                            </div>
                        </section>

                        {/* ---------- Card 2: contato e senha ---------- */}
                        <section
                            className="cadastro-card cadastro-card--senha"
                            aria-labelledby="cadastro-senha-titulo"
                        >
                            <h2 id="cadastro-senha-titulo" className="cadastro-senha-titulo cadastro-coluna">
                                <IconCadeadoCirculo />
                                Usuário e senha
                            </h2>

                            <div className="cadastro-coluna">
                                <Campo
                                    name="usuario"
                                    label="Usuário"
                                    type="text"
                                    autoComplete="username"
                                    maxLength={20}
                                    value={dados.usuario}
                                    onChange={atualizar}
                                    onBlur={conferirUsuario}
                                    erro={erros.usuario}
                                />
                                {!erros.usuario &&
                                    disponibilidade?.disponivel &&
                                    disponibilidade.usuario === dados.usuario.trim() && (
                                        <p className="cadastro-ok" role="status">
                                            ✓ {disponibilidade.mensagem}
                                        </p>
                                    )}
                                <Campo
                                    name="senha"
                                    label="Senha"
                                    type="password"
                                    autoComplete="new-password"
                                    value={dados.senha}
                                    onChange={atualizar}
                                    erro={erros.senha}
                                />
                                <ul className="cadastro-requisitos" aria-label="Requisitos da senha">
                                    {REQUISITOS_SENHA.map((requisito) => {
                                        const atendido = requisito.ok(dados.senha)
                                        return (
                                            <li
                                                key={requisito.id}
                                                className={
                                                    atendido
                                                        ? 'cadastro-requisito cadastro-requisito--ok'
                                                        : 'cadastro-requisito'
                                                }
                                            >
                                                <span className="cadastro-requisito-marca" aria-hidden="true">
                                                    {atendido ? '✓' : ''}
                                                </span>
                                                {requisito.texto}
                                                <span className="cadastro-sr">
                                                    {atendido ? ' (atendido)' : ' (pendente)'}
                                                </span>
                                            </li>
                                        )
                                    })}
                                </ul>
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
                                    {enviando ? 'Cadastrando...' : 'Cadastrar'}
                                </button>
                                <p className="cadastro-erro cadastro-erro--geral" aria-live="polite">
                                    {erroGeral}
                                </p>
                                <span className="cadastro-ou">ou</span>
                                <Link to="/login" className="btn cadastro-btn">
                                    ← Voltar para o login
                                </Link>
                            </div>
                        </section>
                    </form>
                )}

                {!concluido && <img className="cadastro-mascote" src={mascotes} alt="" />}
            </div>
        </main>
    )
}