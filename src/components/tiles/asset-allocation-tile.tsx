"use client";

import { BentoTile } from "@/components/bento-grid";

interface AllocationItem {
    name: string;
    value: number;
    color: string;
}

interface AssetAllocationTileProps {
    allocations: AllocationItem[];
    asTileContent?: boolean;
}

export function AssetAllocationTile({ allocations, asTileContent = false }: AssetAllocationTileProps) {
    const total = allocations.reduce((sum, item) => sum + item.value, 0);

    // Format value
    const formatValue = (value: number) => {
        if (value >= 100000) {
            return `₹${(value / 100000).toFixed(1)}L`;
        } else if (value >= 1000) {
            return `₹${(value / 1000).toFixed(1)}K`;
        }
        return `₹${value.toFixed(0)}`;
    };

    const content = (
        <div className="flex flex-col h-full">
            <p className="text-sm text-muted-foreground mb-3">Asset Allocation</p>

            {/* Stacked bar */}
            <div className="h-6 rounded-full overflow-hidden flex mb-4">
                {allocations.map((item, idx) => (
                    <div
                        key={idx}
                        className="h-full transition-all duration-300 hover:opacity-80"
                        style={{
                            width: `${(item.value / total) * 100}%`,
                            backgroundColor: item.color,
                        }}
                        title={`${item.name}: ${formatValue(item.value)}`}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2 overflow-auto">
                {allocations.map((item, idx) => {
                    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                    return (
                        <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-muted-foreground">{item.name}</span>
                            </div>
                            <div className="flex gap-2">
                                <span>{formatValue(item.value)}</span>
                                <span className="text-muted-foreground">({percentage}%)</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total */}
            <div className="border-t border-border/50 pt-2 mt-2 flex justify-between font-medium">
                <span>Total</span>
                <span>{formatValue(total)}</span>
            </div>
        </div>
    );

    if (asTileContent) {
        return content;
    }

    return (
        <BentoTile colSpan={1} rowSpan={2}>
            {content}
        </BentoTile>
    );
}
