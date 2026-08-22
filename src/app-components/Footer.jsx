import { Link } from "react-router-dom";

function Footer() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <footer className="border-t border-border/70 bg-background/70 backdrop-blur-sm">
      <div className="w-full px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" onClick={scrollToTop} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" onClick={scrollToTop} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link to="/calculate" onClick={scrollToTop} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Cost Calculator
                </Link>
              </li>
              <li>
                <Link to="/recalls" onClick={scrollToTop} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Vehicle Recalls
                </Link>
              </li>
              <li>
                <Link to="/reliability" onClick={scrollToTop} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Reliability
                </Link>
              </li>
              <li>
                <Link to="/forums" onClick={scrollToTop} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Forums
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-foreground">Contact</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Questions or feedback? Get in touch with us.
            </p>
            <a
              href="mailto:contact@quotio.com"
              className="inline-flex rounded-md border border-primary/50 bg-primary/20 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/30"
            >
              Contact Us
            </a>
          </div>
        </div>

        <div className="my-8 border-t border-border/70"></div>

        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">&copy; 2026 Quotio. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" onClick={scrollToTop} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
            <Link to="/terms" onClick={scrollToTop} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
