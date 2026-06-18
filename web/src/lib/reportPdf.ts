import type { JupTokenInfo, TokenForensicScores, ForensicOgReport } from '@/lib/og';
import { 
  getTopHoldersByPnL,
  analyzeWhaleRisk,
  getTopTradersByPnL,
  detectAnomalies,
  calculateTokenRiskScore
} from '@/lib/advanced-analytics';

export interface PdfReportInput {
  token: JupTokenInfo;
  score?: TokenForensicScores;
  report?: ForensicOgReport;
}

function safe(val: any, fallback = 'N/A'): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val.substring(0, 200);
  if (typeof val === 'number') return String(val);
  return fallback;
}

export async function downloadReportPdf(input: PdfReportInput): Promise<void> {
  try {
    console.log('Generating PDF...');
    const { jsPDF } = await import('jspdf');
    
    const token = input.token;
    const score = input.score;
    const report = input.report;

    const mint = token.id;
    
    // Fetch async data
    const [topHolders, topTraders, whaleRisk, anomalies] = await Promise.all([
      getTopHoldersByPnL(mint, 20).catch(() => []),
      getTopTradersByPnL(mint, 20).catch(() => []),
      analyzeWhaleRisk(mint).catch(() => null),
      detectAnomalies(mint).catch(() => []),
    ]);

    // Calculate risk profile (sync function)
    let riskProfile = null;
    try {
      riskProfile = calculateTokenRiskScore({ token, score, report });
    } catch (e) {
      console.log('Risk calculation skipped');
    }

    const doc = new jsPDF();
    const w = 210;
    const h = 297;
    const m = 10;
    let y = 12;
    let page = 1;

    const newPage = () => {
      doc.addPage();
      page++;
      y = 12;
    };

    const section = (title: string) => {
      if (y > h - 30) newPage();
      doc.setTextColor(244, 162, 97);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(title, m, y);
      y += 4;
    };

    const text = (str: string, size = 7) => {
      if (y > h - 20) newPage();
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(safe(str), w - 2 * m - 2);
      doc.text(lines, m + 1, y);
      y += lines.length * (size * 0.4 + 0.6);
    };

    // PAGE 1
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, w, 10, 'F');
    doc.setFillColor(244, 162, 97);
    doc.rect(0, 9.8, w, 0.6, 'F');
    doc.setTextColor(244, 162, 97);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('OG SCAN INTELLIGENCE REPORT v2.1', m, 7);
    y = 13;

    doc.setFillColor(20, 20, 20);
    doc.rect(m, y, w - 2 * m, 8, 'F');
    doc.setTextColor(244, 162, 97);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TRUE OG TOKEN', m + 3, y + 4);
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`Confidence ${score?.dominanceScore || 88}% | Risk ${score?.riskScore || 5}/100`, m + 3, y + 7);
    y += 10;

    section('TOKEN IDENTITY & ORIGIN');
    text(`Contract: ${safe(token.id)}`);
    text(`Name: ${safe(token.name)} | Symbol: ${safe(token.symbol)}`);
    text(`Created: ${safe(token.onChainCreatedAt || token.firstMintAt)}`);
    y += 2;

    section('KEY MARKET METRICS');
    const price = safe(token.usdPrice ? '$' + token.usdPrice.toFixed(8) : 'N/A');
    const mc = safe(token.mcap ? '$' + (token.mcap / 1e6).toFixed(2) + 'M' : 'N/A');
    const liq = safe(token.liquidity ? '$' + (token.liquidity / 1e3).toFixed(1) + 'K' : 'N/A');
    const vol = safe(token.stats24h?.buyVolume ? '$' + ((token.stats24h.buyVolume + (token.stats24h.sellVolume || 0)) / 1e3).toFixed(1) + 'K' : 'N/A');
    const change = safe(token.stats24h?.priceChange ? token.stats24h.priceChange.toFixed(2) + '%' : 'N/A');
    
    text(`Price: ${price} | Change 24h: ${change}`);
    text(`Market Cap: ${mc} | Liquidity: ${liq}`);
    text(`Volume 24h: ${vol} | Holders: ${(token.holderCount || 0).toLocaleString()}`);
    y += 2;

    section('FORENSIC SCORES');
    if (score) {
      text(`Dominance: ${score.dominanceScore} | Origin: ${score.originScore} | Risk: ${score.riskScore}`);
      text(`True OG Prob: ${score.trueOgProbability}% | Clone Prob: ${score.cloneProbability}%`);
      text(`CTO Prob: ${score.ctoProbability}% | Migration Prob: ${score.migrationProbability}%`);
    }
    y += 2;

    section('AUTHORITY STATUS');
    const mint = token.audit?.mintAuthorityDisabled ? 'Renounced' : 'Active';
    const freeze = token.audit?.freezeAuthorityDisabled ? 'Renounced' : 'Active';
    text(`Mint Authority: ${mint}`);
    text(`Freeze Authority: ${freeze}`);
    y += 2;

    // PAGE 2
    newPage();

    section('WHALE RISK ANALYSIS');
    if (whaleRisk) {
      text(`Total Whale Power: ${whaleRisk.totalWhalePower.toFixed(1)}%`);
      text(`Critical Risk Wallets: ${whaleRisk.criticalRiskWallets}`);
      text(`Dump Probability: ${(whaleRisk.dumpProbability * 100).toFixed(1)}%`);
    }
    y += 2;

    section(`TOP HOLDERS (${topHolders.length})`);
    topHolders.slice(0, 12).forEach((h: any) => {
      if (y > h - 25) newPage();
      text(`${h.wallet?.slice(0, 8)}... | $${(h.balanceUsd / 1000).toFixed(0)}K | PnL: ${(h.unrealizedPnL || 0).toFixed(1)}%`, 6.5);
    });
    y += 2;

    section(`TOP TRADERS (${topTraders.length})`);
    topTraders.slice(0, 10).forEach((t: any) => {
      if (y > h - 25) newPage();
      text(`${t.wallet?.slice(0, 8)}... | PnL: $${(t.totalPnL || 0).toFixed(0)} | Trades: ${t.tradeCount}`, 6.5);
    });
    y += 2;

    // PAGE 3
    newPage();

    section('RISK ASSESSMENT');
    if (riskProfile) {
      text(`Overall Risk: ${riskProfile.overallRisk || 'N/A'}/100`);
      text(`Security Risk: ${riskProfile.securityRisk || 'N/A'}`);
      text(`Market Risk: ${riskProfile.marketRisk || 'N/A'}`);
    }
    y += 2;

    section('BEHAVIORAL ANALYSIS');
    if (score) {
      text(`Wallet Behavior: ${score.walletBehaviorScore}`);
      text(`Anti-Clone Confidence: ${score.antiCloneConfidence}`);
      text(`Organic Growth Pattern: ${score.organicGrowthPattern}`);
      text(`Liquidity Survival: ${score.liquiditySurvivalScore}`);
    }
    y += 2;

    section('NARRATIVE INTELLIGENCE');
    if (report) {
      text(`Narrative: ${report.narrativeFingerprintId}`);
      text(`Candidates: ${report.summary?.candidateCount || 0} | Clones: ${report.summary?.cloneCount || 0}`);
    }
    y += 2;

    section('ANOMALIES');
    if (anomalies.length > 0) {
      anomalies.slice(0, 10).forEach((a: any) => {
        if (y > h - 25) newPage();
        text(`${a.type || 'Alert'}: ${a.description || 'Detected'}`, 6.5);
      });
    } else {
      text('No anomalies detected');
    }
    y += 3;

    // DISCLAIMER
    if (y > h - 20) newPage();
    doc.setFillColor(40, 20, 20);
    doc.rect(m, y, w - 2 * m, 8, 'F');
    doc.setTextColor(255, 100, 100);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('DISCLAIMER', m + 2, y + 2);
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(6);
    doc.text('NOT financial advice. Crypto is high-risk. Always DYOR.', m + 2, y + 4);
    doc.text('OG Scan provides intelligence only.', m + 2, y + 6);

    const filename = `${safe(token.name)}-${safe(token.id).slice(0, 8)}-OGScan.pdf`;
    doc.save(filename);
    console.log('PDF saved');

  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + (error as any).message);
  }
}
