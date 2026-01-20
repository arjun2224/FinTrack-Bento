import { NextRequest, NextResponse } from "next/server";
import { fetchPrice, fetchPrices, AssetProvider } from "@/lib/market-data";

// GET - Fetch prices for assets
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const tickersParam = searchParams.get("tickers");

        if (!tickersParam) {
            return NextResponse.json(
                { error: "Missing tickers parameter" },
                { status: 400 }
            );
        }

        // Parse tickers - format: "TICKER:PROVIDER:MARKET,..."
        const tickerList = tickersParam.split(",").map((t) => {
            const [ticker, provider = "YAHOO", market = "IN"] = t.split(":");
            return {
                ticker,
                provider: provider as AssetProvider,
                market,
            };
        });

        if (tickerList.length === 1) {
            // Single ticker
            const { ticker, provider, market } = tickerList[0];
            const price = await fetchPrice(ticker, provider, market);

            if (!price) {
                return NextResponse.json(
                    { error: `Price not found for ${ticker}` },
                    { status: 404 }
                );
            }

            return NextResponse.json(price);
        }

        // Multiple tickers - batch fetch
        const prices = await fetchPrices(tickerList);
        const result: Record<string, unknown> = {};

        prices.forEach((price, ticker) => {
            result[ticker] = price;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Price fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch prices" },
            { status: 500 }
        );
    }
}
