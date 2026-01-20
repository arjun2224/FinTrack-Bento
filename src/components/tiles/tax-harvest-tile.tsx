"use client";

import { BentoTile } from "@/components/bento-grid";
import { AlertTriangle, Sparkles } from "lucide-react";

interface TaxHarvestTileProps {
    potentialSavings: number;
    opportunitiesCount: number;
    asTileContent?: boolean;
}

export function TaxHarvestTile({
    potentialSavings,
    opportunitiesCount,
    asTileContent = false,
}: TaxHarvestTileProps) {
    const formatValue = (value: number) => {
        if (value >= 100000) {
            return `₹${(value / 100000).toFixed(1)}L`;
        } else if (value >= 1000) {
            return `₹${(value / 1000).toFixed(1)}K`;
        }
        return `₹${value.toFixed(0)}`;
    };

    const hasOpportunities = potentialSavings > 0;

    const content = (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-2">
                {hasOpportunities ? (
                    <Sparkles className="w-4 h-4 text-warning" />
                ) : (
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                )}
                <p className="text-sm text-muted-foreground">Tax Harvest</p>
            </div>

            {hasOpportunities ? (
                <>
                    <p className="text-xl font-semibold text-profit">
                        Save {formatValue(potentialSavings)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {opportunitiesCount} opportunity{opportunitiesCount !== 1 ? "ies" : "y"} found
                    </p>
                    <a
                        href="#"
                        className="text-xs text-primary hover:underline mt-auto"
                    >
                        View details →
                    </a>
                </>
            ) : (
                <>
                    <p className="text-sm text-muted-foreground">
                        No harvesting opportunities
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                        Keep adding transactions to find tax-saving opportunities
                    </p>
                </>
            )}
        </div>
    );

    if (asTileContent) {
        return content;
    }

    return <BentoTile>{content}</BentoTile>;
}
