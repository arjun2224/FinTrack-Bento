import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchPrices, getUSDINRRate, AssetProvider } from "@/lib/market-data";
import { calculateXIRR, calculateAbsoluteReturn, calculateSGBInterest, type HoldingData } from "@/lib/financial-engine";

// Types for portfolio response
interface HoldingSummary {
    id: string;
    ticker: string;
    name: string;
    assetType: string;
    market: string;
    quantity: number;
    avgPrice: number;
    totalInvested: number;
    currentPrice: number;
    currentValue: number;
    profitLoss: number;
    profitLossPercent: number;
    xirr: number | null;
    currency: string;
    change: number;
    changePercent: number;
    isHarvestable: boolean;
    harvestSavings: number;
    sgbInterest: number; // Accrued SGB interest (2.5% p.a.)
    sipCount: number; // Number of SIP transactions
    isMutualFund: boolean;
}

interface TaxHarvestOpportunity {
    ticker: string;
    name: string;
    loss: number;
    taxRate: number;
    potentialSavings: number;
    taxType: "STCG" | "LTCG";
}

interface AllocationItem {
    name: string;
    value: number;
    color: string;
}

interface CurrencyExposure {
    currency: string;
    value: number;
    color: string;
}

interface PortfolioData {
    netWorth: {
        totalValue: number;
        totalInvested: number;
        change: number;
        changePercent: number;
        profitLoss: number;
        profitLossPercent: number;
        sparklineData: number[];
    };
    allocations: AllocationItem[];
    currencyExposure: CurrencyExposure[];
    taxHarvest: {
        potentialSavings: number;
        opportunitiesCount: number;
    };
    holdings: HoldingSummary[];
    fxRate: number; // Current USD/INR rate
}

// Asset type colors
const ASSET_COLORS: Record<string, string> = {
    "Indian Equity": "#6366f1",
    "US Equity": "#10b981",
    "Mutual Funds": "#8b5cf6",
    Crypto: "#f59e0b",
    SGB: "#eab308",
    Cash: "#64748b",
};

const CURRENCY_COLORS: Record<string, string> = {
    INR: "#6366f1",
    USD: "#10b981",
    BTC: "#f59e0b",
    ETH: "#8b5cf6",
};

export async function GET() {
    try {
        // Get all transactions with assets
        const transactions = await prisma.transaction.findMany({
            include: {
                asset: true,
            },
            orderBy: {
                date: "asc",
            },
        });

        if (transactions.length === 0) {
            // Return empty portfolio data
            return NextResponse.json({
                netWorth: {
                    totalValue: 0,
                    totalInvested: 0,
                    change: 0,
                    changePercent: 0,
                    profitLoss: 0,
                    profitLossPercent: 0,
                    sparklineData: [],
                },
                allocations: [],
                currencyExposure: [],
                taxHarvest: { potentialSavings: 0, opportunitiesCount: 0 },
                holdings: [],
                fxRate: 85, // Default FX rate
            } as PortfolioData);
        }

        // Group transactions by asset
        const assetMap = new Map<string, {
            asset: typeof transactions[0]["asset"];
            transactions: typeof transactions;
        }>();

        for (const tx of transactions) {
            const existing = assetMap.get(tx.assetId);
            if (existing) {
                existing.transactions.push(tx);
            } else {
                assetMap.set(tx.assetId, {
                    asset: tx.asset,
                    transactions: [tx],
                });
            }
        }

        // Get current USD/INR rate
        const usdInrRate = await getUSDINRRate();

        // Fetch live prices for all assets
        const assetsToFetch = Array.from(assetMap.values()).map((a) => ({
            ticker: a.asset.ticker,
            provider: a.asset.provider as AssetProvider,
            market: a.asset.market,
        }));

        const prices = await fetchPrices(assetsToFetch);

        // Calculate holdings
        const holdings: HoldingSummary[] = [];
        let totalValue = 0;
        let totalInvested = 0;
        let totalChange = 0;
        let taxHarvestSavings = 0;
        let taxHarvestCount = 0;

        const allocationMap = new Map<string, number>();
        const currencyMap = new Map<string, number>();

        for (const [, data] of assetMap) {
            const { asset, transactions: txs } = data;

            // Calculate quantity and average price
            let quantity = 0;
            let totalCost = 0;

            for (const tx of txs) {
                if (tx.type === "BUY") {
                    quantity += tx.quantity;
                    totalCost += tx.quantity * tx.price * tx.fxRate;
                } else {
                    quantity -= tx.quantity;
                    totalCost -= tx.quantity * tx.price * tx.fxRate;
                }
            }

            if (quantity <= 0) continue; // Skip closed positions

            const avgPrice = totalCost / quantity;
            const priceData = prices.get(asset.ticker);

            // Get current price with exchange rate
            let currentPrice = priceData?.price ?? avgPrice;
            let fxRate = 1;

            if (asset.market === "US" || priceData?.currency === "USD") {
                fxRate = usdInrRate;
            }

            const currentValue = quantity * currentPrice * fxRate;
            const invested = totalCost;
            const profitLoss = currentValue - invested;
            const profitLossPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;

            // Calculate XIRR
            const holdingData: HoldingData = {
                transactions: txs.map((tx) => ({
                    type: tx.type as "BUY" | "SELL",
                    quantity: tx.quantity,
                    price: tx.price,
                    date: tx.date,
                    fxRate: tx.fxRate,
                })),
                currentPrice,
                currentFxRate: fxRate,
            };

            let xirr = calculateXIRR(holdingData);
            if (xirr === null) {
                xirr = calculateAbsoluteReturn(holdingData);
            }

            // Tax harvest detection - look for positions at loss that can be harvested
            let isHarvestable = false;
            let harvestSavings = 0;

            if (profitLoss < 0 && asset.market === "IN" && (asset.assetType === "STOCK" || asset.assetType === "MUTUAL_FUND")) {
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

                // Check if any buys are within 1 year (STCG) or over 1 year (LTCG)
                const hasSTCGLoss = txs.some(t => t.type === "BUY" && new Date(t.date) > oneYearAgo);
                const hasLTCGLoss = txs.some(t => t.type === "BUY" && new Date(t.date) <= oneYearAgo);

                // Calculate potential savings
                // STCG: 20% tax rate, LTCG: 12.5% tax rate
                const loss = Math.abs(profitLoss);
                if (hasSTCGLoss) {
                    isHarvestable = true;
                    harvestSavings = loss * 0.20; // 20% STCG rate
                    taxHarvestSavings += harvestSavings;
                    taxHarvestCount++;
                } else if (hasLTCGLoss) {
                    isHarvestable = true;
                    harvestSavings = loss * 0.125; // 12.5% LTCG rate
                    taxHarvestSavings += harvestSavings;
                    taxHarvestCount++;
                }
            }

            // Calculate SGB interest accrual (2.5% p.a. on issue price)
            let sgbInterest = 0;
            if (asset.assetType === "SGB") {
                // Find the earliest buy date for SGB
                const buyTxs = txs.filter(t => t.type === "BUY");
                if (buyTxs.length > 0) {
                    const earliestBuy = buyTxs.reduce((min, t) =>
                        new Date(t.date) < new Date(min.date) ? t : min
                    );
                    // avgPrice is the issue price for SGBs
                    sgbInterest = calculateSGBInterest(avgPrice, quantity, new Date(earliestBuy.date));
                }
            }

            // Count SIP transactions for this holding
            const sipCount = txs.filter(t => t.isSIP).length;
            const isMutualFund = asset.assetType === "MUTUAL_FUND";

            holdings.push({
                id: asset.id,
                ticker: asset.ticker,
                name: asset.name,
                assetType: asset.assetType,
                market: asset.market,
                quantity,
                avgPrice,
                totalInvested: invested,
                currentPrice,
                currentValue,
                profitLoss,
                profitLossPercent,
                xirr,
                currency: asset.market === "US" ? "USD" : "INR",
                change: priceData?.change ?? 0,
                changePercent: priceData?.changePercent ?? 0,
                isHarvestable,
                harvestSavings,
                sgbInterest,
                sipCount,
                isMutualFund,
            });

            totalValue += currentValue;
            totalInvested += invested;
            totalChange += (priceData?.change ?? 0) * quantity * fxRate;

            // Allocation tracking
            let allocCategory = asset.assetType;
            if (asset.assetType === "STOCK") {
                allocCategory = asset.market === "IN" ? "Indian Equity" : "US Equity";
            } else if (asset.assetType === "MUTUAL_FUND") {
                allocCategory = "Mutual Funds";
            }
            allocationMap.set(allocCategory, (allocationMap.get(allocCategory) ?? 0) + currentValue);

            // Currency tracking
            const curr = asset.market === "US" || asset.market === "CRYPTO" ? "USD" : "INR";
            currencyMap.set(curr, (currencyMap.get(curr) ?? 0) + currentValue);
        }

        // Sort holdings by current value descending
        holdings.sort((a, b) => b.currentValue - a.currentValue);

        // Build allocations
        const allocations: AllocationItem[] = Array.from(allocationMap.entries())
            .map(([name, value]) => ({
                name,
                value,
                color: ASSET_COLORS[name] ?? "#94a3b8",
            }))
            .sort((a, b) => b.value - a.value);

        // Build currency exposure
        const currencyExposure: CurrencyExposure[] = Array.from(currencyMap.entries())
            .map(([currency, value]) => ({
                currency,
                value,
                color: CURRENCY_COLORS[currency] ?? "#94a3b8",
            }))
            .sort((a, b) => b.value - a.value);

        // Generate mock sparkline (would need historical data for real implementation)
        const sparklineData = generateSparkline(totalValue, 10);

        const response: PortfolioData = {
            netWorth: {
                totalValue,
                totalInvested,
                change: totalChange,
                changePercent: totalValue > 0 ? (totalChange / totalValue) * 100 : 0,
                profitLoss: totalValue - totalInvested,
                profitLossPercent: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
                sparklineData,
            },
            allocations,
            currencyExposure,
            taxHarvest: {
                potentialSavings: Math.round(taxHarvestSavings),
                opportunitiesCount: taxHarvestCount,
            },
            holdings,
            fxRate: usdInrRate,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Portfolio fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch portfolio data" },
            { status: 500 }
        );
    }
}

// Generate mock sparkline data based on current value
function generateSparkline(currentValue: number, points: number): number[] {
    if (currentValue === 0) return [];

    const data: number[] = [];
    const variance = currentValue * 0.05; // 5% variance

    for (let i = 0; i < points; i++) {
        const randomVariation = (Math.random() - 0.5) * variance;
        const trendFactor = (i / points) * 0.02 * currentValue; // Slight upward trend
        data.push(currentValue - variance + randomVariation + trendFactor);
    }

    data.push(currentValue); // End with current value
    return data;
}
