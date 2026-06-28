import { useEffect, useRef, useState } from "react";
import logo from "@/assets/logo.png";

const HERO_SLIDES = [
  { src: "/ogscan-splash-banner.jpg", label: "Platform", accent: "#2F80FF" },
  { src: "/ogscan-shot-screener.jpg", label: "Screener", accent: "#14E0C8" },
  { src: "/ogscan-shot-scanner.jpg", label: "Scanner", accent: "#9945FF" },
  { src: "/ogscan-shot-track.jpg", label: "Tracking", accent: "#FFC53D" },
];

const SHOWCASE_ITEMS = [
  { src: "/ogscan-shot-deck.jpg", label: "Dashboard", caption: "Command center", accent: "#2F80FF" },
  { src: "/ogscan-shot-screener.jpg", label: "Screener", caption: "Live pairs", accent: "#14E0C8" },
  { src: "/ogscan-shot-mobile.jpg", label: "Mobile", caption: "On the go", accent: "#9945FF" },
  { src: "/ogscan-shot-track.jpg", label: "Tracker", caption: "Smart money", accent: "#FFC53D" },
];

const BRAND = "OG Scan";
const LINKS = {
  app: "/ORBITX_DEX",
  signin: "/auth?mode=signin",
  signup: "/auth?mode=signup",
  telegram: "https://t.me/ogscan",
  x: "https://x.com/ogscan",
  privacy: "/privacy",
  terms: "/terms",
};

const FEATURES = [
  { title: "Multi-chain scanner", desc: "Forensic scanning across 16 blockchains with OG Score, holder quality, and risk flags.", img: "/ogscan-shot-scanner.jpg", tag: "Scan", accent: "#2F80FF" },
  { title: "Live screener", desc: "Orderbook-style screener with trending pairs, launches, and advanced filters.", img: "/ogscan-shot-screener.jpg", tag: "Trade", accent: "#14E0C8" },
  { title: "Smart money tracker", desc: "Top wallet PnL, win rate, timing patterns. KOL labels mapped in real-time.", img: "/ogscan-shot-track.jpg", tag: "Alpha", accent: "#9945FF" },
  { title: "Portfolio dashboard", desc: "Unified holdings across every wallet. See everything in one live view.", img: "/ogscan-shot-deck.jpg", tag: "Portfolio", accent: "#FFC53D" },
  { title: "AI analyst", desc: "Natural language queries. Ask anything about any token or wallet.", img: "/ogscan-splash-banner.jpg", tag: "AI", accent: "#14a0ff" },
  { title: "Reports & exports", desc: "Generate branded PDF reports with charts, metrics, and AI insights.", img: "/ogscan-shot-deck.jpg", tag: "Reports", accent: "#ff6bd0" },
];

export default function Splash() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const [ready, setReady] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    const cycle = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 5000);
    return () => { clearTimeout(t); clearInterval(cycle); };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      document.querySelector(".sp-nav")?.classList.toggle("scrolled", window.scrollY > 24);
    };
    const onMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div className="sp">
      <style>{css}</style>

      <nav className="sp-nav">
        <a className="sp-brand" href="/">
          <span className="sp-mark" />
          {BRAND}
        </a>
        <div className="sp-links">
          <a href="#features">Features</a>
          <a href="#platform">Platform</a>
          <a href="#ecosystem">Ecosystem</a>
        </div>
        <div className="sp-nav-cta">
          <a className="btn-ghost sm" href={LINKS.signin}>Sign in</a>
          <a className="sp-cta" href={LINKS.signup}>Get started</a>
        </div>
      </nav>

      <header className={`sp-hero ${ready ? "sp-hero-ready" : ""}`} ref={heroRef}>
        <div className="sp-hero-bg">
          {HERO_SLIDES.map((s, i) => (
            <div
              key={s.src}
              className={`sp-hero-slide ${i === slide ? "is-active" : ""}`}
              style={{ backgroundImage: `url(${s.src})` }}
            />
          ))}
          <div className="sp-hero-vignette" />
          <div className="sp-hero-grid-overlay" />
        </div>

        <div className="sp-hero-particles">
          {Array.from({ length: 50 }).map((_, i) => (
            <span
              key={i}
              className="sp-particle"
              style={{
                "--i": i,
                "--px": Math.random() * 100 + "%",
                "--py": Math.random() * 100 + "%",
                "--d": 6 + Math.random() * 14 + "s",
                "--dl": -(Math.random() * 10) + "s",
              }}
            />
          ))}
        </div>

        <div className="sp-hero-content">
          <div className="sp-hero-inner" style={{ "--mx": mouse.x * 14 + "px", "--my": mouse.y * 10 + "px" }}>
            <div className="sp-badge">
              <img src={logo} alt="" width={24} height={24} className="sp-badge-logo" />
              <span>{BRAND}</span>
              <span className="sp-badge-dot" />
              <span className="sp-badge-pulse" />
            </div>

            <h1 className="sp-h1">
              On-chain intelligence,
              <br />
              <span className="sp-h1-gradient">reimagined.</span>
            </h1>

            <p className="sp-lead">
              Scan tokens, analyze wallets, trade, launch projects, and harness AI — across 16 blockchains in one platform.
            </p>

            <div className="sp-hero-actions">
              <a className="btn-primary lg" href={LINKS.signup}>
                Start scanning <span className="btn-arrow">→</span>
              </a>
              <a className="btn-glass" href={LINKS.app}>
                <span className="btn-glass-glare" />
                Launch app
              </a>
            </div>

            <div className="sp-hero-meta">
              <div className="sp-meta-item"><strong>16</strong> chains</div>
              <div className="sp-meta-divider" />
              <div className="sp-meta-item"><strong>AI</strong> powered</div>
              <div className="sp-meta-divider" />
              <div className="sp-meta-item"><strong>Real-time</strong></div>
            </div>
          </div>

          <div className="sp-showcase">
            <div className="sp-showcase-stage">
              {SHOWCASE_ITEMS.map((item, i) => {
                const next = (i + 1) % SHOWCASE_ITEMS.length;
                return (
                  <div
                    key={item.src}
                    className={`sp-showcase-item ${i === slide ? "is-active" : ""} ${next === slide ? "is-next" : ""}`}
                    style={{ "--accent": item.accent }}
                  >
                    <div className="sp-showcase-device">
                      <div className="sp-device-bar">
                        <span className="sp-device-dot" />
                        <span className="sp-device-dot" />
                        <span className="sp-device-dot" />
                      </div>
                      <img src={item.src} alt={item.label} className="sp-showcase-img" loading="lazy" />
                      <div className="sp-showcase-shine" />
                    </div>
                    <div className="sp-showcase-label">
                      <strong>{item.label}</strong>
                      <span>{item.caption}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="sp-showcase-pips">
              {SHOWCASE_ITEMS.map((_, i) => (
                <button
                  key={i}
                  className={`sp-pip ${i === slide ? "is-active" : ""}`}
                  onClick={() => setSlide(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="scroll-hint" aria-hidden><span /></div>
      </header>

      <div className="sp-marquee" aria-hidden>
        <div className="sp-marquee-track">
          {[...Array(2)].map((_, i) => (
            <span key={i} className="sp-marquee-content">
              Token discovery · Wallet forensics · Smart money · Live screener · Fair launches · AI analyst · Prediction markets · Voice & Spaces · Degen Tower · APIs · Webhooks ·
            </span>
          ))}
        </div>
      </div>

      <section id="features" className="sp-sec sp-features-sec">
        <div className="sp-section-header reveal">
          <span className="sp-kicker">Platform</span>
          <h2 className="sp-h2">One platform. Every tool.</h2>
          <p className="sp-body">Stop switching between 8 disconnected apps. OG Scan unifies scanning, trading, intelligence, and community.</p>
        </div>
        <div className="sp-features-grid">
          {FEATURES.map((f, i) => (
            <article key={f.title} className="sp-feature-card reveal" style={{ "--delay": i * 80 + "ms" } as Record<string, string>}>
              <div className="sp-feature-media">
                <img src={f.img} alt={f.title} loading="lazy" />
                <div className="sp-feature-media-overlay" />
                <span className="sp-feature-tag" style={{ background: f.accent }}>{f.tag}</span>
              </div>
              <div className="sp-feature-body">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
              <div className="sp-feature-glow" style={{ background: f.accent }} />
            </article>
          ))}
        </div>
      </section>

      <section className="sp-strip-sec" aria-label="Platform preview">
        <div className="sp-strip-track">
          {[...SHOWCASE_ITEMS, ...SHOWCASE_ITEMS].map((item, i) => (
            <div key={`${item.label}-${i}`} className="sp-strip-card">
              <img src={item.src} alt={item.label} className="sp-strip-img" loading="lazy" />
              <div className="sp-strip-border-glow" />
            </div>
          ))}
        </div>
      </section>

      <section className="sp-stats-sec">
        <div className="sp-stats-grid reveal">
          <div className="sp-stat">
            <strong className="sp-stat-num">16</strong>
            <span>Blockchains</span>
          </div>
          <div className="sp-stat">
            <strong className="sp-stat-num">AI</strong>
            <span>Natural language</span>
          </div>
          <div className="sp-stat">
            <strong className="sp-stat-num">∞</strong>
            <span>Scans</span>
          </div>
          <div className="sp-stat">
            <strong className="sp-stat-num">0ms</strong>
            <span>Latency</span>
          </div>
        </div>
      </section>

      <section id="ecosystem" className="sp-sec sp-eco-sec reveal">
        <div className="sp-section-header">
          <span className="sp-kicker">Ecosystem</span>
          <h2 className="sp-h2">Built. Shipped. Live.</h2>
        </div>
        <div className="sp-eco-grid">
          <a className="sp-eco-card" href={LINKS.app}>
            <div className="sp-eco-icon">
              <img src={logo} alt="" />
            </div>
            <div className="sp-eco-content">
              <h3>OG Scan</h3>
              <p>Multi-chain scanner, wallet forensics, AI analyst, PDF reports, and live market data.</p>
            </div>
            <span className="sp-eco-arrow">→</span>
          </a>
        </div>
      </section>

      <section className="sp-cta-sec reveal">
        <div className="sp-cta-inner">
          <h2>The last platform you&apos;ll ever need for on-chain.</h2>
          <p>Join the community. Start scanning. Build your edge.</p>
          <div className="sp-cta-actions">
            <a className="btn-primary lg" href={LINKS.signup}>
              Create account <span className="btn-arrow">→</span>
            </a>
            <a className="btn-ghost lg" href={LINKS.telegram} target="_blank" rel="noreferrer">
              Join Telegram
            </a>
          </div>
        </div>
      </section>

      <footer className="sp-foot">
        <div className="sp-foot-inner">
          <div className="sp-foot-brand">
            <a className="sp-brand" href="/">
              <span className="sp-mark" />
              {BRAND}
            </a>
            <p className="sp-foot-tagline">On-chain intelligence, reimagined.</p>
          </div>
          <div className="sp-foot-links">
            <a href={LINKS.app}>OG Scan</a>
            <a href={LINKS.telegram} target="_blank" rel="noreferrer">Telegram</a>
            <a href={LINKS.x} target="_blank" rel="noreferrer">X</a>
            <a href={LINKS.signin}>Sign in</a>
            <a href={LINKS.privacy}>Privacy</a>
            <a href={LINKS.terms}>Terms</a>
          </div>
          <div className="sp-foot-bottom">
            <span>© {new Date().getFullYear()} {BRAND}. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const css = `
.sp{--bg:#02050a;--ink:#ffffff;--muted:#8b95a8;--line:rgba(255,255,255,0.08);--accent:#2F80FF;--accent2:#9945FF;
  background:var(--bg);color:var(--ink);overflow-x:hidden;
  font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',Inter,'Plus Jakarta Sans',sans-serif;-webkit-font-smoothing:antialiased;margin:0;padding:0;}
.sp a{text-decoration:none;color:inherit;}
.sp *{box-sizing:border-box;}

/* NAV */
.sp-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px clamp(18px,5vw,56px);transition:all .4s;}
.sp-nav.scrolled{background:rgba(2,5,10,.78);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--line);}
.sp-brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.14em;font-size:15px;color:#fff;}
.sp-mark{width:18px;height:18px;border-radius:6px;background:conic-gradient(from 140deg,var(--accent),var(--accent2),var(--accent));box-shadow:0 6px 24px -6px rgba(47,128,255,.7);}
.sp-links{display:flex;gap:28px;font-size:13.5px;color:var(--muted);}
.sp-links a{position:relative;transition:color .25s;}
.sp-links a:hover{color:#fff;}
.sp-nav-cta{display:flex;align-items:center;gap:10px;}
.sp-cta{font-size:13.5px;font-weight:700;color:#000;padding:10px 18px;border-radius:980px;background:linear-gradient(120deg,var(--accent),var(--accent2));box-shadow:0 10px 28px -10px rgba(47,128,255,.85);transition:transform .2s,filter .2s;}
.sp-cta:hover{filter:brightness(1.1);transform:translateY(-1px);}
@media(max-width:860px){.sp-links{display:none}}
@media(max-width:500px){.btn-ghost.sm{display:none}}

/* HERO */
.sp-hero{position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:120px clamp(18px,5vw,56px) 80px;overflow:hidden;}
.sp-hero-bg{position:absolute;inset:0;z-index:0;will-change:transform;}
.sp-hero-slide{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat;opacity:0;transform:scale(1.08);transition:opacity 1.8s cubic-bezier(.2,.7,.2,1),transform 12s ease-out;will-change:opacity,transform;}
.sp-hero-slide.is-active{opacity:.48;transform:scale(1);}
.sp-hero-slide::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,transparent 18%,rgba(2,5,10,.6) 72%),linear-gradient(180deg,rgba(2,5,10,.15),rgba(2,5,10,.88) 58%,#02050a);}
.sp-hero-vignette{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,transparent 25%,rgba(2,5,10,.92) 100%);pointer-events:none;}
.sp-hero-grid-overlay{position:absolute;inset:0;opacity:.28;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:64px 64px;-webkit-mask-image:radial-gradient(circle at 50% 38%,#000,transparent 62%);mask-image:radial-gradient(circle at 50% 38%,#000,transparent 62%);}

/* PARTICLES */
.sp-hero-particles{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden;}
.sp-particle{position:absolute;left:var(--px);top:var(--py);width:2px;height:2px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 0 8px rgba(255,255,255,.25),0 0 16px rgba(47,128,255,.18);animation:spParticleFloat var(--d) ease-in-out infinite;animation-delay:var(--dl);opacity:0;}
@keyframes spParticleFloat{0%,100%{opacity:0;transform:translateY(0) scale(1)}12%{opacity:.75}50%{transform:translateY(-80px) scale(1.5)}88%{opacity:.35}}

/* CONTENT */
.sp-hero-content{position:relative;z-index:2;width:min(1320px,100%);display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(28px,5vw,80px);align-items:center;}
.sp-hero-ready .sp-hero-content{animation:heroContentIn 1.2s cubic-bezier(.2,.8,.2,1) .1s both;}
@keyframes heroContentIn{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}

.sp-hero-inner{max-width:640px;transition:transform .2s ease-out;will-change:transform;}
.sp-badge{display:inline-flex;align-items:center;gap:10px;padding:8px 16px 8px 10px;border-radius:980px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);margin-bottom:22px;animation:badgeIn .9s cubic-bezier(.2,.8,.2,1) .2s both;font-size:13px;font-weight:600;letter-spacing:.04em;position:relative;}
@keyframes badgeIn{from{opacity:0;transform:translateY(22px) scale(.94)}to{opacity:1;transform:none}}
.sp-badge-logo{border-radius:8px;box-shadow:0 8px 24px -8px rgba(47,128,255,.5);}
.sp-badge-dot{width:7px;height:7px;border-radius:50%;background:#14F195;box-shadow:0 0 12px #14F195;animation:dotPulse 2s ease-in-out infinite;position:relative;z-index:1;}
.sp-badge-pulse{position:absolute;width:7px;height:7px;border-radius:50%;background:#14F195;animation:pulseOut 2s ease-out infinite;left:0;top:0;}
@keyframes dotPulse{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes pulseOut{0%{transform:scale(1);opacity:.55}100%{transform:scale(3.2);opacity:0}}

.sp-h1{margin:0;font-size:clamp(38px,6.5vw,82px);line-height:.96;letter-spacing:-.035em;font-weight:800;animation:h1In .95s cubic-bezier(.2,.8,.2,1) .3s both;position:relative;}
@keyframes h1In{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
.sp-h1-gradient{background:linear-gradient(120deg,var(--accent),var(--accent2),var(--accent));background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:gradientShift 5s ease-in-out infinite;}
@keyframes gradientShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.sp-lead{margin:24px 0 0;font-size:clamp(14.5px,1.4vw,17px);line-height:1.6;color:var(--muted);max-width:54ch;animation:leadIn .95s cubic-bezier(.2,.8,.2,1) .4s both;}
@keyframes leadIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}

.sp-hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px;animation:actionsIn .95s cubic-bezier(.2,.8,.2,1) .5s both;}
@keyframes actionsIn{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
.btn-primary{font-weight:700;font-size:15px;color:#000;padding:14px 26px;border-radius:980px;background:linear-gradient(120deg,var(--accent),var(--accent2));box-shadow:0 18px 44px -14px rgba(47,128,255,.9);transition:transform .22s,filter .22s,box-shadow .22s;display:inline-flex;align-items:center;gap:8px;}
.btn-primary:hover{filter:brightness(1.12);transform:translateY(-3px);box-shadow:0 24px 52px -14px rgba(47,128,255,.95);}
.btn-primary.lg{font-size:16px;padding:16px 32px;}
.btn-arrow{transition:transform .2s;display:inline-block;position:relative;top:-1px;}
.btn-primary:hover .btn-arrow{transform:translateX(3px);}
.btn-glass{font-weight:700;font-size:15px;color:#fff;padding:14px 26px;border-radius:980px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:all .28s;position:relative;overflow:hidden;}
.btn-glass:hover{border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.09);transform:translateY(-3px);box-shadow:0 18px 40px -16px rgba(0,0,0,.6);}
.btn-glass-glare{position:absolute;inset:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.12) 50%,transparent 62%);transform:translateX(-140%);transition:transform .65s ease;}
.btn-glass:hover .btn-glass-glare{transform:translateX(140%);}
.btn-ghost{font-weight:700;font-size:15px;color:#fff;padding:14px 22px;border-radius:980px;border:1px solid var(--line);background:rgba(255,255,255,.03);transition:all .25s;}
.btn-ghost:hover{border-color:var(--accent);background:rgba(47,128,255,.14);transform:translateY(-2px);}
.btn-ghost.sm{font-size:13px;padding:9px 16px;}

.sp-hero-meta{display:flex;align-items:center;gap:18px;margin-top:28px;animation:actionsIn .95s cubic-bezier(.2,.8,.2,1) .6s both;}
.sp-meta-item{font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px;}
.sp-meta-item strong{color:#fff;font-weight:700;font-size:13px;}
.sp-meta-divider{width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.18);flex-shrink:0;}

/* SHOWCASE */
.sp-showcase{position:relative;min-height:520px;display:flex;flex-direction:column;align-items:center;justify-content:center;perspective:1400px;animation:showcaseIn 1.3s cubic-bezier(.2,.8,.2,1) .2s both;}
@keyframes showcaseIn{from{opacity:0;transform:translateY(44px) scale(.94)}to{opacity:1;transform:none}}
.sp-showcase-stage{position:relative;width:min(300px,58vw);height:min(520px,62vh);}
.sp-showcase-item{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transform:translate3d(90px,40px,-140px) rotateY(-26deg) scale(.88);filter:blur(10px);transition:opacity 1s cubic-bezier(.2,.8,.2,1),transform 1.1s cubic-bezier(.2,.8,.2,1),filter 1s ease;pointer-events:none;will-change:transform,opacity;}
.sp-showcase-item.is-active{opacity:1;transform:translate3d(0,0,0) rotateY(-6deg) scale(1);filter:blur(0);z-index:3;}
.sp-showcase-item.is-next{opacity:.45;transform:translate3d(60px,22px,-90px) rotateY(-16deg) scale(.93);filter:blur(4px);z-index:2;}
.sp-showcase-device{position:relative;width:100%;height:100%;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,.16);background:#060812;box-shadow:0 50px 120px -48px rgba(0,0,0,.95),0 0 0 1px rgba(255,255,255,.04) inset,0 0 60px -14px var(--accent);animation:showcaseFloat 7s ease-in-out infinite;will-change:transform;}
@keyframes showcaseFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
.sp-showcase-item.is-active .sp-showcase-device{animation:showcaseFloat 7s ease-in-out infinite,devicePulse 6s ease-in-out infinite;}
@keyframes devicePulse{50%{box-shadow:0 54px 140px -42px rgba(0,0,0,.95),0 0 0 1px rgba(255,255,255,.06) inset,0 0 70px -10px var(--accent)}}
.sp-device-bar{position:absolute;top:0;left:0;right:0;height:34px;background:rgba(0,0,0,.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:7px;padding:0 14px;z-index:2;}
.sp-device-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.22);}
.sp-showcase-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;transform:scale(1.06);transition:transform .9s cubic-bezier(.2,.8,.2,1);}
.sp-showcase-item.is-active .sp-showcase-img{transform:scale(1);}
.sp-showcase-shine{position:absolute;inset:0;background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.16) 50%,transparent 60%);transform:translateX(-160%);animation:shine 4.5s ease-in-out infinite;pointer-events:none;}
@keyframes shine{0%,32%{transform:translateX(-160%)}100%{transform:translateX(160%)}}
.sp-showcase-label{position:absolute;bottom:-36px;left:0;right:0;display:flex;flex-direction:column;gap:3px;pointer-events:none;}
.sp-showcase-label strong{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#fff;}
.sp-showcase-label span{font-size:11px;color:var(--muted);letter-spacing:.04em;}
.sp-showcase-pips{display:flex;gap:10px;margin-top:52px;}
.sp-pip{width:11px;height:11px;border-radius:50%;background:rgba(255,255,255,.12);border:none;cursor:pointer;padding:0;transition:all .4s cubic-bezier(.2,.8,.2,1);position:relative;}
.sp-pip:hover{background:rgba(255,255,255,.35);transform:scale(1.15);}
.sp-pip.is-active{background:var(--accent);box-shadow:0 0 24px var(--accent);transform:scale(1.4);}

@media(max-width:980px){
  .sp-hero-content{grid-template-columns:1fr;text-align:center;}
  .sp-showcase{display:none;}
  .sp-hero-inner{max-width:100%;margin:0 auto;}
  .sp-hero-meta{justify-content:center;flex-wrap:wrap;gap:10px;}
  .sp-hero-actions{justify-content:center;}
  .sp-badge{justify-content:center;}
}

/* MARQUEE */
.sp-marquee{border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden;padding:18px 0;background:rgba(255,255,255,.012);}
.sp-marquee-track{display:flex;white-space:nowrap;gap:0;animation:marquee 45s linear infinite;will-change:transform;}
.sp-marquee-content{padding-right:44px;font-size:14px;color:#4a5568;font-weight:700;letter-spacing:.02em;}
@keyframes marquee{to{transform:translateX(-50%)}}

/* FEATURES */
.sp-features-sec{max-width:1240px;margin:0 auto;padding:clamp(72px,12vw,150px) clamp(18px,5vw,40px);}
.sp-section-header{text-align:center;margin-bottom:68px;display:flex;flex-direction:column;align-items:center;}
.sp-kicker{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--accent);padding:7px 16px;border-radius:980px;background:rgba(47,128,255,.1);border:1px solid rgba(47,128,255,.2);margin-bottom:18px;}
.sp-h2{margin:0;font-size:clamp(26px,4.2vw,46px);line-height:1.06;letter-spacing:-.03em;font-weight:800;max-width:22ch;}
.sp-body{margin:16px 0 0;font-size:clamp(14.5px,1.4vw,16.5px);line-height:1.6;color:var(--muted);max-width:60ch;}

.sp-features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
@media(max-width:1024px){.sp-features-grid{grid-template-columns:1fr 1fr;}}
@media(max-width:640px){.sp-features-grid{grid-template-columns:1fr;}}

.sp-feature-card{position:relative;border:1px solid var(--line);border-radius:22px;overflow:hidden;background:linear-gradient(170deg,rgba(255,255,255,.04),rgba(255,255,255,.01));transition:all .5s cubic-bezier(.2,.8,.2,1);will-change:transform;animation:cardIn 1s cubic-bezier(.2,.8,.2,1) both;animation-delay:var(--delay,0ms);opacity:0;}
@keyframes cardIn{from{opacity:0;transform:translateY(56px) scale(.95)}to{opacity:1;transform:none}}
.sp-feature-card:hover{border-color:rgba(47,128,255,.38);transform:translateY(-8px) scale(1.02);box-shadow:0 40px 100px -36px rgba(47,128,255,.22);}
.sp-feature-media{position:relative;height:190px;overflow:hidden;border-bottom:1px solid var(--line);}
.sp-feature-media img{width:100%;height:100%;object-fit:cover;transform:scale(1.08);transition:transform .8s cubic-bezier(.2,.8,.2,1);will-change:transform;}
.sp-feature-card:hover .sp-feature-media img{transform:scale(1.16);}
.sp-feature-media-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(2,5,10,.9) 0%,transparent 55%);pointer-events:none;}
.sp-feature-tag{position:absolute;top:14px;left:14px;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#000;padding:5px 10px;border-radius:6px;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:1;}
.sp-feature-body{padding:20px 22px 22px;position:relative;z-index:1;}
.sp-feature-body h3{margin:0;font-size:17px;font-weight:700;letter-spacing:-.01em;margin-bottom:8px;}
.sp-feature-body p{margin:0;font-size:13.5px;line-height:1.55;color:var(--muted);}
.sp-feature-glow{position:absolute;top:-70px;right:-70px;width:170px;height:170px;border-radius:50%;filter:blur(60px);opacity:.28;transition:opacity .5s;pointer-events:none;}
.sp-feature-card:hover .sp-feature-glow{opacity:.52;}

/* STRIP */
.sp-strip-sec{overflow:hidden;padding:30px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.012),transparent);}
.sp-strip-track{display:flex;gap:20px;width:max-content;animation:strip 52s linear infinite;padding:0 20px;will-change:transform;}
.sp-strip-track:hover{animation-play-state:paused;}
@keyframes strip{to{transform:translateX(-50%)}}
.sp-strip-card{position:relative;width:260px;aspect-ratio:16/10;border-radius:18px;overflow:hidden;border:1px solid var(--line);flex-shrink:0;transition:all .45s cubic-bezier(.2,.8,.2,1);will-change:transform;}
.sp-strip-card:hover{transform:translateY(-8px) scale(1.04);border-color:rgba(47,128,255,.5);box-shadow:0 28px 70px -28px rgba(47,128,255,.3);}
.sp-strip-img{width:100%;height:100%;object-fit:cover;transform:scale(1.06);transition:transform .8s cubic-bezier(.2,.8,.2,1);will-change:transform;}
.sp-strip-card:hover .sp-strip-img{transform:scale(1.16);}
.sp-strip-border-glow{position:absolute;inset:-1px;border-radius:18px;opacity:0;transition:opacity .4s;background:linear-gradient(120deg,var(--accent),var(--accent2));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;padding:1px;pointer-events:none;}
.sp-strip-card:hover .sp-strip-border-glow{opacity:.75;}

/* STATS */
.sp-stats-sec{max-width:1100px;margin:0 auto;padding:clamp(56px,8vw,110px) clamp(18px,5vw,40px);}
.sp-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center;}
@media(max-width:760px){.sp-stats-grid{grid-template-columns:1fr 1fr;gap:36px;}}
.sp-stat{display:flex;flex-direction:column;gap:6px;}
.sp-stat-num{font-size:clamp(34px,4.2vw,48px);font-weight:800;letter-spacing:-.035em;background:linear-gradient(180deg,#fff 30%,rgba(255,255,255,.45));-webkit-background-clip:text;background-clip:text;color:transparent;}
.sp-stat span{font-size:12.5px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;font-weight:700;}

/* ECOSYSTEM */
.sp-eco-sec{max-width:1100px;margin:0 auto;padding:clamp(64px,10vw,130px) clamp(18px,5vw,40px);}
.sp-eco-grid{display:grid;grid-template-columns:1fr;gap:16px;max-width:720px;margin:32px auto 0;}
.sp-eco-card{display:flex;align-items:center;gap:20px;padding:24px 26px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(170deg,rgba(47,128,255,.07),rgba(153,69,255,.03));transition:all .4s cubic-bezier(.2,.8,.2,1);}
.sp-eco-card:hover{border-color:rgba(47,128,255,.4);transform:translateY(-4px);box-shadow:0 28px 70px -28px rgba(47,128,255,.2);}
.sp-eco-icon{width:52px;height:52px;border-radius:14px;overflow:hidden;flex-shrink:0;border:1px solid var(--line);background:#060812;}
.sp-eco-icon img{width:100%;height:100%;object-fit:cover;}
.sp-eco-content{flex:1;min-width:0;}
.sp-eco-content h3{margin:0;font-size:18px;font-weight:700;}
.sp-eco-content p{margin:6px 0 0;font-size:13.5px;color:var(--muted);line-height:1.5;}
.sp-eco-arrow{font-size:18px;color:var(--accent);font-weight:700;transition:transform .25s;}
.sp-eco-card:hover .sp-eco-arrow{transform:translateX(4px);}

/* CTA */
.sp-cta-sec{padding:clamp(80px,14vw,170px) clamp(18px,5vw,40px);text-align:center;}
.sp-cta-inner{max-width:720px;margin:0 auto;}
.sp-cta-sec h2{margin:0;font-size:clamp(32px,5.8vw,68px);line-height:1.04;letter-spacing:-.035em;font-weight:800;}
.sp-cta-sec p{margin:18px 0 34px;font-size:17px;color:var(--muted);}
.sp-cta-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}

/* FOOTER */
.sp-foot{border-top:1px solid var(--line);padding:50px clamp(18px,5vw,52px) 32px;background:rgba(255,255,255,.012);}
.sp-foot-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.4fr 1fr;gap:40px;}
.sp-foot-brand{display:flex;flex-direction:column;gap:10px;}
.sp-foot-tagline{font-size:13px;color:var(--muted);margin:0;}
.sp-foot-links{display:flex;gap:clamp(20px,4vw,48px);flex-wrap:wrap;align-content:flex-start;}
.sp-foot-links a{display:block;font-size:13.5px;color:#a0a8b6;margin-bottom:10px;transition:color .2s;}
.sp-foot-links a:hover{color:var(--accent);}
.sp-foot-bottom{max-width:1100px;margin:32px auto 0;padding-top:22px;border-top:1px solid var(--line);font-size:12.5px;color:#5a6474;}
.reveal{opacity:0;transform:translateY(40px);transition:opacity 1s cubic-bezier(.2,.8,.2,1),transform 1s cubic-bezier(.2,.8,.2,1);}
.reveal.in{opacity:1;transform:none;}
`;
