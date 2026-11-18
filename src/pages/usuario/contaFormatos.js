// Formatações usadas nas telas da área do cliente.

// "2026-11-17 23:30:28" -> "17/11/2026"
export function formatarData(texto) {
    const [ano, mes, dia] = String(texto ?? '').slice(0, 10).split('-')

    return ano && mes && dia ? `${dia}/${mes}/${ano}` : '—'
}

// "11987654321" -> "(11) 98765-4321"
export function formatarTelefone(valor) {
    const d = String(valor ?? '').replace(/\D/g, '').slice(0, 11)

    if (d.length <= 2) return d

    const corte = d.length > 10 ? 7 : 6

    return d.length > corte
        ? `(${d.slice(0, 2)}) ${d.slice(2, corte)}-${d.slice(corte)}`
        : `(${d.slice(0, 2)}) ${d.slice(2)}`
}

// "12345678909" -> "123.456.789-09"
export function formatarCpf(valor) {
    return String(valor ?? '')
        .replace(/\D/g, '')
        .slice(0, 11)
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// "01310100" -> "01310-100"
export function formatarCep(valor) {
    const d = String(valor ?? '').replace(/\D/g, '').slice(0, 8)

    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}
