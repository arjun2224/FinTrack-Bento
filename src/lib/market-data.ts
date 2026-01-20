import yahooFinance from "yahoo-finance2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YahooQuote = any; // Using any for yahoo-finance2 quote response
import { prisma } from "./db";

// Cache TTL in seconds
const PRICE_CACHE_TTL = 60; // 60 seconds for live prices

// Types
export interface PriceData {
    ticker: string;
    price: number;
    currency: string;
    change?: number;
    changePercent?: number;
    previousClose?: number;
}

export type AssetProvider = "YAHOO" | "MFAPI";

// Yahoo Finance tickers need specific suffixes for Indian markets
export function getYahooTicker(ticker: string, market: string): string {
    if (market === "IN") {
        // Add .NS suffix for NSE stocks if not already present
        if (!ticker.endsWith(".NS") && !ticker.endsWith(".BO")) {
            return `${ticker}.NS`;
        }
    }
    return ticker;
}

// Check if cached price is still valid
async function getCachedPrice(ticker: string): Promise<PriceData | null> {
    try {
        const cached = await prisma.priceCache.findUnique({
            where: { ticker },
        });

        if (!cached) return null;

        const age = (Date.now() - cached.lastUpdated.getTime()) / 1000;
        if (age > PRICE_CACHE_TTL) return null;

        return {
            ticker: cached.ticker,
            price: cached.price,
            currency: cached.currency,
            change: cached.change ?? undefined,
            changePercent: cached.changePercent ?? undefined,
            previousClose: cached.previousClose ?? undefined,
        };
    } catch (error) {
        console.error("Cache read error:", error);
        return null;
    }
}

// Update price cache
async function updatePriceCache(data: PriceData): Promise<void> {
    try {
        await prisma.priceCache.upsert({
            where: { ticker: data.ticker },
            update: {
                price: data.price,
                currency: data.currency,
                change: data.change ?? null,
                changePercent: data.changePercent ?? null,
                previousClose: data.previousClose ?? null,
            },
            create: {
                ticker: data.ticker,
                price: data.price,
                currency: data.currency,
                change: data.change ?? null,
                changePercent: data.changePercent ?? null,
                previousClose: data.previousClose ?? null,
            },
        });
    } catch (error) {
        console.error("Cache write error:", error);
    }
}

// Fetch from Yahoo Finance with retries
async function fetchYahooQuote(
    ticker: string,
    retries = 3
): Promise<PriceData | null> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const quote = await yahooFinance.quote(ticker) as YahooQuote;

            if (!quote || typeof quote.regularMarketPrice !== 'number') {
                return null;
            }

            const data: PriceData = {
                ticker,
                price: quote.regularMarketPrice,
                currency: (quote.currency as string) || "USD",
                change: typeof quote.regularMarketChange === 'number' ? quote.regularMarketChange : undefined,
                changePercent: typeof quote.regularMarketChangePercent === 'number' ? quote.regularMarketChangePercent : undefined,
                previousClose: typeof quote.regularMarketPreviousClose === 'number' ? quote.regularMarketPreviousClose : undefined,
            };

            // Cache the result
            await updatePriceCache(data);

            return data;
        } catch (error) {
            console.error(`Yahoo Finance error (attempt ${attempt + 1}):`, error);
            if (attempt < retries - 1) {
                await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * (attempt + 1))
                );
            }
        }
    }
    return null;
}

// Fetch from MFAPI.in for Indian Mutual Funds
async function fetchMFAPIQuote(schemeCode: string): Promise<PriceData | null> {
    try {
        const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
        if (!response.ok) return null;

        const data = await response.json();
        if (!data.data || data.data.length === 0) return null;

        const latestNav = data.data[0];
        const previousNav = data.data.length > 1 ? data.data[1] : null;

        const price = parseFloat(latestNav.nav);
        const previousClose = previousNav ? parseFloat(previousNav.nav) : undefined;
        const change = previousClose ? price - previousClose : undefined;
        const changePercent =
            previousClose && change ? (change / previousClose) * 100 : undefined;

        const priceData: PriceData = {
            ticker: schemeCode,
            price,
            currency: "INR",
            change,
            changePercent,
            previousClose,
        };

        await updatePriceCache(priceData);
        return priceData;
    } catch (error) {
        console.error("MFAPI error:", error);
        return null;
    }
}

// Main function to fetch price for any asset
export async function fetchPrice(
    ticker: string,
    provider: AssetProvider,
    market: string
): Promise<PriceData | null> {
    // Check cache first
    const cachedPrice = await getCachedPrice(ticker);
    if (cachedPrice) {
        return cachedPrice;
    }

    // Fetch based on provider
    if (provider === "MFAPI") {
        return fetchMFAPIQuote(ticker);
    }

    // Default to Yahoo Finance
    const yahooTicker = getYahooTicker(ticker, market);
    return fetchYahooQuote(yahooTicker);
}

// Batch fetch multiple prices
export async function fetchPrices(
    assets: Array<{ ticker: string; provider: AssetProvider; market: string }>
): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    const toFetch: typeof assets = [];

    // Check cache for all assets first
    for (const asset of assets) {
        const cached = await getCachedPrice(asset.ticker);
        if (cached) {
            results.set(asset.ticker, cached);
        } else {
            toFetch.push(asset);
        }
    }

    // Group remaining by provider
    const yahooAssets = toFetch.filter((a) => a.provider === "YAHOO");
    const mfapiAssets = toFetch.filter((a) => a.provider === "MFAPI");

    // Batch fetch Yahoo (using quoteCombine for efficiency)
    if (yahooAssets.length > 0) {
        try {
            const yahooTickers = yahooAssets.map((a) =>
                getYahooTicker(a.ticker, a.market)
            );

            // Fetch all quotes
            const quotes = await Promise.allSettled(
                yahooTickers.map((t) => yahooFinance.quote(t))
            );

            for (let i = 0; i < quotes.length; i++) {
                const result = quotes[i];
                const asset = yahooAssets[i];

                if (result.status === "fulfilled" && result.value) {
                    const quote = result.value as YahooQuote;
                    if (typeof quote.regularMarketPrice === 'number') {
                        const data: PriceData = {
                            ticker: asset.ticker,
                            price: quote.regularMarketPrice,
                            currency: (quote.currency as string) || "USD",
                            change: typeof quote.regularMarketChange === 'number' ? quote.regularMarketChange : undefined,
                            changePercent: typeof quote.regularMarketChangePercent === 'number' ? quote.regularMarketChangePercent : undefined,
                            previousClose: typeof quote.regularMarketPreviousClose === 'number' ? quote.regularMarketPreviousClose : undefined,
                        };
                        results.set(asset.ticker, data);
                        await updatePriceCache(data);
                    }
                }
            }
        } catch (error) {
            console.error("Batch Yahoo fetch error:", error);
        }
    }

    // Parallel fetch MF NAVs
    const mfPromises = mfapiAssets.map(async (asset) => {
        const data = await fetchMFAPIQuote(asset.ticker);
        if (data) {
            results.set(asset.ticker, data);
        }
    });
    await Promise.allSettled(mfPromises);

    return results;
}

// Get USD/INR exchange rate
export async function getUSDINRRate(): Promise<number> {
    const cached = await getCachedPrice("USDINR=X");
    if (cached) {
        return cached.price;
    }

    const data = await fetchYahooQuote("USDINR=X");
    return data?.price ?? 83.5; // Fallback rate
}
