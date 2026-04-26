"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle } from "lucide-react";

export default function SelesaiPage() {
    const router = useRouter();
    const [studentName, setStudentName] = useState("");

    useEffect(() => {
        const sName = sessionStorage.getItem("studentName");
        if (sName) {
            setStudentName(sName);
        } else {
            router.push("/");
        }
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden text-center p-12">
                <div className="flex justify-center mb-6 text-green-500">
                    <CheckCircle className="w-24 h-24" />
                </div>
                <h1 className="text-3xl font-bold text-foreground mb-4">Terima Kasih, {studentName}!</h1>
                <p className="text-lg text-foreground/80 mb-8">
                    Anda telah menyelesaikan seluruh rangkaian skala dan tes. Jawaban Anda telah tersimpan dengan aman.
                </p>
                <button
                    onClick={() => {
                        sessionStorage.clear();
                        router.push("/");
                    }}
                    className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-xl transition-all"
                >
                    Kembali ke Beranda
                </button>
            </div>
        </div>
    );
}
