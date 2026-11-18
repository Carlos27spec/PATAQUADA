// =====================================================
// ROTAS - DADOS PÚBLICOS DA EMPRESA (tabela dados_pataquada)
//
// GET /api/empresa -> nome, e-mail, WhatsApp, redes sociais e o valor do
// frete grátis, para o site. Só devolve campos públicos e só as redes
// cadastradas.
// =====================================================

import express from 'express';
import { db } from '../config/database.js';
import { responderErro } from '../utils/helpers.js';

function digitos(valor) {
    return String(valor ?? '').replace(/\D/g, '');
}

// Aceita endereço completo ("https://instagram.com/x"), "@x" ou só "x".
function linkDaRede(valor, base) {
    const texto = String(valor ?? '').trim();

    if (!texto) {
        return null;
    }

    if (/^https?:\/\//i.test(texto)) {
        return texto;
    }

    // "instagram.com/x" ou "www.site.com.br": só falta o https://
    if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(texto) && !texto.startsWith('@')) {
        return `https://${texto}`;
    }

    return base(texto.replace(/^@/, ''));
}

// Número do WhatsApp só com dígitos e com o 55 do Brasil.
function numeroWhatsapp(numero) {
    let d = digitos(numero);

    if (d.length === 10 || d.length === 11) {
        d = `55${d}`;
    }

    return d.length >= 12 && d.length <= 13 ? d : null;
}

function configuracao(chave) {
    return db.prepare(`
        SELECT valor FROM configuracoes_pataquada WHERE LOWER(chave) = ?
    `).get(chave)?.valor ?? null;
}

const REDES = [
    { campo: 'instagram', nome: 'Instagram', base: u => `https://instagram.com/${u}` },
    { campo: 'facebook', nome: 'Facebook', base: u => `https://facebook.com/${u}` },
    { campo: 'tiktok', nome: 'TikTok', base: u => `https://www.tiktok.com/@${u}` },
    { campo: 'youtube', nome: 'YouTube', base: u => `https://youtube.com/@${u}` },
    { campo: 'site', nome: 'Site', base: u => `https://${u}` }
];

export default function criarRotasEmpresa() {
    const router = express.Router();

    router.get('/api/empresa', (req, res) => {
        try {
            const dados = db.prepare(`
                SELECT nome_fantasia, email, telefone, whatsapp,
                       instagram, facebook, tiktok, youtube, site
                FROM dados_pataquada
                WHERE id = 1
            `).get() ?? {};

            const redes = [];

            // WhatsApp: whatsapp_vendas (Configurações da loja), se preenchido;
            // senão o WhatsApp ou o telefone de Dados da empresa.
            const whatsapp = numeroWhatsapp(
                configuracao('whatsapp_vendas') || dados.whatsapp || dados.telefone
            );

            if (whatsapp) {
                redes.push({ tipo: 'whatsapp', nome: 'WhatsApp', url: `https://wa.me/${whatsapp}` });
            }

            // Frete grátis (centavos) de Configurações da loja; 0 = sem frete grátis.
            const freteGratis = Number(configuracao('frete_gratis_a_partir_de'));

            for (const rede of REDES) {
                const url = linkDaRede(dados[rede.campo], rede.base);

                if (url) {
                    redes.push({ tipo: rede.campo, nome: rede.nome, url });
                }
            }

            return res.json({
                sucesso: true,
                dados: {
                    nome: dados.nome_fantasia || 'PataQuada',
                    email: dados.email || null,
                    whatsapp,
                    frete_gratis_a_partir_de:
                        Number.isFinite(freteGratis) && freteGratis >= 0 ? freteGratis : 0,
                    redes
                }
            });
        } catch (erro) {
            return responderErro(res, erro, 'Erro ao consultar os dados da empresa.');
        }
    });

    return router;
}
