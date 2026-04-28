"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Users, BookOpen, CheckCircle, Download, LogOut, Edit, Eye, Trash2, Search, Filter, AlertTriangle, Sparkles, Zap, Wand2, Settings, Flag, Home, BrainCircuit, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import * as XLSX from "xlsx";
import { LINGKUNGAN_BELAJAR_Q, EFIKASI_DIRI_Q, TES_SOAL, ESSAY_QUESTIONS } from "@/lib/constants";

interface Student {
    id: string;
    name: string;
    school?: string;
    status_progres: number;
    angkets_1?: Record<number, number>;
    angkets_2?: Record<number, number>;
    essay_answer?: string | Record<number, string>;
    essay_scores?: Record<number, number>;
    lastUpdated?: string;
    completion_time_ms?: number;
}

export default function AdminDashboard() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const [gradingModal, setGradingModal] = useState<Student | null>(null);
    const [batchLoadingStudentId, setBatchLoadingStudentId] = useState<string | null>(null);
    const [scoreInput, setScoreInput] = useState<number | "">("");
    const [activeView, setActiveView] = useState<"Rekap" | "Lingkungan" | "Efikasi" | "Evaluasi" | "Settings">("Rekap");
    const [popover, setPopover] = useState<{ text: string, x: number, y: number, idx: number | string } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'lastUpdated'; direction: 'asc' | 'desc' } | null>(null);

    // Manual API Config States
    const [customApiKey, setCustomApiKey] = useState("");
    const [customModel, setCustomModel] = useState("gemini-2.5-flash");

    useEffect(() => {
        const savedKey = localStorage.getItem("gemini_api_key");
        const savedModel = localStorage.getItem("gemini_model_name");
        if (savedKey) setCustomApiKey(savedKey);
        if (savedModel) setCustomModel(savedModel);
    }, []);
    const [modalEssayIdx, setModalEssayIdx] = useState(0);
    const [gradingLoading, setGradingLoading] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Simple session check
        const isAdmin = sessionStorage.getItem("adminAuth");
        if (!isAdmin) {
            router.push("/admin/login");
            return;
        }
        setAuthChecking(false);
    }, [router]);

    useEffect(() => {
        if (authChecking) return;

        // 1. Real-time Firestore Sync
        setLoading(true);
        const unsub = onSnapshot(collection(db, "students"), (snapshot) => {
            const studentsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Student[];
            setStudents(studentsList);
            setLoading(false);
        });

        return () => unsub();
    }, [authChecking]);

    useEffect(() => {
        const handleClick = () => setPopover(null);
        if (popover) window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, [popover]);

    // Update score input when question index or student changes in modal
    useEffect(() => {
        if (gradingModal) {
            const scores = gradingModal.essay_scores || {};
            setScoreInput(scores[modalEssayIdx] ?? "");
        }
    }, [gradingModal, modalEssayIdx]);

    const renderRespondentAnswer = (ans: string, qId?: number) => {
        if (!ans) return <p className="text-slate-400 italic">Tidak ada jawaban.</p>;

        const isTable = ans.includes("[TABLE]");
        const isLine = ans.includes("[LINE-T]") && ans.includes("[LINE-B]");
        const hasReason = ans.includes("[REASON]");

        let mainContent = ans;
        let reasonPart = "";

        if (hasReason) {
            const parts = ans.split("[REASON]");
            mainContent = parts[0];
            reasonPart = parts[1]?.trim();
        }

        // Clean UI indicators
        mainContent = mainContent.replace(/\[VISUAL:[A-Z]+\]/g, "");

        if (isTable) {
            const tableData = mainContent.replace("[TABLE]", "").trim();
            const rows = tableData.split("|").map(r => r.trim().split(":"));

            // Determine headers based on qId
            let h1 = "Kolom 1", h2 = "Kolom 2";
            if (qId === 6) { h1 = "Jumlah Cokelat (n)"; h2 = "Harga (Rp)"; }
            if (qId === 7) { h1 = "Bahan Bakar (Liter)"; h2 = "Jarak (km)"; }

            return (
                <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 text-center font-bold text-slate-600">{h1}</th>
                                    <th className="p-3 text-center font-bold text-slate-600">{h2}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="p-3 text-center font-black text-primary text-lg">{row[0] || "-"}</td>
                                        <td className="p-3 text-center font-bold text-slate-700 text-lg">
                                            {qId === 6 ? `Rp ${row[1] || "-"}` : (row[1] || "-")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {reasonPart && (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-100 rounded-2xl">
                            <span className="block text-[10px] font-black text-yellow-600 uppercase mb-1">Alasan Pemilihan:</span>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">{reasonPart}</p>
                        </div>
                    )}
                </div>
            );
        }

        if (isLine) {
            const tPart = mainContent.split("[LINE-T]")[1]?.split("[LINE-B]")[0]?.trim() || "";
            const bPart = mainContent.split("[LINE-B]")[1]?.trim() || "";
            const tArr = tPart.split("|");
            const bArr = bPart.split("|");

            return (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 space-y-10">
                        <div className="relative pt-8 pb-8">
                            {/* Top Line */}
                            <div className="h-1 bg-primary relative rounded-full flex justify-between items-center px-4">
                                {tArr.map((v, i) => (
                                    <div key={i} className="w-1.5 h-4 bg-primary rounded-full relative">
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 min-w-[30px] h-8 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center px-2">
                                            <span className="text-xs font-black text-primary">{v || "?"}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <span className="block text-[9px] font-black text-primary uppercase mt-1">Bahan Bakar (Liter)</span>

                            {/* Bottom Line */}
                            <div className="h-1 bg-slate-200 mt-16 relative rounded-full flex justify-between items-center px-4">
                                {bArr.map((v, i) => (
                                    <div key={i} className="w-1.5 h-4 bg-slate-300 rounded-full relative">
                                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 min-w-[30px] h-8 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center px-2">
                                            <span className="text-xs font-black text-slate-600">{v || "?"}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <span className="block text-[9px] font-black text-slate-400 uppercase mt-12 text-right">Jarak (km)</span>
                        </div>
                    </div>
                    {reasonPart && (
                        <div className="p-4 bg-yellow-50 border-2 border-yellow-100 rounded-2xl">
                            <span className="block text-[10px] font-black text-yellow-600 uppercase mb-1">Alasan Pemilihan:</span>
                            <p className="text-sm text-slate-700 font-medium leading-relaxed">{reasonPart}</p>
                        </div>
                    )}
                </div>
            );
        }

        // GRID format (Question 5)
        const isGrid = ans.includes("[GRID]");
        if (isGrid) {
            const gridData = ans.replace("[GRID]", "").trim();
            const parts = gridData.split("|");
            const s1C = parts.find(p => p.startsWith("S1:"))?.replace("S1:", "").trim() || "-";
            const s1A = parts.find(p => p.startsWith("A1:"))?.replace("A1:", "").trim() || "-";
            const s2C = parts.find(p => p.startsWith("S2:"))?.replace("S2:", "").trim() || "-";
            const s2A = parts.find(p => p.startsWith("A2:"))?.replace("A2:", "").trim() || "-";

            const situations = [
                { id: 1, choice: s1C, reason: s1A, text: "Umur Risa (Situasi 1)" },
                { id: 2, choice: s2C, reason: s2A, text: "Mesin Printer (Situasi 2)" }
            ];

            return (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="p-3 text-left font-bold text-slate-600">Situasi</th>
                                <th className="p-3 text-center font-bold text-slate-600">Jenis Hubungan</th>
                                <th className="p-3 text-left font-bold text-slate-600">Alasan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {situations.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/50">
                                    <td className="p-3 font-bold text-primary w-1/4">{s.text}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded-full font-black text-[10px] ${s.choice === 'Proporsional' ? 'bg-emerald-100 text-emerald-700' : s.choice === 'Tidak Proporsional' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-400'}`}>
                                            {s.choice}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-600 font-medium italic">"{s.reason}"</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <p className="text-lg text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{mainContent}</p>
                {reasonPart && (
                    <div className="p-4 bg-yellow-50 border-2 border-yellow-100 rounded-2xl">
                        <span className="block text-[10px] font-black text-yellow-600 uppercase mb-1">Alasan & Penjelasan tambahan:</span>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{reasonPart}</p>
                    </div>
                )}
            </div>
        );
    };

    const handleSort = (key: 'name' | 'lastUpdated') => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedStudents = () => {
        if (!sortConfig) return students;

        return [...students].sort((a, b) => {
            if (sortConfig.key === 'name') {
                const nameA = (a.name || "").toUpperCase();
                const nameB = (b.name || "").toUpperCase();
                if (nameA < nameB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (nameA > nameB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            } else if (sortConfig.key === 'lastUpdated') {
                const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
                const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            return 0;
        });
    };

    const sortedStudents = getSortedStudents();

    const saveSettings = () => {
        if (!customApiKey.trim()) {
            alert("API Key tidak boleh kosong.");
            return;
        }
        localStorage.setItem("gemini_api_key", customApiKey.trim());
        localStorage.setItem("gemini_model_name", customModel.trim());

        // Force refresh state values
        setCustomApiKey(customApiKey.trim());
        setCustomModel(customModel.trim());

        setActiveView("Rekap");
        alert("Konfigurasi API diperbarui paksa dan siap digunakan!");
    };

    const calculateScore = (angkets?: Record<number, number>) => {
        if (!angkets) return 0;
        return Object.values(angkets).reduce((acc, curr) => acc + curr, 0);
    };

    const isStudentFinished = (s: Student) => {
        if (s.status_progres === 4) return true;

        const angket1Done = s.angkets_1 && Object.keys(s.angkets_1).length >= 43;
        const angket2Done = s.angkets_2 && Object.keys(s.angkets_2).length >= 41;

        // Check essay
        const essayAns = s.essay_answer || {};
        const checkAnswered = (i: number, val: string) => {
            const trimmed = (val || "").trim();
            if (!trimmed) return false;
            // Question 7 has special visual markers
            if (i === 6) {
                const clean = trimmed.replace(/\[VISUAL:.*?\]|\[TABLE\]|\[LINE-T\]|\[LINE-B\]|\[REASON\]|[:| \t\n\r]/g, "");
                return clean.length > 0;
            }
            return trimmed.length > 0;
        };
        const essayDone = ESSAY_QUESTIONS.every((_, i) => checkAnswered(i, essayAns[i] || ""));

        return angket1Done && angket2Done && essayDone;
    };

    const totalSiswa = students.length;
    const selesai = students.filter(s => isStudentFinished(s)).length;
    const sedangMengerjakan = students.filter(s => {
        const finished = isStudentFinished(s);
        if (finished) return false;
        // In progress if has some data
        return (s.angkets_1 && Object.keys(s.angkets_1).length > 0) ||
            (s.angkets_2 && Object.keys(s.angkets_2).length > 0) ||
            (s.essay_answer && Object.keys(s.essay_answer).length > 0);
    }).length;


    const handleLogout = async () => {
        if (confirm("Apakah Anda yakin ingin keluar dari Portal Peneliti?")) {
            sessionStorage.removeItem("adminAuth");
            await signOut(auth);
            router.push("/admin/login");
        }
    };

    const analyzeRespondent = (s: Student) => {
        let statsEnv = { time: "green", monotone: "green", trap: "green", logic: "green" };
        let statsEfi = { sync: "green", monotone: "green", trap: "green", logic: "green" };
        let issuesEnv: string[] = [];
        let issuesEfi: string[] = [];

        const envScore = calculateScore(s.angkets_1);
        const efiScore = calculateScore(s.angkets_2);
        const essayScores = s.essay_scores || {};
        const essayScoreSum = Object.values(essayScores).reduce((a, b) => a + Number(b), 0);
        const essayFullText = typeof s.essay_answer === "string" ? s.essay_answer : Object.values(s.essay_answer || {}).map(v => String(v)).join(" ");

        // === 1. WAKTU (-> Lingkungan) ===
        // 84+ soal skala + esai membutuhkan minimal beberapa menit
        if (s.completion_time_ms) {
            if (s.completion_time_ms < 180000) {
                statsEnv.time = "red";
                issuesEnv.push("Waktu: Terlalu Cepat (< 3 Menit untuk seluruh instrumen)");
            } else if (s.completion_time_ms < 480000) {
                statsEnv.time = "yellow";
                issuesEnv.push("Waktu: Cukup Cepat (< 8 Menit)");
            }
        }

        // === 2. VARIASI / MONOTON (-> per instrumen) ===
        const checkVariance = (angkets: Record<number, number> | undefined, expectedLen: number) => {
            if (!angkets) return -1; // no data
            const vals = Object.values(angkets).map(Number);
            if (vals.length < Math.floor(expectedLen * 0.5)) return -1; // belum cukup data
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
            const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
            return variance;
        };

        const var1 = checkVariance(s.angkets_1, 43);
        const var2 = checkVariance(s.angkets_2, 41);

        if (var1 >= 0) {
            if (var1 < 0.3) {
                statsEnv.monotone = "red";
                issuesEnv.push(`Jawaban Monoton (Lingkungan): Variance = ${var1.toFixed(2)}. Hampir semua jawaban identik.`);
            } else if (var1 < 0.5) {
                statsEnv.monotone = "yellow";
                issuesEnv.push(`Variasi Rendah (Lingkungan): Variance = ${var1.toFixed(2)}. Jawaban cenderung seragam.`);
            }
        }

        if (var2 >= 0) {
            if (var2 < 0.3) {
                statsEfi.monotone = "red";
                issuesEfi.push(`Jawaban Monoton (Efikasi): Variance = ${var2.toFixed(2)}. Hampir semua jawaban identik.`);
            } else if (var2 < 0.5) {
                statsEfi.monotone = "yellow";
                issuesEfi.push(`Variasi Rendah (Efikasi): Variance = ${var2.toFixed(2)}. Jawaban cenderung seragam.`);
            }
        }

        // === 3. JEBAKAN (-> per instrumen) ===
        // Lingkungan Q43 (idx 42): "pilih 'Tidak Setuju' (TS)" -> jawaban benar = 2
        if (s.angkets_1 && s.angkets_1[42] !== undefined) {
            if (s.angkets_1[42] !== 2) {
                statsEnv.trap = "red";
                issuesEnv.push(`Gagal Soal Jebakan (Lingkungan Q43): Menjawab ${s.angkets_1[42]}, seharusnya 2 (TS).`);
            }
        }
        // Efikasi Q41 (idx 40): "pilihlah 'Sangat Setuju' (SS)" -> jawaban benar = 5
        if (s.angkets_2 && s.angkets_2[40] !== undefined) {
            if (s.angkets_2[40] !== 5) {
                statsEfi.trap = "red";
                issuesEfi.push(`Gagal Soal Jebakan (Efikasi Q41): Menjawab ${s.angkets_2[40]}, seharusnya 5 (SS).`);
            }
        }

        // === 4. LOGIKA / KONTRADIKSI (-> per instrumen) ===
        // Pasangan positif-negatif dalam dimensi yang sama.
        // Kontradiksi = keduanya >= 4 (Setuju/Sangat Setuju padahal maknanya bertolak belakang)

        // -- Lingkungan Belajar --
        // Dim I: Q1 (idx 0, positif: udara sejuk) vs Q3 (idx 2, negatif: gerah)
        // Dim II: Q9 (idx 8, positif: guru bimbing) vs Q11 (idx 10, negatif: guru abaikan)
        // Dim II: Q13 (idx 12, positif: teman bantu) vs Q15 (idx 14, negatif: teman ejek)
        // Dim IV: Q25 (idx 24, positif: semangat) vs Q27 (idx 26, negatif: cemas)
        const envPairs = [[0, 2], [8, 10], [12, 14], [24, 26]];
        let logicEnvCount = 0;
        const logicEnvDetails: string[] = [];
        if (s.angkets_1) {
            envPairs.forEach(([pos, neg]) => {
                const pVal = s.angkets_1?.[pos];
                const nVal = s.angkets_1?.[neg];
                if (pVal !== undefined && nVal !== undefined && pVal >= 4 && nVal >= 4) {
                    logicEnvCount++;
                    logicEnvDetails.push(`Q${pos + 1}=${pVal} vs Q${neg + 1}=${nVal}`);
                }
            });
        }
        if (logicEnvCount >= 3) {
            statsEnv.logic = "red";
            issuesEnv.push(`Kontradiksi Logika Tinggi (Lingkungan): ${logicEnvCount} pasangan bertentangan (${logicEnvDetails.join(", ")})`);
        } else if (logicEnvCount > 0) {
            statsEnv.logic = "yellow";
            issuesEnv.push(`Kontradiksi Logika Ringan (Lingkungan): ${logicEnvCount} pasangan (${logicEnvDetails.join(", ")})`);
        }

        // -- Efikasi Diri --
        // Dim I: Q1 (idx 0, positif: mampu soal mudah) vs Q6 (idx 5, negatif: langsung menyerah)
        // Dim I: Q4 (idx 3, positif: percaya diri) vs Q8 (idx 7, negatif: ragu/cemas)
        // Dim II: Q9 (idx 8, positif: keyakinan kuat) vs Q13 (idx 12, negatif: mudah putus asa)
        // Dim III: Q17 (idx 16, positif: berlaku semua materi) vs Q23 (idx 22, negatif: belum mampu keseluruhan)
        const efiPairs = [[0, 5], [3, 7], [8, 12], [16, 22]];
        let logicEfiCount = 0;
        const logicEfiDetails: string[] = [];
        if (s.angkets_2) {
            efiPairs.forEach(([pos, neg]) => {
                const pVal = s.angkets_2?.[pos];
                const nVal = s.angkets_2?.[neg];
                if (pVal !== undefined && nVal !== undefined && pVal >= 4 && nVal >= 4) {
                    logicEfiCount++;
                    logicEfiDetails.push(`Q${pos + 1}=${pVal} vs Q${neg + 1}=${nVal}`);
                }
            });
        }
        if (logicEfiCount >= 3) {
            statsEfi.logic = "red";
            issuesEfi.push(`Kontradiksi Logika Tinggi (Efikasi): ${logicEfiCount} pasangan bertentangan (${logicEfiDetails.join(", ")})`);
        } else if (logicEfiCount > 0) {
            statsEfi.logic = "yellow";
            issuesEfi.push(`Kontradiksi Logika Ringan (Efikasi): ${logicEfiCount} pasangan (${logicEfiDetails.join(", ")})`);
        }

        // === 5. SINKRONISASI / TRIANGULASI (-> Efikasi) ===
        const envMax = 215; // 43 items * 5
        const efiMax = 205; // 41 items * 5
        const envPct = envScore > 0 ? (envScore / envMax) * 100 : 0;
        const efiPct = efiScore > 0 ? (efiScore / efiMax) * 100 : 0;

        // Kedua skala tinggi tapi esai kosong/sangat pendek
        if (envPct > 80 && efiPct > 80 && (essayScoreSum === 0 || !essayFullText || essayFullText.length < 20)) {
            statsEfi.sync = "red";
            issuesEfi.push(`Anomali Triangulasi: Skor skala tinggi (Lingk: ${envPct.toFixed(0)}%, Efik: ${efiPct.toFixed(0)}%) tapi esai kosong/sangat singkat.`);
        }
        // Perbedaan besar antar skala (> 30 poin persentase)
        else if (envPct > 0 && efiPct > 0 && Math.abs(envPct - efiPct) > 30) {
            statsEfi.sync = "yellow";
            issuesEfi.push(`Inkonsistensi Antar-Skala: Gap ${Math.abs(envPct - efiPct).toFixed(0)} poin (Lingk: ${envPct.toFixed(0)}%, Efik: ${efiPct.toFixed(0)}%).`);
        }

        return { statsEnv, statsEfi, issuesEnv, issuesEfi };
    };

    const getScale100 = (scores?: Record<number, number>) => {
        if (!scores) return 0;
        const total = Object.values(scores).reduce((a, b) => a + b, 0);
        return Math.round((total / 40) * 100);
    };

    const getScaleValidity = (score: number, max: number) => {
        if (score === 0) return null;
        const pct = (score / max) * 100;
        if (pct >= 80) return { label: "Tinggi", color: "bg-emerald-100 text-emerald-700 border-emerald-200", desc: "Interpretasi Tinggi: Responden memiliki tingkat persepsi/keyakinan yang sangat positif dan stabil terhadap variabel ini." };
        if (pct >= 55) return { label: "Sedang", color: "bg-amber-100 text-amber-700 border-amber-200", desc: "Interpretasi Sedang: Responden memiliki persepsi/keyakinan yang cukup baik, namun masih terdapat fluktuasi dalam aspek tertentu." };
        return { label: "Rendah", color: "bg-rose-100 text-rose-700 border-rose-200", desc: "Interpretasi Rendah: Responden memiliki persepsi/keyakinan yang cenderung kurang kondusif dan memerlukan perhatian lebih mendalam." };
    };

    const exportInstrumentBlueprint = () => {
        const blueprintHeader = ["No", "Butir Pernyataan", "Dimensi", "Favorabilitas (+/-)"];

        // 1. Lingkungan Belajar
        const envNegative = [2, 3, 6, 7, 10, 11, 14, 15, 18, 19, 22, 23, 26, 27, 30, 31, 34, 35, 40, 41, 42];
        const envBlueprintData: any[] = [];
        let envGlobalIdx = 0;
        LINGKUNGAN_BELAJAR_Q.forEach(dim => {
            dim.qs.forEach(q => {
                envBlueprintData.push([
                    envGlobalIdx + 1,
                    q,
                    dim.dimensi,
                    envNegative.includes(envGlobalIdx) ? "(-)" : "(+)"
                ]);
                envGlobalIdx++;
            });
        });

        // 2. Efikasi Diri
        const efiNegative = [4, 5, 6, 7, 12, 13, 14, 15, 20, 21, 22, 23, 28, 29, 30, 31, 36, 37, 38, 39, 40];
        const efiBlueprintData: any[] = [];
        let efiGlobalIdx = 0;
        EFIKASI_DIRI_Q.forEach(dim => {
            dim.qs.forEach(q => {
                efiBlueprintData.push([
                    efiGlobalIdx + 1,
                    q,
                    dim.dimensi,
                    efiNegative.includes(efiGlobalIdx) ? "(-)" : "(+)"
                ]);
                efiGlobalIdx++;
            });
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([blueprintHeader, ...envBlueprintData]), "Skala Lingkungan");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([blueprintHeader, ...efiBlueprintData]), "Skala Efikasi Diri");

        XLSX.writeFile(wb, "Blueprint_Pernyataan_Instrumen.xlsx");
    };

    const exportExcel = () => {
        // 1. Rekapitulasi Global (Simplified)
        const recapHeaders = [
            "Nama Lengkap",
            "Nama Sekolah",
            "Status",
            "Skor Lingkungan",
            "Skor Efikasi",
            "Total Skor Esai (40)",
            "Skor Akhir (100)",
            "Hasil Validasi Sistem"
        ];
        const recapRows = students.map(s => [
            s.name,
            s.school || "-",
            s.status_progres === 4 ? "Selesai" : `Tahap ${s.status_progres}`,
            calculateScore(s.angkets_1),
            calculateScore(s.angkets_2),
            Object.values(s.essay_scores || {}).reduce((a, b) => Number(a) + Number(b), 0),
            getScale100(s.essay_scores),
            [...analyzeRespondent(s).issuesEnv, ...analyzeRespondent(s).issuesEfi].join(" | ") || "Valid"
        ]);
        const wsRecap = XLSX.utils.aoa_to_sheet([recapHeaders, ...recapRows]);

        // 2. Angket Lingkungan Belajar (Item breakdown)
        const envHeaders = ["Nama Lengkap", "Nama Sekolah", ...Array.from({ length: 43 }).map((_, i) => `Butir ${i + 1}`)];
        const envRows = students.map(s => [
            s.name,
            s.school || "-",
            ...Array.from({ length: 43 }).map((_, i) => s.angkets_1?.[i] ?? "")
        ]);
        const wsEnv = XLSX.utils.aoa_to_sheet([envHeaders, ...envRows]);

        // 3. Angket Efikasi Diri (Item breakdown)
        const efiHeaders = ["Nama Lengkap", "Nama Sekolah", ...Array.from({ length: 41 }).map((_, i) => `Butir ${i + 1}`)];
        const efiRows = students.map(s => [
            s.name,
            s.school || "-",
            ...Array.from({ length: 41 }).map((_, i) => s.angkets_2?.[i] ?? "")
        ]);
        const wsEfi = XLSX.utils.aoa_to_sheet([efiHeaders, ...efiRows]);

        // 4. Jawaban Tes Esai (Separate Sheet)
        const essayHeaders = [
            "Nama Lengkap",
            "Nama Sekolah",
            ...ESSAY_QUESTIONS.flatMap(q => [`Jawaban ${q.id}`, `Skor ${q.id}`])
        ];
        const essayRows = students.map(s => {
            const essayAns = s.essay_answer || {};
            const essayScores = s.essay_scores || {};
            return [
                s.name,
                s.school || "-",
                ...ESSAY_QUESTIONS.flatMap((_, i) => [
                    essayAns[i] || "",
                    essayScores[i] || 0
                ])
            ];
        });
        const wsEssay = XLSX.utils.aoa_to_sheet([essayHeaders, ...essayRows]);

        // Build Workbook & Excecute Download
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsRecap, "Rekapitulasi Global");
        XLSX.utils.book_append_sheet(wb, wsEnv, "Jawaban Lingkungan Belajar");
        XLSX.utils.book_append_sheet(wb, wsEfi, "Jawaban Efikasi Diri");
        XLSX.utils.book_append_sheet(wb, wsEssay, "Jawaban Tes Esai");

        XLSX.writeFile(wb, "Data_Penelitian_Analitik.xlsx");
    };

    const renderAngketList = (title: string, score: number, maxScore: number, angkets: Record<number, number> | undefined, questionsArray: { qs: string[] }[], isEfikasi = false) => {
        const flatQuestions = questionsArray.flatMap(d => d.qs);
        return (
            <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-800">{title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${isEfikasi ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                        Skor: {score} / {maxScore}
                    </span>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {flatQuestions.map((q, i) => {
                        const ans = angkets?.[i];
                        let bgClass = "bg-slate-200 text-slate-500";
                        if (ans) {
                            if (isEfikasi) {
                                bgClass = ans >= 4 ? "bg-amber-500 text-white" : ans === 3 ? "bg-amber-300 text-amber-900" : "bg-amber-100 text-amber-700";
                            } else {
                                bgClass = ans >= 4 ? "bg-primary text-white" : ans === 3 ? "bg-primary/40 text-primary-900" : "bg-primary/10 text-primary";
                            }
                        }
                        return (
                            <div key={i} className="flex gap-3 text-sm p-2 bg-white rounded-lg border border-slate-100 items-start">
                                <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md font-bold ${bgClass}`}>
                                    {ans || "-"}
                                </div>
                                <div className="text-slate-600 leading-tight leading-snug">{q}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const getCellColor = (val: number | undefined) => {
        if (!val) return 'text-slate-300';
        if (val === 5) return 'bg-emerald-500 text-white font-bold';
        if (val === 4) return 'bg-emerald-200 text-emerald-800 font-bold';
        if (val === 3) return 'bg-amber-200 text-amber-800 font-bold';
        if (val === 2) return 'bg-rose-200 text-rose-800 font-bold';
        return 'bg-rose-500 text-white font-bold';
    };

    const renderTableHeaders = () => {
        const envQs = LINGKUNGAN_BELAJAR_Q.flatMap(d => d.qs);
        const efiQs = EFIKASI_DIRI_Q.flatMap(d => d.qs);

        const SortButton = ({ label, sortKey }: { label: string, sortKey: 'name' | 'lastUpdated' }) => (
            <button
                onClick={() => handleSort(sortKey)}
                className="flex items-center gap-1 hover:text-primary transition-colors group"
            >
                {label}
                {sortConfig?.key === sortKey ? (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-primary/50" />
                )}
            </button>
        );

        if (activeView === "Lingkungan") {
            return (
                <tr>
                    <th className="p-4 font-semibold text-left sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#f1f5f9]">
                        <SortButton label="Nama Lengkap" sortKey="name" />
                    </th>
                    <th className="p-4 font-semibold text-center border-r border-slate-200 bg-slate-50 z-10">Total</th>
                    {Array.from({ length: 43 }).map((_, i) => (
                        <th key={i}
                            onClick={(e) => { e.stopPropagation(); setPopover({ text: envQs[i], x: e.clientX, y: e.clientY, idx: i }); }}
                            className={`p-2 font-semibold text-center text-[10px] whitespace-nowrap min-w-[40px] cursor-pointer transition-colors ${popover?.idx === i ? 'bg-primary text-white ring-2 ring-primary ring-offset-1' : 'bg-slate-50 hover:bg-slate-200'}`}
                            title="Klik untuk melihat teks pernyataan"
                        >Q{i + 1}</th>
                    ))}
                </tr>
            );
        }
        if (activeView === "Efikasi") {
            return (
                <tr>
                    <th className="p-4 font-semibold text-left sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#f1f5f9]">
                        <SortButton label="Nama Lengkap" sortKey="name" />
                    </th>
                    <th className="p-4 font-semibold text-center border-r border-slate-200 bg-slate-50 z-10">Total</th>
                    {Array.from({ length: 41 }).map((_, i) => (
                        <th key={i}
                            onClick={(e) => { e.stopPropagation(); setPopover({ text: efiQs[i], x: e.clientX, y: e.clientY, idx: i }); }}
                            className={`p-2 font-semibold text-center text-[10px] whitespace-nowrap min-w-[40px] cursor-pointer transition-colors ${popover?.idx === i ? 'bg-amber-500 text-white ring-2 ring-amber-500 ring-offset-1' : 'bg-slate-50 hover:bg-slate-200'}`}
                            title="Klik untuk melihat teks pernyataan"
                        >Q{i + 1}</th>
                    ))}
                </tr>
            );
        }
        if (activeView === "Evaluasi") {
            return (
                <tr>
                    <th className="p-4 font-semibold text-left">
                        <SortButton label="Nama Lengkap" sortKey="name" />
                    </th>
                    {ESSAY_QUESTIONS.map(q => (
                        <th key={q.id} className="p-4 font-semibold text-center">Soal {q.id}</th>
                    ))}
                    <th className="p-4 font-semibold text-center">Total Skor</th>
                    <th className="p-4 font-semibold text-center">Nilai</th>
                    <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
            );
        }
        return (
            <tr>
                <th className="p-4 font-semibold text-left">
                    <SortButton label="Nama" sortKey="name" />
                </th>
                <th className="p-4 font-semibold text-left">Sekolah</th>
                <th className="p-4 font-semibold text-center">
                    <SortButton label="Waktu" sortKey="lastUpdated" />
                </th>
                <th className="p-4 font-semibold text-center">Kualitas Lingk.</th>
                <th className="p-4 font-semibold text-center">Kualitas Efi.</th>
                <th className="p-4 font-semibold text-center">Lingk.</th>
                <th className="p-4 font-semibold text-center">Efi.</th>
                <th className="p-4 font-semibold text-center">Esai</th>
                <th className="p-4 font-semibold text-center">Triangulasi</th>
                <th className="p-4 font-semibold text-center">Aksi</th>
            </tr>
        );
    };

    const handleDeleteStudent = async (id: string, name: string) => {
        if (!id) {
            alert("Error: ID responden tidak ditemukan.");
            return;
        }
        if (confirm(`Apakah Anda yakin ingin menghapus respon dari "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
            try {
                console.log("Attempting to delete student with ID:", id);
                const studentRef = doc(db, "students", id);
                await deleteDoc(studentRef);

                // Also clean up local storage if it was ever used as a cache
                const localData = localStorage.getItem("localStudentsData");
                if (localData) {
                    const studentsMap = JSON.parse(localData);
                    delete studentsMap[id];
                    localStorage.setItem("localStudentsData", JSON.stringify(studentsMap));
                }

                alert(`Data responden "${name}" telah berhasil dihapus dari cloud.`);
            } catch (err: any) {
                console.error("Firebase delete failed:", err);
                alert(`Gagal menghapus data: ${err.message || "Kesalahan pada server Firestore"}`);
            }
        }
    };

    const performSave = async (studentId: string, essayIdx: number, val: number | "") => {
        if (!studentId || val === "") return;
        try {
            const student = students.find(s => s.id === studentId);
            if (!student) return;

            const newScores = { ...(student.essay_scores || {}), [essayIdx]: Number(val) };

            // Update LocalStorage (Dashboard State Source)
            const localDataStore = localStorage.getItem("localStudentsData");
            if (localDataStore) {
                const studentsMap = JSON.parse(localDataStore);
                if (studentsMap[studentId]) {
                    studentsMap[studentId].essay_scores = newScores;
                    localStorage.setItem("localStudentsData", JSON.stringify(studentsMap));
                    setStudents(Object.values(studentsMap));
                }
            }

            // Sync with Firestore (Persistent Data)
            try {
                const studentRef = doc(db, "students", studentId);
                await updateDoc(studentRef, { essay_scores: newScores });
            } catch (fsErr) {
                console.warn("Firestore sync failed:", fsErr);
            }

            // If we are in the modal, update modal state too
            if (gradingModal && gradingModal.id === studentId) {
                setGradingModal({ ...gradingModal, essay_scores: newScores });
            }
        } catch (e) {
            console.error("Auto-save error:", e);
        }
    };

    // Google Gemini AI Grading

    const handleAIGrading = async (studentAnswer: string) => {
        if (!studentAnswer || studentAnswer.length < 5) {
            alert("Jawaban terlalu singkat untuk dinilai AI.");
            return;
        }

        setGradingLoading(true);
        try {
            const q = ESSAY_QUESTIONS[modalEssayIdx];
            const res = await fetch("/api/grade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    questionText: q.text,
                    studentAnswer,
                    rubric: q.rubric,
                    indicator: q.indicator,
                    cognitiveLevel: q.cognitiveLevel,
                    customApiKey,
                    customModel
                })
            });

            const data = await res.json();
            if (data.score !== undefined) {
                setScoreInput(data.score);
                if (data.feedback) {
                    setAiFeedback(data.feedback);
                }
                // Auto save AI result
                if (gradingModal) {
                    performSave(gradingModal.id, modalEssayIdx, data.score);
                }
            } else {
                const errMsg = data.error || data.feedback || "Gagal mendapatkan penilaian dari AI.";
                if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("limit")) {
                    if (confirm(`Quota Terbatas / Limit Terlampaui (429). \n\nApakah Anda ingin mengganti API Key sekarang di menu Pengaturan?`)) {
                        setGradingModal(null); // Close modal
                        setActiveView("Settings"); // Switch view
                    }
                } else {
                    alert(`Error: ${errMsg}`);
                }
            }
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat menghubungi AI.");
        } finally {
            setGradingLoading(false);
        }
    };

    const handleAutoGradingForStudent = async (student: Student) => {
        const essayAns = typeof student.essay_answer === "string" ? { 0: student.essay_answer } : student.essay_answer || {};
        if (Object.keys(essayAns).length === 0) {
            alert("Tidak ada jawaban yang bisa dievaluasi.");
            return;
        }

        if (!confirm(`Mulai evaluasi AI otomatis untuk semua soal ${student.name}?`)) return;

        setBatchLoadingStudentId(student.id);
        setGradingLoading(true);

        try {
            const currentScores = { ...(student.essay_scores || {}) };
            for (let i = 0; i < ESSAY_QUESTIONS.length; i++) {
                const answer = essayAns[i];
                if (answer && answer.length >= 5) {
                    const q = ESSAY_QUESTIONS[i];
                    try {
                        const res = await fetch("/api/grade", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                questionText: q.text,
                                studentAnswer: answer,
                                rubric: q.rubric,
                                indicator: q.indicator,
                                cognitiveLevel: q.cognitiveLevel,
                                customApiKey,
                                customModel
                            })
                        });
                        const data = await res.json();
                        if (data.score !== undefined) {
                            currentScores[i] = data.score;
                            // Update state locally for real-time feedback
                            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, essay_scores: { ...currentScores } } : s));

                            // Real-time Sync to LocalStorage
                            const localDataStore = localStorage.getItem("localStudentsData");
                            if (localDataStore) {
                                const map = JSON.parse(localDataStore);
                                if (map[student.id]) {
                                    map[student.id].essay_scores = { ...currentScores };
                                    localStorage.setItem("localStudentsData", JSON.stringify(map));
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`Error grading Q${i + 1}:`, e);
                    }
                }
            }

            // Sync to Firestore
            const studentRef = doc(db, "students", student.id);
            await updateDoc(studentRef, { essay_scores: currentScores });

            // Sync to LocalStorage (Dashboard Source of Truth)
            const localData = localStorage.getItem("localStudentsData");
            if (localData) {
                const studentsMap = JSON.parse(localData);
                if (studentsMap[student.id]) {
                    studentsMap[student.id].essay_scores = currentScores;
                    localStorage.setItem("localStudentsData", JSON.stringify(studentsMap));
                    setStudents(Object.values(studentsMap));
                }
            }
        } catch (error) {
            console.error("Batch Grading Error:", error);
            alert("Terjadi kesalahan saat batch grading.");
        } finally {
            setBatchLoadingStudentId(null);
            setGradingLoading(false);
        }
    };

    const handleBatchAIGrading = async () => {
        if (!gradingModal) return;
        const essayAns = typeof gradingModal.essay_answer === "string" ? { 0: gradingModal.essay_answer } : gradingModal.essay_answer || {};

        if (Object.keys(essayAns).length === 0) {
            alert("Tidak ada jawaban yang bisa dievaluasi.");
            return;
        }

        if (!confirm("Mulai evaluasi AI otomatis untuk semua soal?")) return;

        setGradingLoading(true);
        try {
            const currentScores = { ...(gradingModal.essay_scores || {}) };
            for (let i = 0; i < ESSAY_QUESTIONS.length; i++) {
                const answer = essayAns[i];
                if (answer && answer.length >= 5) {
                    setModalEssayIdx(i); // Visual feedback
                    const q = ESSAY_QUESTIONS[i];
                    const res = await fetch("/api/grade", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            questionText: q.text,
                            studentAnswer: answer,
                            rubric: q.rubric,
                            indicator: q.indicator,
                            cognitiveLevel: q.cognitiveLevel
                        })
                    });
                    const data = await res.json();
                    if (data.score !== undefined) {
                        currentScores[i] = data.score;
                        setStudents(prev => prev.map(s => s.id === gradingModal.id ? { ...s, essay_scores: { ...currentScores } } : s));

                        // Real-time Sync to LocalStorage
                        const lData = localStorage.getItem("localStudentsData");
                        if (lData) {
                            const lMap = JSON.parse(lData);
                            if (lMap[gradingModal.id]) {
                                lMap[gradingModal.id].essay_scores = { ...currentScores };
                                localStorage.setItem("localStudentsData", JSON.stringify(lMap));
                            }
                        }
                    }
                }
            }

            // Save all scores at once
            const studentRef = doc(db, "students", gradingModal.id);
            await updateDoc(studentRef, {
                essay_scores: currentScores,
                status_progres: 4 // Mark as fully graded if desired or just update
            });

            setGradingModal({ ...gradingModal, essay_scores: currentScores });

            // Sync with LocalStorage
            const localData = localStorage.getItem("localStudentsData");
            if (localData) {
                const studentsMap = JSON.parse(localData);
                if (studentsMap[gradingModal.id]) {
                    studentsMap[gradingModal.id].essay_scores = currentScores;
                    studentsMap[gradingModal.id].status_progres = 4;
                    localStorage.setItem("localStudentsData", JSON.stringify(studentsMap));
                    setStudents(Object.values(studentsMap));
                }
            }

            alert("Evaluasi AI untuk semua soal selesai.");
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat evaluasi batch.");
        } finally {
            setGradingLoading(false);
        }
    };

    const handleResetGrading = async () => {
        if (!gradingModal) return;
        if (!confirm(`Apakah Anda yakin ingin RESET semua penilaian untuk ${gradingModal.name}? Tindakan ini tidak dapat dibatalkan.`)) return;

        setGradingLoading(true);
        try {
            const studentRef = doc(db, "students", gradingModal.id);
            await updateDoc(studentRef, {
                essay_scores: {},
            });

            setGradingModal({ ...gradingModal, essay_scores: {} });

            // Sync with LocalStorage
            const localData = localStorage.getItem("localStudentsData");
            if (localData) {
                const studentsMap = JSON.parse(localData);
                if (studentsMap[gradingModal.id]) {
                    studentsMap[gradingModal.id].essay_scores = {};
                    localStorage.setItem("localStudentsData", JSON.stringify(studentsMap));
                    setStudents(Object.values(studentsMap));
                }
            }

            setScoreInput("");
            setAiFeedback(null);
            alert("Penilaian berhasil di-reset.");
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat me-reset penilaian.");
        } finally {
            setGradingLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-foreground">
            {/* Navbar */}
            <nav className="bg-primary text-white p-3 sm:p-4 shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="font-bold text-sm sm:text-xl tracking-wide truncate mr-2">Admin Peneliti</h1>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={() => router.push("/")}
                            className="flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg hover:bg-primary-hover text-white/90 hover:text-white transition font-medium text-xs sm:text-sm"
                        >
                            <Home className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Home</span>
                        </button>
                        <div className="w-[1px] h-4 sm:h-6 bg-white/20 mx-0.5 sm:mx-1"></div>
                        <button
                            onClick={() => setActiveView("Settings")}
                            className={`flex items-center gap-2 px-2 sm:px-4 py-2 rounded-lg transition font-medium text-xs sm:text-sm ${activeView === "Settings" ? "bg-white text-primary shadow-md" : "hover:bg-primary-hover text-white/90 hover:text-white"}`}
                        >
                            <Settings className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Pengaturan</span>
                        </button>
                        <div className="w-[1px] h-4 sm:h-6 bg-white/20 mx-0.5 sm:mx-1"></div>
                        <button onClick={handleLogout} className="flex items-center gap-2 hover:bg-primary-hover px-2 sm:px-4 py-2 rounded-lg transition text-white/90 hover:text-white font-medium text-xs sm:text-sm">
                            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Keluar</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-8">
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                        <div className="bg-blue-100 p-2 sm:p-4 rounded-xl mr-3 sm:mr-4"><Users className="w-5 h-5 sm:w-8 sm:h-8 text-blue-600" /></div>
                        <div>
                            <p className="text-slate-500 text-[10px] sm:text-sm font-medium">Responden</p>
                            <h2 className="text-xl sm:text-3xl font-bold text-slate-800">{totalSiswa}</h2>
                        </div>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                        <div className="bg-amber-100 p-2 sm:p-4 rounded-xl mr-3 sm:mr-4"><BookOpen className="w-5 h-5 sm:w-8 sm:h-8 text-amber-600" /></div>
                        <div>
                            <p className="text-slate-500 text-[10px] sm:text-sm font-medium">Progres</p>
                            <h2 className="text-xl sm:text-3xl font-bold text-slate-800">{sedangMengerjakan}</h2>
                        </div>
                    </div>
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center col-span-2 md:col-span-1">
                        <div className="bg-green-100 p-2 sm:p-4 rounded-xl mr-3 sm:mr-4"><CheckCircle className="w-5 h-5 sm:w-8 sm:h-8 text-green-600" /></div>
                        <div>
                            <p className="text-slate-500 text-[10px] sm:text-sm font-medium">Selesai</p>
                            <h2 className="text-xl sm:text-3xl font-bold text-slate-800">{selesai}</h2>
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Data Responden</h2>
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 mb-8 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setActiveView("Rekap")}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeView === "Rekap" ? "bg-white text-primary shadow-sm ring-1 ring-slate-100" : "text-slate-500 hover:bg-slate-100"}`}
                            >
                                Rekap Global
                            </button>
                            <button
                                onClick={() => setActiveView("Lingkungan")}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeView === "Lingkungan" ? "bg-white text-primary shadow-sm ring-1 ring-slate-100" : "text-slate-500 hover:bg-slate-100"}`}
                            >
                                Skala Lingkungan
                            </button>
                            <button
                                onClick={() => setActiveView("Efikasi")}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeView === "Efikasi" ? "bg-white text-primary shadow-sm ring-1 ring-slate-100" : "text-slate-500 hover:bg-slate-100"}`}
                            >
                                Skala Efikasi
                            </button>
                            <button
                                onClick={() => setActiveView("Evaluasi")}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeView === "Evaluasi" ? "bg-white text-primary shadow-sm ring-1 ring-slate-100" : "text-slate-500 hover:bg-slate-100"}`}
                            >
                                Instrumen Tes
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={exportInstrumentBlueprint} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white px-4 py-2 rounded-lg transition shadow-sm font-bold text-sm">
                            <Download className="w-4 h-4" /> Download Blueprint
                        </button>
                        <button onClick={exportExcel} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg transition shadow-sm font-medium">
                            <Download className="w-4 h-4" /> Export Laporan (Excel)
                        </button>
                    </div>
                </div>

                {activeView === "Settings" ? (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
                                <div className="bg-indigo-100 p-3 rounded-2xl">
                                    <Settings className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Pengaturan API Gemini</h3>
                                    <p className="text-sm text-slate-500 font-medium">Konfigurasi manual untuk sistem penilaian otomatis.</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">Google Gemini API Key</label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            value={customApiKey}
                                            onChange={(e) => setCustomApiKey(e.target.value)}
                                            placeholder="Masukkan API Key Anda..."
                                            className="w-full p-4 pr-12 text-sm border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium bg-slate-50/50"
                                        />
                                        <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium italic">Kunci ini disimpan secara lokal di browser Anda dan hanya digunakan untuk proses penilaian.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-slate-700">Model Name</label>
                                    <select
                                        value={customModel}
                                        onChange={(e) => setCustomModel(e.target.value)}
                                        className="w-full p-4 text-sm border-2 border-slate-100 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold bg-slate-50/50"
                                    >
                                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                    </select>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={saveSettings}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        Simpan & Paksa Update
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto w-full custom-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                    {renderTableHeaders()}
                                </thead>
                                <tbody className="divide-y divide-slate-100/60">
                                    {sortedStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={100} className="p-8 text-center text-slate-500">Belum ada data responden.</td>
                                        </tr>
                                    )}
                                    {sortedStudents.map((s) => {
                                        if (activeView === "Lingkungan" || activeView === "Efikasi") {
                                            const isEnv = activeView === "Lingkungan";
                                            const len = isEnv ? 43 : 41;
                                            const angkets = isEnv ? s.angkets_1 : s.angkets_2;
                                            const qsList = isEnv ? LINGKUNGAN_BELAJAR_Q.flatMap(d => d.qs) : EFIKASI_DIRI_Q.flatMap(d => d.qs);
                                            return (
                                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-medium text-slate-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#f1f5f9] whitespace-nowrap">{s.name}</td>
                                                    <td className="p-4 text-center font-bold text-slate-600 border-r border-slate-100 bg-white">{calculateScore(angkets) || "-"}</td>
                                                    {Array.from({ length: len }).map((_, i) => (
                                                        <td key={i} className="p-1">
                                                            <div
                                                                onClick={(e) => { e.stopPropagation(); setPopover({ text: qsList[i], x: e.clientX, y: e.clientY, idx: i }); }}
                                                                className={`w-8 h-8 mx-auto flex items-center justify-center rounded text-[11px] cursor-pointer ring-offset-1 hover:ring-2 hover:ring-slate-300 transition-all ${popover?.idx === i ? 'ring-2 ring-primary scale-125 z-10' : ''} ${getCellColor(angkets?.[i])}`}
                                                                title="Klik untuk melihat teks pernyataan"
                                                            >
                                                                {angkets?.[i] || "-"}
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        }

                                        if (activeView === "Evaluasi") {
                                            const essayAns = typeof s.essay_answer === "string" ? { 0: s.essay_answer } : s.essay_answer || {};
                                            return (
                                                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-slate-800">{s.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">ID: {s.id}</div>
                                                    </td>
                                                    {ESSAY_QUESTIONS.map((_, i) => {
                                                        const score = s.essay_scores?.[i];
                                                        const hasAnswer = !!essayAns[i];
                                                        const scoreColor = score !== undefined
                                                            ? score >= 3 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                                : score === 2 ? "bg-amber-100 text-amber-700 border-amber-200"
                                                                    : "bg-rose-100 text-rose-700 border-rose-200"
                                                            : hasAnswer ? "bg-slate-100 text-slate-500 border-slate-200" : "";
                                                        return (
                                                            <td key={i} className="p-4 text-center">
                                                                {hasAnswer ? (
                                                                    <button
                                                                        onClick={() => { setGradingModal(s); setModalEssayIdx(i); }}
                                                                        className={`font-bold text-sm px-3 py-1 rounded-md border hover:opacity-80 transition-colors ${scoreColor}`}
                                                                    >
                                                                        {score !== undefined ? score : "-"}
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-slate-300 font-medium text-xs">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="p-4 text-center font-bold text-primary">
                                                        {s.essay_scores ? Object.values(s.essay_scores).reduce((a, b) => a + b, 0) : 0}
                                                    </td>
                                                    <td className="p-4 text-center font-black text-slate-700">
                                                        {getScale100(s.essay_scores)}
                                                    </td>
                                                    <td className="p-4 flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleAutoGradingForStudent(s)}
                                                            disabled={batchLoadingStudentId === s.id}
                                                            className="bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white p-2 rounded-lg transition disabled:opacity-50"
                                                            title="Koreksi Otomatis (Semua Soal)"
                                                        >
                                                            <Wand2 className={`w-5 h-5 ${batchLoadingStudentId === s.id ? 'animate-spin' : ''}`} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setGradingModal(s); setModalEssayIdx(0); }}
                                                            className="bg-primary/10 text-primary hover:bg-primary hover:text-white p-2 rounded-lg transition"
                                                            title="Evaluasi Detail"
                                                        >
                                                            <Edit className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const envComplete = s.angkets_1 && Object.keys(s.angkets_1).length >= 43;
                                        const efiComplete = s.angkets_2 && Object.keys(s.angkets_2).length >= 41;
                                        const validation = analyzeRespondent(s);

                                        return (
                                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 font-medium text-slate-800">{s.name}</td>
                                                <td className="p-4 text-slate-600 font-medium">{s.school || "-"}</td>
                                                <td className="p-4 text-center text-[10px] text-slate-500 font-mono">
                                                    {s.lastUpdated ? new Date(s.lastUpdated).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : "-"}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {envComplete ? (
                                                        <div className="flex justify-center gap-1">
                                                            {(() => {
                                                                const { statsEnv, issuesEnv } = validation;
                                                                const FlagIcon = ({ status, label, detail }: { status: string, label: string, detail?: string }) => (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); if (detail) setPopover({ text: `${label}: ${detail}`, x: e.clientX, y: e.clientY, idx: `env-${s.id}-${label}` }); }}
                                                                        className={`p-1 rounded-md border transition-all hover:scale-110 active:scale-95 ${status === 'red' ? 'bg-rose-50 border-rose-200 text-rose-600' : status === 'yellow' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}
                                                                        title={`${label}: ${status === 'green' ? 'Valid' : 'Anomali'}`}
                                                                    >
                                                                        <Flag className={`w-3 h-3 ${status !== 'green' ? 'fill-current' : ''}`} />
                                                                    </button>
                                                                );
                                                                return (
                                                                    <>
                                                                        <FlagIcon status={statsEnv.time} label="Waktu" detail={issuesEnv.find((i) => i.includes("Waktu"))} />
                                                                        <FlagIcon status={statsEnv.monotone} label="Variasi" detail={issuesEnv.find((i) => i.includes("Monoton") || i.includes("Variasi"))} />
                                                                        <FlagIcon status={statsEnv.trap} label="Jebakan" detail={issuesEnv.find((i) => i.includes("Jebakan"))} />
                                                                        <FlagIcon status={statsEnv.logic} label="Logika" detail={issuesEnv.find((i) => i.includes("Kontradiksi"))} />
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">Belum lengkap</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center border-l border-slate-50">
                                                    {efiComplete ? (
                                                        <div className="flex justify-center gap-1">
                                                            {(() => {
                                                                const { statsEfi, issuesEfi } = validation;
                                                                const FlagIcon = ({ status, label, detail }: { status: string, label: string, detail?: string }) => (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); if (detail) setPopover({ text: `${label}: ${detail}`, x: e.clientX, y: e.clientY, idx: `efi-${s.id}-${label}` }); }}
                                                                        className={`p-1 rounded-md border transition-all hover:scale-110 active:scale-95 ${status === 'red' ? 'bg-rose-50 border-rose-200 text-rose-600' : status === 'yellow' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}
                                                                        title={`${label}: ${status === 'green' ? 'Valid' : 'Anomali'}`}
                                                                    >
                                                                        <Flag className={`w-3 h-3 ${status !== 'green' ? 'fill-current' : ''}`} />
                                                                    </button>
                                                                );
                                                                return (
                                                                    <>
                                                                        <FlagIcon status={statsEfi.sync} label="Sinkron" detail={issuesEfi.find((i) => i.includes("Triangulasi") || i.includes("Inkonsistensi"))} />
                                                                        <FlagIcon status={statsEfi.monotone} label="Variasi" detail={issuesEfi.find((i) => i.includes("Monoton") || i.includes("Variasi"))} />
                                                                        <FlagIcon status={statsEfi.trap} label="Jebakan" detail={issuesEfi.find((i) => i.includes("Jebakan"))} />
                                                                        <FlagIcon status={statsEfi.logic} label="Logika" detail={issuesEfi.find((i) => i.includes("Kontradiksi"))} />
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic">Belum lengkap</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="font-semibold text-slate-600">{calculateScore(s.angkets_1) || "-"}</span>
                                                        {s.angkets_1 && calculateScore(s.angkets_1) > 0 && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); const val = getScaleValidity(calculateScore(s.angkets_1), 215); if (val) setPopover({ text: val.desc, x: e.clientX, y: e.clientY, idx: `v1-${s.id}` }); }}
                                                                className={`text-[9px] px-2 py-0.5 rounded-full border font-bold hover:scale-105 transition-transform ${getScaleValidity(calculateScore(s.angkets_1), 215)?.color}`}
                                                            >
                                                                {getScaleValidity(calculateScore(s.angkets_1), 215)?.label}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="font-semibold text-slate-600">{calculateScore(s.angkets_2) || "-"}</span>
                                                        {s.angkets_2 && calculateScore(s.angkets_2) > 0 && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); const val = getScaleValidity(calculateScore(s.angkets_2), 205); if (val) setPopover({ text: val.desc, x: e.clientX, y: e.clientY, idx: `v2-${s.id}` }); }}
                                                                className={`text-[9px] px-2 py-0.5 rounded-full border font-bold hover:scale-105 transition-transform ${getScaleValidity(calculateScore(s.angkets_2), 205)?.color}`}
                                                            >
                                                                {getScaleValidity(calculateScore(s.angkets_2), 205)?.label}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center border-l border-slate-50">
                                                    {s.essay_scores ? (
                                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                                            {Object.values(s.essay_scores).reduce((a, b) => a + b, 0)}
                                                        </span>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    {(() => {
                                                        const isFinished = isStudentFinished(s);
                                                        if (!isFinished) return <span className="text-[10px] text-slate-400 italic">Belum selesai</span>;
                                                        if (!s.essay_scores) return <span className="text-[10px] text-amber-500 font-bold italic">Belum dinilai</span>;

                                                        const allStats = [...Object.values(validation.statsEnv), ...Object.values(validation.statsEfi)];
                                                        const allIssues = [...validation.issuesEnv, ...validation.issuesEfi];
                                                        const hasRed = allStats.includes("red");
                                                        const hasYellow = allStats.includes("yellow");

                                                        let label = "Baik";
                                                        let colorClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                                                        let summary = "✅ Data Valid — Seluruh indikator kualitas data (waktu, variasi, jebakan, logika, dan triangulasi) menunjukkan konsistensi yang baik. Data layak digunakan untuk analisis.";

                                                        if (hasRed) {
                                                            label = "Kurang";
                                                            colorClass = "bg-rose-100 text-rose-700 border-rose-200";
                                                            summary = `⚠️ Data Bermasalah — Ditemukan ${allIssues.length} anomali serius:\n${allIssues.map(i => `• ${i}`).join("\n")}\n\nRekomendasi: Pertimbangkan untuk mengeluarkan data ini dari analisis atau lakukan verifikasi manual.`;
                                                        } else if (hasYellow) {
                                                            label = "Cukup";
                                                            colorClass = "bg-amber-100 text-amber-700 border-amber-200";
                                                            summary = `⚡ Data Perlu Perhatian — Ditemukan ${allIssues.length} catatan minor:\n${allIssues.map(i => `• ${i}`).join("\n")}\n\nRekomendasi: Data masih dapat digunakan, namun perlu dicermati pada indikator yang ditandai.`;
                                                        }

                                                        return (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setPopover({ text: summary, x: e.clientX, y: e.clientY, idx: `tri-${s.id}` }); }}
                                                                className={`text-xs px-3 py-1 rounded-full border font-bold hover:scale-105 transition-transform cursor-pointer ${colorClass}`}
                                                            >
                                                                {label}
                                                            </button>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => setGradingModal(s)}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                                                            title="Nilai AI"
                                                        >
                                                            <Users className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStudent(s.id, s.name)}
                                                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
                }

                {
                    popover && (
                        <div
                            className="fixed z-[100] bg-slate-800 text-white p-3 rounded-lg shadow-2xl text-sm font-medium w-64 md:w-72 leading-relaxed animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
                            style={{
                                left: Math.min(popover.x, typeof window !== "undefined" ? window.innerWidth - 300 : popover.x),
                                top: popover.y + 15
                            }}
                        >
                            <span className="inline-block bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded mr-2 mb-1">
                                {typeof popover.idx === 'number' ? `Butir ${popover.idx + 1}` : 'Interpretasi'}
                            </span>
                            <span>{popover.text}</span>
                            <div className="absolute -top-2 left-4 border-8 border-transparent border-b-slate-800"></div>
                        </div>
                    )
                }
            </main >

            {/* Grading Modal */}
            {
                gradingModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white rounded-3xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-lg text-slate-800">Verifikasi Instrumen - {gradingModal.name}</h3>
                                <button
                                    onClick={() => { setGradingModal(null); setModalEssayIdx(0); }}
                                    className="text-slate-400 hover:text-slate-600 px-3 py-1 bg-white border border-slate-200 rounded-lg"
                                >
                                    Tutup
                                </button>
                            </div>

                            {/* Modal Body / Split Screen */}
                            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                                {/* Left Screen: Student Answer */}
                                <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100 bg-white">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Jawaban Tes (Esai)</h4>
                                        <div className="flex gap-1">
                                            {ESSAY_QUESTIONS.map((_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        setModalEssayIdx(i);
                                                        const essayScores = gradingModal.essay_scores || {};
                                                        setScoreInput(essayScores[i] ?? "");
                                                        setAiFeedback(null); // Clear feedback when switching questions
                                                    }}
                                                    className={`w-8 h-8 rounded-lg font-bold text-xs transition-all ${modalEssayIdx === i ? 'bg-primary text-white scale-110 shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 italic text-sm text-slate-600">
                                        <span className="font-bold text-primary mr-2">SOAL {modalEssayIdx + 1}:</span>
                                        {ESSAY_QUESTIONS[modalEssayIdx].text}
                                    </div>

                                    <div className="bg-blue-50 text-slate-800 p-6 rounded-xl min-h-[150px] border border-blue-100 leading-relaxed mb-6 font-medium shadow-inner">
                                        <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Jawaban Responden</h5>
                                        {(() => {
                                            const ans = typeof gradingModal.essay_answer === "string"
                                                ? (modalEssayIdx === 0 ? gradingModal.essay_answer : null)
                                                : gradingModal.essay_answer?.[modalEssayIdx];
                                            return renderRespondentAnswer(ans || "", ESSAY_QUESTIONS[modalEssayIdx].id);
                                        })()}
                                    </div>

                                    {/* Scoring Rubric for Admin */}
                                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg mb-8">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rambu-rambu Jawaban {modalEssayIdx + 1}</h4>
                                        <div className="space-y-3">
                                            {ESSAY_QUESTIONS[modalEssayIdx].rubric.map((r, idx) => (
                                                <div key={idx} className="flex gap-3 items-start border-l-2 border-primary/50 pl-4 py-1">
                                                    <span className="text-white/90 text-sm leading-relaxed">{r}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between text-[10px] text-white/40 font-bold">
                                            <span>MATERI: {ESSAY_QUESTIONS[modalEssayIdx].subject}</span>
                                            <span>LEVEL: {ESSAY_QUESTIONS[modalEssayIdx].cognitiveLevel}</span>
                                        </div>
                                    </div>

                                    <hr className="border-slate-100 mb-8" />

                                    <div className="mb-6">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <div className="w-4 h-[2px] bg-slate-200"></div>
                                            Data Triangulasi (Skala)
                                        </h3>

                                        {renderAngketList("Lingkungan Belajar", calculateScore(gradingModal.angkets_1), 215, gradingModal.angkets_1, LINGKUNGAN_BELAJAR_Q, false)}

                                        {renderAngketList("Efikasi Diri", calculateScore(gradingModal.angkets_2), 205, gradingModal.angkets_2, EFIKASI_DIRI_Q, true)}

                                    </div>
                                </div>

                                {/* Right Screen: Assessment */}
                                <div className="w-full md:w-96 p-6 bg-slate-50 flex flex-col overflow-y-auto max-h-[80vh]">
                                    <h4 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wide">Penilaian (0-4)</h4>

                                    <div className="mb-8 p-4 bg-white border border-slate-200 rounded-xl">
                                        <label className="block text-slate-700 font-bold mb-2">Skor Manual</label>
                                        <input
                                            type="number"
                                            min="0" max="4"
                                            value={scoreInput}
                                            onChange={(e) => {
                                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                                setScoreInput(val);
                                                if (gradingModal) {
                                                    performSave(gradingModal.id, modalEssayIdx, val);
                                                }
                                            }}
                                            className="w-full text-center text-4xl p-4 border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                                            placeholder="-"
                                        />
                                    </div>

                                    <hr className="border-slate-200 mb-8" />
                                    <div className="mb-auto">
                                        <button
                                            onClick={() => {
                                                const ans = modalEssayIdx === 0 && typeof gradingModal.essay_answer === "string"
                                                    ? gradingModal.essay_answer
                                                    : gradingModal.essay_answer?.[modalEssayIdx];
                                                handleAIGrading(ans || "");
                                            }}
                                            disabled={!gradingModal.essay_answer || gradingLoading}
                                            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                                        >
                                            <Sparkles className={`w-5 h-5 ${gradingLoading ? 'animate-spin' : ''}`} />
                                            {gradingLoading ? "Menganalisis..." : "Koreksi dgn AI"}
                                        </button>

                                        {aiFeedback && (
                                            <div className="mt-4 p-5 bg-purple-50 border border-purple-200 border-l-4 border-l-purple-500 rounded-xl">
                                                <h5 className="text-xs font-black text-purple-500 uppercase tracking-widest mb-2">Petunjuk Koreksi</h5>
                                                <p className="text-sm text-purple-900 leading-relaxed">{aiFeedback}</p>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-400 mt-3 text-center">
                                            Fungsi auto-grading menggunakan Google Gemini.
                                        </p>
                                    </div>

                                    <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-emerald-600 font-bold text-xs animate-in fade-in slide-in-from-bottom-1">
                                        <CheckCircle className="w-4 h-4" /> Skor Tersimpan Otomatis
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
