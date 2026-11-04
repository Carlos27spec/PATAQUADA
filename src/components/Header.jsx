import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import logo from "../assets/logo.png";
import { SearchIcon, CartIcon, UserIcon } from "./Icons";
import "./Header.css";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/servicos", label: "Serviços" },
  { to: "/shop", label: "Shop" },
  { to: "/sobre", label: "Sobre" },
  { to: "/contato", label: "Contato" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="header">
      <Link to="/" className="header__logo" onClick={() => setOpen(false)}>
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
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => (isActive ? "is-active" : undefined)}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
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
