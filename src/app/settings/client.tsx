"use client";

import { useTheme } from "next-themes";
import { useSettingsStore, usePortfolioStore, AssetClass } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sun,
    Moon,
    Monitor,
    ArrowLeft,
    TrendingUp,
    PiggyBank,
    Bitcoin,
    Landmark,
    Wallet,
    Download,
    Trash2,
    Settings,
    Palette,
    LayoutGrid,
    Globe,
    Database,
    PieChart,
    Scissors,
    DollarSign,
    List,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createUser, deleteUser, resetPassword } from "@/app/actions/users";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { User, Shield, AlertTriangle, Key, Trash, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

const assetClassConfig: {
    id: AssetClass;
    label: string;
    description: string;
    icon: React.ReactNode;
}[] = [
        {
            id: "STOCK",
            label: "Stocks",
            description: "Indian & US equity investments",
            icon: <TrendingUp className="h-5 w-5" />,
        },
        {
            id: "MUTUAL_FUND",
            label: "Mutual Funds",
            description: "Indian mutual fund schemes",
            icon: <PiggyBank className="h-5 w-5" />,
        },
        {
            id: "CRYPTO",
            label: "Cryptocurrency",
            description: "Bitcoin, Ethereum & other crypto",
            icon: <Bitcoin className="h-5 w-5" />,
        },
        {
            id: "SGB",
            label: "Sovereign Gold Bonds",
            description: "Government-issued gold bonds",
            icon: <Landmark className="h-5 w-5" />,
        },
        {
            id: "CASH",
            label: "Cash & Fixed Deposits",
            description: "Bank deposits and liquid cash",
            icon: <Wallet className="h-5 w-5" />,
        },
    ];

function ThemeButton({
    active,
    onClick,
    icon: Icon,
    label,
}: {
    active: boolean;
    onClick: () => void;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`
                flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all
                ${active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                }
            `}
        >
            <Icon className="h-6 w-6" />
            <span className="text-sm font-medium">{label}</span>
        </button>
    );
}

function SettingsSection({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="glass-card rounded-2xl p-6 space-y-6">
            <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <p className="text-muted-foreground text-sm">{description}</p>
                </div>
            </div>
            <div className="pt-2">{children}</div>
        </div>
    );
}

export default function SettingsClient({
    session,
    users = []
}: {
    session: any,
    users: any[]
}) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const {
        compactMode,
        setCompactMode,
        enabledAssetClasses,
        toggleAssetClass,
        defaultCurrency,
        setDefaultCurrency,
        defaultMarket,
        setDefaultMarket,
    } = useSettingsStore();

    const { tilePositions, toggleTileVisibility } = usePortfolioStore();

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleExportTransactions = async () => {
        try {
            const response = await fetch("/api/transactions");
            const data = await response.json();

            if (!data.transactions || data.transactions.length === 0) {
                toast.info("No transactions to export");
                return;
            }

            // Create CSV
            const headers = [
                "Date",
                "Type",
                "Asset Type",
                "Ticker",
                "Name",
                "Quantity",
                "Price",
                "Currency",
                "Market",
                "Notes",
            ];
            const rows = data.transactions.map((t: {
                date: string;
                type: string;
                assetType: string;
                ticker: string;
                name: string;
                quantity: number;
                price: number;
                currency: string;
                market: string;
                notes?: string;
            }) => [
                    new Date(t.date).toISOString().split("T")[0],
                    t.type,
                    t.assetType,
                    t.ticker,
                    t.name,
                    t.quantity,
                    t.price,
                    t.currency,
                    t.market,
                    t.notes || "",
                ]);

            const csv =
                headers.join(",") +
                "\n" +
                rows.map((r: (string | number)[]) => r.map((v: string | number) => `"${v}"`).join(",")).join("\n");

            // Download
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `fintrack-transactions-${new Date().toISOString().split("T")[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success("Transactions exported successfully");
        } catch {
            toast.error("Failed to export transactions");
        }
    };

    const handleClearData = async () => {
        if (!confirm("Are you sure you want to delete ALL transactions? This cannot be undone.")) {
            return;
        }
        if (!confirm("This will permanently delete all your portfolio data. Type 'DELETE' to confirm.")) {
            return;
        }

        try {
            const response = await fetch("/api/transactions", {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("All data cleared successfully");
                window.location.href = "/";
            } else {
                throw new Error("Failed to clear data");
            }
        } catch {
            toast.error("Failed to clear data");
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading settings...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-border/50">
                <div className="container max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" size="icon" className="rounded-xl">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Settings className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Settings</h1>
                                <p className="text-sm text-muted-foreground">
                                    Customize your portfolio experience
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
                {/* Appearance */}
                <SettingsSection
                    icon={Palette}
                    title="Appearance"
                    description="Customize how FinTrack looks"
                >
                    <div className="space-y-6">
                        {/* Theme Selection */}
                        <div>
                            <Label className="text-sm font-medium mb-3 block">Theme</Label>
                            <div className="grid grid-cols-3 gap-3">
                                <ThemeButton
                                    active={theme === "light"}
                                    onClick={() => setTheme("light")}
                                    icon={Sun}
                                    label="Light"
                                />
                                <ThemeButton
                                    active={theme === "dark"}
                                    onClick={() => setTheme("dark")}
                                    icon={Moon}
                                    label="Dark"
                                />
                                <ThemeButton
                                    active={theme === "system"}
                                    onClick={() => setTheme("system")}
                                    icon={Monitor}
                                    label="System"
                                />
                            </div>
                        </div>

                        {/* Compact Mode */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                            <div className="flex items-center gap-3">
                                <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <Label htmlFor="compact-mode" className="font-medium">
                                        Compact Mode
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        Show more information in less space
                                    </p>
                                </div>
                            </div>
                            <Switch
                                id="compact-mode"
                                checked={compactMode}
                                onCheckedChange={setCompactMode}
                            />
                        </div>
                    </div>
                </SettingsSection>

                {/* Asset Classes */}
                <SettingsSection
                    icon={TrendingUp}
                    title="Asset Classes"
                    description="Enable or disable asset types you want to track"
                >
                    <div className="space-y-3">
                        {assetClassConfig.map((asset) => {
                            const isEnabled = enabledAssetClasses.includes(asset.id);
                            const isLastEnabled =
                                isEnabled && enabledAssetClasses.length === 1;

                            return (
                                <div
                                    key={asset.id}
                                    className={`
                                        flex items-center justify-between p-4 rounded-xl transition-all
                                        ${isEnabled ? "bg-primary/5 border border-primary/20" : "bg-muted/30 border border-transparent"}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`
                                                p-2 rounded-lg transition-colors
                                                ${isEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
                                            `}
                                        >
                                            {asset.icon}
                                        </div>
                                        <div>
                                            <Label
                                                htmlFor={`asset-${asset.id}`}
                                                className={`font-medium ${!isEnabled && "text-muted-foreground"}`}
                                            >
                                                {asset.label}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                {asset.description}
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        id={`asset-${asset.id}`}
                                        checked={isEnabled}
                                        onCheckedChange={() => {
                                            if (isLastEnabled) {
                                                toast.error("At least one asset class must be enabled");
                                                return;
                                            }
                                            toggleAssetClass(asset.id);
                                        }}
                                        disabled={isLastEnabled}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </SettingsSection>

                {/* Dashboard Widgets */}
                <SettingsSection
                    icon={LayoutGrid}
                    title="Dashboard Widgets"
                    description="Show or hide dashboard tiles"
                >
                    <div className="space-y-3">
                        {[
                            { id: "net-worth", label: "Net Worth", description: "Total portfolio value and daily change", icon: <TrendingUp className="h-5 w-5" /> },
                            { id: "asset-allocation", label: "Asset Allocation", description: "Breakdown by asset type", icon: <PieChart className="h-5 w-5" /> },
                            { id: "tax-harvest", label: "Tax Harvest", description: "Tax-loss harvesting opportunities", icon: <Scissors className="h-5 w-5" /> },
                            { id: "currency-exposure", label: "Currency Exposure", description: "INR vs USD distribution", icon: <DollarSign className="h-5 w-5" /> },
                            { id: "holdings", label: "Top Holdings", description: "Your largest positions", icon: <List className="h-5 w-5" /> },
                        ].map((widget) => {
                            const tile = tilePositions.find(t => t.id === widget.id);
                            const isVisible = tile?.visible ?? true;
                            const visibleCount = tilePositions.filter(t => t.visible).length;
                            const isLastVisible = isVisible && visibleCount <= 1;

                            return (
                                <div
                                    key={widget.id}
                                    className={`
                                        flex items-center justify-between p-4 rounded-xl transition-all
                                        ${isVisible ? "bg-primary/5 border border-primary/20" : "bg-muted/30 border border-transparent"}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`
                                                p-2 rounded-lg transition-colors
                                                ${isVisible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}
                                            `}
                                        >
                                            {widget.icon}
                                        </div>
                                        <div>
                                            <Label
                                                htmlFor={`widget-${widget.id}`}
                                                className={`font-medium ${!isVisible && "text-muted-foreground"}`}
                                            >
                                                {widget.label}
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                {widget.description}
                                            </p>
                                        </div>
                                    </div>
                                    <Switch
                                        id={`widget-${widget.id}`}
                                        checked={isVisible}
                                        onCheckedChange={() => {
                                            if (isLastVisible) {
                                                toast.error("At least one widget must be visible");
                                                return;
                                            }
                                            toggleTileVisibility(widget.id);
                                        }}
                                        disabled={isLastVisible}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </SettingsSection>

                {/* Defaults */}
                <SettingsSection
                    icon={Globe}
                    title="Defaults"
                    description="Set your preferred defaults for new transactions"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Default Currency</Label>
                            <Select
                                value={defaultCurrency}
                                onValueChange={(v) => setDefaultCurrency(v as "INR" | "USD")}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INR">
                                        <span className="flex items-center gap-2">
                                            <span>🇮🇳</span>
                                            <span>Indian Rupee (INR)</span>
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="USD">
                                        <span className="flex items-center gap-2">
                                            <span>🇺🇸</span>
                                            <span>US Dollar (USD)</span>
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Default Market</Label>
                            <Select
                                value={defaultMarket}
                                onValueChange={(v) => setDefaultMarket(v as "IN" | "US")}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IN">
                                        <span className="flex items-center gap-2">
                                            <span>🇮🇳</span>
                                            <span>India (NSE/BSE)</span>
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="US">
                                        <span className="flex items-center gap-2">
                                            <span>🇺🇸</span>
                                            <span>United States (NYSE/NASDAQ)</span>
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </SettingsSection>

                {/* Data Management */}
                <SettingsSection
                    icon={Database}
                    title="Data Management"
                    description="Export or manage your portfolio data"
                >
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 gap-2"
                                onClick={handleExportTransactions}
                            >
                                <Download className="h-4 w-4" />
                                Export Transactions (CSV)
                            </Button>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                                <div className="flex items-start gap-3">
                                    <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
                                    <div className="flex-1">
                                        <h3 className="font-medium text-destructive">
                                            Danger Zone
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Permanently delete all transactions and portfolio data.
                                            This action cannot be undone.
                                        </p>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="mt-3"
                                            onClick={handleClearData}
                                        >
                                            Delete All Data
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </SettingsSection>

                {/* User Management (Admin Only) */}
                {/* @ts-ignore */}
                {session?.user?.role === "ADMIN" && (
                    <SettingsSection
                        icon={Shield}
                        title="User Management"
                        description="Manage users and permissions"
                    >
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Add User
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add New User</DialogTitle>
                                            <DialogDescription>
                                                Create a new user account. They will be able to login immediately.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <form action={async (formData) => {
                                            const result = await createUser(null, formData);
                                            if (result?.error) toast.error(result.error);
                                            else toast.success("User created");
                                        }} className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Email</Label>
                                                <Input name="email" type="email" required placeholder="user@example.com" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Password</Label>
                                                <Input name="password" type="password" required minLength={6} placeholder="Min 6 characters" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Role</Label>
                                                <Select name="role" defaultValue="USER">
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="USER">User</SelectItem>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit">Create User</Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <div className="rounded-xl border border-border overflow-hidden">
                                {users.length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">
                                        No users found.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {users.map((user) => (
                                            <div key={user.id} className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-full bg-muted">
                                                        <User className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-sm">{user.email}</p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            {user.role}
                                                            {user.email === session?.user?.email && (
                                                                <span className="text-primary font-bold">(You)</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* Reset Password */}
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="Reset Password">
                                                                <Key className="h-4 w-4" />
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Reset Password</DialogTitle>
                                                                <DialogDescription>
                                                                    Set a new password for {user.email}.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <form action={async (formData) => {
                                                                const result = await resetPassword(user.id, formData);
                                                                if (result?.error) toast.error(result.error);
                                                                else toast.success("Password reset");
                                                            }} className="space-y-4 py-4">
                                                                <div className="space-y-2">
                                                                    <Label>New Password</Label>
                                                                    <Input name="password" type="password" required minLength={6} />
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button type="submit">Update Password</Button>
                                                                </DialogFooter>
                                                            </form>
                                                        </DialogContent>
                                                    </Dialog>

                                                    {/* Delete User */}
                                                    {user.email !== session?.user?.email && (
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete User">
                                                                    <Trash className="h-4 w-4" />
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Delete User</DialogTitle>
                                                                    <DialogDescription>
                                                                        Are you sure you want to delete {user.email}? This action cannot be undone.
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <DialogFooter>
                                                                    <Button variant="outline">Cancel</Button>
                                                                    <form action={async () => {
                                                                        const result = await deleteUser(user.id);
                                                                        if (result?.error) toast.error(result.error || "Failed to delete");
                                                                        else toast.success("User deleted");
                                                                    }}>
                                                                        <Button type="submit" variant="destructive">Delete User</Button>
                                                                    </form>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </SettingsSection>
                )}

                {/* Version Info */}
                <div className="text-center py-8 text-muted-foreground text-sm">
                    <p>FinTrack-Bento v0.1.0</p>
                    <p className="mt-1">Your data stays on your device</p>
                </div>
            </main>
        </div>
    );
}
