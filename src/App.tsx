import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, X, Layers } from "lucide-react";
const Home = lazy(() => import("./pages/Home"));
const Tools = lazy(() => import("./pages/Tools"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Studio = lazy(
  () => import("./features/document-intelligence/IntelligencePage"),
);
const Privacy = lazy(() => import("./pages/Privacy"));
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="wrap page-section">
        <h1>Something didn’t load.</h1>
        <p>
          Your original files are unchanged. Reload to start a fresh workspace.
        </p>
        <a href="/">Reload Forma</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const [pending, setPending] = useState<File[]>([]),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  const mounted = useRef(false);
  const configured = import.meta.env.VITE_GITHUB_URL as string | undefined;
  const github =
    configured && /^https:\/\/github\.com\//.test(configured)
      ? configured
      : undefined;
  useEffect(() => {
    setMenu(false);
    document.title =
      location.pathname === "/"
        ? "Forma — Documents made simple."
        : "Forma — Smart PDF Studio";
    if (location.hash) {
      requestAnimationFrame(() =>
        document.getElementById(location.hash.slice(1))?.scrollIntoView(),
      );
    } else {
      window.scrollTo(0, 0);
      if (mounted.current) document.getElementById("main")?.focus();
    }
    mounted.current = true;
  }, [location.pathname, location.hash]);
  return (
    <ErrorBoundary>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header wrap">
        <Link to="/" className="logo" aria-label="Forma home">
          <Layers size={27} strokeWidth={1.7} />
          forma<span>.</span>
        </Link>
        <button
          className="menu-toggle"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
        <nav className={menu ? "nav open" : "nav"} aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/tools">All Tools</NavLink>
          <Link to="/#how-it-works">How It Works</Link>
          <NavLink to="/studio">Read & extract</NavLink>
        </nav>
        {github ? (
          <a
            className="github-link"
            href={github}
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowUpRight size={15} />
          </a>
        ) : (
          <span className="header-note">
            <span className="tiny-dot" /> A little less paperwork.
          </span>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        <Suspense
          fallback={
            <div className="wrap page-section" role="status">
              Opening your studio…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home setPending={setPending} />} />
            <Route path="/tools" element={<Tools />} />
            <Route
              path="/tools/:id"
              element={
                <Workspace
                  key={location.pathname}
                  pending={pending}
                  clearPending={() => setPending([])}
                />
              }
            />
            <Route path="/ai" element={<Studio />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route
              path="*"
              element={
                <section className="wrap page-section">
                  <h1>This page got lost.</h1>
                  <Link to="/tools">Find your next tool</Link>
                </section>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer className="footer wrap">
        <div>
          <Link to="/" className="logo">
            forma<span>.</span>
          </Link>
          <p>A little less paperwork. A little more possibility.</p>
        </div>
        <div className="footer-links">
          <Link to="/tools">All tools</Link>
          <Link to="/privacy">Privacy</Link>
          {github && <a href={github}>GitHub</a>}
          <span>© {new Date().getFullYear()} Forma</span>
        </div>
      </footer>
    </ErrorBoundary>
  );
}
