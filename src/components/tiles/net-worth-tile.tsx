"use client";

import { BentoTile } from "@/components/bento-grid";
import { TrendingUp, TrendingDown } from "lucide-react";
import { ReactNode } from "react";

interface NetWorthTileProps {
    totalValue: number;
    change: number;
    changePercent: number;
    currency?: string;
    sparklineData?: number[];
    asTileContent?: boolean;
}

export function NetWorthTile({
    totalValue,
    change,
    changePercent,
    currency = "₹",
    sparklineData = [],
    asTileContent = false,
}: NetWorthTileProps) {
    const isPositive = change >= 0;

    // Format currency
    const formatValue = (value: number) => {
        if (value >= 10000000) {
            return `${(value / 10000000).toFixed(2)} Cr`;
        } else if (value >= 100000) {
            return `${(value / 100000).toFixed(2)} L`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(2)} K`;
        }
        return value.toFixed(2);
    };

    // Simple sparkline SVG
    const renderSparkline = () => {
        if (sparklineData.length < 2) return null;

        const min = Math.min(...sparklineData);
        const max = Math.max(...sparklineData);
        const range = max - min || 1;

        const width = 200;
        const height = 50;
        const padding = 2;

        const points = sparklineData
            .map((value, i) => {
                const x = padding + (i / (sparklineData.length - 1)) * (width - 2 * padding);
                const y = height - padding - ((value - min) / range) * (height - 2 * padding);
                return `${x},${y}`;
            })
            .join(" ");

        return (
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-12 mt-4"
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="sparkline-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop
                            offset="0%"
                            stopColor={isPositive ? "var(--profit)" : "var(--loss)"}
                            stopOpacity="0.3"
                        />
                        <stop
                            offset="100%"
                            stopColor={isPositive ? "var(--profit)" : "var(--loss)"}
                            stopOpacity="0"
                        />
                    </linearGradient>
                </defs>
                <polyline
                    fill="none"
                    stroke={isPositive ? "var(--profit)" : "var(--loss)"}
                    strokeWidth="2"
                    points={points}
                />
                <polygon
                    fill="url(#sparkline-gradient)"
                    points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
                />
            </svg>
        );
    };

    const content = (
        <div className="flex flex-col justify-between h-full">
            <div>
                <p className="text-sm text-muted-foreground mb-1">Net Worth</p>
                <h2 className="text-4xl font-bold tracking-tight">
                    {currency}
                    {formatValue(totalValue)}
                </h2>
            </div>

            <div className="flex items-center gap-2 mt-2">
                {isPositive ? (
                    <TrendingUp className="w-5 h-5 text-profit" />
                ) : (
                    <TrendingDown className="w-5 h-5 text-loss" />
                )}
                <span className={isPositive ? "text-profit" : "text-loss"}>
                    {isPositive ? "+" : ""}
                    {currency}
                    {Math.abs(change).toLocaleString()}
                </span>
                <span className={`text-sm ${isPositive ? "text-profit" : "text-loss"}`}>
                    ({isPositive ? "+" : ""}
                    {changePercent.toFixed(2)}%)
                </span>
            </div>

            {renderSparkline()}
        </div>
    );

    if (asTileContent) {
        return content;
    }

    return (
        <BentoTile colSpan={2} rowSpan={2} className="flex flex-col justify-between">
            {content}
        </BentoTile>
    );
}
