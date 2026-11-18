// =====================================================
// REGRAS DE SENHA E NOME DE USUÁRIO
// Usadas pelas telas (cadastro, redefinir senha, minha conta) e pelo
// servidor, para que as duas pontas validem exatamente igual.
// =====================================================

export const REQUISITOS_SENHA = [
    { id: 'tamanho', texto: 'Pelo menos 8 caracteres', ok: (s) => s.length >= 8 },
    { id: 'letra', texto: 'Uma letra', ok: (s) => /[A-Za-zÀ-ÿ]/.test(s) },
    { id: 'numero', texto: 'Um número', ok: (s) => /\d/.test(s) },
]

export const MENSAGEM_SENHA = 'A senha deve ter pelo menos 8 caracteres, uma letra e um número.'

// O bcrypt só considera os primeiros 72 bytes da senha.
export const MENSAGEM_SENHA_LONGA = 'A senha é muito longa. Utilize até 72 caracteres.'

export function senhaAtendeRequisitos(senha) {
    const texto = String(senha ?? '')
    return REQUISITOS_SENHA.every((requisito) => requisito.ok(texto))
}

export function senhaLongaDemais(senha) {
    return new TextEncoder().encode(String(senha ?? '')).length > 72
}

export const REGEX_USUARIO = /^[a-zA-Z0-9_.]{3,20}$/

export const MENSAGEM_USUARIO = 'Use de 3 a 20 caracteres: letras, números, ponto ou _.'
