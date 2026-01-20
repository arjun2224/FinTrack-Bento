"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft,
    ArrowUpDown,
    TrendingUp,
    TrendingDown,
    RefreshCw,
} from "lucide-react";

// Types
interface Holding {
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
    sipCount?: number;
    isMutualFund?: boolean;
}

interface PortfolioData {
    holdings: Holding[];
    netWorth: {
        totalValue: number;
        totalInvested: number;
        profitLoss: number;
        profitLossPercent: number;
    };
}

type SortField = "ticker" | "currentValue" | "profitLoss" | "xirr" | "changePercent";
type SortDirection = "asc" | "desc";

export default function HoldingsPage() {
    const [sortField, setSortField] = useState<SortField>("currentValue");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [filterType, setFilterType] = useState<string>("all");

    const { data, isLoading, refetch, isFetching } = useQuery<PortfolioData>({
        queryKey: ["portfolio"],
        queryFn: async () => {
            const res = await fetch("/api/portfolio");
            if (!res.ok) throw new Error("Failed to fetch");
            return res.json();
        },
    });

    // Sort and filter holdings
    const sortedHoldings = useMemo(() => {
        if (!data?.holdings) return [];

        let filtered = data.holdings;

        // Apply filter
        if (filterType !== "all") {
            filtered = filtered.filter((h) => {
                switch (filterType) {
                    case "indian":
                        return h.market === "IN";
                    case "us":
                        return h.market === "US";
                    case "crypto":
                        return h.market === "CRYPTO" || h.assetType === "CRYPTO";
                    case "mf":
                        return h.isMutualFund || h.assetType === "MUTUAL_FUND";
                    case "sip":
                        return (h.sipCount ?? 0) > 0;
                    case "profit":
                        return h.profitLoss > 0;
                    case "loss":
                        return h.profitLoss < 0;
                    default:
                        return true;
                }
            });
        }

        // Apply sort
        return [...filtered].sort((a, b) => {
            let aVal: number, bVal: number;

            switch (sortField) {
                case "ticker":
                    return sortDirection === "asc"
                        ? a.ticker.localeCompare(b.ticker)
                        : b.ticker.localeCompare(a.ticker);
                case "currentValue":
                    aVal = a.currentValue;
                    bVal = b.currentValue;
                    break;
                case "profitLoss":
                    aVal = a.profitLoss;
                    bVal = b.profitLoss;
                    break;
                case "xirr":
                    aVal = a.xirr ?? -999;
                    bVal = b.xirr ?? -999;
                    break;
                case "changePercent":
                    aVal = a.changePercent;
                    bVal = b.changePercent;
                    break;
                default:
                    return 0;
            }

            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });
    }, [data?.holdings, sortField, sortDirection, filterType]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection("desc");
        }
    };

    const formatCurrency = (value: number, currency: string = "INR") => {
        const symbol = currency === "USD" ? "$" : "₹";
        if (Math.abs(value) >= 10000000) {
            return `${symbol}${(value / 10000000).toFixed(2)}Cr`;
        }
        if (Math.abs(value) >= 100000) {
            return `${symbol}${(value / 100000).toFixed(2)}L`;
        }
        if (Math.abs(value) >= 1000) {
            return `${symbol}${(value / 1000).toFixed(1)}K`;
        }
        return `${symbol}${value.toFixed(2)}`;
    };

    const SortHeader = ({
        label,
        field,
        className = "",
    }: {
        label: string;
        field: SortField;
        className?: string;
    }) => (
        <button
            onClick={() => handleSort(field)}
            className={`flex items-center gap-1 hover:text-primary transition-colors ${className}`}
        >
            {label}
            <ArrowUpDown
                className={`w-3 h-3 ${sortField === field ? "text-primary" : "text-muted-foreground"}`}
            />
        </button>
    );

    if (isLoading) {
        return (
            <div className="min-h-screen p-4 md:p-6 lg:p-8">
                <div className="flex items-center gap-4 mb-6">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    const totals = data?.netWorth || {
        totalValue: 0,
        totalInvested: 0,
        profitLoss: 0,
        profitLossPercent: 0,
    };

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">All Holdings</h1>
                        <p className="text-sm text-muted-foreground">
                            {sortedHoldings.length} assets • Total: {formatCurrency(totals.totalValue)}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </header>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
                {[
                    { value: "all", label: "All" },
                    { value: "indian", label: "Indian" },
                    { value: "us", label: "US" },
                    { value: "mf", label: "Mutual Funds" },
                    { value: "sip", label: "SIP" },
                    { value: "crypto", label: "Crypto" },
                    { value: "profit", label: "In Profit" },
                    { value: "loss", label: "In Loss" },
                ].map((filter) => (
                    <Button
                        key={filter.value}
                        variant={filterType === filter.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFilterType(filter.value)}
                    >
                        {filter.label}
                    </Button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="glass-card rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">Total Value</p>
                    <p className="text-xl font-semibold">{formatCurrency(totals.totalValue)}</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">Invested</p>
                    <p className="text-xl font-semibold">{formatCurrency(totals.totalInvested)}</p>
                </div>
                <div className="glass-card rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">Profit/Loss</p>
                    <p className={`text-xl font-semibold ${totals.profitLoss >= 0 ? "text-profit" : "text-loss"}`}>
                        {totals.profitLoss >= 0 ? "+" : ""}
                        {formatCurrency(totals.profitLoss)}
                    </p>
                </div>
                <div className="glass-card rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">Returns</p>
                    <p className={`text-xl font-semibold ${totals.profitLossPercent >= 0 ? "text-profit" : "text-loss"}`}>
                        {totals.profitLossPercent >= 0 ? "+" : ""}
                        {totals.profitLossPercent.toFixed(2)}%
                    </p>
                </div>
            </div>

            {/* Holdings Table */}
            <div className="glass-card rounded-xl overflow-hidden">
                <table className="w-full table-fixed">
                    <thead>
                        <tr className="border-b border-border/50 text-sm text-muted-foreground font-medium bg-muted/20">
                            <th className="text-left p-4 font-medium w-[40%] md:w-[25%] lg:w-[25%]">
                                <SortHeader label="Asset" field="ticker" />
                            </th>
                            <th className="text-right p-4 font-medium hidden md:table-cell md:w-[15%] lg:w-[15%]">
                                Quantity
                            </th>
                            <th className="text-right p-4 font-medium w-[30%] md:w-[25%] lg:w-[15%]">
                                <SortHeader label="Value" field="currentValue" className="justify-end w-full" />
                            </th>
                            <th className="text-right p-4 font-medium hidden lg:table-cell lg:w-[15%]">
                                <SortHeader label="P/L" field="profitLoss" className="justify-end w-full" />
                            </th>
                            <th className="text-right p-4 font-medium hidden xl:table-cell xl:w-[10%]">
                                <SortHeader label="XIRR" field="xirr" className="justify-end w-full" />
                            </th>
                            <th className="text-right p-4 font-medium w-[30%] md:w-[35%] lg:w-[20%] xl:w-[20%]">
                                <SortHeader label="Today" field="changePercent" className="justify-end w-full" />
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                        {sortedHoldings.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                    No holdings found
                                </td>
                            </tr>
                        ) : (
                            sortedHoldings.map((holding) => {
                                const isPositive = holding.profitLoss >= 0;
                                const isTodayPositive = holding.changePercent >= 0;

                                return (
                                    <tr
                                        key={holding.id}
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-medium truncate">{holding.name}</span>
                                                {holding.isMutualFund && (
                                                    <Badge variant="secondary" className="text-[10px] bg-purple-500/20 text-purple-400 shrink-0">
                                                        MF
                                                    </Badge>
                                                )}
                                                {(holding.sipCount ?? 0) > 0 && (
                                                    <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-400 shrink-0">
                                                        SIP ×{holding.sipCount}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <span>{holding.ticker}</span>
                                                <Badge variant="outline" className="text-[10px] shrink-0">
                                                    {holding.market}
                                                </Badge>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right align-top hidden md:table-cell">
                                            <div className="text-sm">
                                                <p>{holding.quantity.toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    @ {formatCurrency(holding.avgPrice, holding.currency)}
                                                </p>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right align-top">
                                            <div>
                                                <p className="font-medium">
                                                    {formatCurrency(holding.currentValue, holding.currency === "USD" ? "USD" : "INR")}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {formatCurrency(holding.totalInvested, holding.currency === "USD" ? "USD" : "INR")} (Inv)
                                                </p>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right align-top hidden lg:table-cell">
                                            <div>
                                                <p className={isPositive ? "text-profit" : "text-loss"}>
                                                    {isPositive ? "+" : ""}
                                                    {formatCurrency(holding.profitLoss, holding.currency === "USD" ? "USD" : "INR")}
                                                </p>
                                                <p className={`text-xs mt-0.5 ${isPositive ? "text-profit" : "text-loss"}`}>
                                                    {isPositive ? "+" : ""}
                                                    {holding.profitLossPercent.toFixed(2)}%
                                                </p>
                                            </div>
                                        </td>

                                        <td className="p-4 text-right align-top hidden xl:table-cell">
                                            <div className="flex justify-end">
                                                {holding.xirr != null ? (
                                                    <Badge
                                                        variant="secondary"
                                                        className={holding.xirr >= 0 ? "bg-profit/20 text-profit" : "bg-loss/20 text-loss"}
                                                    >
                                                        {holding.xirr >= 0 ? "+" : ""}
                                                        {holding.xirr.toFixed(1)}%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="p-4 text-right align-top">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1">
                                                    <p className={isTodayPositive ? "text-profit font-medium" : "text-loss font-medium"}>
                                                        {isTodayPositive ? "+" : ""}
                                                        {holding.changePercent.toFixed(2)}%
                                                    </p>
                                                    {isTodayPositive ? (
                                                        <TrendingUp className="w-4 h-4 text-profit" />
                                                    ) : (
                                                        <TrendingDown className="w-4 h-4 text-loss" />
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
