import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app-components/AuthContext";
import { Moon, Sun } from "lucide-react";

const navLinkClass = ({ isActive }) =>
  `text-sm font-medium whitespace-nowrap transition-colors ${
    isActive
      ? "text-foreground"
      : "text-foreground/85 hover:text-foreground"
  }`;

const mobileLinkClass =
  "rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-accent-foreground";

const mobileNavLinkClass = ({ isActive }) =>
  `${mobileLinkClass} ${isActive ? "bg-accent text-accent-foreground" : ""}`;

function AppBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState("dark");

  useEffect(() => {
    const storedTheme = localStorage.getItem("quotio_theme") || "dark";
    setThemeMode(storedTheme);
    document.documentElement.classList.toggle("light-theme", storedTheme === "light");
  }, []);

  useEffect(() => {
    function closeMenuOnDesktop() {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("resize", closeMenuOnDesktop);
    return () => window.removeEventListener("resize", closeMenuOnDesktop);
  }, []);

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  function handleThemeChange(mode) {
    setThemeMode(mode);
    localStorage.setItem("quotio_theme", mode);
    document.documentElement.classList.toggle("light-theme", mode === "light");
  }

  function toggleThemeMode() {
    handleThemeChange(themeMode === "dark" ? "light" : "dark");
  }

  function handleLogout() {
    logout();
    setIsMenuOpen(false);
    navigate("/");
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur-md">
      <div className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6">
        <Link to="/" onClick={scrollToTop} className="flex items-center gap-3 text-foreground hover:text-foreground transition-colors">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/45 bg-primary/10 text-primary">
            <svg
              viewBox="0 0 48 48"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="24"
                cy="24"
                r="14"
                stroke="currentColor"
                strokeWidth="3.5"
                opacity="0.95"
              />
              <path
                d="M31 31L38 38"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <path
                d="M20 24.5h8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.9"
              />
            </svg>
          </span>
          <span className="text-base font-semibold tracking-wide">Quotio</span>
        </Link>

        <nav className="hidden items-center justify-center gap-4 sm:gap-6 md:flex">
          <NavLink to="/calculate" onClick={scrollToTop} className={navLinkClass}>
            Cost Calculator
          </NavLink>

          <NavLink to="/recalls" onClick={scrollToTop} className={navLinkClass}>
            Vehicle Recalls
          </NavLink>

          <NavLink to="/reliability" onClick={scrollToTop} className={navLinkClass}>
            Reliability
          </NavLink>

          <NavLink to="/forums" onClick={scrollToTop} className={navLinkClass}>
            Forums
          </NavLink>

          <NavLink to="/about" onClick={scrollToTop} className={navLinkClass}>
            About
          </NavLink>
        </nav>

        <div className="flex items-center justify-end gap-2">
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              role="switch"
              aria-label="Toggle light and dark theme"
              aria-checked={themeMode === "light"}
              onClick={toggleThemeMode}
              className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
                themeMode === "light"
                  ? "border-slate-300 bg-slate-200"
                  : "border-border bg-muted"
              }`}
            >
              <span
                className={`inline-flex h-4 w-4 transform items-center justify-center rounded-full transition-transform ${
                  themeMode === "light" ? "translate-x-6" : "translate-x-1"
                } ${
                  themeMode === "light" ? "bg-white" : "bg-slate-900"
                }`}
              >
                {themeMode === "light" ? (
                  <Sun className="h-2.5 w-2.5 text-yellow-500" aria-hidden="true" />
                ) : (
                  <Moon className="h-2.5 w-2.5 text-slate-100" aria-hidden="true" />
                )}
              </span>
            </button>

            <div className="ml-2 flex items-center gap-2">
              {user ? (
                <>
                  <span className="hidden text-sm font-medium text-muted-foreground lg:inline">
                    {user.email}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Log out
                  </Button>
                </>
              ) : (
                <NavLink to="/login" onClick={scrollToTop} className={navLinkClass}>
                  Login
                </NavLink>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 w-11 p-0 md:hidden"
            aria-label="Open accessibility and navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav-popup"
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            <span className="sr-only">Accessibility menu</span>
            <span className="flex flex-col items-center gap-1">
              <span className="h-0.5 w-4 bg-current" />
              <span className="h-0.5 w-4 bg-current" />
              <span className="h-0.5 w-4 bg-current" />
            </span>
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <div id="mobile-nav-popup" className="fixed inset-0 top-16 z-40 md:hidden" aria-label="Mobile navigation overlay">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setIsMenuOpen(false)}
          />

          <div className="relative z-10 px-4 pb-4 pt-3">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-border/80 bg-card/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 motion-reduce:animate-none">
              <div className="flex flex-col gap-1">
                <NavLink to="/calculate" className={mobileNavLinkClass} onClick={() => { setIsMenuOpen(false); scrollToTop(); }}>
                  Cost Calculator
                </NavLink>
                <NavLink to="/recalls" className={mobileNavLinkClass} onClick={() => { setIsMenuOpen(false); scrollToTop(); }}>
                  Vehicle Recalls
                </NavLink>
                <NavLink to="/reliability" className={mobileNavLinkClass} onClick={() => { setIsMenuOpen(false); scrollToTop(); }}>
                  Reliability
                </NavLink>
                <NavLink to="/forums" className={mobileNavLinkClass} onClick={() => { setIsMenuOpen(false); scrollToTop(); }}>
                  Forums
                </NavLink>
                <NavLink to="/about" className={mobileNavLinkClass} onClick={() => { setIsMenuOpen(false); scrollToTop(); }}>
                  About
                </NavLink>
                {user ? (
                  <Button className="mt-2 w-fit" variant="outline" size="sm" onClick={handleLogout}>
                    Log out
                  </Button>
                ) : (
                  <NavLink to="/login" className={mobileNavLinkClass} onClick={() => { setIsMenuOpen(false); scrollToTop(); }}>
                    Login
                  </NavLink>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-border/70 bg-background/75 p-4">
                <h3 className="text-sm font-semibold text-foreground">Accessibility</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Theme controls are available now. Light mode is a placeholder style and will be expanded.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={themeMode === "dark" ? "default" : "outline"}
                    onClick={() => handleThemeChange("dark")}
                  >
                    Dark Theme
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={themeMode === "light" ? "default" : "outline"}
                    onClick={() => handleThemeChange("light")}
                  >
                    Light Theme
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default AppBar;