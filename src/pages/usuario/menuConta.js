import { linkWhatsapp } from '../../utils/empresa.js'

// Rota da tela de login do site (para quem ainda não entrou).
export const ROTA_LOGIN = '/login'

// Endereço base da área do cliente.
export const BASE_CONTA = '/usuarios'

// Mensagem enviada ao WhatsApp em "Ajuda" e "Suporte".
const MENSAGEM_SUPORTE = 'Olá! Preciso de ajuda com a minha conta na PataQuada.'

// numero: WhatsApp da empresa (useEmpresa().whatsapp), vindo do banco.
export function linkSuporte(numero) {
    return linkWhatsapp(numero, MENSAGEM_SUPORTE)
}

// Itens do menu lateral (as rotas ficam em App.jsx, dentro de /usuarios).
export const ITENS_MENU = [
    { chave: 'inicio', titulo: 'Início', icone: 'fa-house', to: BASE_CONTA, fim: true },
    { chave: 'pedidos', titulo: 'Meus Pedidos', icone: 'fa-list-ul', to: `${BASE_CONTA}/pedidos` },
    { chave: 'carrinho', titulo: 'Carrinho', icone: 'fa-cart-shopping', to: '/carrinho' },
    { chave: 'dados', titulo: 'Minha Conta', icone: 'fa-user', to: `${BASE_CONTA}/dados` },
    { chave: 'endereco', titulo: 'Endereço', icone: 'fa-location-dot', to: `${BASE_CONTA}/endereco` }
]
