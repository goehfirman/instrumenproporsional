"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Users, BookOpen, CheckCircle, Download, LogOut, Bot, Edit, Eye, Trash2, Search, Filter, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { LINGKUNGAN_BELAJAR_Q, EFIKASI_DIRI_Q, TES_SOAL, ESSAY_QUESTIONS } from "@/lib/constants";

interface Student {
    id: string;
    name: string;
    status_progres: number;
    angkets_1?: Record<number, number>;
    angkets_2?: Record<number, number>;
    essay_answer?: string | Record<number, string>;
    essay_scores?: Record<number, number>;
}

export default function AdminDashboard() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [authChecking, setAuthChecking] = useState(true);
    const [gradingModal, setGradingModal] = useState<Student | null>(null);
    const [scoreInput, setScoreInput] = useState<number | "">("");
    const [activeView, setActiveView] = useState<"Rekap" | "Lingkungan" | "Efikasi" | "Evaluasi">("Rekap");
    const [popover, setPopover] = useState<{ text: string, x: number, y: number, idx: number } | null>(null);
    const [modalEssayIdx, setModalEssayIdx] = useState(0);
    const [gradingLoading, setGradingLoading] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        // Bypassing Firebase Auth
        setAuthChecking(false);
    }, [router]);

    useEffect(() => {
        if (authChecking) return;

        // Read from localStorage
        const localData = localStorage.getItem("localStudentsData");
        if (localData) {
            const studentsMap = JSON.parse(localData);
            setStudents(Object.values(studentsMap));
        } else {
            setStudents([]);
        }
        setLoading(false);

        // We can set a simple interval to poll localStorage for updates since it's temporary
        const interval = setInterval(() => {
            const liveData = localStorage.getItem("localStudentsData");
            if (liveData) {
                setStudents(Object.values(JSON.parse(liveData)));
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [authChecking]);

    useEffect(() => {
        const handleClick = () => setPopover(null);
        if (popover) window.addEventListener("click", handleClick);
        return () => window.removeEventListener("click", handleClick);
    }, [popover]);

    if (authChecking || loading) {
        return <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 text-slate-500 rounded-full animate-pulse">Memuat...</div>;
    }

    const totalSiswa = students.length;
    const sedangMengerjakan = students.filter(s => s.status_progres > 0 && s.status_progres < 4).length;
    const selesai = students.filter(s => s.status_progres === 4).length;

    const calculateScore = (angkets?: Record<number, number>) => {
        if (!angkets) return 0;
        return Object.values(angkets).reduce((acc, curr) => acc + curr, 0);
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/admin/login");
    };

    const analyzeRespondent = (s: Student) => {
        let flags = [];

        // 1. Konsistensi (Kontradiksi Logika)
        // Angket 1: Q[0] (Sejuk) vs Q[2] (Gerah)
        if (s.angkets_1?.[0] && s.angkets_1?.[2]) {
            if ((s.angkets_1[0] >= 4 && s.angkets_1[2] >= 4) || (s.angkets_1[0] <= 2 && s.angkets_1[2] <= 2)) {
                flags.push("Kontradiksi Lingkungan");
            }
        }
        // Angket 2: Q[5] (Langsung menyerah) vs Q[9] (Pantang menyerah)
        if (s.angkets_2?.[5] && s.angkets_2?.[9]) {
            if ((s.angkets_2[5] >= 4 && s.angkets_2[9] >= 4) || (s.angkets_2[5] <= 2 && s.angkets_2[9] <= 2)) {
                flags.push("Kontradiksi Efikasi");
            }
        }

        // 2. Straight-Lining (Varians)
        const checkVariance = (angkets: Record<number, number> | undefined, len: number) => {
            if (!angkets || Object.keys(angkets).length < len) return true; // ignore incomplete
            const vals = Object.values(angkets);
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
            const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
            return variance < 0.25;
        };
        if (checkVariance(s.angkets_1, 43)) flags.push("Monoton Lingkungan");
        if (checkVariance(s.angkets_2, 41)) flags.push("Monoton Efikasi");

        // 3. Attention Check
        if (s.angkets_1?.[42] && s.angkets_1[42] !== 2) flags.push("Trap Lingkungan Gagal"); // must be TS (2)
        if (s.angkets_2?.[40] && s.angkets_2[40] !== 5) flags.push("Trap Efikasi Gagal"); // must be SS (5)

        // 4. Response Time (if available)
        // @ts-ignore
        if (s.completion_time_ms && s.completion_time_ms < 60000) {
            flags.push("Terlalu Cepat (< 1mnt)");
        }

        // 5. Triangulasi
        const envScore = calculateScore(s.angkets_1);
        const efiScore = calculateScore(s.angkets_2);
        const essayScoreSum = s.essay_scores ? Object.values(s.essay_scores).reduce((a, b) => a + b, 0) : 0;
        const essayFullText = typeof s.essay_answer === "string" ? s.essay_answer : Object.values(s.essay_answer || {}).map(v => String(v)).join(" ");

        if (envScore > 170 && efiScore > 160 && (essayScoreSum === 0 || !essayFullText || essayFullText.length < 20)) {
            flags.push("Anomali Triangulasi (Skala tinggi, Esai nol)");
        }

        return flags.length > 0 ? flags.join(" | ") : "Valid";
    };

    const getScale100 = (scores?: Record<number, number>) => {
        if (!scores) return 0;
        const total = Object.values(scores).reduce((a, b) => a + b, 0);
        return Math.round((total / 40) * 100);
    };

    const exportExcel = () => {
        // 1. Rekapitulasi Global (Simplified)
        const recapHeaders = [
            "Nama Lengkap",
            "Status",
            "Skor Lingkungan",
            "Skor Efikasi",
            "Total Skor Esai (40)",
            "Skor Akhir (100)",
            "Hasil Validasi Sistem"
        ];
        const recapRows = students.map(s => [
            s.name,
            s.status_progres === 4 ? "Selesai" : `Tahap ${s.status_progres}`,
            calculateScore(s.angkets_1),
            calculateScore(s.angkets_2),
            Object.values(s.essay_scores || {}).reduce((a, b) => Number(a) + Number(b), 0),
            getScale100(s.essay_scores),
            analyzeRespondent(s)
        ]);
        const wsRecap = XLSX.utils.aoa_to_sheet([recapHeaders, ...recapRows]);

        // 2. Angket Lingkungan Belajar (Item breakdown)
        const envHeaders = ["Nama Lengkap", ...Array.from({ length: 43 }).map((_, i) => `Butir ${i + 1}`)];
        const envRows = students.map(s => [
            s.name,
            ...Array.from({ length: 43 }).map((_, i) => s.angkets_1?.[i] ?? "")
        ]);
        const wsEnv = XLSX.utils.aoa_to_sheet([envHeaders, ...envRows]);

        // 3. Angket Efikasi Diri (Item breakdown)
        const efiHeaders = ["Nama Lengkap", ...Array.from({ length: 41 }).map((_, i) => `Butir ${i + 1}`)];
        const efiRows = students.map(s => [
            s.name,
            ...Array.from({ length: 41 }).map((_, i) => s.angkets_2?.[i] ?? "")
        ]);
        const wsEfi = XLSX.utils.aoa_to_sheet([efiHeaders, ...efiRows]);

        // 4. Jawaban Tes Esai (Separate Sheet)
        const essayHeaders = [
            "Nama Lengkap",
            ...ESSAY_QUESTIONS.flatMap(q => [`Jawaban ${q.id}`, `Skor ${q.id}`])
        ];
        const essayRows = students.map(s => {
            const essayAns = s.essay_answer || {};
            const essayScores = s.essay_scores || {};
            return [
                s.name,
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

        if (activeView === "Lingkungan") {
            return (
                <tr>
                    <th className="p-4 font-semibold text-left sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#f1f5f9]">Nama Lengkap</th>
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
                    <th className="p-4 font-semibold text-left sticky left-0 bg-slate-50 z-20 shadow-[1px_0_0_0_#f1f5f9]">Nama Lengkap</th>
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
                    <th className="p-4 font-semibold text-left">Nama Lengkap</th>
                    {ESSAY_QUESTIONS.map(q => (
                        <th key={q.id} className="p-4 font-semibold text-center">Soal {q.id}</th>
                    ))}
                    <th className="p-4 font-semibold text-center">Total Skor</th>
                    <th className="p-4 font-semibold text-center">Aksi</th>
                </tr>
            );
        }
        return (
            <tr>
                <th className="p-4 font-semibold text-left">Nama Lengkap</th>
                <th className="p-4 font-semibold text-left">Status</th>
                <th className="p-4 font-semibold text-center">Skor Lingkungan</th>
                <th className="p-4 font-semibold text-center">Skor Efikasi</th>
                <th className="p-4 font-semibold text-center">Skor Esai</th>
                <th className="p-4 font-semibold text-center">Skala 100</th>
                <th className="p-4 font-semibold text-center">Validitas</th>
                <th className="p-4 font-semibold text-center">Aksi</th>
            </tr>
        );
    };

    const handleDeleteStudent = (id: string, name: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus respon dari "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
            const localData = localStorage.getItem("localStudentsData");
            if (localData) {
                const studentsMap = JSON.parse(localData);
                delete studentsMap[id];
                localStorage.setItem("localStudentsData", JSON.stringify(studentsMap));
                setStudents(Object.values(studentsMap));
            }
        }
    };

    const saveScore = async () => {
        if (!gradingModal || scoreInput === "") return;
        try {
            const newScores = { ...(gradingModal.essay_scores || {}), [modalEssayIdx]: Number(scoreInput) };

            // In a real app we would use updateDoc(doc(db, "students", gradingModal.id), { essay_scores: newScores });
            // For now, update localStorage
            const localData = localStorage.getItem("localStudentsData");
            if (localData) {
                const studentsMap = JSON.parse(localData);
                if (studentsMap[gradingModal.id]) {
                    studentsMap[gradingModal.id].essay_scores = newScores;
                    localStorage.setItem("localStudentsData", JSON.stringify(studentsMap));
                    setStudents(Object.values(studentsMap)); // trigger re-render
                }
            }

            // If it's the last question, close modal, otherwise stay
            if (modalEssayIdx === ESSAY_QUESTIONS.length - 1) {
                // setGradingModal(null);
            }
        } catch (e) {
            console.error(e);
            alert("Gagal menyimpan skor.");
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
                    cognitiveLevel: q.cognitiveLevel
                })
            });

            const data = await res.json();
            if (data.score !== undefined) {
                setScoreInput(data.score);
                if (data.feedback) {
                    setAiFeedback(data.feedback);
                }
            } else {
                const errMsg = data.error || data.feedback || "Gagal mendapatkan penilaian dari AI.";
                alert(`Error: ${errMsg}`);
            }
        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat menghubungi AI.");
        } finally {
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
                    }
                }
            }

            // Save all scores at once
            const studentRef = doc(db, "respondents", gradingModal.id);
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
            const studentRef = doc(db, "respondents", gradingModal.id);
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
            <nav className="bg-primary text-white p-4 shadow-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <h1 className="font-bold text-xl tracking-wide">Portal Admin Peneliti</h1>
                    <button onClick={handleLogout} className="flex items-center gap-2 hover:bg-primary-hover px-4 py-2 rounded-lg transition">
                        <LogOut className="w-5 h-5" /> Keluar
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                        <div className="bg-blue-100 p-4 rounded-xl mr-4"><Users className="w-8 h-8 text-blue-600" /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Total Responden</p>
                            <h2 className="text-3xl font-bold text-slate-800">{totalSiswa}</h2>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                        <div className="bg-amber-100 p-4 rounded-xl mr-4"><BookOpen className="w-8 h-8 text-amber-600" /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Sedang Mengerjakan</p>
                            <h2 className="text-3xl font-bold text-slate-800">{sedangMengerjakan}</h2>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                        <div className="bg-green-100 p-4 rounded-xl mr-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Selesai</p>
                            <h2 className="text-3xl font-bold text-slate-800">{selesai}</h2>
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
                    <button onClick={exportExcel} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg transition shadow-sm font-medium">
                        <Download className="w-4 h-4" /> Export Laporan (Excel)
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                {renderTableHeaders()}
                            </thead>
                            <tbody className="divide-y divide-slate-100/60">
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={100} className="p-8 text-center text-slate-500">Belum ada data responden.</td>
                                    </tr>
                                )}
                                {students.map((s) => {
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
                                                {ESSAY_QUESTIONS.map((_, i) => (
                                                    <td key={i} className="p-4 text-center">
                                                        {essayAns[i] ? (
                                                            <button
                                                                onClick={() => { setGradingModal(s); setModalEssayIdx(i); }}
                                                                className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                                            >
                                                                Dijawab
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-300 font-medium text-xs">Kosong</span>
                                                        )}
                                                    </td>
                                                ))}
                                                <td className="p-4 text-center font-bold text-primary">
                                                    {s.essay_scores ? Object.values(s.essay_scores).reduce((a, b) => a + b, 0) : 0}
                                                </td>
                                                <td className="p-4 flex justify-center gap-2">
                                                    <button
                                                        onClick={() => { setGradingModal(s); setModalEssayIdx(0); }}
                                                        className="bg-primary/10 text-primary hover:bg-primary hover:text-white p-2 rounded-lg transition"
                                                    >
                                                        <Edit className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const validation = analyzeRespondent(s);
                                    const isValid = validation === "Valid";
                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 font-medium text-slate-800">{s.name}</td>
                                            <td className="p-4">
                                                {s.status_progres === 4 ? (
                                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">Selesai</span>
                                                ) : (
                                                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">Tahap {s.status_progres}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-semibold text-slate-600">{calculateScore(s.angkets_1) || "-"}</td>
                                            <td className="p-4 text-center font-semibold text-slate-600">{calculateScore(s.angkets_2) || "-"}</td>
                                            <td className="p-4 text-center">
                                                {s.essay_scores ? (
                                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                                        {Object.values(s.essay_scores).reduce((a, b) => a + b, 0)}
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-slate-700">
                                                {s.essay_scores ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm">{getScale100(s.essay_scores)}</span>
                                                        <div className="w-12 h-1 bg-slate-100 rounded-full mt-1">
                                                            <div className="h-full bg-primary rounded-full" style={{ width: `${getScale100(s.essay_scores)}%` }}></div>
                                                        </div>
                                                    </div>
                                                ) : "-"}
                                            </td>
                                            <td className="p-4 text-center">
                                                {s.status_progres === 0 ? <span className="text-slate-400 text-xs">-</span> : (
                                                    <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold leading-tight ${isValid ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200 line-clamp-2 max-w-[120px] mx-auto'}`} title={validation}>
                                                        {isValid ? "Valid" : validation}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 flex justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setGradingModal(s);
                                                        const scores = s.essay_scores || {};
                                                        setScoreInput(scores[0] ?? "");
                                                    }}
                                                    className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white p-2 rounded-lg transition flex items-center justify-center"
                                                    title="Pratinjau Respons Lengkap"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteStudent(s.id, s.name)}
                                                    className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white p-2 rounded-lg transition flex items-center justify-center"
                                                    title="Hapus Respon"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {popover && (
                    <div
                        className="fixed z-[100] bg-slate-800 text-white p-3 rounded-lg shadow-2xl text-sm font-medium w-64 md:w-72 leading-relaxed animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
                        style={{
                            left: Math.min(popover.x, typeof window !== "undefined" ? window.innerWidth - 300 : popover.x),
                            top: popover.y + 15
                        }}
                    >
                        <span className="inline-block bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded mr-2 mb-1">Butir {popover.idx + 1}</span>
                        <span>{popover.text}</span>
                        <div className="absolute -top-2 left-4 border-8 border-transparent border-b-slate-800"></div>
                    </div>
                )}
            </main>

            {/* Grading Modal */}
            {gradingModal && (
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

                                <div className="bg-blue-50 text-slate-800 p-6 rounded-xl min-h-[150px] border border-blue-100 whitespace-pre-wrap leading-relaxed mb-6 font-medium shadow-inner">
                                    <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Jawaban Responden</h5>
                                    {(() => {
                                        const ans = typeof gradingModal.essay_answer === "string"
                                            ? (modalEssayIdx === 0 ? gradingModal.essay_answer : null)
                                            : gradingModal.essay_answer?.[modalEssayIdx];
                                        return ans || <em className="text-slate-400">Belum dijawab.</em>;
                                    })()}
                                </div>

                                {/* Scoring Rubric for Admin */}
                                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg mb-8">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Rambu-rambu Jawaban {modalEssayIdx + 1}</h4>
                                    <div className="space-y-3">
                                        {ESSAY_QUESTIONS[modalEssayIdx].rubric.map((r, i) => (
                                            <div key={i} className="flex gap-3 items-start border-l-2 border-primary/50 pl-4 py-1">
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
                            <div className="w-full md:w-80 p-6 bg-slate-50 flex flex-col">
                                <h4 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wide">Penilaian (0-4)</h4>

                                <div className="mb-8 p-4 bg-white border border-slate-200 rounded-xl">
                                    <label className="block text-slate-700 font-bold mb-2">Skor Manual</label>
                                    <input
                                        type="number"
                                        min="0" max="4"
                                        value={scoreInput}
                                        onChange={(e) => setScoreInput(Number(e.target.value))}
                                        className="w-full text-center text-4xl p-4 border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none"
                                        placeholder="-"
                                    />
                                </div>

                                <hr className="border-slate-200 mb-8" />
                                <div className="mb-auto">
                                    <button
                                        onClick={() => {
                                            const ans = typeof gradingModal.essay_answer === "string"
                                                ? (modalEssayIdx === 0 ? gradingModal.essay_answer : "")
                                                : gradingModal.essay_answer?.[modalEssayIdx];
                                            handleAIGrading(ans || "");
                                        }}
                                        disabled={!gradingModal.essay_answer || gradingLoading}
                                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        <Bot className={`w-5 h-5 ${gradingLoading ? 'animate-spin' : ''}`} />
                                        {gradingLoading ? "Menganalisis..." : "Koreksi dgn Gemini AI"}
                                    </button>

                                    <button
                                        onClick={handleBatchAIGrading}
                                        disabled={!gradingModal.essay_answer || gradingLoading}
                                        className="w-full mt-2 bg-slate-800 hover:bg-black text-white font-bold py-2 px-4 rounded-xl transition shadow-md flex justify-center items-center gap-2 disabled:opacity-50 text-xs"
                                    >
                                        <Bot className={`w-4 h-4 ${gradingLoading ? 'animate-spin' : ''}`} />
                                        Koreksi Semua (AI)
                                    </button>

                                    <button
                                        onClick={handleResetGrading}
                                        disabled={gradingLoading}
                                        className="w-full mt-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold py-2 px-4 rounded-xl transition flex justify-center items-center gap-2 disabled:opacity-50 text-[10px]"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Reset Penilaian
                                    </button>

                                    {aiFeedback && (
                                        <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                            <h5 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">AI Feedback</h5>
                                            <p className="text-xs text-purple-800 leading-relaxed italic">"{aiFeedback}"</p>
                                        </div>
                                    )}
                                    <p className="text-xs text-slate-400 mt-3 text-center">
                                        Fungsi auto-grading akan diintegrasikan dengan Google Gemini.
                                    </p>
                                </div>

                                <button
                                    onClick={saveScore}
                                    disabled={scoreInput === ""}
                                    className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 rounded-xl transition-all shadow-lg mt-6 disabled:opacity-50"
                                >
                                    Simpan Skor
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
