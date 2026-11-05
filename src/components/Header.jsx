import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.png";
import { SearchIcon, CartIcon, UserIcon } from "./Icons";
import "./Header.css";

const links = [
  { to: "/", label: "Home" },
  { to: "/servicos", label: "Serviços" },
  { to: "/shop", label: "Shop" },
  { to: "/#sobre", label: "Sobre" },
  { to: "/#contato", label: "Contato" },
];

function separar(to) {
  const [path, h = ""] = to.split("#");
  return { path, hash: h ? `#${h}` : "" };
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();

  const estaAtivo = (to) => {
    const alvo = separar(to);
    return pathname === alvo.path && hash === alvo.hash;
  };

  const aoClicar = (to) => {
    setOpen(false);
    const alvo = separar(to);

    if (pathname !== alvo.path) return;

    if (alvo.hash) {
      document
        .getElementById(alvo.hash.slice(1))
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header className="header">
      <Link to="/" className="header__logo" onClick={() => aoClicar("/")}>
        <img src={logo} alt="PataQuada" />
      </Link>

      <button
        className="header__toggle"
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls="menu-principal"
        onClick={() => setOpen((o) => !o)}
      >
        <span /><span /><span />
      </button>

      <div id="menu-principal" className={`header__menu ${open ? "is-open" : ""}`}>
        <nav className="header__nav" aria-label="Principal">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={estaAtivo(to) ? "is-active" : undefined}
              onClick={() => aoClicar(to)}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="header__actions">
          <Link to="/busca" aria-label="Buscar"><SearchIcon /></Link>
          <Link to="/carrinho" aria-label="Carrinho"><CartIcon /></Link>
          <Link to="/conta" aria-label="Minha conta"><UserIcon /></Link>
        </div>
      </div>
    </header>
  );
}