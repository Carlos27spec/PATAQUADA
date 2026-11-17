// Rota da tela de login do site (para quem ainda não entrou).
export const ROTA_LOGIN = '/login'

// Endereço base da área do cliente.
export const BASE_CONTA = '/usuarios'

// Mensagem enviada ao WhatsApp em "Ajuda" e "Suporte".
const MENSAGEM_SUPORTE = 'Olá! Preciso de ajuda com a minha conta na PataQuada.'

// Mesmo número configurado no .env (VITE_WHATSAPP_NUMERO) que o
// site já usa nos serviços e consultas.
export function linkSuporte() {
    const numero = String(import.meta.env.VITE_WHATSAPP_NUMERO || '').replace(/\D/g, '')

    return numero
        ? `https://wa.me/${numero}?text=${encodeURIComponent(MENSAGEM_SUPORTE)}`
        : null
}

// Itens do menu lateral. As telas de Meus Pedidos, Minha Conta e
// Endereço serão feitas nas próximas etapas.
export const ITENS_MENU = [
    { chave: 'inicio', titulo: 'Início', icone: 'fa-house', to: BASE_CONTA, fim: true },
    { chave: 'pedidos', titulo: 'Meus Pedidos', icone: 'fa-list-ul', to: `${BASE_CONTA}/pedidos` },
    { chave: 'carrinho', titulo: 'Carrinho', icone: 'fa-cart-shopping', to: '/carrinho' },
    { chave: 'dados', titulo: 'Minha Conta', icone: 'fa-user', to: `${BASE_CONTA}/dados` },
    { chave: 'endereco', titulo: 'Endereço', icone: 'fa-location-dot', to: `${BASE_CONTA}/endereco` }
]
