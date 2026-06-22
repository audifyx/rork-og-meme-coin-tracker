import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const _alchemy = Deno.env.get("ALCHEMY_API_KEY") || "";
const _helius = Deno.env.get("HELIUS_API_KEY") || "";
const _quiknode = Deno.env.get("QUICKNODE_WSS") || "";
const ALCHEMY_RPC_URL = _alchemy ? (_alchemy.startsWith("http") ? _alchemy : `https://solana-mainnet.g.alchemy.com/v2/${_alchemy}`) : undefined;
const HELIOS_RPC_1 = _helius ? (_helius.startsWith("http") ? _helius : `https://mainnet.helius-rpc.com/?api-key=${_helius}`) : undefined;
const QUIKNODE_RPC_URL = _quiknode ? _quiknode.replace(/^wss:/, "https:") : undefined;
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  try {
    const { method, params = [], provider = 'alchemy' } = await req.json();
    let rpcUrl = ALCHEMY_RPC_URL;
    if (provider === 'helios') rpcUrl = HELIOS_RPC_1;
    if (provider === 'quiknode') rpcUrl = QUIKNODE_RPC_URL;
    if (!rpcUrl) {
      throw new Error(`RPC provider '${provider}' not configured`);
    }
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: method,
        params: params
      })
    });
    if (!response.ok) {
      throw new Error(`RPC error: ${response.statusText}`);
    }
    const data = await response.json();
    return new Response(JSON.stringify({
      success: true,
      data: data,
      provider: provider,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
