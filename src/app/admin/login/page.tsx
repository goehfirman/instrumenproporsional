"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, Lock } from "lucide-react";

export default function AdminLogin() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setLoading(true);
        setError("");

        try {
            if (password !== "guruganteng") {
                setError("Password rahasia salah.");
                setLoading(false);
                return;
            }
            // Bypassing Firebase Auth
            sessionStorage.setItem("adminAuth", "true");
            router.push("/admin/dashboard");
        } catch (err: any) {
            console.error(err);
            setError("Terjadi kesalahan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden p-8">
                <div className="flex justify-center mb-6 text-primary">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                        <Lock className="w-8 h-8" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-foreground mb-6">Portal Admin</h1>

                {error && (
                    <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1">Password Rahasia</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-xl transition-all shadow-md mt-4 disabled:opacity-50 flex items-center justify-center"
                    >
                        {loading ? (
                            <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Masuk...</>
                        ) : (
                            "Masuk ke Dashboard"
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                    <button
                        onClick={() => router.push("/")}
                        className="text-slate-400 hover:text-primary font-bold text-sm transition-colors flex items-center gap-2"
                    >
                        <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                        Kembali ke Beranda
                    </button>
                </div>
            </div>
        </div>
    );
}
