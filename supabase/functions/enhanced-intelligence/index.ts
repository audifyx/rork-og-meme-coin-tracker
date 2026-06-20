import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const NVIDIA_API_KEY = "***REMOVED_NVIDIA_KEY***";
const NVIDIA_API_BASE = "https://integrate.api.nvidia.com/v1";
const MODEL = "meta/llama-3.1-405b-instruct"; // Best free model

// Tool definitions
const TOOLS = [
  {
    name: "lookupToken",
    description: "Find token info by mint address",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "getHolderData",
    description: "Get holder distribution data",
    parameters: {
      type: "object",
      properties: { mint: { type: "string" } },
      required: ["mint"],
    },
  },
];

async function executeTool(toolName: string, params: any, supabase: any): Promise<string> {
  try {
    if (toolName === "lookupToken") {
      const { data } = await supabase
        .from("tokens")
        .select("*")
        .or(`mint.eq.${params.query},name.ilike.%${params.query}%,symbol.ilike.%${params.query}%`)
        .limit(1)
        .maybeSingle();
      
      if (!data) return JSON.stringify({ error: "Token not found" });
      return JSON.stringify({
        mint: data.mint,
        name: data.name,
        symbol: data.symbol,
        price: data.current_price,
        marketCap: data.market_cap,
        holders: data.holders_count,
      });
    }
    
    if (toolName === "getHolderData") {
      const { data } = await supabase
        .from("tokens")
        .select("holders_count, top_10_holders_pct")
        .eq("mint", params.mint)
        .single();
      
      if (!data) return JSON.stringify({ error: "Token not found" });
      return JSON.stringify({
        total: data.holders_count,
        top10Percent: data.top_10_holders_pct,
      });
    }
    
    return JSON.stringify({ error: "Unknown tool" });
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await req.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const systemPrompt = `You are a blockchain intelligence expert.${context ? `\n\nContext:\n${context}` : ""}\n\nProvide clear, data-backed analysis.`;

    // Call Llama 3.1 405B with tools
    const response = await fetch(`${NVIDIA_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        tools: TOOLS.map((t) => ({ type: "function", function: t })),
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      throw new Error("No response from model");
    }

    // Handle tool calls
    let finalContent = message.content || "";

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolResults: Record<string, string> = {};

      for (const toolCall of message.tool_calls) {
        const args = typeof toolCall.function.arguments === "string" 
          ? JSON.parse(toolCall.function.arguments) 
          : toolCall.function.arguments;

        toolResults[toolCall.function.name] = await executeTool(
          toolCall.function.name,
          args,
          supabase
        );
      }

      finalContent += `\n\nData fetched:\n${Object.entries(toolResults)
        .map(([name, result]) => `${name}: ${result}`)
        .join("\n")}`;
    }

    return new Response(
      JSON.stringify({
        content: finalContent,
        model: MODEL,
        modelsUsed: [MODEL],
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
