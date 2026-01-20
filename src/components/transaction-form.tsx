"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePortfolioStore, useSettingsStore } from "@/lib/store";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface TransactionFormData {
    ticker: string;
    name: string;
    assetType: string;
    market: string;
    type: "BUY" | "SELL";
    quantity: string;
    price: string;
    currency: string;
    date: string;
    isSIP: boolean;
    sipAmount: string;
}

interface SearchResult {
    ticker: string;
    name: string;
    type: string;
    exchange?: string;
}

const assetTypeOptions = [
    { value: "STOCK", label: "Stock" },
    { value: "MUTUAL_FUND", label: "Mutual Fund" },
    { value: "CRYPTO", label: "Crypto" },
    { value: "SGB", label: "SGB" },
    { value: "CASH", label: "Cash/FD" },
] as const;

const initialFormData: TransactionFormData = {
    ticker: "",
    name: "",
    assetType: "STOCK",
    market: "IN",
    type: "BUY",
    quantity: "",
    price: "",
    currency: "INR",
    date: new Date().toISOString().split("T")[0],
    isSIP: false,
    sipAmount: "",
};

interface TransactionFormProps {
    onSuccess?: () => void;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function TransactionForm({ onSuccess }: TransactionFormProps) {
    const { isAddTransactionOpen, setAddTransactionOpen } = usePortfolioStore();
    const { enabledAssetClasses, defaultMarket, defaultCurrency } = useSettingsStore();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<TransactionFormData>(initialFormData);
    const [mounted, setMounted] = useState(false);

    // Handle hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Filter asset type options based on enabled classes
    const filteredAssetTypes = assetTypeOptions.filter((opt) =>
        enabledAssetClasses.includes(opt.value as typeof enabledAssetClasses[number])
    );

    // Autocomplete state
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLookingUp, setIsLookingUp] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const isMutualFund = formData.assetType === "MUTUAL_FUND";

    // Debounced name for search
    const debouncedName = useDebounce(formData.name, 300);

    // Reset form and search state when dialog opens
    useEffect(() => {
        if (isAddTransactionOpen && mounted) {
            // Compute default asset type from enabled classes
            const enabledOptions = assetTypeOptions.filter((opt) =>
                enabledAssetClasses.includes(opt.value as typeof enabledAssetClasses[number])
            );
            const defaultAssetType = enabledOptions[0]?.value || "STOCK";
            setFormData({
                ...initialFormData,
                assetType: defaultAssetType,
                market: defaultMarket,
                currency: defaultCurrency,
            });
            setSearchResults([]);
            setShowDropdown(false);
            setIsSearching(false);
            setIsLookingUp(false);
        }
    }, [isAddTransactionOpen, defaultMarket, defaultCurrency, enabledAssetClasses, mounted]);

    // Search for assets when name changes
    useEffect(() => {
        if (debouncedName.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        const searchAssets = async () => {
            setIsSearching(true);
            try {
                const params = new URLSearchParams({
                    q: debouncedName,
                    assetType: formData.assetType,
                    market: formData.market,
                    mode: "search",
                });

                const response = await fetch(`/api/search?${params}`);
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    setSearchResults(data.results);
                    setShowDropdown(true);
                } else {
                    setSearchResults([]);
                    setShowDropdown(false);
                }
            } catch (error) {
                console.error("Search error:", error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        searchAssets();
    }, [debouncedName, formData.assetType, formData.market]);

    // Lookup ticker to get name
    const lookupTicker = useCallback(async (ticker: string) => {
        if (!ticker || ticker.length < 1) return;

        setIsLookingUp(true);
        try {
            const params = new URLSearchParams({
                q: ticker,
                assetType: formData.assetType,
                market: formData.market,
                mode: "lookup",
            });

            const response = await fetch(`/api/search?${params}`);
            const data = await response.json();

            if (data.result && data.result.name) {
                setFormData((prev) => ({
                    ...prev,
                    name: data.result.name,
                }));
            }
        } catch (error) {
            console.error("Lookup error:", error);
        } finally {
            setIsLookingUp(false);
        }
    }, [formData.assetType, formData.market]);

    // Handle ticker blur - lookup name
    const handleTickerBlur = () => {
        if (formData.ticker && !formData.name) {
            lookupTicker(formData.ticker);
        }
    };

    // Handle search result selection
    const handleSelectResult = (result: SearchResult) => {
        setFormData((prev) => ({
            ...prev,
            ticker: result.ticker,
            name: result.name,
        }));
        setShowDropdown(false);
        setSearchResults([]);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            let quantity = parseFloat(formData.quantity);
            if (formData.isSIP && formData.sipAmount && formData.price) {
                quantity = parseFloat(formData.sipAmount) / parseFloat(formData.price);
            }

            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticker: formData.ticker.toUpperCase(),
                    name: formData.name || formData.ticker,
                    assetType: formData.assetType,
                    market: formData.market,
                    type: formData.type,
                    quantity,
                    price: parseFloat(formData.price),
                    currency: formData.currency,
                    date: new Date(formData.date).toISOString(),
                    isSIP: formData.isSIP,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to add transaction");
            }

            const sipLabel = formData.isSIP ? " (SIP)" : "";
            toast.success(`Transaction added successfully!${sipLabel}`);
            setFormData(initialFormData);
            setAddTransactionOpen(false);

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error("Error adding transaction:", error);
            toast.error("Failed to add transaction");
        } finally {
            setIsLoading(false);
        }
    };

    const updateField = (field: keyof TransactionFormData, value: string | boolean) => {
        setFormData((prev) => {
            const updated = { ...prev, [field]: value };

            if (field === "assetType" && value === "MUTUAL_FUND") {
                updated.market = "IN";
                updated.currency = "INR";
            }

            if (field === "market") {
                if (value === "US") {
                    updated.currency = "USD";
                } else if (value === "IN") {
                    updated.currency = "INR";
                }
            }

            if (field === "assetType" && value !== "MUTUAL_FUND") {
                updated.isSIP = false;
            }

            return updated;
        });
    };

    return (
        <Dialog open={isAddTransactionOpen} onOpenChange={setAddTransactionOpen}>
            <DialogContent className="sm:max-w-[500px] glass-card !bg-[rgba(20,20,30,0.90)]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Add Transaction
                        {formData.isSIP && (
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                                SIP
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {isMutualFund
                            ? "Add a mutual fund investment (lumpsum or SIP installment)"
                            : "Add a new buy or sell transaction to your portfolio."
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Asset Type & Market */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="assetType">Asset Type</Label>
                            <Select
                                value={formData.assetType}
                                onValueChange={(v) => updateField("assetType", v)}
                            >
                                <SelectTrigger id="assetType">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="!bg-[#0f0f16] !border-border/50">
                                    {filteredAssetTypes.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="market">Market</Label>
                            <Select
                                value={formData.market}
                                onValueChange={(v) => updateField("market", v)}
                                disabled={isMutualFund}
                            >
                                <SelectTrigger id="market">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="!bg-[#0f0f16] !border-border/50">
                                    <SelectItem value="IN">India</SelectItem>
                                    <SelectItem value="US">US</SelectItem>
                                    <SelectItem value="CRYPTO">Crypto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* SIP Toggle for Mutual Funds */}
                    {isMutualFund && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="space-y-0.5">
                                <Label htmlFor="sip-toggle" className="text-sm font-medium">
                                    SIP Investment
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Mark as Systematic Investment Plan installment
                                </p>
                            </div>
                            <Switch
                                id="sip-toggle"
                                checked={formData.isSIP}
                                onCheckedChange={(checked) => updateField("isSIP", checked)}
                            />
                        </div>
                    )}

                    {/* Ticker & Name with Autocomplete */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="ticker">
                                {isMutualFund ? "Scheme Code" : "Ticker"}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="ticker"
                                    placeholder={
                                        isMutualFund ? "e.g. 119551" : "e.g. RELIANCE"
                                    }
                                    value={formData.ticker}
                                    onChange={(e) => updateField("ticker", e.target.value)}
                                    onBlur={handleTickerBlur}
                                    required
                                />
                                {isLookingUp && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                            {isMutualFund && (
                                <p className="text-[10px] text-muted-foreground">
                                    Find scheme code on AMFI website
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 relative" ref={dropdownRef}>
                            <Label htmlFor="name">Fund/Asset Name</Label>
                            <div className="relative">
                                <Input
                                    id="name"
                                    ref={nameInputRef}
                                    placeholder={isMutualFund ? "e.g. Axis Bluechip Fund" : "Search company..."}
                                    value={formData.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                                    autoComplete="off"
                                />
                                {isSearching && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            {/* Autocomplete Dropdown */}
                            {showDropdown && searchResults.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 max-h-48 overflow-auto rounded-md border border-border/50 bg-[#0f0f16] shadow-xl">
                                    {searchResults.map((result, index) => (
                                        <button
                                            key={`${result.ticker}-${index}`}
                                            type="button"
                                            className="w-full px-3 py-2 text-left hover:bg-accent/50 focus:bg-accent/50 focus:outline-none border-b border-border/50 last:border-0 transition-colors"
                                            onClick={() => handleSelectResult(result)}
                                        >
                                            <div className="font-medium text-sm truncate">
                                                {result.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span className="font-mono">{result.ticker}</span>
                                                {result.exchange && (
                                                    <span className="text-[10px] bg-muted px-1 rounded">
                                                        {result.exchange}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Transaction Type */}
                    <div className="space-y-2">
                        <Label>Transaction Type</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={formData.type === "BUY" ? "default" : "outline"}
                                className={`flex-1 ${formData.type === "BUY" ? "bg-profit hover:bg-profit/90" : ""}`}
                                onClick={() => updateField("type", "BUY")}
                            >
                                {isMutualFund ? "Purchase" : "Buy"}
                            </Button>
                            <Button
                                type="button"
                                variant={formData.type === "SELL" ? "default" : "outline"}
                                className={`flex-1 ${formData.type === "SELL" ? "bg-loss hover:bg-loss/90" : ""}`}
                                onClick={() => updateField("type", "SELL")}
                            >
                                {isMutualFund ? "Redeem" : "Sell"}
                            </Button>
                        </div>
                    </div>

                    {/* Amount/Quantity, NAV/Price, Currency */}
                    <div className="grid grid-cols-3 gap-4">
                        {formData.isSIP ? (
                            <div className="space-y-2">
                                <Label htmlFor="sipAmount">SIP Amount (₹)</Label>
                                <Input
                                    id="sipAmount"
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder="5000"
                                    value={formData.sipAmount}
                                    onChange={(e) => updateField("sipAmount", e.target.value)}
                                    required
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="quantity">
                                    {isMutualFund ? "Units" : "Quantity"}
                                </Label>
                                <Input
                                    id="quantity"
                                    type="number"
                                    step="any"
                                    min="0"
                                    placeholder={isMutualFund ? "123.456" : "10"}
                                    value={formData.quantity}
                                    onChange={(e) => updateField("quantity", e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="price">
                                {isMutualFund ? "NAV (₹)" : "Price"}
                            </Label>
                            <Input
                                id="price"
                                type="number"
                                step="any"
                                min="0"
                                placeholder={isMutualFund ? "45.67" : "100.50"}
                                value={formData.price}
                                onChange={(e) => updateField("price", e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="currency">Currency</Label>
                            <Select
                                value={formData.currency}
                                onValueChange={(v) => updateField("currency", v)}
                                disabled={isMutualFund}
                            >
                                <SelectTrigger id="currency">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="!bg-[#0f0f16] !border-border/50">
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Show units preview for SIP */}
                    {formData.isSIP && formData.sipAmount && formData.price && (
                        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                            Units purchased: {(parseFloat(formData.sipAmount) / parseFloat(formData.price)).toFixed(4)}
                        </div>
                    )}

                    {/* Date */}
                    <div className="space-y-2">
                        <Label htmlFor="date">
                            {formData.isSIP ? "SIP Date" : "Transaction Date"}
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => updateField("date", e.target.value)}
                            required
                        />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setAddTransactionOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading
                                ? "Adding..."
                                : formData.isSIP
                                    ? "Add SIP Investment"
                                    : isMutualFund
                                        ? "Add MF Investment"
                                        : "Add Transaction"
                            }
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
