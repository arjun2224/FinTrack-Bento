import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type AssetProvider = "YAHOO" | "MFAPI";

// POST - Create a new transaction
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            ticker,
            name,
            assetType,
            market,
            type,
            quantity,
            price,
            currency,
            date,
            fxRate = 1.0,
            portfolioId,
            isSIP = false,
        } = body;

        // Validate required fields
        if (!ticker || !type || !quantity || !price || !date) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Determine provider based on asset type and market
        let provider: AssetProvider = "YAHOO";
        if (assetType === "MUTUAL_FUND" && market === "IN") {
            provider = "MFAPI";
        }

        // Find or create asset
        let asset = await prisma.asset.findUnique({
            where: { ticker },
        });

        if (!asset) {
            asset = await prisma.asset.create({
                data: {
                    ticker,
                    name: name || ticker,
                    provider,
                    assetType: assetType || "STOCK",
                    market: market || "IN",
                },
            });
        }

        // Get or create default portfolio and user
        let portfolio;
        if (portfolioId) {
            portfolio = await prisma.portfolio.findUnique({
                where: { id: portfolioId },
            });
        }

        if (!portfolio) {
            // Find or create default user
            let user = await prisma.user.findFirst();
            if (!user) {
                user = await prisma.user.create({
                    data: {
                        email: "default@fintrack.local",
                        password: "default-password-change-me",
                    },
                });
            }

            // Find or create default portfolio
            portfolio = await prisma.portfolio.findFirst({
                where: { userId: user.id },
            });

            if (!portfolio) {
                portfolio = await prisma.portfolio.create({
                    data: {
                        userId: user.id,
                        name: "My Portfolio",
                        type: "General",
                    },
                });
            }
        }

        // Create transaction
        const transaction = await prisma.transaction.create({
            data: {
                portfolioId: portfolio.id,
                assetId: asset.id,
                type,
                quantity,
                price,
                currency: currency || "INR",
                date: new Date(date),
                fxRate,
                isSIP,
            },
            include: {
                asset: true,
            },
        });

        return NextResponse.json(transaction, { status: 201 });
    } catch (error) {
        console.error("Transaction creation error:", error);
        return NextResponse.json(
            { error: "Failed to create transaction" },
            { status: 500 }
        );
    }
}

// GET - List all transactions
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const portfolioId = searchParams.get("portfolioId");

        const transactions = await prisma.transaction.findMany({
            where: portfolioId ? { portfolioId } : undefined,
            include: {
                asset: true,
            },
            orderBy: {
                date: "desc",
            },
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("Transaction fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch transactions" },
            { status: 500 }
        );
    }
}
