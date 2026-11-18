// =====================================================
// IMAGENS VINDAS DO BANCO DE DADOS
//
// O banco guarda SOMENTE o nome do arquivo (ex.: "racao-premium.png").
// O arquivo fica em src/images/<pasta>/, uma pasta para cada tipo:
//
//   src/images/produtos/       -> produtos.imagem, itens_pedido.imagem,
//                                 produto_imagens.caminho_imagem
//   src/images/categorias/     -> categorias_produto.imagem
//   src/images/servicos/       -> servicos.imagem
//   src/images/pets/           -> pets.imagem
//   src/images/empresa/        -> dados_pataquada.logo e .favicon
//   src/images/planos/         -> planos (a tabela ainda não tem coluna de imagem)
//   src/images/consultas/      -> tipos_consulta (ainda não tem coluna de imagem)
//   src/images/profissionais/  -> profissionais (ainda não tem coluna de imagem)
//
// Regras:
//   - Maiúsculas/minúsculas e acentos são ignorados.
//   - A extensão é opcional no banco: "racao" encontra "racao.png".
//   - Se vier um caminho ("img/racao.png"), só o nome do arquivo é usado.
//   - Se não houver nome ou o arquivo não existir, usa a imagem padrão.
// =====================================================

import patinha from '../assets/paw.png';

export const PASTAS_IMAGEM = {
    produtos: 'produtos',
    categorias: 'categorias',
    servicos: 'servicos',
    pets: 'pets',
    empresa: 'empresa',
    planos: 'planos',
    consultas: 'consultas',
    profissionais: 'profissionais'
};

// Todos os arquivos das subpastas, já com a URL gerada pelo Vite.
const arquivos = import.meta.glob(
    './*/*.{png,PNG,jpg,JPG,jpeg,JPEG,webp,WEBP,svg,SVG,avif,AVIF,gif,GIF}',
    {
        eager: true,
        query: '?url',
        import: 'default'
    }
);

function normalizar(texto) {
    return String(texto)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

// "Racao Premium.PNG" -> { nome: "racao premium.png", semExtensao: "racao premium" }
function chaves(nomeArquivo) {
    const nome = normalizar(nomeArquivo);
    const ponto = nome.lastIndexOf('.');

    return {
        nome,
        semExtensao: ponto > 0 ? nome.slice(0, ponto) : nome
    };
}

// pasta -> Map(nome normalizado -> url)
const indice = new Map();

for (const [caminho, url] of Object.entries(arquivos)) {
    // caminho = "./produtos/racao.png"
    const [, pasta, arquivo] = caminho.split('/');
    const { nome, semExtensao } = chaves(arquivo);

    if (!indice.has(pasta)) {
        indice.set(pasta, new Map());
    }

    const daPasta = indice.get(pasta);

    daPasta.set(nome, url);

    // Sem extensão: o primeiro arquivo encontrado com esse nome vale.
    if (!daPasta.has(semExtensao)) {
        daPasta.set(semExtensao, url);
    }
}

/**
 * URL da imagem de um item vindo do banco.
 *
 * @param {string} pasta   Uma das PASTAS_IMAGEM (ex.: 'produtos').
 * @param {string} nome    Valor da coluna no banco (só o nome do arquivo).
 * @param {string} padrao  Imagem usada quando não houver arquivo.
 */
export function imagemDe(pasta, nome, padrao = patinha) {
    if (!nome) {
        return padrao;
    }

    const texto = String(nome).trim();

    // Endereço completo (imagem hospedada fora do projeto): usa como está.
    if (/^(https?:|data:|blob:)/i.test(texto)) {
        return texto;
    }

    // Só o nome do arquivo, mesmo se vier um caminho.
    const arquivo = texto.split(/[\\/]/).pop();
    const daPasta = indice.get(pasta);

    if (!daPasta || !arquivo) {
        return padrao;
    }

    const { nome: chave, semExtensao } = chaves(arquivo);

    return daPasta.get(chave) ?? daPasta.get(semExtensao) ?? padrao;
}

export const imagemPadrao = patinha;
