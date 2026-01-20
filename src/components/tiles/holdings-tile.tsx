"use client";

import { BentoTile } from "@/components/bento-grid";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface Holding {
    id: string;
    ticker: string;
    name: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    change: number;
    changePercent: number;
    xirr?: number | null;
    currency: string;
    market: string;
}

interface HoldingsTileProps {
    holdings: Holding[];
    onViewAll?: () => void;
    asTileContent?: boolean;
}

export function HoldingsTile({ holdings, onViewAll, asTileContent = false }: HoldingsTileProps) {
    const formatValue = (value: number, currency: string = "₹") => {
        const symbol = currency === "USD" ? "$" : "₹";
        if (Math.abs(value) >= 100000) {
            return `${symbol}${(value / 100000).toFixed(1)}L`;
        }
        if (Math.abs(value) >= 1000) {
            return `${symbol}${(value / 1000).toFixed(1)}K`;
        }
        return `${symbol}${value.toFixed(0)}`;
    };

    // Show top 5 holdings
    const displayHoldings = holdings.slice(0, 5);

    const content = (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">Top Holdings</p>
                {holdings.length > 0 && (
                    <Link
                        href="/holdings"
                        className="text-xs text-primary hover:underline"
                    >
                        View all ({holdings.length})
                    </Link>
                )}
            </div>

            {holdings.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                    No holdings yet. Add a transaction to get started.
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
                    {displayHoldings.map((holding) => {
                        const isPositive = holding.changePercent >= 0;
                        const invested = holding.quantity * holding.avgPrice;
                        const current = holding.quantity * holding.currentPrice;
                        const profit = current - invested;

                        return (
                            <div
                                key={holding.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                {/* Name & Ticker */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">{holding.name}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                        <span>{holding.ticker}</span>
                                        <Badge variant="outline" className="text-[10px] px-1">
                                            {holding.market}
                                        </Badge>
                                    </p>
                                </div>

                                {/* Mini sparkline placeholder - 7 day */}
                                <div className="w-16 h-8 bg-muted/30 rounded flex items-center justify-center">
                                    <span className="text-[10px] text-muted-foreground">7d</span>
                                </div>

                                {/* Value */}
                                <div className="text-right min-w-[80px]">
                                    <p className="font-medium">{formatValue(current, holding.currency)}</p>
                                    <p className={`text-xs ${isPositive ? "text-profit" : "text-loss"}`}>
                                        {isPositive ? "+" : ""}
                                        {formatValue(profit, holding.currency)}
                                    </p>
                                </div>

                                {/* XIRR Badge */}
                                <div className="min-w-[60px] text-right">
                                    {holding.xirr != null ? (
                                        <Badge
                                            variant="secondary"
                                            className={`${holding.xirr >= 0
                                                ? "bg-profit/20 text-profit"
                                                : "bg-loss/20 text-loss"
                                                }`}
                                        >
                                            {holding.xirr >= 0 ? "+" : ""}
                                            {holding.xirr.toFixed(1)}%
                                        </Badge>
                                    ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                </div>

                                {/* Change indicator */}
                                <div className="flex items-center gap-1">
                                    {isPositive ? (
                                        <TrendingUp className="w-4 h-4 text-profit" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-loss" />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    if (asTileContent) {
        return content;
    }

    return (
        <BentoTile colSpan={2} rowSpan={2} className="flex flex-col">
            {content}
        </BentoTile>
    );
}
