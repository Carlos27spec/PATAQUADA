import { Link } from "react-router-dom";
import logo from "../assets/logo-footer.png";
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
    <footer className="footer">
      <PawIcon className="footer__paw footer__paw--top" />
      <PawIcon className="footer__paw footer__paw--brand" />
      <PawIcon className="footer__paw footer__paw--left" />
      <PawIcon className="footer__paw footer__paw--right" />

      <div className="footer__content">
        <div className="footer__brand">
          <img src={logo} alt="PataQuada" />
          <p>
            Tudo o que seu pet precisa,
            <br />
            em um só lugar!
          </p>
        </div>

        <div className="footer__info">
          <nav className="footer__nav" aria-label="Rodapé">
            {links.map(({ to, label }) => (
              <Link key={to} to={to}>{label}</Link>
            ))}
          </nav>

          <div className="footer__social">
            {socials.map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                <Icon />
              </a>
            ))}
          </div>

          <p className="footer__credit">
            <HeartIcon /> Site desenvolvido por Synthex
          </p>
        </div>
      </div>

      <svg className="footer__wave" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 40C150 0 280 20 420 50S700 30 900 40s380 40 540-30V140H0z" fill="#fbcd91" />
      </svg>
    </footer>
  );
}
