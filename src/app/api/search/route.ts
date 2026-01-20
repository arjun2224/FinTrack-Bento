import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

// Create yahoo-finance2 instance (v3 API requires this)
const yahooFinance = new YahooFinance();

export interface SearchResult {
    ticker: string;
    name: string;
    type: string;
    exchange?: string;
}

// Search for stocks using Yahoo Finance
async function searchYahoo(query: string, market: string, assetType: string): Promise<SearchResult[]> {
    try {
        const results = await yahooFinance.search(query, {
            quotesCount: 15,
            newsCount: 0,
        });

        if (!results.quotes || results.quotes.length === 0) {
            return [];
        }

        // Filter by market and asset type
        const filtered = results.quotes.filter((q) => {
            // Filter for crypto
            if (assetType === "CRYPTO") {
                return q.quoteType === "CRYPTOCURRENCY";
            }

            // Filter for stocks by market
            if (market === "IN") {
                return q.exchange === "NSI" || q.exchange === "BSE" || q.exchange === "NSE";
            } else if (market === "US") {
                return q.exchange === "NYQ" || q.exchange === "NMS" || q.exchange === "NGM" || q.exchange === "NYSE" || q.exchange === "NASDAQ";
            }
            return true;
        });

        return filtered.map((q) => ({
            ticker: String(q.symbol || "").replace(".NS", "").replace(".BO", ""),
            name: String(q.shortname || q.longname || q.symbol || ""),
            type: String(q.quoteType || "EQUITY"),
            exchange: q.exchange as string | undefined,
        }));
    } catch (error) {
        console.error("Yahoo search error:", error);
        return [];
    }
}

// Search for mutual funds using MFAPI
async function searchMutualFunds(query: string): Promise<SearchResult[]> {
    try {
        const response = await fetch("https://api.mfapi.in/mf/search?q=" + encodeURIComponent(query));
        if (!response.ok) return [];

        const data = await response.json();
        if (!Array.isArray(data)) return [];

        return data.slice(0, 10).map((mf: { schemeCode: number; schemeName: string }) => ({
            ticker: String(mf.schemeCode),
            name: mf.schemeName,
            type: "MUTUAL_FUND",
        }));
    } catch (error) {
        console.error("MFAPI search error:", error);
        return [];
    }
}

// Lookup a specific ticker to get its name
async function lookupTicker(ticker: string, assetType: string, market: string): Promise<SearchResult | null> {
    try {
        if (assetType === "MUTUAL_FUND") {
            // For mutual funds, fetch the scheme details
            const response = await fetch(`https://api.mfapi.in/mf/${ticker}`);
            if (!response.ok) return null;

            const data = await response.json();
            if (!data.meta) return null;

            return {
                ticker: ticker,
                name: data.meta.scheme_name || data.meta.fund_house,
                type: "MUTUAL_FUND",
            };
        } else if (assetType === "SGB" || assetType === "CASH") {
            // SGB and Cash don't have external APIs - user enters manually
            return null;
        } else if (assetType === "CRYPTO") {
            // For crypto, use Yahoo Finance with suffix like BTC-USD
            let cryptoTicker = ticker;
            if (!ticker.includes("-")) {
                cryptoTicker = `${ticker}-USD`;
            }
            const quote = await yahooFinance.quote(cryptoTicker);
            if (!quote) return null;

            return {
                ticker: ticker,
                name: quote.shortName || quote.longName || ticker,
                type: "CRYPTOCURRENCY",
                exchange: quote.exchange,
            };
        } else {
            // For stocks, use Yahoo Finance quote
            const yahooTicker = market === "IN" ? `${ticker}.NS` : ticker;
            const quote = await yahooFinance.quote(yahooTicker);

            if (!quote) return null;

            return {
                ticker: ticker,
                name: quote.shortName || quote.longName || ticker,
                type: "STOCK",
                exchange: quote.exchange,
            };
        }
    } catch (error) {
        console.error("Ticker lookup error:", error);
        return null;
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const assetType = searchParams.get("assetType") || "STOCK";
    const market = searchParams.get("market") || "IN";
    const mode = searchParams.get("mode") || "search"; // "search" or "lookup"

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    // SGB and Cash don't have search APIs - return empty
    if (assetType === "SGB" || assetType === "CASH") {
        return NextResponse.json({ results: [], message: "Manual entry required for this asset type" });
    }

    try {
        if (mode === "lookup") {
            // Lookup a specific ticker
            const result = await lookupTicker(query, assetType, market);
            return NextResponse.json({ result });
        }

        // Search mode
        let results: SearchResult[] = [];

        if (assetType === "MUTUAL_FUND") {
            results = await searchMutualFunds(query);
        } else {
            // STOCK or CRYPTO - both use Yahoo Finance
            results = await searchYahoo(query, market, assetType);
        }

        return NextResponse.json({ results });
    } catch (error) {
        console.error("Search API error:", error);
        return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
}
