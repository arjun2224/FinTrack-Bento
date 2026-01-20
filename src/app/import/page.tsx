"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ImportPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [password, setPassword] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus("idle");
            setMessage("");
        }
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setIsLoading(true);
        setStatus("idle");
        setMessage("");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("password", password);

        try {
            const res = await fetch("/api/import/cas", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to import");
            }

            setStatus("success");
            setMessage(`Successfully imported ${data.data?.transactions?.length || 0} transactions!`);
            // Optional: Redirect or refresh data
            setTimeout(() => {
                router.push("/");
            }, 2000);
        } catch (error: any) {
            console.error(error);
            setStatus("error");
            setMessage(error.message || "Something went wrong during import");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Import Data</h1>
                    <p className="text-muted-foreground">Add transactions from external sources</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* CAS Import Card */}
                <div className="glass-card rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <FileText className="w-24 h-24" />
                    </div>

                    <h2 className="text-xl font-semibold mb-2">CAS Import (India)</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        Upload your NSDL/CDSL Consolidated Account Statement (PDF) to auto-import mutual funds and stocks.
                    </p>

                    <form onSubmit={handleImport} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">CAS PDF File</label>
                            <Input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="cursor-pointer file:text-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">PDF Password</label>
                            <Input
                                type="password"
                                placeholder="Enter PDF password (usually PAN)"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {status === "error" && (
                            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {message}
                            </div>
                        )}

                        {status === "success" && (
                            <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                {message}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={!file || isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Parsing CAS...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import CAS
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                {/* Broker CSV Import Placeholder */}
                <div className="glass-card rounded-xl p-6 opacity-60">
                    <h2 className="text-xl font-semibold mb-2">Broker CSV Import</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        Support for Vested, INDmoney, and Crypto exchanges coming soon.
                    </p>
                    <Button variant="outline" className="w-full" disabled>
                        Coming Soon
                    </Button>
                </div>
            </div>
        </div>
    );
}
