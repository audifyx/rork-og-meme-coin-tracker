import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const BIRDEYE_API_KEY = Deno.env.get("BIRDEYE_API_KEY") || Deno.env.get("BIRDSEYE_API_KEY") || "";
// Map friendly type -> Birdeye /defi path
const TYPE_MAP: Record<string, string> = {
  overview: "token_overview",
  token_overview: "token_overview",
  price: "price",
  security: "token_security",
  token_security: "token_security",
  creation: "token_creation_info",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  try {
    const { address, type = "overview", chain = "solana" } = await req.json();
    if (!address) throw new Error("Token address is required");
    const path = TYPE_MAP[type] || "token_overview";
    const url = `https://public-api.birdeye.so/defi/${path}?address=${address}`;
    const response = await fetch(url, {
      headers: { "X-API-KEY": BIRDEYE_API_KEY, "x-chain": chain, accept: "application/json" },
    });
    if (!response.ok) { const t = await response.text(); throw new Error(`Birdeye ${response.status}: ${t.slice(0,160)}`); }
    const data = await response.json();
    return new Response(JSON.stringify({ success: true, data, timestamp: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
