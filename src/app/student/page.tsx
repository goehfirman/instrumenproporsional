"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, BookOpen, BrainCircuit, CheckCircle, ArrowRight, LogOut } from "lucide-react";
import { ESSAY_QUESTIONS } from "@/lib/constants";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

interface StudentData {
    angkets_1?: Record<number, number>;
    angkets_2?: Record<number, number>;
    essay_answer?: Record<number, string>;
}

export default function StudentDashboard() {
    const router = useRouter();
    const [studentName, setStudentName] = useState("");
    const [studentData, setStudentData] = useState<StudentData>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const sId = sessionStorage.getItem("studentId");
        const sName = sessionStorage.getItem("studentName");

        if (!sId) {
            router.push("/");
            return;
        }

        setStudentName(sName || "");

        // 1. Real-time Cloud Sync
        let unsub = () => { };
        if (db) {
            unsub = onSnapshot(doc(db, "students", sId), (docSnap) => {
                if (docSnap.exists()) {
                    setStudentData(docSnap.data());
                }
                setLoading(false);
            }, (error) => {
                console.error("Dashboard sync error:", error);
                setLoading(false);
            });
        }

        // 2. Local Fallback (immediate UI if cloud slow)
        const localData = localStorage.getItem("localStudentsData");
        if (localData) {
            const students = JSON.parse(localData);
            if (students[sId]) {
                setStudentData(students[sId]);
                // We show local immediately but keep loading=true 
                // until cloud snapshot overwrites it if needed
                if (!db) setLoading(false);
            }
        } else {
            if (!db) setLoading(false);
        }

        return () => unsub();
    }, [router]);

    const handleLogout = () => {
        sessionStorage.removeItem("studentId");
        sessionStorage.removeItem("studentName");
        router.push("/");
    };

    const angket1Ans = studentData.angkets_1 ? Object.keys(studentData.angkets_1).length : 0;
    const angket1Progress = (angket1Ans / 43) * 100;
    const isAngket1Done = angket1Ans === 43;

    const angket2Ans = studentData.angkets_2 ? Object.keys(studentData.angkets_2).length : 0;
    const angket2Progress = (angket2Ans / 41) * 100;
    const isAngket2Done = angket2Ans === 41;

    const isEssayDone = (() => {
        const ans = studentData.essay_answer;
        if (!ans) return false;

        // Use a consistent logic helper (inline for now)
        const checkAnswered = (i: number, val: string) => {
            const trimmed = (val || "").trim();
            if (!trimmed) return false;
            if (i === 6) { // Soal No 7
                const clean = trimmed.replace(/\[VISUAL:.*?\]|\[TABLE\]|\[LINE-T\]|\[LINE-B\]|\[REASON\]|[:| \t\n\r]/g, "");
                return clean.length > 0;
            }
            return trimmed.length > 0;
        };

        if (typeof ans === "string") return checkAnswered(0, ans);

        // Check if all questions are answered according to the new logic
        return ESSAY_QUESTIONS.every((_, i) => checkAnswered(i, ans[i] || ""));
    })();

    const essayProgress = (() => {
        const ans = studentData.essay_answer;
        if (!ans) return 0;

        const checkAnswered = (i: number, val: string) => {
            const trimmed = (val || "").trim();
            if (!trimmed) return false;
            if (i === 6) { // Soal No 7
                const clean = trimmed.replace(/\[VISUAL:.*?\]|\[TABLE\]|\[LINE-T\]|\[LINE-B\]|\[REASON\]|[:| \t\n\r]/g, "");
                return clean.length > 0;
            }
            return trimmed.length > 0;
        };

        if (typeof ans === "string") return checkAnswered(0, ans) ? 100 : 0;

        const answeredCount = ESSAY_QUESTIONS.filter((_, i) => checkAnswered(i, ans[i] || "")).length;
        return (answeredCount / ESSAY_QUESTIONS.length) * 100;
    })();

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-black text-primary tracking-tighter uppercase mb-1">
                                    Selamat Datang, {studentName}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <p className="text-slate-500 font-medium">Portal Instrumen Penelitian</p>
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100 shadow-sm">
                                        {db ? (
                                            <>
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tight">Cloud Synced</span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-tight">Local Cache</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-slate-100 hover:bg-slate-200 p-3 rounded-2xl transition-all border border-slate-200 hover:scale-105 active:scale-95 group"
                                title="Keluar"
                            >
                                <LogOut className="w-6 h-6 text-slate-600 group-hover:rotate-12 transition-transform" />
                            </button>
                        </div>
                    </div>
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 blur-xl"></div>
                </div>

                {/* Petunjuk Pengisian */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in zoom-in duration-500 delay-100">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" /> Petunjuk Pengisian
                    </h2>
                    <ul className="list-disc list-inside space-y-2 text-slate-600">
                        <li>Terdapat 3 tahap yang harus Anda selesaikan.</li>
                        <li>Anda dapat memilih tahap mana saja terlebih dahulu, namun disarankan berurutan.</li>
                        <li>Pastikan koneksi lancar, jawaban Anda akan otomatis tersimpan.</li>
                        <li>Jawablah skala sesuai keadaan diri Anda masing-masing sejujurnya.</li>
                        <li>Pada tes penalaran, tuliskan langkah penyelesaian secara detail!</li>
                    </ul>
                </div>

                {/* Pilihan Menu */}
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <h2 className="text-xl font-bold text-slate-800 ml-2 mt-8 mb-4">Pilihan Pengisian:</h2>

                    <button
                        onClick={() => router.push("/instrument?step=1")}
                        className="w-full flex items-center justify-between p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-primary/20 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-4 w-full">
                            <div className={`p-4 rounded-xl shrink-0 ${isAngket1Done ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-bold text-slate-800 text-lg">1. Skala Lingkungan Belajar</h3>
                                <p className="text-slate-500 text-sm">Berisi pertanyaan skala sikap 1-5.</p>
                                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                                    <div className={`h-full ${isAngket1Done ? 'bg-green-500' : 'bg-primary'} transition-all duration-500`} style={{ width: `${angket1Progress}%` }}></div>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 font-medium">{angket1Ans} / 43 terjawab</p>
                            </div>
                        </div>
                        {isAngket1Done ? (
                            <span className="flex items-center text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg text-sm shrink-0 ml-4">
                                <CheckCircle className="w-4 h-4 mr-2" /> Selesai
                            </span>
                        ) : (
                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors shrink-0 ml-4" />
                        )}
                    </button>

                    <button
                        onClick={() => router.push("/instrument?step=2")}
                        className="w-full flex items-center justify-between p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-primary/20 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-4 w-full">
                            <div className={`p-4 rounded-xl shrink-0 ${isAngket2Done ? 'bg-green-100 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                <ClipboardList className="w-6 h-6" />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-bold text-slate-800 text-lg">2. Skala Efikasi Diri</h3>
                                <p className="text-slate-500 text-sm">Berisi pertanyaan tingkat keyakinan diri.</p>
                                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                                    <div className={`h-full ${isAngket2Done ? 'bg-green-500' : 'bg-amber-500'} transition-all duration-500`} style={{ width: `${angket2Progress}%` }}></div>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 font-medium">{angket2Ans} / 41 terjawab</p>
                            </div>
                        </div>
                        {isAngket2Done ? (
                            <span className="flex items-center text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg text-sm shrink-0 ml-4">
                                <CheckCircle className="w-4 h-4 mr-2" /> Selesai
                            </span>
                        ) : (
                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors shrink-0 ml-4" />
                        )}
                    </button>

                    <button
                        onClick={() => router.push("/instrument?step=3")}
                        className="w-full flex items-center justify-between p-6 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-primary/20 hover:shadow-md transition-all group"
                    >
                        <div className="flex items-center gap-4 w-full">
                            <div className={`p-4 rounded-xl shrink-0 ${isEssayDone ? 'bg-green-100 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
                                <BrainCircuit className="w-6 h-6" />
                            </div>
                            <div className="text-left flex-1">
                                <h3 className="font-bold text-slate-800 text-lg">3. Tes Penalaran Proporsional</h3>
                                <p className="text-slate-500 text-sm">Soal uraian essay matematika.</p>
                                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                                    <div className={`h-full ${isEssayDone ? 'bg-green-500' : 'bg-purple-500'} transition-all duration-500`} style={{ width: `${essayProgress}%` }}></div>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 font-medium">{isEssayDone ? 'Selesai dijawab' : (essayProgress > 0 ? 'Sedang dikerjakan' : 'Belum dimulai')}</p>
                            </div>
                        </div>
                        {isEssayDone ? (
                            <span className="flex items-center text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg text-sm shrink-0 ml-4">
                                <CheckCircle className="w-4 h-4 mr-2" /> Selesai
                            </span>
                        ) : (
                            <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-600 transition-colors shrink-0 ml-4" />
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
