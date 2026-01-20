import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AssetClass = "STOCK" | "MUTUAL_FUND" | "CRYPTO" | "SGB" | "CASH";
export type ThemePreference = "dark" | "light" | "system";
export type Currency = "INR" | "USD";
export type Market = "IN" | "US";

export interface TilePosition {
    id: string;
    order: number;
    visible: boolean;
}

export interface SettingsState {
    // Appearance
    theme: ThemePreference;
    compactMode: boolean;

    // Asset classes
    enabledAssetClasses: AssetClass[];

    // Defaults
    defaultCurrency: Currency;
    defaultMarket: Market;

    // Actions
    setTheme: (theme: ThemePreference) => void;
    setCompactMode: (compact: boolean) => void;
    toggleAssetClass: (assetClass: AssetClass) => void;
    setEnabledAssetClasses: (classes: AssetClass[]) => void;
    setDefaultCurrency: (currency: Currency) => void;
    setDefaultMarket: (market: Market) => void;
}

export interface PortfolioStore {
    // Active portfolio
    activePortfolioId: string | null;
    setActivePortfolio: (id: string | null) => void;

    // UI state
    currency: Currency;
    setCurrency: (currency: Currency) => void;

    // Bento grid tile positions (for drag and drop)
    tilePositions: TilePosition[];
    setTilePositions: (positions: TilePosition[]) => void;
    moveTile: (fromIndex: number, toIndex: number) => void;
    toggleTileVisibility: (id: string) => void;

    // Modal states
    isAddTransactionOpen: boolean;
    setAddTransactionOpen: (open: boolean) => void;
}

const defaultTilePositions: TilePosition[] = [
    { id: "net-worth", order: 0, visible: true },
    { id: "asset-allocation", order: 1, visible: true },
    { id: "tax-harvest", order: 2, visible: true },
    { id: "currency-exposure", order: 3, visible: true },
    { id: "holdings", order: 4, visible: true },
];

const defaultEnabledAssetClasses: AssetClass[] = [
    "STOCK",
    "MUTUAL_FUND",
    "CRYPTO",
    "SGB",
    "CASH",
];

// Settings store - persisted separately
export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // Appearance
            theme: "dark",
            compactMode: false,

            // Asset classes
            enabledAssetClasses: defaultEnabledAssetClasses,

            // Defaults
            defaultCurrency: "INR",
            defaultMarket: "IN",

            // Actions
            setTheme: (theme) => set({ theme }),
            setCompactMode: (compactMode) => set({ compactMode }),
            toggleAssetClass: (assetClass) =>
                set((state) => {
                    const enabled = state.enabledAssetClasses.includes(assetClass);
                    if (enabled) {
                        // Don't allow disabling all asset classes
                        if (state.enabledAssetClasses.length <= 1) {
                            return state;
                        }
                        return {
                            enabledAssetClasses: state.enabledAssetClasses.filter(
                                (c) => c !== assetClass
                            ),
                        };
                    } else {
                        return {
                            enabledAssetClasses: [...state.enabledAssetClasses, assetClass],
                        };
                    }
                }),
            setEnabledAssetClasses: (classes) => set({ enabledAssetClasses: classes }),
            setDefaultCurrency: (defaultCurrency) => set({ defaultCurrency }),
            setDefaultMarket: (defaultMarket) => set({ defaultMarket }),
        }),
        {
            name: "fintrack-settings",
        }
    )
);

// Portfolio store (original)
export const usePortfolioStore = create<PortfolioStore>()(
    persist(
        (set) => ({
            // Active portfolio
            activePortfolioId: null,
            setActivePortfolio: (id) => set({ activePortfolioId: id }),

            // UI state
            currency: "INR",
            setCurrency: (currency) => set({ currency }),

            // Tile positions
            tilePositions: defaultTilePositions,
            setTilePositions: (positions) => set({ tilePositions: positions }),
            moveTile: (fromIndex, toIndex) =>
                set((state) => {
                    const newPositions = [...state.tilePositions];
                    const [moved] = newPositions.splice(fromIndex, 1);
                    newPositions.splice(toIndex, 0, moved);
                    return {
                        tilePositions: newPositions.map((p, i) => ({ ...p, order: i })),
                    };
                }),
            toggleTileVisibility: (id) =>
                set((state) => {
                    const visibleCount = state.tilePositions.filter((t) => t.visible).length;
                    return {
                        tilePositions: state.tilePositions.map((t) => {
                            if (t.id === id) {
                                // Don't allow hiding if it's the last visible tile
                                if (t.visible && visibleCount <= 1) {
                                    return t;
                                }
                                return { ...t, visible: !t.visible };
                            }
                            return t;
                        }),
                    };
                }),

            // Modal states
            isAddTransactionOpen: false,
            setAddTransactionOpen: (open) => set({ isAddTransactionOpen: open }),
        }),
        {
            name: "fintrack-storage",
            partialize: (state) => ({
                activePortfolioId: state.activePortfolioId,
                currency: state.currency,
                tilePositions: state.tilePositions,
            }),
        }
    )
);
