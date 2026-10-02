import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight, ShieldAlert } from 'lucide-react';
import './Navbar.css';

export interface NavbarProps {
  /** Callback when user clicks 'Launch Investigation' */
  onLaunch?: () => void;
  /** Active theme */
  theme?: 'dark' | 'light';
  /** Toggle theme callback */
  onToggleTheme?: () => void;
  /** Presenter mode trigger callback */
  onOpenPresenter?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLaunch,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  // Monitor window scroll to apply 1px hairline border & subtle backdrop blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle focus trap, Esc keydown, and scroll locking when mobile sheet opens
  useEffect(() => {
    if (!isMenuOpen) return;

    // Lock body scroll
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button initially
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        hamburgerButtonRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && sheetRef.current) {
        const focusableElements = sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  const handleLaunchClick = () => {
    setIsMenuOpen(false);
    if (onLaunch) {
      onLaunch();
    } else {
      window.location.href = '/workspace/ACC_05001';
    }
  };

  return (
    <>
      {/* ── Skip to Main Content Link (Accessibility) ────── */}
      <a href="#main-content" className="skip-to-content mono">
        Skip to main content
      </a>

      {/* ── Top Navigation Bar ────────────────────────────── */}
      <header
        className={`mule-navbar ${isScrolled ? 'is-scrolled' : 'is-transparent'}`}
        role="banner"
      >
        <div className="nav-container">
          {/* Mobile Left: Hamburger Button */}
          <div className="nav-col-left">
            <button
              ref={hamburgerButtonRef}
              type="button"
              className="nav-hamburger-btn"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav-sheet"
            >
              <Menu size={20} aria-hidden="true" />
            </button>

            {/* Desktop Left: Wordmark MULETRACE with tiny amber dot */}
            <div className="nav-brand-desktop">
              <a href="#top" className="nav-wordmark-link" aria-label="MuleTrace Home">
                <span className="nav-wordmark">MULETRACE</span>
                <span className="nav-amber-dot" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Center Column: Wordmark on Mobile (strictly centered) / Links on Desktop */}
          <div className="nav-col-center">
            {/* Mobile Centered Wordmark */}
            <div className="nav-brand-mobile">
              <a href="#top" className="nav-wordmark-link" aria-label="MuleTrace Home">
                <span className="nav-wordmark">MULETRACE</span>
                <span className="nav-amber-dot" aria-hidden="true" />
              </a>
            </div>

            {/* Desktop Center Links */}
            <nav className="nav-links-desktop" aria-label="Primary Navigation">
              <a href="#approach" className="nav-link">
                Platform
              </a>
              <a href="#features" className="nav-link">
                Intelligence
              </a>
              <a href="#workbench" className="nav-link">
                Investigation
              </a>
              <a href="#problem" className="nav-link">
                About
              </a>
            </nav>
          </div>

          {/* Right Column: Mobile Action Icon / Desktop Primary Button */}
          <div className="nav-col-right">
            {/* Mobile Action Icon Button */}
            <button
              type="button"
              className="nav-mobile-action-btn"
              onClick={handleLaunchClick}
              aria-label="Launch Investigation"
              title="Launch Investigation"
            >
              <ShieldAlert size={18} className="text-signal" aria-hidden="true" />
            </button>

            {/* Desktop Primary Button */}
            <button
              type="button"
              className="nav-launch-btn"
              onClick={handleLaunchClick}
            >
              <span>Launch Investigation</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Left Sheet Navigation ──────────────────── */}
      {isMenuOpen && (
        <div
          className="nav-sheet-backdrop"
          onClick={() => {
            setIsMenuOpen(false);
            hamburgerButtonRef.current?.focus();
          }}
          aria-hidden="true"
        />
      )}

      <aside
        id="mobile-nav-sheet"
        ref={sheetRef}
        className={`nav-mobile-sheet ${isMenuOpen ? 'is-open' : ''}`}
        aria-label="Mobile Navigation Menu"
        aria-hidden={!isMenuOpen}
        role="dialog"
        aria-modal="true"
        hidden={!isMenuOpen}
      >
        <div className="sheet-header">
          <div className="sheet-brand">
            <span className="nav-wordmark">MULETRACE</span>
            <span className="nav-amber-dot" aria-hidden="true" />
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="sheet-close-btn"
            onClick={() => {
              setIsMenuOpen(false);
              hamburgerButtonRef.current?.focus();
            }}
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="sheet-links" aria-label="Mobile Menu Links">
          <a href="#approach" className="sheet-link" onClick={handleLinkClick}>
            <span className="sheet-link-num mono">01</span>
            <span className="sheet-link-text">Platform</span>
          </a>
          <a href="#features" className="sheet-link" onClick={handleLinkClick}>
            <span className="sheet-link-num mono">02</span>
            <span className="sheet-link-text">Intelligence</span>
          </a>
          <a href="#workbench" className="sheet-link" onClick={handleLinkClick}>
            <span className="sheet-link-num mono">03</span>
            <span className="sheet-link-text">Investigation</span>
          </a>
          <a href="#problem" className="sheet-link" onClick={handleLinkClick}>
            <span className="sheet-link-num mono">04</span>
            <span className="sheet-link-text">About</span>
          </a>
        </nav>

        <div className="sheet-footer">
          <button
            type="button"
            className="nav-launch-btn sheet-launch-btn"
            onClick={handleLaunchClick}
          >
            <ShieldAlert size={16} aria-hidden="true" />
            <span>Launch Investigation</span>
          </button>
          <div className="sheet-footnote mono">
            FORENSIC AML GRAPH ENGINE · LIVE
          </div>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
