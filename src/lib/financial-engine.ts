import { xirr, type CashFlow } from "xirr";

// Types for financial calculations
export interface Transaction {
    type: "BUY" | "SELL";
    quantity: number;
    price: number;
    date: Date;
    fxRate: number;
}

export interface HoldingData {
    transactions: Transaction[];
    currentPrice: number;
    currentFxRate: number;
}

export interface TaxInfo {
    type: "STCG" | "LTCG" | "DEBT_SLAB" | "CRYPTO";
    rate: number;
    amount: number;
    isHarvestable: boolean;
}

// Calculate XIRR (Extended Internal Rate of Return)
export function calculateXIRR(data: HoldingData): number | null {
    try {
        const cashFlows: CashFlow[] = [];

        // Add all transactions as cash flows
        for (const transaction of data.transactions) {
            const amount = transaction.quantity * transaction.price * transaction.fxRate;
            cashFlows.push({
                amount: transaction.type === "BUY" ? -amount : amount,
                date: new Date(transaction.date),
            });
        }

        // Calculate current value
        const currentQuantity = data.transactions.reduce((sum, t) => {
            return sum + (t.type === "BUY" ? t.quantity : -t.quantity);
        }, 0);

        if (currentQuantity <= 0) {
            // Position is closed, no XIRR applicable
            return null;
        }

        const currentValue = currentQuantity * data.currentPrice * data.currentFxRate;

        // Add current value as final positive cash flow
        cashFlows.push({
            amount: currentValue,
            date: new Date(),
        });

        // Calculate XIRR (returns as decimal, e.g., 0.15 for 15%)
        const xirrResult = xirr(cashFlows);

        // Return as percentage
        return xirrResult * 100;
    } catch (error) {
        console.error("XIRR calculation error:", error);
        return null;
    }
}

// Calculate absolute return when XIRR fails
export function calculateAbsoluteReturn(data: HoldingData): number {
    const totalInvested = data.transactions.reduce((sum, t) => {
        const amount = t.quantity * t.price * t.fxRate;
        return sum + (t.type === "BUY" ? amount : -amount);
    }, 0);

    const currentQuantity = data.transactions.reduce((sum, t) => {
        return sum + (t.type === "BUY" ? t.quantity : -t.quantity);
    }, 0);

    const currentValue = currentQuantity * data.currentPrice * data.currentFxRate;

    if (totalInvested === 0) return 0;

    return ((currentValue - totalInvested) / totalInvested) * 100;
}

// India Tax Rules 2024
// Equity: STCG 20%, LTCG 12.5% (after 1 year, above ₹1.25L exemption)
// Debt MF (post Apr 2023): Taxed at slab rate
// Crypto: Flat 30%, no loss offset

export function calculateIndianEquityTax(
    transactions: Transaction[],
    currentPrice: number,
    assetType: "STOCK" | "MUTUAL_FUND"
): TaxInfo[] {
    const taxes: TaxInfo[] = [];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Group by holding period
    let stcgGain = 0;
    let ltcgGain = 0;

    for (const t of transactions) {
        if (t.type !== "BUY") continue;

        const buyPrice = t.price * t.fxRate;
        const currentValue = currentPrice;
        const gain = (currentValue - buyPrice) * t.quantity;

        if (new Date(t.date) > oneYearAgo) {
            stcgGain += gain;
        } else {
            ltcgGain += gain;
        }
    }

    if (stcgGain !== 0) {
        taxes.push({
            type: "STCG",
            rate: 20,
            amount: stcgGain > 0 ? stcgGain * 0.2 : 0,
            isHarvestable: stcgGain < 0,
        });
    }

    if (ltcgGain !== 0) {
        // Apply ₹1.25L exemption for LTCG
        const taxableLTCG = Math.max(0, ltcgGain - 125000);
        taxes.push({
            type: "LTCG",
            rate: 12.5,
            amount: taxableLTCG * 0.125,
            isHarvestable: ltcgGain < 0,
        });
    }

    return taxes;
}

export function calculateCryptoTax(
    transactions: Transaction[],
    currentPrice: number
): TaxInfo {
    const totalGain = transactions.reduce((sum, t) => {
        if (t.type !== "BUY") return sum;
        const gain = (currentPrice - t.price * t.fxRate) * t.quantity;
        return sum + gain;
    }, 0);

    return {
        type: "CRYPTO",
        rate: 30,
        amount: totalGain > 0 ? totalGain * 0.3 : 0,
        isHarvestable: false, // Crypto losses cannot offset gains in India
    };
}

// US Tax: Wash Sale Detection
// If you sell at a loss and buy the same security within 30 days, it's a wash sale
export function detectWashSale(
    transactions: Transaction[],
    ticker: string
): { isWashSale: boolean; affectedTransactions: Date[] } {
    const sortedTransactions = [...transactions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const affectedTransactions: Date[] = [];
    const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

    for (let i = 0; i < sortedTransactions.length; i++) {
        const t = sortedTransactions[i];
        if (t.type !== "SELL") continue;

        // Check if sold at a loss (simplified - would need acquisition cost)
        // For now, flag any sell followed by buy within 30 days
        for (let j = i + 1; j < sortedTransactions.length; j++) {
            const future = sortedTransactions[j];
            const timeDiff = new Date(future.date).getTime() - new Date(t.date).getTime();

            if (timeDiff > thirtyDays) break;

            if (future.type === "BUY") {
                affectedTransactions.push(new Date(t.date));
                break;
            }
        }
    }

    return {
        isWashSale: affectedTransactions.length > 0,
        affectedTransactions,
    };
}

// Calculate Forex Impact (for US stocks held by Indian investors)
export function calculateForexImpact(
    buyFxRate: number,
    currentFxRate: number,
    assetReturn: number
): { totalReturn: number; assetContribution: number; forexContribution: number } {
    // Total return in INR = (1 + asset return) * (current FX / buy FX) - 1
    const forexChange = (currentFxRate / buyFxRate) - 1;
    const totalReturn = (1 + assetReturn / 100) * (1 + forexChange) - 1;

    return {
        totalReturn: totalReturn * 100,
        assetContribution: assetReturn,
        forexContribution: forexChange * 100,
    };
}

// SGB (Sovereign Gold Bond) specific calculations
export function calculateSGBInterest(
    issuePrice: number,
    quantity: number,
    issueDate: Date
): number {
    // SGB pays 2.5% annual interest on issue price
    const annualRate = 0.025;
    const yearsHeld = (Date.now() - issueDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const accruedInterest = issuePrice * quantity * annualRate * yearsHeld;

    return accruedInterest;
}

// Portfolio aggregation helpers
export function calculateTotalValue(
    holdings: Array<{ quantity: number; currentPrice: number; fxRate: number }>
): number {
    return holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice * h.fxRate, 0);
}

export function calculateTotalInvested(transactions: Transaction[]): number {
    return transactions.reduce((sum, t) => {
        const amount = t.quantity * t.price * t.fxRate;
        return sum + (t.type === "BUY" ? amount : -amount);
    }, 0);
}
