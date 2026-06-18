import { Token } from '@/lib/og';
import { supabase } from '@/lib/supabase';
import { analyzeWhaleRisk } from '@/lib/advanced-analytics/holder-analytics';
import { predictTokenPrice, assessRugRisk } from '@/lib/ml-models';

export async function generateOgScanReport(token: Token): Promise<string> {
  console.log('🎨 Generating OG Scan report for:', token.name);

  let holders: any[] = [];
  let transactions: any[] = [];
  let anomalies: any[] = [];
  let candles: any[] = [];
  let whaleRisk: any = null;
  let predictions: any = null;
  let rugRisk: any = null;

  try {
    const [h, t, a, c] = await Promise.all([
      supabase.from('holder_snapshots').select('*').eq('mint_address', token.mint).order('balance_usd', { ascending: false }).limit(1000),
      supabase.from('transactions_extended').select('*').eq('mint_address', token.mint).order('blockchain_timestamp', { ascending: false }).limit(2000),
      supabase.from('real_time_alerts').select('*').eq('mint_address', token.mint).order('triggered_timestamp', { ascending: false }).limit(500),
      supabase.from('price_candles_extended').select('*').eq('mint_address', token.mint).order('candle_timestamp', { ascending: false }).limit(500),
    ]);
    holders = h.data || [];
    transactions = t.data || [];
    anomalies = a.data || [];
    candles = c.data || [];
  } catch (err) {
    console.warn('⚠️ Data fetch error:', err);
  }

  try { whaleRisk = await analyzeWhaleRisk(token.mint); } catch (err) { console.warn('Whale risk error:', err); }
  try { predictions = await predictTokenPrice(token.mint); } catch (err) { console.warn('Prediction error:', err); }
  try { rugRisk = await assessRugRisk(token.mint); } catch (err) { console.warn('Rug risk error:', err); }

  const topHolders = holders.slice(0, 20);
  const recentTransactions = transactions.slice(0, 50);
  const recentAnomalies = anomalies.slice(0, 20);

  // Build holders table rows
  let holdersRows = topHolders.map((h: any, idx: number) => {
    const pnlColor = (h.unrealized_pnl_percent || 0) >= 0 ? '#64FF00' : '#FF4444';
    return `<tr><td>#${idx + 1}</td><td>${h.wallet_address?.slice(0, 14) || 'N/A'}...</td><td>$${((h.balance_usd || 0) / 1000).toFixed(1)}K</td><td>${(h.balance_percent_of_supply || 0).toFixed(2)}%</td><td style="color: ${pnlColor}">${(h.unrealized_pnl_percent || 0).toFixed(0)}%</td><td>${h.classification || 'Unknown'}</td></tr>`;
  }).join('');

  // Build anomalies rows
  let anomaliesRows = recentAnomalies.map((a: any) => {
    const time = new Date((a.triggered_timestamp || 0) * 1000).toLocaleString();
    return `<div class="data-card"><div><div class="card-label">${a.alert_type || 'Alert'}</div><div style="font-size: 0.85em; color: #999;">${time}</div></div><span class="badge badge-${a.severity || 'info'}">${(a.severity || 'INFO').toUpperCase()}</span></div>`;
  }).join('');

  // Build transactions rows
  let transactionsRows = recentTransactions.map((t: any) => {
    const date = new Date((t.blockchain_timestamp || 0) * 1000).toLocaleDateString();
    const pnlColor = (t.profit_loss_usd || 0) >= 0 ? '#64FF00' : '#FF4444';
    const pnlSign = (t.profit_loss_usd || 0) >= 0 ? '+' : '';
    return `<tr><td>${date}</td><td>${(t.direction || 'SWAP').toUpperCase()}</td><td>${((t.token_amount || 0) / 1e6).toFixed(2)}</td><td>$${(t.usd_volume || 0).toFixed(0)}</td><td style="color: ${pnlColor}">${pnlSign}$${(t.profit_loss_usd || 0).toFixed(0)}</td></tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OG Scan Report - ${token.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0a0a; color: #fff; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0; }
    .header-banner { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-top: 4px solid #FFD700; border-bottom: 4px solid #FFD700; padding: 40px 20px; text-align: center; }
    .header-banner h1 { color: #FFD700; font-size: 48px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 3px; }
    .header-content { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 30px; align-items: center; }
    .header-item { text-align: center; }
    .header-item .label { color: #999; font-size: 12px; margin-bottom: 5px; }
    .header-item .value { color: #FFD700; font-size: 24px; font-weight: bold; }
    .info-bar { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; padding: 20px; background: #1a1a1a; border-bottom: 1px solid #333; }
    .info-item { padding: 15px; background: #2a2a2a; border-radius: 8px; border-left: 3px solid #FFD700; }
    .info-label { color: #999; font-size: 11px; margin-bottom: 5px; }
    .info-value { color: #FFD700; font-size: 16px; font-weight: bold; }
    .content { padding: 40px 20px; }
    .section { margin: 40px 0; }
    .section-title { color: #FFD700; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #FFD700; text-transform: uppercase; letter-spacing: 2px; }
    .data-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
    .data-card { background: #1a1a1a; padding: 20px; border-radius: 8px; border-left: 4px solid #FFD700; }
    .card-label { color: #999; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; }
    .card-value { color: #FFD700; font-size: 22px; font-weight: bold; }
    .card-desc { color: #666; font-size: 11px; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #1a1a1a; }
    th { background: #2a2a2a; color: #FFD700; padding: 12px; text-align: left; border-bottom: 2px solid #FFD700; font-weight: bold; }
    td { padding: 10px 12px; border-bottom: 1px solid #2a2a2a; }
    tr:hover { background: #2a2a2a; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    .badge-critical { background: #FF4444; color: #fff; }
    .badge-high { background: #FF8844; color: #fff; }
    .badge-medium { background: #FFBB44; color: #000; }
    .badge-low { background: #64FF00; color: #000; }
    .positive { color: #64FF00; }
    .negative { color: #FF4444; }
    .footer { background: #1a1a1a; padding: 30px 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #333; margin-top: 50px; }
    .footer strong { color: #FFD700; display: block; margin-bottom: 5px; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .section { animation: fadeIn 0.6s ease-in; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-banner">
      <h1>🔍 OG SCAN</h1>
      <div class="header-content">
        <div class="header-item">
          <div class="label">TOKEN</div>
          <div class="value">${token.name}</div>
        </div>
        <div class="header-item">
          <div class="label">PRICE</div>
          <div class="value">$${(token.priceUsd || 0).toFixed(8)}</div>
        </div>
        <div class="header-item">
          <div class="label">24H CHANGE</div>
          <div class="value ${(token.stats24h?.priceChange || 0) >= 0 ? 'positive' : 'negative'}">
            ${(token.stats24h?.priceChange || 0) >= 0 ? '📈' : '📉'} ${(token.stats24h?.priceChange || 0).toFixed(2)}%
          </div>
        </div>
      </div>
    </div>

    <div class="info-bar">
      <div class="info-item">
        <div class="info-label">Market Cap</div>
        <div class="info-value">$${(token.marketCapUsd ? token.marketCapUsd / 1e6 : 0).toFixed(2)}M</div>
      </div>
      <div class="info-item">
        <div class="info-label">Liquidity</div>
        <div class="info-value">$${(token.liquidityUsd ? token.liquidityUsd / 1e3 : 0).toFixed(1)}K</div>
      </div>
      <div class="info-item">
        <div class="info-label">24H Volume</div>
        <div class="info-value">$${(token.volume24hUsd ? token.volume24hUsd / 1e3 : 0).toFixed(1)}K</div>
      </div>
      <div class="info-item">
        <div class="info-label">Holders</div>
        <div class="info-value">${(token.holderCount || 0).toLocaleString()}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Age</div>
        <div class="info-value">${Math.floor((Date.now() - new Date(token.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24))} days</div>
      </div>
      <div class="info-item">
        <div class="info-label">Transactions</div>
        <div class="info-value">${transactions.length.toLocaleString()}</div>
      </div>
    </div>

    <div class="content">
      <!-- CONTRACT DETAILS -->
      <div class="section">
        <div class="section-title">📋 Contract Details</div>
        <div class="data-grid">
          <div class="data-card">
            <div class="card-label">Total Supply</div>
            <div class="card-value">${(token.totalSupply ? token.totalSupply / 1e9 : 0).toFixed(2)}B</div>
            <div class="card-desc">Total tokens minted</div>
          </div>
          <div class="data-card">
            <div class="card-label">Circulating</div>
            <div class="card-value">${(token.circulatingSupply ? token.circulatingSupply / 1e9 : 0).toFixed(2)}B</div>
            <div class="card-desc">Currently in circulation</div>
          </div>
          <div class="data-card">
            <div class="card-label">Decimals</div>
            <div class="card-value">${token.decimals || 9}</div>
            <div class="card-desc">Token precision</div>
          </div>
          <div class="data-card">
            <div class="card-label">Mint Address</div>
            <div class="card-value" style="font-size: 12px; word-break: break-all;">${token.mint.slice(0, 20)}...</div>
            <div class="card-desc">Token contract</div>
          </div>
          <div class="data-card">
            <div class="card-label">Chain</div>
            <div class="card-value">${token.chainId || 'Solana'}</div>
            <div class="card-desc">Blockchain network</div>
          </div>
          <div class="data-card">
            <div class="card-label">Status</div>
            <div class="card-value positive">ACTIVE</div>
            <div class="card-desc">Token status</div>
          </div>
        </div>
      </div>

      <!-- TOP HOLDERS -->
      <div class="section">
        <div class="section-title">💎 Top Holders (${topHolders.length})</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Wallet</th>
              <th>Balance USD</th>
              <th>% Supply</th>
              <th>Unrealized PnL</th>
              <th>Classification</th>
            </tr>
          </thead>
          <tbody>
            ${holdersRows || '<tr><td colspan="6" style="text-align: center; color: #666;">No holder data available</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- WHALE ANALYSIS -->
      <div class="section">
        <div class="section-title">🐋 Whale Analysis</div>
        <div class="data-grid">
          <div class="data-card">
            <div class="card-label">Total Whale Power</div>
            <div class="card-value">${(whaleRisk?.totalWhalePower || 0).toFixed(1)}%</div>
            <div class="card-desc">Concentration risk</div>
          </div>
          <div class="data-card">
            <div class="card-label">Critical Risk Wallets</div>
            <div class="card-value ${(whaleRisk?.criticalRiskWallets?.length || 0) > 5 ? 'negative' : 'positive'}">${(whaleRisk?.criticalRiskWallets?.length || 0)}</div>
            <div class="card-desc">High-risk wallets</div>
          </div>
          <div class="data-card">
            <div class="card-label">Dump Probability</div>
            <div class="card-value ${(whaleRisk?.dumpProbability || 0) > 50 ? 'negative' : 'positive'}">${(whaleRisk?.dumpProbability || 0).toFixed(0)}%</div>
            <div class="card-desc">Likelihood of dump</div>
          </div>
          <div class="data-card">
            <div class="card-label">Price Impact</div>
            <div class="card-value">${(whaleRisk?.priceImpact || 0).toFixed(2)}%</div>
            <div class="card-desc">Whale selling impact</div>
          </div>
        </div>
      </div>

      <!-- REAL-TIME ANOMALIES -->
      ${recentAnomalies.length > 0 ? `
      <div class="section">
        <div class="section-title">⚠️ Real-Time Anomalies (${recentAnomalies.length})</div>
        <div class="data-grid">
          ${anomaliesRows}
        </div>
      </div>
      ` : ''}

      <!-- RECENT TRANSACTIONS -->
      <div class="section">
        <div class="section-title">💸 Recent Transactions (${recentTransactions.length})</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Volume</th>
              <th>PnL</th>
            </tr>
          </thead>
          <tbody>
            ${transactionsRows || '<tr><td colspan="5" style="text-align: center; color: #666;">No transaction data available</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- ML PREDICTIONS -->
      <div class="section">
        <div class="section-title">🤖 Machine Learning Analysis</div>
        <div class="data-grid">
          <div class="data-card">
            <div class="card-label">1H Price Forecast</div>
            <div class="card-value">$${(predictions?.price_1h || token.priceUsd || 0).toFixed(8)}</div>
            <div class="card-desc">Direction: ${predictions?.direction_1h || 'NEUTRAL'}</div>
          </div>
          <div class="data-card">
            <div class="card-label">24H Price Forecast</div>
            <div class="card-value">$${(predictions?.price_24h || token.priceUsd || 0).toFixed(8)}</div>
            <div class="card-desc">Direction: ${predictions?.direction_24h || 'NEUTRAL'}</div>
          </div>
          <div class="data-card">
            <div class="card-label">Rug Pull Probability</div>
            <div class="card-value ${(rugRisk?.rug_probability || 0) > 50 ? 'negative' : 'positive'}">${(rugRisk?.rug_probability || 0).toFixed(1)}%</div>
            <div class="card-desc">Risk assessment</div>
          </div>
          <div class="data-card">
            <div class="card-label">Rug Pull Verdict</div>
            <div class="card-value ${rugRisk?.rug_verdict === 'SAFE' ? 'positive' : 'negative'}">${rugRisk?.rug_verdict || 'UNKNOWN'}</div>
            <div class="card-desc">Final verdict</div>
          </div>
          <div class="data-card">
            <div class="card-label">Confidence 1H</div>
            <div class="card-value">${(predictions?.confidence_1h || 0).toFixed(0)}%</div>
            <div class="card-desc">Model confidence</div>
          </div>
          <div class="data-card">
            <div class="card-label">Confidence 24H</div>
            <div class="card-value">${(predictions?.confidence_24h || 0).toFixed(0)}%</div>
            <div class="card-desc">Model confidence</div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <strong>🔍 OG SCAN - Blockchain Intelligence Report</strong>
      Generated: ${new Date().toLocaleString()}<br>
      Token: ${token.name} (${token.mint.slice(0, 8)}...)<br>
      Holders: ${holders.length} | Transactions: ${transactions.length} | Anomalies: ${anomalies.length}
    </div>
  </div>
</body>
</html>`;

  return html;
}
