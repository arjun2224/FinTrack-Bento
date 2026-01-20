"use client";

import { SortableBentoGrid, TileConfig } from "@/components/bento-grid";
import {
    NetWorthTile,
    AssetAllocationTile,
    TaxHarvestTile,
    CurrencyExposureTile,
    HoldingsTile,
} from "@/components/tiles";
import { TransactionForm } from "@/components/transaction-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioStore, useSettingsStore, AssetClass } from "@/lib/store";
import { Plus, RefreshCw, Wallet, Settings, Upload, LogOut } from "lucide-react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { logout } from "@/app/actions/auth";

// Types for API response
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
    allocations: Array<{ name: string; value: number; color: string }>;
    currencyExposure: Array<{ currency: string; value: number; color: string }>;
    taxHarvest: {
        potentialSavings: number;
        opportunitiesCount: number;
    };
    holdings: Array<{
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
        sgbInterest: number;
        sipCount: number;
        isMutualFund: boolean;
    }>;
    fxRate: number;
}

// Helper to generate sparkline data (mock)
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

// Asset type colors (matching API)
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

// Default tile configuration with spans
const DEFAULT_TILES: TileConfig[] = [
    { id: "net-worth", colSpan: 2, rowSpan: 2 },
    { id: "asset-allocation", colSpan: 1, rowSpan: 2 },
    { id: "tax-harvest", colSpan: 1, rowSpan: 1 },
    { id: "currency-exposure", colSpan: 1, rowSpan: 1 },
    { id: "holdings", colSpan: 2, rowSpan: 2 },
];

// Skeleton for tiles during loading
function DashboardSkeleton() {
    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(140px,auto)]">
            {/* Net Worth skeleton - 2x2 */}
            <div className="glass-card rounded-xl p-4 md:col-span-2 md:row-span-2">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-10 w-40 mb-4" />
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-12 w-full" />
            </div>

            {/* Asset Allocation skeleton - 1x2 */}
            <div className="glass-card rounded-xl p-4 md:row-span-2">
                <Skeleton className="h-4 w-28 mb-3" />
                <div className="space-y-2 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                    ))}
                </div>
            </div>

            {/* Tax Harvest skeleton - 1x1 */}
            <div className="glass-card rounded-xl p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-6 w-28" />
            </div>

            {/* Currency Exposure skeleton - 1x1 */}
            <div className="glass-card rounded-xl p-4">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            </div>

            {/* Holdings skeleton - 2x2 */}
            <div className="glass-card rounded-xl p-4 md:col-span-2 md:row-span-2">
                <Skeleton className="h-4 w-24 mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-6 w-20 ml-auto" />
                            <Skeleton className="h-6 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Empty state when no transactions
function EmptyState({ onAddTransaction }: { onAddTransaction: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <Wallet className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">No transactions yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
                Start tracking your portfolio by adding your first transaction.
                You can add stocks, mutual funds, crypto, and more.
            </p>
            <Button onClick={onAddTransaction} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Transaction
            </Button>
        </div>
    );
}

export function Dashboard() {
    const { setAddTransactionOpen, tilePositions, setTilePositions } = usePortfolioStore();
    const { enabledAssetClasses } = useSettingsStore();
    const queryClient = useQueryClient();

    // Fetch portfolio data from API
    const { data: rawData, isLoading, refetch, isFetching } = useQuery<PortfolioData>({
        queryKey: ["portfolio"],
        queryFn: async () => {
            const res = await fetch("/api/portfolio");
            if (!res.ok) throw new Error("Failed to fetch portfolio");
            return res.json();
        },
        refetchInterval: 60000,
        staleTime: 30000,
    });

    // Invalidate portfolio when transaction is added
    const handleTransactionAdded = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    }, [queryClient]);

    // Filter data based on enabled asset classes
    const data = useMemo(() => {
        if (!rawData) return null;

        const filteredHoldings = rawData.holdings.filter(h =>
            enabledAssetClasses.includes(h.assetType as AssetClass)
        );

        // Recalculate Net Worth
        let totalValue = 0;
        let totalInvested = 0;
        let totalChange = 0;
        let taxHarvestSavings = 0;
        let taxHarvestCount = 0;

        const allocationMap = new Map<string, number>();
        const currencyMap = new Map<string, number>();

        filteredHoldings.forEach(h => {
            totalValue += h.currentValue;
            totalInvested += h.totalInvested;
            totalChange += (h.currentValue - h.totalInvested); // This is approximate change since we don't have daily change value per holding in HoldingSummary easily accessible except 'change' which is per unit.
            // Wait, h.change is price change per unit.
            // h.change * h.quantity * fxRate is the absolute change for the day?
            // Actually changePercent is more reliable?
            // Let's use logic: daily change = (currentPrice - yesterdayPrice) * quantity.
            // HoldingSummary has 'change' (absolute price change per unit).
            // But we need to account for FX?
            // h.currentValue is in INR.
            // Assuming h.change is in asset currency.
            // We'll stick to simple totals.

            if (h.isHarvestable) {
                taxHarvestSavings += h.harvestSavings;
                taxHarvestCount++;
            }

            // Allocation
            let allocCategory = h.assetType;
            if (h.assetType === "STOCK") {
                allocCategory = h.market === "IN" ? "Indian Equity" : "US Equity";
            } else if (h.assetType === "MUTUAL_FUND") {
                allocCategory = "Mutual Funds";
            } else if (h.assetType === "CRYPTO") {
                allocCategory = "Crypto";
            } else if (h.assetType === "SGB") { // Fix casing to match API
                allocCategory = "SGB";
            } else if (h.assetType === "CASH") {
                allocCategory = "Cash";
            }
            allocationMap.set(allocCategory, (allocationMap.get(allocCategory) ?? 0) + h.currentValue);

            // Currency - use holding currency
            currencyMap.set(h.currency, (currencyMap.get(h.currency) ?? 0) + h.currentValue);
        });

        // Use rawData.netWorth sparkline if possible, but scaled?
        // Actually, let's just generate a new one based on new totalValue
        const sparklineData = generateSparkline(totalValue, 10);

        // Build allocations
        const allocations = Array.from(allocationMap.entries())
            .map(([name, value]) => ({
                name,
                value,
                color: ASSET_COLORS[name] ?? "#94a3b8",
            }))
            .sort((a, b) => b.value - a.value);

        // Build currency exposure
        const currencyExposure = Array.from(currencyMap.entries())
            .map(([currency, value]) => ({
                currency,
                value,
                color: CURRENCY_COLORS[currency] ?? "#94a3b8",
            }))
            .sort((a, b) => b.value - a.value);

        // Calculate total change amount
        // API calculates it as sum of (priceChange * quantity * fxRate).
        // holding.change is price change.
        // We can approximate or just recalculate properly if we trust holding.change
        // HoldingSummary has 'change'.
        // We need FX rate for the holding. `currency` tells us if it's USD or INR.
        // If USD, we need the exchange rate. rawData.fxRate is available?
        // rawData.fxRate is available.

        const fxRate = rawData.fxRate;

        let dailyChange = 0;
        filteredHoldings.forEach(h => {
            const holdingFx = h.currency === "USD" ? fxRate : 1;
            dailyChange += h.change * h.quantity * holdingFx;
        });

        return {
            netWorth: {
                totalValue,
                totalInvested,
                change: dailyChange,
                changePercent: totalValue > 0 ? (dailyChange / totalValue) * 100 : 0,
                profitLoss: totalValue - totalInvested,
                profitLossPercent: totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0,
                sparklineData,
            },
            allocations,
            currencyExposure,
            taxHarvest: {
                potentialSavings: taxHarvestSavings,
                opportunitiesCount: taxHarvestCount,
            },
            holdings: filteredHoldings,
            fxRate: rawData.fxRate
        };

    }, [rawData, enabledAssetClasses]);

    // Build tile configs from store, falling back to defaults
    const tileConfigs = useMemo(() => {
        const storedIds = tilePositions.map((t) => t.id);
        const defaults = DEFAULT_TILES.filter((t) => !storedIds.includes(t.id));

        return [
            ...tilePositions
                .filter((t) => t.visible)
                .map((t) => {
                    const defaultTile = DEFAULT_TILES.find((d) => d.id === t.id);
                    return {
                        id: t.id,
                        colSpan: defaultTile?.colSpan ?? 1,
                        rowSpan: defaultTile?.rowSpan ?? 1,
                    } as TileConfig;
                }),
            ...defaults,
        ];
    }, [tilePositions]);

    // Handle tile reorder
    const handleReorder = useCallback(
        (newOrder: TileConfig[]) => {
            setTilePositions(
                newOrder.map((tile, index) => ({
                    id: tile.id,
                    order: index,
                    visible: true,
                }))
            );
        },
        [setTilePositions]
    );

    // Render tile content by ID
    const renderTile = useCallback(
        (id: string) => {
            if (!data) return null;

            switch (id) {
                case "net-worth":
                    return (
                        <NetWorthTile
                            totalValue={data.netWorth.totalValue}
                            change={data.netWorth.change}
                            changePercent={data.netWorth.changePercent}
                            sparklineData={data.netWorth.sparklineData}
                            asTileContent
                        />
                    );
                case "asset-allocation":
                    return <AssetAllocationTile allocations={data.allocations} asTileContent />;
                case "tax-harvest":
                    return (
                        <TaxHarvestTile
                            potentialSavings={data.taxHarvest.potentialSavings}
                            opportunitiesCount={data.taxHarvest.opportunitiesCount}
                            asTileContent
                        />
                    );
                case "currency-exposure":
                    return <CurrencyExposureTile exposures={data.currencyExposure} asTileContent />;
                case "holdings":
                    return <HoldingsTile holdings={data.holdings} asTileContent />;
                default:
                    return null;
            }
        },
        [data]
    );

    // Show skeleton while loading
    if (isLoading) {
        return (
            <div className="min-h-screen p-4 md:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            FinTrack-Bento
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Your portfolio command center
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" disabled>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button disabled>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Transaction
                        </Button>
                    </div>
                </header>
                <DashboardSkeleton />
            </div>
        );
    }

    // Show empty state if no data
    const isEmpty = !rawData || rawData.holdings.length === 0;

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        FinTrack-Bento
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Your portfolio command center
                        <span className="text-xs ml-2 text-muted-foreground/60">• Drag tiles to reorder</span>
                    </p>
                </div>

                <div className="flex gap-2">
                    <Link href="/import">
                        <Button variant="outline" size="icon">
                            <Upload className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Link href="/settings">
                        <Button variant="outline" size="icon">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    </Button>
                    <Button onClick={() => setAddTransactionOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Transaction
                    </Button>
                    <form action={logout}>
                        <Button
                            variant="ghost"
                            size="sm"
                            type="submit"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </Button>
                    </form>
                </div>
            </header>

            {isEmpty ? (
                <EmptyState onAddTransaction={() => setAddTransactionOpen(true)} />
            ) : (
                <SortableBentoGrid
                    tiles={tileConfigs}
                    renderTile={renderTile}
                    onReorder={handleReorder}
                />
            )}

            {/* Transaction Form Modal */}
            <TransactionForm onSuccess={handleTransactionAdded} />
        </div>
    );
}
