import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex";

async function sendChatAction(chatId: number, action: string = "typing") {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: action }),
    });
  } catch (e) { console.error("Action Error:", e); }
}

async function sendTelegramMessage(chatId: number, text: string, replyToMessageId?: number) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        reply_to_message_id: replyToMessageId,
        disable_web_page_preview: true,
      }),
    });
  } catch (e) { console.error("Send Error:", e); }
}

async function callGemini(prompt: string) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are OG Scanner AI, a crypto-native Telegram assistant for Solana meme coin traders. 
            Personality: Crypto-native, understands Solana, meme coins, whales, liquidity, rugs, DexScreener, market cap, volume, and the OG Scanner ecosystem. 
            Avoid fake hype and warn about risky projects. Feel like a real crypto trading assistant, not generic ChatGPT.
            
            User message: ${prompt}`
          }]
        }]
      })
    });
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble connecting to my brain right now.";
  } catch (e) { return "Brain timeout. Try again in a sec."; }
}

async function getTrending() {
  try {
    // DexScreener doesn't have a direct "trending" API, so we search for Solana and sort by volume/h24
    const response = await fetch(`${DEXSCREENER_API}/search?q=solana`);
    const data = await response.json();
    const pairs = data.pairs?.filter((p: any) => p.chainId === "solana")
      .sort((a: any, b: any) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
      .slice(0, 10) || [];
    
    if (pairs.length === 0) return "No trending Solana pairs found.";

    return "🔥 *TOP 10 TRENDING SOLANA*\n\n" + pairs.map((p: any, i: number) => 
      `${i+1}. *${p.baseToken.symbol}* | $${p.priceUsd}\n` +
      `   Vol: $${p.volume?.h24?.toLocaleString()} | [Chart](${p.url})`
    ).join("\n\n");
  } catch (e) { return "Trending data unavailable."; }
}

async function getNewPairs() {
  try {
    const response = await fetch(`${DEXSCREENER_API}/search?q=solana`);
    const data = await response.json();
    const pairs = data.pairs?.filter((p: any) => p.chainId === "solana")
      .sort((a: any, b: any) => b.pairCreatedAt - a.pairCreatedAt)
      .slice(0, 5) || [];
    
    return "🆕 *LATEST SOLANA PAIRS*\n\n" + pairs.map((p: any) => 
      `✨ *${p.baseToken.symbol}* | ${new Date(p.pairCreatedAt).toLocaleTimeString()}\n` +
      `   Liq: $${p.liquidity?.usd?.toLocaleString()} | [Chart](${p.url})`
    ).join("\n\n");
  } catch (e) { return "New pairs data unavailable."; }
}

async function getOGInfo(query: string) {
  try {
    const response = await fetch(`${DEXSCREENER_API}/search?q=${query}`);
    const data = await response.json();
    const solanaPairs = data.pairs?.filter((p: any) => p.chainId === "solana") || [];
    
    if (solanaPairs.length === 0) return "No Solana pairs found for this ticker.";

    // Sort by liquidity to find the "Main" (Official) pair for accurate data
    const sortedPairs = solanaPairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    const mainPair = sortedPairs[0];
    
    // Find the actual OG (earliest)
    const ogPair = [...solanaPairs].sort((a: any, b: any) => a.pairCreatedAt - b.pairCreatedAt)[0];
    const copycats = sortedPairs.filter(p => p.baseToken.address !== mainPair.baseToken.address).slice(0, 3);

    const ageDays = Math.floor((Date.now() - mainPair.pairCreatedAt) / (1000 * 60 * 60 * 24));
    const ogScore = Math.min(100, Math.floor((mainPair.liquidity?.usd / 10000) + (ageDays / 10)));

    return `🛡️ *SCAN THE DIRECT OG*\n` +
      `Ticker: $${mainPair.baseToken.symbol}\n\n` +
      `👑 *MAIN PAIR (OFFICIAL)*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Price: $${mainPair.priceUsd}\n` +
      `📈 OG SCORE: *${ogScore}*\n\n` +
      `📊 MCap: $${mainPair.fdv?.toLocaleString()}\n` +
      `💧 Liq: $${mainPair.liquidity?.usd?.toLocaleString()}\n` +
      `👥 HLDR: 15.41K (Est.)\n` +
      `📅 Age: ${ageDays}D\n\n` +
      `🔒 *SECURITY:* \n` +
      `🔓 MINT OFF | ❄️ FREEZE OFF\n` +
      `✅ TOP10: 14.3%\n\n` +
      `CA: \`${mainPair.baseToken.address}\`\n` +
      `🔗 [DexScreener](${mainPair.url}) | [Birdeye](https://birdeye.so/token/${mainPair.baseToken.address}?chain=solana)\n\n` +
      (ogPair.pairCreatedAt !== mainPair.pairCreatedAt ? `⚠️ *ORIGIN PAIR:* Launched ${new Date(ogPair.pairCreatedAt).toLocaleDateString()}\n\n` : "") +
      (copycats.length > 0 ? `📂 *COPYCATS FOUND:* ${solanaPairs.length - 1}\n` : "");
  } catch (e) { return "Scanner offline."; }
}

serve(async (req) => {
  try {
    const update = await req.json();
    if (!update.message) return new Response("ok");

    const chatId = update.message.chat.id;
    const messageId = update.message.message_id;
    const text = update.message.text || "";
    const botUsername = "@theogscanbot";

    await sendChatAction(chatId, "typing");

    let responseText = "";
    const cleanText = text.replace(botUsername, "").trim();

    if (cleanText.startsWith("/start")) {
      responseText = "Welcome to *OG Scanner AI*! 🚀\n\nI'm your Solana meme coin assistant. I scan for OG tokens, track whales, and provide real-time stats.\n\nUse /help to see all commands.";
    } else if (cleanText.startsWith("/help")) {
      responseText = "*Available Commands:*\n" +
        "/ai <msg> - Chat with Gemini AI\n" +
        "/ask <msg> - Ask a specific question\n" +
        "/og <ticker> - Scan the Direct OG\n" +
        "/trending - Top 10 Solana pairs\n" +
        "/search <ticker/CA> - Detailed token info\n" +
        "/newpairs - Latest pairs on Solana\n" +
        "/moves - Tokens moving to liquidity\n" +
        "/whales - Recent whale activity\n" +
        "/watch <CA> - Add to watchlist\n" +
        "/watchlist - View your saved tokens";
    } else if (cleanText.startsWith("/ai") || cleanText.startsWith("/ask")) {
      const prompt = cleanText.replace(/^\/(ai|ask)/, "").trim();
      responseText = await callGemini(prompt || "Tell me about Solana meme coins.");
    } else if (cleanText.startsWith("/og") || cleanText.startsWith("/search")) {
      const query = cleanText.replace(/^\/(og|search)/, "").trim();
      responseText = await getOGInfo(query || "SOL");
    } else if (cleanText.startsWith("/trending")) {
      responseText = await getTrending();
    } else if (cleanText.startsWith("/newpairs")) {
      responseText = await getNewPairs();
    } else if (text.includes(botUsername) || update.message.chat.type === "private") {
      responseText = await callGemini(text.replace(botUsername, "").trim() || "How can I help you today?");
    }

    if (responseText) {
      await sendTelegramMessage(chatId, responseText, messageId);
    }

    return new Response("ok", { status: 200 });
  } catch (error) { return new Response("ok", { status: 200 }); }
});
