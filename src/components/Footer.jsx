import { Link } from "react-router-dom";
import insignea from "../assets/Insignea-mini.png";
import { InstagramIcon, FacebookIcon, YoutubeIcon, HeartIcon, PawIcon } from "./Icons";
import "./Footer.css";

const links = [
  { to: "/", label: "Home" },
  { to: "/servicos", label: "Serviços" },
  { to: "/shop", label: "Shop" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
];

const socials = [
  { href: "https://instagram.com/", label: "Instagram", Icon: InstagramIcon },
  { href: "https://facebook.com/", label: "Facebook", Icon: FacebookIcon },
  { href: "https://youtube.com/", label: "YouTube", Icon: YoutubeIcon },
];

export default function Footer() {
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

            <div className="footer-social">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                >
                  <Icon />
                </a>
              ))}
            </div>
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