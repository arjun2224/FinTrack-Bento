import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import * as OS from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

const execAsync = promisify(exec);

// CAS Transaction Type Mapping
const TX_TYPE_MAP: Record<string, "BUY" | "SELL"> = {
    "PURCHASE": "BUY",
    "PURCHASE_SIP": "BUY",
    "SIP": "BUY",
    "SIP PURCHASE": "BUY",
    "SWITCH IN": "BUY",
    "DIVIDEND REINVESTMENT": "BUY",
    "REDEMPTION": "SELL",
    "SWITCH OUT": "SELL",
    "SELL": "SELL"
};

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const password = formData.get("password") as string || "";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const tempDir = OS.tmpdir();
        // Use randomUUID for unique temp filename
        const tempFilePath = join(tempDir, `cas-${randomUUID()}.pdf`);

        await writeFile(tempFilePath, buffer);

        let parsedData: any = null;

        try {
            const pythonScriptPath = join(process.cwd(), "scripts", "parse_cas.py");
            // Use the virtual environment python
            const pythonExecutable = join(process.cwd(), ".venv", "bin", "python");

            // Escape password for shell - simplistic but functional for basic passwords. 
            const safePassword = password.replace(/"/g, '\\"');

            const { stdout } = await execAsync(
                `${pythonExecutable} ${pythonScriptPath} "${tempFilePath}" --password "${safePassword}"`
            );

            parsedData = JSON.parse(stdout);
        } catch (execError: any) {
            // Clean up
            try { await unlink(tempFilePath); } catch { }
            const msg = execError.stderr || execError.message;
            if (msg.includes("Incorrect Password")) {
                return NextResponse.json({ error: "Incorrect Password" }, { status: 401 });
            }
            return NextResponse.json({ error: "Failed to parse CAS", details: msg }, { status: 500 });
        }

        // Cleanup temp file
        try { await unlink(tempFilePath); } catch { }

        if (!parsedData) {
            return NextResponse.json({ error: "No data parsed" }, { status: 500 });
        }

        // --- Persist to Database ---

        // 1. Get Portfolio (Defaulting to first one for now)
        const portfolio = await prisma.portfolio.findFirst();
        if (!portfolio) {
            return NextResponse.json({ error: "No portfolio found. Please create one first." }, { status: 400 });
        }

        let importCount = 0;
        const schemes = parsedData.folios?.flatMap((f: any) => f.schemes) || [];

        for (const scheme of schemes) {
            // Look for AMFI or ISIN
            const amfi = scheme.amfi || scheme.scheme_code;
            const isin = scheme.isin;
            const schemeName = scheme.scheme;

            if (!schemeName) continue;

            // Determine Ticker: Prefer AMFI, then ISIN, then generate a slug
            const ticker = amfi ? amfi.toString() : (isin || schemeName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15));

            // Find or Create Asset
            // We assume CAS is mainly Mutual Funds (MFAPI)
            let asset = await prisma.asset.findFirst({
                where: {
                    OR: [
                        { isin: isin || undefined },
                        { ticker: ticker }
                    ]
                }
            });

            if (!asset) {
                asset = await prisma.asset.create({
                    data: {
                        ticker: ticker,
                        isin: isin || null,
                        name: schemeName,
                        provider: "MFAPI",
                        assetType: "MUTUAL_FUND",
                        market: "IN",
                    }
                });
            }

            // Process Transactions
            for (const tx of scheme.transactions) {
                const dateStr = tx.date; // YYYY-MM-DD
                const typeRaw = (tx.description || "PURCHASE").toUpperCase();

                // Heuristic to determine type
                let type: "BUY" | "SELL" = "BUY";
                let foundType = false;
                for (const key in TX_TYPE_MAP) {
                    if (typeRaw.includes(key)) {
                        type = TX_TYPE_MAP[key];
                        foundType = true;
                        break;
                    }
                }
                if (!foundType && typeRaw.includes("REVERSAL")) {
                    // Handle reversals? Skip for now or treat as opposite?
                    continue;
                }

                const amount = Math.abs(parseFloat(tx.amount || "0"));
                const units = Math.abs(parseFloat(tx.units || "0"));
                const nav = parseFloat(tx.nav || "0");

                if (units === 0) continue;

                // Check if transaction exists to avoid duplicates
                // We use (Asset + Date + Units + Type) as a composite key proxy
                const existing = await prisma.transaction.findFirst({
                    where: {
                        assetId: asset.id,
                        date: new Date(dateStr),
                        // Use float tolerance or exact match? Prisma floats are exact enough for this check usually
                        quantity: { equals: units },
                        type: type,
                    }
                });

                if (!existing) {
                    await prisma.transaction.create({
                        data: {
                            portfolioId: portfolio.id,
                            assetId: asset.id,
                            type: type,
                            date: new Date(dateStr),
                            quantity: units,
                            price: nav > 0 ? nav : (amount / units) || 0,
                            currency: "INR",
                            isSIP: typeRaw.includes("SIP"),
                            notes: `CAS Import: ${tx.description}`,
                        }
                    });
                    importCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                transactions: { length: importCount },
                summary: `Imported ${importCount} new transactions.`
            }
        });

    } catch (error: any) {
        console.error("Import logic error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
