"use client";

import { BentoTile } from "@/components/bento-grid";

interface CurrencyExposure {
    currency: string;
    value: number;
    color: string;
}

interface CurrencyExposureTileProps {
    exposures: CurrencyExposure[];
    asTileContent?: boolean;
}

export function CurrencyExposureTile({ exposures, asTileContent = false }: CurrencyExposureTileProps) {
    const total = exposures.reduce((sum, e) => sum + e.value, 0);

    // Draw donut chart
    const renderDonut = () => {
        const radius = 35;
        const strokeWidth = 12;
        const circumference = 2 * Math.PI * radius;
        let offset = 0;

        return (
            <svg viewBox="0 0 100 100" className="w-20 h-20 mx-auto">
                {/* Background circle */}
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth={strokeWidth}
                    opacity={0.2}
                />
                {/* Segments */}
                {exposures.map((exposure, idx) => {
                    const percentage = total > 0 ? exposure.value / total : 0;
                    const dashLength = circumference * percentage;
                    const dashOffset = -circumference * offset;
                    offset += percentage;

                    return (
                        <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="none"
                            stroke={exposure.color}
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                            className="transition-all duration-500"
                        />
                    );
                })}
            </svg>
        );
    };

    const content = (
        <div className="flex flex-col h-full">
            <p className="text-sm text-muted-foreground mb-2">Currency Exposure</p>

            {renderDonut()}

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-xs">
                {exposures.map((exp, idx) => {
                    const percentage = total > 0 ? ((exp.value / total) * 100).toFixed(0) : 0;
                    return (
                        <div key={idx} className="flex items-center gap-1">
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: exp.color }}
                            />
                            <span>{exp.currency}</span>
                            <span className="text-muted-foreground">({percentage}%)</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (asTileContent) {
        return content;
    }

    return <BentoTile>{content}</BentoTile>;
}
