import { useEffect, useState } from 'react'

// =====================================================
// DADOS PÚBLICOS DA EMPRESA (GET /api/empresa)
// Nome, e-mail, WhatsApp, redes sociais e frete grátis, vindos do banco
// (Dados da empresa e Configurações da loja). Busca uma vez só por visita.
// =====================================================

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

let promessa = null

export function carregarEmpresa() {
    if (!promessa) {
        promessa = fetch(`${API_URL}/api/empresa`)
            .then(resposta => (resposta.ok ? resposta.json() : null))
            .then(resposta => resposta?.dados ?? {})
            .catch(() => {
                // Sem servidor: tenta de novo na próxima vez.
                promessa = null
                return {}
            })
    }

    return promessa
}

// null enquanto carrega; depois, o objeto com os dados.
export function useEmpresa() {
    const [empresa, setEmpresa] = useState(null)

    useEffect(() => {
        let vivo = true

        carregarEmpresa().then(dados => {
            if (vivo) setEmpresa(dados)
        })

        return () => {
            vivo = false
        }
    }, [])

    return empresa
}

// Link do WhatsApp da empresa com uma mensagem pronta (ou null sem número).
export function linkWhatsapp(numero, mensagem = '') {
    const digitos = String(numero ?? '').replace(/\D/g, '')

    if (!digitos) {
        return null
    }

    return mensagem
        ? `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`
        : `https://wa.me/${digitos}`
}
