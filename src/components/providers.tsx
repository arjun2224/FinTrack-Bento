"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { useSettingsStore } from "@/lib/store";

function ThemeSync() {
    // Sync Zustand theme setting with next-themes
    const theme = useSettingsStore((state) => state.theme);

    useEffect(() => {
        // This is handled by next-themes automatically via the attribute
    }, [theme]);

    return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000, // 1 minute for price data
                        refetchOnWindowFocus: false,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem
                disableTransitionOnChange
            >
                <ThemeSync />
                {children}
                <Toaster position="bottom-right" richColors />
            </ThemeProvider>
        </QueryClientProvider>
    );
}
