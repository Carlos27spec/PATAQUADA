import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import insignea from "../assets/Insignea-mini.png";
import {
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
  TiktokIcon,
  WhatsappIcon,
  SiteIcon,
  HeartIcon,
  PawIcon,
} from "./Icons";
import "./Footer.css";
import { carregarEmpresa } from "../utils/empresa.js";


// Ícone de cada rede (o "tipo" vem de /api/empresa).
const ICONES = {
  whatsapp: WhatsappIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
  site: SiteIcon,
};

// As redes vêm de dados_pataquada; só aparecem as que estão cadastradas.
// Guardadas em memória para não buscar de novo a cada troca de página.
let redesEmCache = null;

function useRedesSociais() {
  const [redes, setRedes] = useState(redesEmCache ?? []);

  useEffect(() => {
    if (redesEmCache) return undefined;

    let ativo = true;

    carregarEmpresa()
      .then((dados) => {
        const lista = (dados?.redes ?? []).filter((rede) => ICONES[rede.tipo]);
        redesEmCache = lista;
        if (ativo) setRedes(lista);
      })
      .catch(() => {
        // Sem servidor: o rodapé aparece sem as redes.
      });

    return () => {
      ativo = false;
    };
  }, []);

  return redes;
}

const links = [
  { to: "/", label: "Home" },
  { to: "/servicos", label: "Serviços" },
  { to: "/shop", label: "Shop" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
];

export default function Footer() {
  const redes = useRedesSociais();

  return (
    <footer className="site-footer">
      <PawIcon className="footer-paw footer-paw--top" />
      <PawIcon className="footer-paw footer-paw--left" />
      <PawIcon className="footer-paw footer-paw--right" />

      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="footer-brand-content">
              <PawIcon className="footer-paw footer-paw--brand" />

              <div className="footer-logo">
                <img src={insignea} alt="" />
                <span>
                  Pata<span className="logo-destaque">Quada</span>
                </span>
              </div>

              <p className="footer-description">
                Tudo o que seu pet precisa,
                <br />
                em um só lugar!
              </p>
            </div>
          </div>

          <div className="footer-content">
            <nav className="footer-nav" aria-label="Rodapé">
              {links.map(({ to, label }) => (
                <Link key={to} to={to}>
                  {label}
                </Link>
              ))}
            </nav>

            {redes.length > 0 && (
              <div className="footer-social">
                {redes.map(({ tipo, nome, url }) => {
                  const Icone = ICONES[tipo];

                  return (
                    <a
                      key={tipo}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={nome}
                      title={nome}
                    >
                      <Icone />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-heart">
            <HeartIcon />
          </span>
          Site desenvolvido por Synthex
        </div>
      </div>

      <svg
        className="footer-wave"
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 40C150 0 280 20 420 50S700 30 900 40s380 40 540-30V140H0z" />
      </svg>
    </footer>
  );
}