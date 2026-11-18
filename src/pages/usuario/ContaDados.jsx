import { useEffect, useState } from 'react'

import { formatarCpf, formatarData, formatarTelefone } from './contaFormatos.js'
import { chamarApi } from '../shop/carrinho.js'
import './conta.css'
import { MENSAGEM_SENHA, senhaAtendeRequisitos } from '../../utils/regrasCadastro.js'

const SENHAS_VAZIAS = { senha_atual: '', nova_senha: '', confirmar: '' }

function Campo({ rotulo, erro, dica, children }) {
    return (
        <label className={'cta-campo' + (erro ? ' cta-campo--erro' : '')}>
            <span>{rotulo}</span>
            {children}
            {erro ? <small role="alert">{erro}</small> : dica && <small>{dica}</small>}
        </label>
    )
}

// Minha Conta: dados pessoais e troca de senha.
function ContaDados() {
    const [carregando, setCarregando] = useState(true)
    const [erroCarregar, setErroCarregar] = useState(null)
    const [conta, setConta] = useState(null)
    const [form, setForm] = useState({ nome: '', email: '', usuario: '', telefone: '', cpf: '' })
    const [envioDados, setEnvioDados] = useState({ salvando: false, ok: null, erro: null, campo: null })

    const [senhas, setSenhas] = useState(SENHAS_VAZIAS)
    const [envioSenha, setEnvioSenha] = useState({ salvando: false, ok: null, erro: null, campo: null })

    useEffect(() => {
        let vivo = true

        chamarApi('/api/cliente/dados')
            .then(resposta => {
                if (!vivo) return

                const dados = resposta.dados
                setConta(dados)
                setForm({
                    nome: dados.nome ?? '',
                    email: dados.email ?? '',
                    usuario: dados.usuario ?? '',
                    telefone: formatarTelefone(dados.telefone),
                    cpf: dados.cpf ? formatarCpf(dados.cpf) : ''
                })
                setCarregando(false)
            })
            .catch(erro => {
                if (vivo) {
                    setErroCarregar(erro.message)
                    setCarregando(false)
                }
            })

        return () => {
            vivo = false
        }
    }, [])

    function alterar(campo, valor) {
        setForm(atual => ({ ...atual, [campo]: valor }))
        setEnvioDados(atual => ({ ...atual, ok: null }))
    }

    async function salvarDados(evento) {
        evento.preventDefault()
        setEnvioDados({ salvando: true, ok: null, erro: null, campo: null })

        try {
            const resposta = await chamarApi('/api/cliente/dados', {
                metodo: 'PUT',
                corpo: {
                    nome: form.nome,
                    email: form.email,
                    usuario: form.usuario,
                    telefone: form.telefone.replace(/\D/g, ''),
                    cpf: form.cpf.replace(/\D/g, '')
                }
            })

            setConta(resposta.dados)
            setEnvioDados({ salvando: false, ok: resposta.mensagem, erro: null, campo: null })
        } catch (erro) {
            setEnvioDados({ salvando: false, ok: null, erro: erro.message, campo: erro.campo ?? null })
        }
    }

    async function salvarSenha(evento) {
        evento.preventDefault()

        if (!senhaAtendeRequisitos(senhas.nova_senha)) {
            setEnvioSenha({ salvando: false, ok: null, erro: MENSAGEM_SENHA, campo: 'nova_senha' })
            return
        }

        if (senhas.nova_senha !== senhas.confirmar) {
            setEnvioSenha({ salvando: false, ok: null, erro: 'As senhas novas não conferem.', campo: 'confirmar' })
            return
        }

        setEnvioSenha({ salvando: true, ok: null, erro: null, campo: null })

        try {
            const resposta = await chamarApi('/api/cliente/senha', {
                metodo: 'PUT',
                corpo: { senha_atual: senhas.senha_atual, nova_senha: senhas.nova_senha }
            })

            setSenhas(SENHAS_VAZIAS)
            setEnvioSenha({ salvando: false, ok: resposta.mensagem, erro: null, campo: null })
        } catch (erro) {
            setEnvioSenha({ salvando: false, ok: null, erro: erro.message, campo: erro.campo ?? null })
        }
    }

    if (carregando) {
        return <p className="cta-mensagem" role="status">Carregando seus dados...</p>
    }

    if (erroCarregar) {
        return <p className="cta-mensagem cta-mensagem--erro" role="alert">{erroCarregar}</p>
    }

    const erroDo = campo => (envioDados.campo === campo ? envioDados.erro : null)
    const erroSenhaDo = campo => (envioSenha.campo === campo ? envioSenha.erro : null)

    return (
        <section className="cta-secao" aria-labelledby="cta-titulo-dados">
            <header className="cta-titulo-pagina">
                <h1 id="cta-titulo-dados">Minha Conta</h1>
                <p>Cliente desde {formatarData(conta.data_cadastro)}.</p>
            </header>

            <form className="cta-painel" onSubmit={salvarDados} noValidate>
                <h2>Dados pessoais</h2>

                <div className="cta-form">
                    <Campo rotulo="Nome completo" erro={erroDo('nome')}>
                        <input type="text" autoComplete="name" value={form.nome}
                            onChange={e => alterar('nome', e.target.value)} />
                    </Campo>

                    <Campo rotulo="E-mail" erro={erroDo('email')} dica="Usado para entrar na sua conta.">
                        <input type="email" autoComplete="email" value={form.email}
                            onChange={e => alterar('email', e.target.value)} />
                    </Campo>

                    <Campo rotulo="Telefone com DDD" erro={erroDo('telefone')}>
                        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321"
                            value={form.telefone}
                            onChange={e => alterar('telefone', formatarTelefone(e.target.value))} />
                    </Campo>

                    <Campo rotulo="Nome de usuário (opcional)" erro={erroDo('usuario')}
                        dica="Também pode ser usado para entrar.">
                        <input type="text" autoComplete="username" value={form.usuario}
                            onChange={e => alterar('usuario', e.target.value.toLowerCase())} />
                    </Campo>

                    <Campo rotulo="CPF" erro={erroDo('cpf')}
                        dica={conta.cpf ? 'O CPF não pode ser alterado.' : null}>
                        <input type="text" inputMode="numeric" value={form.cpf} disabled={Boolean(conta.cpf)}
                            onChange={e => alterar('cpf', formatarCpf(e.target.value))} />
                    </Campo>
                </div>

                {envioDados.erro && !envioDados.campo && (
                    <p className="cta-retorno cta-retorno--erro" role="alert">{envioDados.erro}</p>
                )}
                {envioDados.ok && <p className="cta-retorno cta-retorno--ok" role="status">{envioDados.ok}</p>}

                <div className="cta-form-botoes">
                    <button type="submit" className="btn" disabled={envioDados.salvando}>
                        {envioDados.salvando ? 'Salvando...' : 'Salvar dados'}
                    </button>
                </div>
            </form>

            <form className="cta-painel" onSubmit={salvarSenha} noValidate>
                <h2>Alterar senha</h2>

                <div className="cta-form">
                    <Campo rotulo="Senha atual" erro={erroSenhaDo('senha_atual')}>
                        <input type="password" autoComplete="current-password" value={senhas.senha_atual}
                            onChange={e => setSenhas(atual => ({ ...atual, senha_atual: e.target.value }))} />
                    </Campo>

                    <Campo rotulo="Nova senha" erro={erroSenhaDo('nova_senha')} dica="Mínimo de 8 caracteres, com pelo menos uma letra e um número.">
                        <input type="password" autoComplete="new-password" value={senhas.nova_senha}
                            onChange={e => setSenhas(atual => ({ ...atual, nova_senha: e.target.value }))} />
                    </Campo>

                    <Campo rotulo="Confirmar nova senha" erro={erroSenhaDo('confirmar')}>
                        <input type="password" autoComplete="new-password" value={senhas.confirmar}
                            onChange={e => setSenhas(atual => ({ ...atual, confirmar: e.target.value }))} />
                    </Campo>
                </div>

                {envioSenha.erro && !envioSenha.campo && (
                    <p className="cta-retorno cta-retorno--erro" role="alert">{envioSenha.erro}</p>
                )}
                {envioSenha.ok && <p className="cta-retorno cta-retorno--ok" role="status">{envioSenha.ok}</p>}

                <div className="cta-form-botoes">
                    <button type="submit" className="btn" disabled={envioSenha.salvando}>
                        {envioSenha.salvando ? 'Salvando...' : 'Alterar senha'}
                    </button>
                </div>
            </form>
        </section>
    )
}

export default ContaDados
