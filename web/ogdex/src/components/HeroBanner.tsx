export default function HeroBanner() {
  return (
    <div className="mb-4 overflow-hidden rounded-2xl"
      style={{
        height: "140px",
        border: "1px solid rgba(47,128,255,0.20)",
        boxShadow: "0 0 32px rgba(47,128,255,0.08)",
      }}>
      <img
        src="/ORBITX_DEX/ogdex-hero.jpg"
        alt="OG DEX"
        className="w-full h-full"
        style={{ objectFit: "cover", objectPosition: "center", display: "block" }}
      />
    </div>
  );
}
