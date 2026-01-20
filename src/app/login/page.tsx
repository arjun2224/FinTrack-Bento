"use client";

import { useActionState } from "react";
import { authenticate } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
    // Note: useActionState (react 19) is available in latest next.js 15+, but let's assume we use useFormState if we're on older version?
    // User metadata says next 15/16. 'react-dom' version 19.
    // So useActionState is correct.
    const [errorMessage, formAction, isPending] = useActionState(
        authenticate,
        undefined
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
            <div className="w-full max-w-md glass-card rounded-2xl p-8 shadow-2xl animate-fade-in-scale">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        FinTrack-Bento
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Sign in to access your portfolio
                    </p>
                </div>

                <form action={formAction} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="name@example.com"
                                required
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                required
                                minLength={6}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg animate-fade-in">
                            <AlertCircle className="h-4 w-4" />
                            <p>{errorMessage}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-11 text-base group"
                        disabled={isPending}
                    >
                        {isPending ? "Signing in..." : "Sign in"}
                        {!isPending && (
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    <p>Protected by NextAuth.js</p>
                </div>
            </div>
        </div>
    );
}
