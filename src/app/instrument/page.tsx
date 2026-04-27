"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Save, Home, BrainCircuit, CheckCircle } from "lucide-react";
import { useRef } from "react";

import { LINGKUNGAN_BELAJAR_Q, EFIKASI_DIRI_Q, TES_SOAL, DimensionGroup, ESSAY_QUESTIONS } from "@/lib/constants";

function InstrumentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const stepParam = searchParams.get("step");

    const [step, setStep] = useState<number>(1);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [studentId, setStudentId] = useState("");

    // States to hold answers
    const [angket1, setAngket1] = useState<Record<number, number>>({});
    const [angket2, setAngket2] = useState<Record<number, number>>({});
    const [essayAnswers, setEssayAnswers] = useState<Record<number, string>>({});
    const [essayStep, setEssayStep] = useState(0);
    const [subStep, setSubStep] = useState(0);
    const [showMathKeyboard, setShowMathKeyboard] = useState(false);

    useEffect(() => {
        // Reset subStep when step changes
        setSubStep(0);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [stepParam]);

    useEffect(() => {
        const sId = sessionStorage.getItem("studentId");
        if (!sId) {
            router.push("/");
            return;
        }
        setStudentId(sId);

        let start = localStorage.getItem(`start_${sId}`);
        if (!start) {
            localStorage.setItem(`start_${sId}`, Date.now().toString());
        }

        // Fallback if step is not in URL
        const stepNum = stepParam ? parseInt(stepParam) : 1;
        setStep(stepNum);

        // Fetch exiting data from localStorage instead of Firebase
        const fetchData = async () => {
            try {
                const localData = localStorage.getItem("localStudentsData");
                if (localData) {
                    const students = JSON.parse(localData);
                    if (students[sId]) {
                        const data = students[sId];
                        if (data.angkets_1) setAngket1(data.angkets_1);
                        if (data.angkets_2) setAngket2(data.angkets_2);
                        if (data.essay_answer) {
                            // Migration logic: if string, convert to {0: string}
                            if (typeof data.essay_answer === "string") {
                                setEssayAnswers({ 0: data.essay_answer });
                            } else {
                                setEssayAnswers(data.essay_answer);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [stepParam, router]);

    const autoSaveAngket = async (stage: 1 | 2, updatedData: Record<number, number>) => {
        setSaving(true);
        try {
            const localData = localStorage.getItem("localStudentsData");
            if (localData) {
                const students = JSON.parse(localData);
                if (students[studentId]) {
                    if (stage === 1) students[studentId].angkets_1 = updatedData;
                    if (stage === 2) students[studentId].angkets_2 = updatedData;
                    const start = localStorage.getItem(`start_${studentId}`);
                    if (start) { students[studentId].completion_time_ms = Date.now() - parseInt(start); }
                    localStorage.setItem("localStudentsData", JSON.stringify(students));
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setSaving(false), 500);
        }
    };

    const autoSaveEssay = (val: Record<number, string>) => {
        setSaving(true);
        setEssayAnswers(val);
        try {
            const localData = localStorage.getItem("localStudentsData");
            if (localData) {
                const students = JSON.parse(localData);
                if (students[studentId]) {
                    students[studentId].essay_answer = val;

                    const start = localStorage.getItem(`start_${studentId}`);
                    if (start) {
                        students[studentId].completion_time_ms = Date.now() - parseInt(start);
                    }

                    localStorage.setItem("localStudentsData", JSON.stringify(students));
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setSaving(false), 500);
        }
    };

    const handleNext = async () => {
        router.push("/student");
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    const renderAngket = (
        title: string,
        groups: DimensionGroup[],
        answers: Record<number, number>,
        setObj: (val: Record<number, number>) => void,
        stage: 1 | 2
    ) => {
        const currentGroup = groups[subStep];
        const isFirstSubStep = subStep === 0;
        const isLastSubStep = subStep === groups.length - 1;

        let startIndex = 0;
        for (let i = 0; i < subStep; i++) {
            startIndex += groups[i].qs.length;
        }

        // Check if the current group is fully answered
        const currentGroupAnswered = currentGroup.qs.every((_, i) => answers[startIndex + i] !== undefined);

        const handleSubNext = () => {
            if (!isLastSubStep && currentGroupAnswered) {
                setSubStep(subStep + 1);
                setTimeout(() => { document.getElementById('questions-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            }
        };

        const handleSubPrev = () => {
            if (!isFirstSubStep) {
                setSubStep(subStep - 1);
                setTimeout(() => { document.getElementById('questions-start')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            }
        };

        return (
            <div className="w-full max-w-3xl mx-auto py-8 animate-in fade-in zoom-in duration-500">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
                    <div className="text-center mb-8 border-b-2 border-primary/20 pb-6">
                        <h1 className="text-2xl font-bold text-primary">{title}</h1>
                    </div>

                    {/* Dimension Header */}
                    <div className="bg-gradient-to-r from-primary to-primary-hover text-white p-4 rounded-2xl text-center shadow-md -mb-4 relative z-10 mx-4">
                        <h3 className="font-bold text-lg md:text-xl tracking-wide">{currentGroup.dimensi}</h3>
                        <p className="text-white/80 text-sm font-medium mt-1">Bagian {subStep + 1} dari {groups.length}</p>
                    </div>

                    <div className="bg-blue-50/50 p-4 sm:p-6 sm:pt-10 rounded-2xl border border-blue-100 mb-8 px-4 sm:px-6">
                        <h3 className="font-bold text-primary mb-2 sm:mb-3 text-base sm:text-lg">PETUNJUK PENGISIAN</h3>
                        <p className="text-slate-700 text-[11px] sm:text-sm leading-relaxed mb-4">
                            Bacalah setiap pernyataan berikut dengan saksama, kemudian pilihlah kolom angka yang paling sesuai dengan keadaan Anda.
                        </p>

                        <p className="font-bold text-slate-800 text-xs sm:text-sm mb-2">Pilihan jawaban:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-sm mb-4">
                            {[
                                { k: 'SS', v: 'Sangat Setuju' },
                                { k: 'S', v: 'Setuju' },
                                { k: 'R', v: 'Ragu-Ragu' },
                                { k: 'TS', v: 'Tidak Setuju' },
                                { k: 'STS', v: 'Sangat Tidak Setuju', span: true }
                            ].map((item) => (
                                <div key={item.k} className={`bg-white p-2 rounded-lg border border-slate-200 flex items-center ${item.span ? 'col-span-2' : ''}`}>
                                    <span className="font-bold text-slate-700 w-8 sm:w-12 inline-block">{item.k}</span>
                                    <span className="text-slate-600 truncate">= {item.v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div id="questions-start" className="space-y-8">
                        {getStudentShuffle(studentId, stage, subStep, currentGroup.qs.length).map((originalLocalIndex, displayIndex) => {
                            const globalIndex = startIndex + originalLocalIndex;
                            const q = currentGroup.qs[originalLocalIndex];
                            return (
                                <div key={globalIndex} className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm hover:border-primary/20 transition-colors animate-in slide-in-from-right-8 duration-300 fill-mode-both" style={{ animationDelay: `${displayIndex * 50}ms` }}>
                                    <p className="font-medium text-lg text-slate-800 mb-6 leading-relaxed bg-slate-50 p-4 rounded-xl">
                                        {displayIndex + 1}. {q}
                                    </p>
                                    <div className="flex justify-between items-center gap-2">
                                        {[
                                            { val: 5, label: 'SS', desc: 'Sangat Setuju' },
                                            { val: 4, label: 'S', desc: 'Setuju' },
                                            { val: 3, label: 'R', desc: 'Ragu-Ragu' },
                                            { val: 2, label: 'TS', desc: 'Tidak Setuju' },
                                            { val: 1, label: 'STS', desc: 'Sangat Tidak Setuju' }
                                        ].map((item) => (
                                            <label key={item.val} className="flex flex-col items-center cursor-pointer group flex-1">
                                                <input
                                                    type="radio"
                                                    name={`q-${stage}-${globalIndex}`}
                                                    value={item.val}
                                                    checked={answers[globalIndex] === item.val}
                                                    onChange={() => {
                                                        const newAns = { ...answers, [globalIndex]: item.val };
                                                        setObj(newAns);
                                                        autoSaveAngket(stage, newAns);
                                                    }}
                                                    className="sr-only"
                                                />
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 flex items-center justify-center rounded-full text-sm md:text-lg font-bold transition-all shadow-sm shrink-0
                                                ${answers[globalIndex] === item.val
                                                        ? 'bg-primary text-white scale-110 shadow-primary/30 ring-4 ring-primary/20 z-10'
                                                        : 'bg-white text-slate-400 border-2 border-slate-200 group-hover:border-primary/40 group-hover:bg-blue-50'}
                                            `}>
                                                    {item.label}
                                                </div>
                                                <div className="h-10 mt-2 flex items-start justify-center text-center">
                                                    <span className={`text-[10px] md:text-xs font-bold text-primary transition-all duration-300 leading-tight max-w-[70px]
                                                        ${answers[globalIndex] === item.val ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}>
                                                        {item.desc}
                                                    </span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-full w-full sm:w-auto">
                        {saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2 text-primary" /> Menyimpan...</>
                        ) : answers && Object.keys(answers).length > 0 ? (
                            <><Save className="w-4 h-4 mr-2 text-green-500" /> Tersimpan</>
                        ) : (
                            "Belum ada jawaban"
                        )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {!isFirstSubStep && (
                            <button
                                onClick={handleSubPrev}
                                className="flex-1 sm:flex-none border-2 border-slate-200 hover:border-slate-300 text-slate-600 font-bold py-3 px-6 rounded-xl transition-all"
                            >
                                Kembali
                            </button>
                        )}

                        {!isLastSubStep ? (
                            <button
                                onClick={handleSubNext}
                                disabled={!currentGroupAnswered}
                                className="flex-1 sm:flex-none bg-primary hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Lanjut ke Bagian {subStep + 2}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={!currentGroupAnswered}
                                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-emerald-600/30 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Simpan & Selesai
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const insertMathSymbol = (symbol: string) => {
        const el = textareaRef.current;
        if (!el) return;

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const text = essayAnswers[essayStep] || "";
        const before = text.substring(0, start);
        const after = text.substring(end);
        const newText = before + symbol + after;

        const newMap = { ...essayAnswers, [essayStep]: newText };
        setEssayAnswers(newMap);
        autoSaveEssay(newMap);

        // Return focus and move cursor
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + symbol.length, start + symbol.length);
        }, 0);
    };

    const mathSymbols = [
        { sym: "7", type: "num" }, { sym: "8", type: "num" }, { sym: "9", type: "num" }, { sym: "÷", type: "op" },
        { sym: "4", type: "num" }, { sym: "5", type: "num" }, { sym: "6", type: "num" }, { sym: "×", type: "op" },
        { sym: "1", type: "num" }, { sym: "2", type: "num" }, { sym: "3", type: "num" }, { sym: "-", type: "op" },
        { sym: "0", type: "num" }, { sym: ".", type: "num" }, { sym: "=", type: "op" }, { sym: "+", type: "op" },
    ];

    const advancedSymbols = [
        { sym: "/", label: "a/b", desc: "Pecahan" },
        { sym: "^", label: "xⁿ", desc: "Pangkat" },
        { sym: "√", label: "√", desc: "Akar" },
        { sym: "π", label: "π", desc: "Pi" },
        { sym: "( )", label: "( )", desc: "Kurung", insert: "()" },
        { sym: "≤", label: "≤", desc: "Kecil Sama" },
        { sym: "≥", label: "≥", desc: "Besar Sama" },
        { sym: ":", label: ":", desc: "Rasio/Banding" },
    ];

    const renderEssay = () => {
        const currentQ = ESSAY_QUESTIONS[essayStep];
        const val = essayAnswers[essayStep] || "";
        const isFirst = essayStep === 0;
        const isLast = essayStep === ESSAY_QUESTIONS.length - 1;

        const handleEssayNext = () => {
            if (!isLast) {
                setEssayStep(essayStep + 1);
                setTimeout(() => { document.getElementById('essay-scroll-point')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            }
            else handleNext();
        };

        const handleEssayPrev = () => {
            if (!isFirst) {
                setEssayStep(essayStep - 1);
                setTimeout(() => { document.getElementById('essay-scroll-point')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
            }
        };

        return (
            <div className="w-full max-w-3xl mx-auto py-8 animate-in fade-in zoom-in duration-500">
                {/* Question Navigator */}
                <div className="flex flex-wrap gap-3 mb-6 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 items-center">
                    <div className="flex items-center gap-2 mr-4 border-r border-slate-100 pr-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Navigator</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ESSAY_QUESTIONS.map((_, i) => {
                            const isAnswered = (() => {
                                const val = (essayAnswers[i] || "").trim();
                                if (!val) return false;
                                if (i === 6) { // Soal No 7
                                    const clean = val.replace(/\[VISUAL:.*?\]|\[TABLE\]|\[LINE-T\]|\[LINE-B\]|\[REASON\]|[:| \t\n\r]/g, "");
                                    return clean.length > 0;
                                }
                                return val.length > 0;
                            })();
                            const isCurrent = essayStep === i;
                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setEssayStep(i);
                                        setTimeout(() => { document.getElementById('essay-scroll-point')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                                    }}
                                    className={`w-10 h-10 rounded-xl font-black transition-all flex items-center justify-center text-sm
                                        ${isCurrent ? 'bg-primary text-white scale-110 shadow-lg shadow-primary/30 ring-4 ring-primary/10' :
                                            isAnswered ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600' :
                                                'bg-slate-50 text-slate-400 border-2 border-slate-100 hover:border-primary/40 hover:text-primary'}
                                    `}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                    <div className="ml-auto hidden md:flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Sudah</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded-sm"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Belum</span>
                        </div>
                    </div>
                </div>

                <div id="essay-scroll-point" className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
                    <div className="text-center mb-10 border-b-2 border-primary/20 pb-6">
                        <h1 className="text-2xl font-bold text-primary">Tes Penalaran Proporsional</h1>
                    </div>

                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                            <BrainCircuit className="w-6 h-6" /> Soal Latihan
                        </h2>
                        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter">
                            Butir Soal {essayStep + 1}
                        </span>
                    </div>

                    <div className="bg-primary/5 border-l-4 border-primary p-6 rounded-r-xl mb-4">
                        <p className="text-lg text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                            {currentQ.text}
                        </p>
                    </div>

                    {currentQ.id === 5 && (
                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl mb-8 flex gap-3 items-start">
                            <div className="text-xs text-amber-800 leading-relaxed">
                                <p className="font-bold mb-1">💡 Petunjuk:</p>
                                <ul className="list-disc ml-4 space-y-1 font-medium">
                                    <li><strong>Proporsional</strong>: Hubungan yang melibatkan perkalian atau pembagian yang bersifat konstan.</li>
                                    <li><strong>Tidak Proporsional</strong>: Hubungan yang hanya berdasarkan pada penjumlahan atau selisih yang bersifat tetap.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex items-end">
                            <label className="block text-sm font-bold text-slate-600">
                                {currentQ.id === 7
                                    ? "a. Pilih bentuk visualisasi dan tentukan jarak yang dapat ditempuh jika tersedia 5 liter, 15 liter dan 35 liter bahan bakar!"
                                    : "Tuliskan langkah penyelesaian di bawah ini:"
                                }
                            </label>
                        </div>

                        {currentQ.id === 5 ? (
                            <div className="space-y-6">
                                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="p-4 text-left font-bold text-slate-600 min-w-[250px]">Situasi</th>
                                                <th className="p-4 text-center font-bold text-slate-600">Jenis Hubungan</th>
                                                <th className="p-4 text-left font-bold text-slate-600 min-w-[200px]">Alasan</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[1, 2].map((sit) => {
                                                const currentVal = essayAnswers[essayStep] || "";

                                                // Extract choices and reason using more robust regex
                                                const choiceMatch = currentVal.match(new RegExp(`S${sit}:\\s*(Proporsional|Tidak Proporsional)`));
                                                const choice = choiceMatch ? choiceMatch[1] : "";
                                                const reasonMatch = currentVal.match(new RegExp(`A${sit}:\\s*([^|]*)`));
                                                const reason = reasonMatch ? reasonMatch[1] : "";

                                                const isProp = choice === 'Proporsional';
                                                const isNonProp = choice === 'Tidak Proporsional';

                                                const sitTexts = [
                                                    "Umur Risa saat ini adalah 14 tahun, sedangkan umur adiknya 10 tahun. Risa menghitung bahwa 5 tahun lagi, umurnya akan menjadi 19 tahun dan adiknya menjadi 15 tahun.",
                                                    "Sebuah mesin pencetak (printer) mampu mencetak 30 lembar dokumen dalam waktu 2 menit. Jika mesin beroperasi tanpa henti selama 6 menit, maka dokumen yang tercetak adalah 90 lembar."
                                                ];

                                                const updateData = (newChoice: string, newReason: string) => {
                                                    // Parse existing or defaults
                                                    let s1C = sit === 1 ? newChoice : (currentVal.match(/S1:\s*(Proporsional|Tidak Proporsional)/)?.[1] || "");
                                                    let s1R = sit === 1 ? newReason : (currentVal.match(/A1:\s*([^|]*)/)?.[1] || "");
                                                    let s2C = sit === 2 ? newChoice : (currentVal.match(/S2:\s*(Proporsional|Tidak Proporsional)/)?.[1] || "");
                                                    let s2R = sit === 2 ? newReason : (currentVal.match(/A2:\s*([^|]*)/)?.[1] || "");

                                                    const newVal = `[GRID] S1:${s1C}|A1:${s1R}|S2:${s2C}|A2:${s2R}`;
                                                    const newMap = { ...essayAnswers, [essayStep]: newVal };
                                                    setEssayAnswers(newMap);
                                                    autoSaveEssay(newMap);
                                                };

                                                return (
                                                    <tr key={sit} className="hover:bg-slate-50/30">
                                                        <td className="p-4 align-top">
                                                            <div className="font-black text-primary mb-2">Situasi {sit}</div>
                                                            <p className="text-slate-700 leading-relaxed text-xs sm:text-sm font-medium">
                                                                {sitTexts[sit - 1]}
                                                            </p>
                                                        </td>
                                                        <td className="p-4 align-top">
                                                            <div className="flex flex-col gap-3 items-center">
                                                                <button
                                                                    onClick={() => updateData('Proporsional', reason)}
                                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all w-full min-w-[140px] ${isProp ? 'bg-primary border-primary text-white shadow-md' : 'border-slate-100 bg-white hover:border-primary/30 text-slate-500'}`}
                                                                >
                                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isProp ? 'border-white' : 'border-slate-300'}`}>
                                                                        {isProp && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold tracking-tight">Proporsional</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => updateData('Tidak Proporsional', reason)}
                                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all w-full min-w-[140px] ${isNonProp ? 'bg-primary border-primary text-white shadow-md' : 'border-slate-100 bg-white hover:border-primary/30 text-slate-500'}`}
                                                                >
                                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isNonProp ? 'border-white' : 'border-slate-300'}`}>
                                                                        {isNonProp && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold tracking-tight">Tidak Proporsional</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 align-top">
                                                            <textarea
                                                                value={reason}
                                                                onChange={(e) => updateData(choice, e.target.value)}
                                                                placeholder="Berikan alasan..."
                                                                className="w-full h-32 p-3 text-sm border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none resize-none transition-all font-medium bg-slate-50/50"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : currentQ.id === 6 ? (
                            <div className="space-y-6">
                                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="p-4 text-center font-bold text-slate-600">Jumlah Cokelat (n)</th>
                                                <th className="p-4 text-center font-bold text-slate-600">Harga (Rp)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {[0, 1, 2, 3, 4].map((idx) => {
                                                const currentVal = essayAnswers[essayStep] || "";
                                                const parts = currentVal.replace('[TABLE]', '').trim().split('|');
                                                const getRowData = (i: number) => {
                                                    const r_parts = (parts[i] || "").trim().split(':');
                                                    return { n: r_parts[0] || "", p: r_parts[1] || "" };
                                                };
                                                const rows = [0, 1, 2, 3, 4].map(getRowData);

                                                const updateMatrix = (field: 'n' | 'p', val: string) => {
                                                    const nextRows = [...rows];
                                                    nextRows[idx] = { ...nextRows[idx], [field]: val };
                                                    const tableStr = `[TABLE] ` + nextRows.map(r => `${r.n}:${r.p}`).join(' | ');
                                                    const newMap = { ...essayAnswers, [essayStep]: tableStr };
                                                    setEssayAnswers(newMap);
                                                    autoSaveEssay(newMap);
                                                };

                                                const activeRow = rows[idx];

                                                return (
                                                    <tr key={idx} className="hover:bg-slate-50/30">
                                                        <td className="p-4 w-1/3">
                                                            <input
                                                                type="text"
                                                                value={activeRow.n}
                                                                onChange={(e) => updateMatrix('n', e.target.value)}
                                                                placeholder="..."
                                                                className="w-full p-4 text-xl border-2 border-slate-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-center text-primary bg-slate-50/50"
                                                            />
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-slate-400 font-black text-lg">Rp</span>
                                                                <input
                                                                    type="text"
                                                                    value={activeRow.p}
                                                                    onChange={(e) => updateMatrix('p', e.target.value)}
                                                                    placeholder="..."
                                                                    className="w-full p-4 text-xl border-2 border-slate-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-black text-slate-800 bg-white"
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-xs text-primary font-bold flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex gap-2 items-center">
                                        <span>Petunjuk: Isi kolom Jumlah Cokelat (n) dan kolom Harga (Rp) secara manual sesuai pemikiran Anda.</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const newMap = { ...essayAnswers, [essayStep]: "[TABLE] :|:|:|:|:" };
                                            setEssayAnswers(newMap);
                                            autoSaveEssay(newMap);
                                        }}
                                        className="text-[10px] bg-white border border-primary/20 px-4 py-2 rounded-xl hover:bg-slate-50 transition-all font-black text-primary shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
                                    >
                                        KOSONGKAN TABEL ↺
                                    </button>
                                </div>
                            </div>
                        ) : currentQ.id === 7 ? (
                            <div className="space-y-8">
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                                    <label className="block text-sm font-bold text-slate-600 tracking-wide mb-4">Pilih bentuk visualisasi:</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {[
                                            { id: 'TABLE', label: 'Tabel Rasio', desc: 'Kotak baris & kolom' },
                                            { id: 'LINE', label: 'Garis Bilangan', desc: 'Garis ganda sejajar' },
                                            { id: 'TEXT', label: 'Deskripsi/Lainnya', desc: 'Teks atau narasi' }
                                        ].map((opt) => {
                                            const currentData = essayAnswers[essayStep] || "";
                                            const isActive = currentData.includes(`[VISUAL:${opt.id}]`);

                                            // Lock logic: detect if any content exists in any visualization type
                                            const tableContent = (currentData.includes('[TABLE]') ? currentData.split('[TABLE]')[1]?.split('[REASON]')[0] : "").replace(/[:| ]/g, '');
                                            const lineTContent = (currentData.includes('[LINE-T]') ? currentData.split('[LINE-T]')[1]?.split('[LINE-B]')[0] : "").replace(/[| ]/g, '');
                                            const lineBContent = (currentData.includes('[LINE-B]') ? currentData.split('[LINE-B]')[1]?.split('[REASON]')[0] : "").replace(/[| ]/g, '');
                                            const textContent = (currentData.includes('[VISUAL:TEXT]') ? currentData.split('[REASON]')[0]?.replace('[VISUAL:TEXT]', '') : "").trim();

                                            const isLocked = tableContent.length > 0 || lineTContent.length > 0 || lineBContent.length > 0 || textContent.length > 0;
                                            const isDisabled = isLocked && !isActive;

                                            return (
                                                <button
                                                    key={opt.id}
                                                    disabled={isDisabled}
                                                    onClick={() => {
                                                        if (isDisabled) return;
                                                        const reasonPart = (currentData.split('[REASON]')[1] || "").trim();
                                                        const newData = `[VISUAL:${opt.id}][REASON]${reasonPart}`;
                                                        const newMap = { ...essayAnswers, [essayStep]: newData };
                                                        setEssayAnswers(newMap);
                                                        autoSaveEssay(newMap);
                                                    }}
                                                    className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group
                                                        ${isActive ? 'border-primary bg-primary/5 shadow-md' : 'border-slate-100 bg-white hover:border-primary/30'}
                                                        ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed border-slate-50' : ''}
                                                    `}
                                                >
                                                    <div className={`w-8 h-8 rounded-full border-2 mb-3 flex items-center justify-center transition-colors ${isActive ? 'bg-primary border-primary' : 'border-slate-200'}`}>
                                                        {isActive && <CheckCircle className="w-5 h-5 text-white" />}
                                                    </div>
                                                    <div className={`font-bold text-sm tracking-tight ${isActive ? 'text-primary' : 'text-slate-600'}`}>{opt.label}</div>
                                                    <div className="text-[10px] text-slate-400 font-bold mt-1">{opt.desc}</div>
                                                    {isDisabled && (
                                                        <div className="absolute top-2 right-2">
                                                            <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Lock Warning */}
                                    {(essayAnswers[essayStep] || "").length > 50 && (
                                        <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-medium animate-in fade-in">
                                            <div className="w-1 h-1 bg-primary rounded-full"></div>
                                            Hapus data jika ingin mengubah metode visualisasi.
                                        </div>
                                    )}
                                </div>

                                {/* Dynamic Workspace */}
                                <div className="p-1">
                                    {(essayAnswers[essayStep] || "").includes('[VISUAL:TABLE]') && (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                        <tr>
                                                            <th className="p-4 text-center font-bold text-slate-600">Bahan Bakar (Liter)</th>
                                                            <th className="p-4 text-center font-bold text-slate-600">Jarak (km)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {[0, 1, 2, 3].map((idx) => {
                                                            const currentVal = essayAnswers[essayStep] || "";
                                                            const tablePart = currentVal.includes('[TABLE]') ? currentVal.split('[TABLE]')[1].split('[REASON]')[0].trim() : "";
                                                            const parts = tablePart.split('|');
                                                            const getRowData = (i: number) => {
                                                                const r_parts = (parts[i] || "").trim().split(':');
                                                                return { n: r_parts[0] || "", p: r_parts[1] || "" };
                                                            };
                                                            const rows = [0, 1, 2, 3].map(getRowData);

                                                            const updateMatrix = (field: 'n' | 'p', val: string) => {
                                                                const nextRows = [...rows];
                                                                nextRows[idx] = { ...nextRows[idx], [field]: val };
                                                                const tableStr = nextRows.map(r => `${r.n}:${r.p}`).join('|');
                                                                const reasonPart = (currentVal.split('[REASON]')[1] || "").trim();
                                                                const newData = `[VISUAL:TABLE][TABLE]${tableStr}[REASON]${reasonPart}`;
                                                                const newMap = { ...essayAnswers, [essayStep]: newData };
                                                                setEssayAnswers(newMap);
                                                                autoSaveEssay(newMap);
                                                            };
                                                            const activeRow = rows[idx];
                                                            return (
                                                                <tr key={idx} className="hover:bg-slate-50/30">
                                                                    <td className="p-4"><input type="text" value={activeRow.n} onChange={(e) => updateMatrix('n', e.target.value)} placeholder="..." className="w-full p-4 text-center text-xl font-black border-2 border-slate-100 rounded-2xl focus:border-primary outline-none bg-slate-50/50" /></td>
                                                                    <td className="p-4"><input type="text" value={activeRow.p} onChange={(e) => updateMatrix('p', e.target.value)} placeholder="..." className="w-full p-4 text-center text-xl font-black border-2 border-slate-100 rounded-2xl focus:border-primary outline-none bg-white font-mono" /></td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {(essayAnswers[essayStep] || "").includes('[VISUAL:LINE]') && (
                                        <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 space-y-12 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="relative pt-12 pb-12">
                                                {/* Top Line (Liter) */}
                                                <div className="flex justify-between items-center px-4 mb-2">
                                                    <span className="text-[10px] font-black text-primary uppercase">Bahan Bakar (Liter)</span>
                                                </div>
                                                <div className="h-1.5 bg-primary relative rounded-full flex justify-between items-center px-6">
                                                    {[0, 1, 2, 3].map(i => (
                                                        <div key={i} className="w-2 h-6 bg-primary rounded-full relative">
                                                            <div className="absolute -top-14 left-1/2 -translate-x-1/2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="..."
                                                                    className="w-14 h-12 border-2 border-slate-200 rounded-2xl text-center text-sm font-black focus:border-primary outline-none shadow-sm"
                                                                    value={(essayAnswers[essayStep] || "").split('[LINE-T]')[1]?.split('[LINE-B]')[0]?.split('|')[i]?.trim() || ""}
                                                                    onChange={(e) => {
                                                                        const current = essayAnswers[essayStep] || "";
                                                                        const tPart = current.includes('[LINE-T]') ? current.split('[LINE-T]')[1]?.split('[LINE-B]')[0]?.trim() || "|||" : "|||";
                                                                        const bPart = current.includes('[LINE-B]') ? current.split('[LINE-B]')[1]?.split('[REASON]')[0]?.trim() || "|||" : "|||";
                                                                        const tArr = tPart.split('|');
                                                                        tArr[i] = e.target.value;
                                                                        const reasonPart = (current.split('[REASON]')[1] || "").trim();
                                                                        const newData = `[VISUAL:LINE][LINE-T]${tArr.join('|')}[LINE-B]${bPart.trim()}[REASON]${reasonPart}`;
                                                                        setEssayAnswers({ ...essayAnswers, [essayStep]: newData });
                                                                        autoSaveEssay({ ...essayAnswers, [essayStep]: newData });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Bottom Line (km) */}
                                                <div className="h-1.5 bg-slate-200 mt-24 relative rounded-full flex justify-between items-center px-6">
                                                    {[0, 1, 2, 3].map(i => (
                                                        <div key={i} className="w-2 h-6 bg-slate-300 rounded-full relative">
                                                            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="..."
                                                                    className="w-14 h-12 border-2 border-slate-200 rounded-2xl text-center text-sm font-black focus:border-primary outline-none shadow-sm"
                                                                    value={(essayAnswers[essayStep] || "").split('[LINE-B]')[1]?.split('[REASON]')[0]?.split('|')[i]?.trim() || ""}
                                                                    onChange={(e) => {
                                                                        const current = essayAnswers[essayStep] || "";
                                                                        const tPart = current.includes('[LINE-T]') ? current.split('[LINE-T]')[1]?.split('[LINE-B]')[0]?.trim() || "|||" : "|||";
                                                                        const bPart = current.includes('[LINE-B]') ? current.split('[LINE-B]')[1]?.split('[REASON]')[0]?.trim() || "|||" : "|||";
                                                                        const bArr = bPart.split('|');
                                                                        bArr[i] = e.target.value;
                                                                        const reasonPart = (current.split('[REASON]')[1] || "").trim();
                                                                        const newData = `[VISUAL:LINE][LINE-T]${tPart.trim()}[LINE-B]${bArr.join('|')}[REASON]${reasonPart}`;
                                                                        setEssayAnswers({ ...essayAnswers, [essayStep]: newData });
                                                                        autoSaveEssay({ ...essayAnswers, [essayStep]: newData });
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center px-4 mt-16">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">Jarak (km)</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(essayAnswers[essayStep] || "").includes('[VISUAL:TEXT]') && (
                                        <textarea
                                            ref={textareaRef}
                                            value={(essayAnswers[essayStep] || "").split('[REASON]')[0].replace('[VISUAL:TEXT]', '').trim()}
                                            onChange={(e) => {
                                                const current = essayAnswers[essayStep] || "";
                                                const reasonPart = current.split('[REASON]')[1] || "";
                                                const newData = `[VISUAL:TEXT]${e.target.value}[REASON]${reasonPart}`;
                                                setEssayAnswers({ ...essayAnswers, [essayStep]: newData });
                                                autoSaveEssay({ ...essayAnswers, [essayStep]: newData });
                                            }}
                                            className="w-full h-64 p-6 border-2 border-slate-200 rounded-3xl outline-none focus:border-primary transition-all font-medium text-lg"
                                            placeholder="Gunakan representasi lain (grafik, diagram, dll) atau jelaskan secara naratif di sini..."
                                        />
                                    )}
                                </div>

                                {currentQ.id === 7 && (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-bold text-slate-600 tracking-wide">b. Jelaskan alasan mengapa kamu memilih bentuk visualisasi tersebut!</label>
                                        <textarea
                                            value={(essayAnswers[essayStep] || "").split('[REASON]')[1] || ""}
                                            onChange={(e) => {
                                                const current = essayAnswers[essayStep] || "";
                                                const visualPart = current.split('[REASON]')[0] || "[VISUAL:TABLE]";
                                                const newData = `${visualPart.trim()}[REASON]${e.target.value}`;
                                                setEssayAnswers({ ...essayAnswers, [essayStep]: newData });
                                                autoSaveEssay({ ...essayAnswers, [essayStep]: newData });
                                            }}
                                            className="w-full h-32 p-5 bg-yellow-50/30 border-2 border-yellow-100 rounded-3xl outline-none focus:border-primary transition-all font-medium"
                                            placeholder="Berikan alasan pemilihanmu..."
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <textarea
                                ref={textareaRef}
                                value={val}
                                onChange={(e) => {
                                    const newMap = { ...essayAnswers, [essayStep]: e.target.value };
                                    setEssayAnswers(newMap);
                                    autoSaveEssay(newMap);
                                }}
                                className="w-full h-48 sm:h-64 p-5 text-lg border-2 border-slate-200 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none resize-none transition-all placeholder:text-slate-300 font-medium"
                                placeholder="Tuliskan jawaban dan penjelasan lengkap Anda di sini..."
                            />
                        )}

                        {/* Math Keyboard Toggle */}
                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-primary" />
                                <span className="text-sm font-bold text-slate-700">Keyboard Matematika</span>
                            </div>
                            <button
                                onClick={() => setShowMathKeyboard(!showMathKeyboard)}
                                className={`w-12 h-6 rounded-full transition-all relative ${showMathKeyboard ? 'bg-primary' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showMathKeyboard ? 'right-1' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Math Keyboard */}
                        {showMathKeyboard && (
                            <div className="bg-slate-900 p-4 md:p-6 rounded-3xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Numpad */}
                                    <div className="grid grid-cols-4 gap-2 flex-1">
                                        {mathSymbols.map((s, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => insertMathSymbol(s.sym)}
                                                className={`h-11 sm:h-14 rounded-xl text-lg sm:text-xl font-bold transition-all active:scale-95 flex items-center justify-center
                                                    ${s.type === 'num' ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-primary text-white hover:bg-primary-hover'}
                                                `}
                                            >
                                                {s.sym}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Advanced symbols */}
                                    <div className="grid grid-cols-2 md:grid-cols-2 gap-2 flex-1">
                                        {advancedSymbols.map((s, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => insertMathSymbol((s as any).insert || s.sym)}
                                                className="h-11 sm:h-14 bg-slate-800 text-white border border-slate-700 rounded-xl hover:bg-slate-700 transition-all active:scale-95 group relative flex flex-col items-center justify-center pt-1"
                                            >
                                                {s.sym === "/" ? (
                                                    <div className="flex flex-col items-center justify-center -space-y-1.5 transform scale-75 sm:scale-90 mb-1">
                                                        <span className="text-xs sm:text-sm font-bold">a</span>
                                                        <div className="w-3 sm:w-4 h-0.5 bg-white rounded-full"></div>
                                                        <span className="text-xs sm:text-sm font-bold">b</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-lg sm:text-xl font-bold">{s.label}</span>
                                                )}
                                                <span className="hidden sm:inline text-[9px] text-slate-500 uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1">{s.desc}</span>
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newText = val.slice(0, -1);
                                                const newMap = { ...essayAnswers, [essayStep]: newText };
                                                setEssayAnswers(newMap);
                                                autoSaveEssay(newMap);
                                            }}
                                            className="h-11 sm:h-14 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center font-bold col-span-2 text-xs sm:text-base"
                                        >
                                            HAPUS ⌫
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex items-center text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-full w-full sm:w-auto">
                        {saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2 text-primary" /> Menyimpan...</>
                        ) : val.length > 0 ? (
                            <><Save className="w-4 h-4 mr-2 text-green-500" /> Jawaban tersimpan</>
                        ) : (
                            "Belum ada jawaban"
                        )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {!isFirst && (
                            <button
                                onClick={handleEssayPrev}
                                className="flex-1 sm:flex-none border-2 border-slate-200 hover:border-slate-300 text-slate-600 font-bold py-3 px-6 rounded-xl transition-all"
                            >
                                Kembali
                            </button>
                        )}

                        <button
                            onClick={handleEssayNext}
                            className={`flex-1 sm:flex-none font-bold py-3 px-8 rounded-xl transition-all shadow-md
                                ${isLast ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20' : 'bg-primary hover:bg-primary-hover text-white'}
                            `}
                        >
                            {isLast ? "Selesaikan Tes" : `Lanjut ke Soal ${essayStep + 2}`}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8 pt-6 sm:pt-12">
            <div className="max-w-4xl mx-auto relative">
                {/* Back to Home Button */}
                <button
                    onClick={() => router.push("/student")}
                    className="absolute -top-12 sm:-top-8 left-0 flex items-center text-slate-500 hover:text-primary transition-colors text-sm font-medium"
                >
                    <Home className="w-4 h-4 mr-2" />
                    Kembali ke Menu
                </button>

                <div className="mb-8 animate-in slide-in-from-top-4 duration-500 mt-8 sm:mt-0 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                        <div>
                            <span className="font-bold text-slate-800 block text-sm sm:text-base">
                                {step === 1 && "Tahap 1: Lingkungan Belajar"}
                                {step === 2 && "Tahap 2: Efikasi Diri"}
                                {step === 3 && "Tahap 3: Penalaran Proporsional"}
                            </span>
                            <span className="text-xs text-slate-500 font-medium mt-1 inline-block bg-slate-50 px-2 py-1 rounded-md">
                                {step === 1 && `${Object.keys(angket1).length} dari ${LINGKUNGAN_BELAJAR_Q.reduce((a, b) => a + b.qs.length, 0)} terjawab`}
                                {step === 2 && `${Object.keys(angket2).length} dari ${EFIKASI_DIRI_Q.reduce((a, b) => a + b.qs.length, 0)} terjawab`}
                                {step === 3 && `${ESSAY_QUESTIONS.filter((_, i) => {
                                    const val = (essayAnswers[i] || "").trim();
                                    if (!val) return false;
                                    if (i === 6) { // Soal No 7 (Visualisasi)
                                        const clean = val.replace(/\[VISUAL:.*?\]|\[TABLE\]|\[LINE-T\]|\[LINE-B\]|\[REASON\]|[:| \t\n\r]/g, "");
                                        return clean.length > 0;
                                    }
                                    return val.length > 0;
                                }).length} dari ${ESSAY_QUESTIONS.length} soal terjawab`}
                            </span>
                        </div>
                        <span className="text-xl sm:text-2xl font-black text-primary">
                            {step === 1 && Math.round((Object.keys(angket1).length / LINGKUNGAN_BELAJAR_Q.reduce((a, b) => a + b.qs.length, 0)) * 100) + "%"}
                            {step === 2 && Math.round((Object.keys(angket2).length / EFIKASI_DIRI_Q.reduce((a, b) => a + b.qs.length, 0)) * 100) + "%"}
                            {step === 3 && Math.round((ESSAY_QUESTIONS.filter((_, i) => {
                                const val = (essayAnswers[i] || "").trim();
                                if (!val) return false;
                                if (i === 6) {
                                    const clean = val.replace(/\[VISUAL:.*?\]|\[TABLE\]|\[LINE-T\]|\[LINE-B\]|\[REASON\]|[:| \t\n\r]/g, "");
                                    return clean.length > 0;
                                }
                                return val.length > 0;
                            }).length / ESSAY_QUESTIONS.length) * 100) + "%"}
                        </span>
                    </div>
                    <div className="flex bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden shadow-inner">
                        <div
                            className="bg-primary transition-all duration-700 ease-out"
                            style={{
                                width: step === 1 ? `${(Object.keys(angket1).length / LINGKUNGAN_BELAJAR_Q.reduce((a, b) => a + b.qs.length, 0)) * 100}%`
                                    : step === 2 ? `${(Object.keys(angket2).length / EFIKASI_DIRI_Q.reduce((a, b) => a + b.qs.length, 0)) * 100}%`
                                        : `${ESSAY_QUESTIONS.filter((_, i) => {
                                            const val = (essayAnswers[i] || "").trim();
                                            if (!val) return false;
                                            if (i === 6) {
                                                const clean = val.replace(/\[VISUAL:.*?\]|\[TABLE\]|\[LINE-T\]|\[LINE-B\]|\[REASON\]|[:| \t\n\r]/g, "");
                                                return clean.length > 0;
                                            }
                                            return val.length > 0;
                                        }).length / ESSAY_QUESTIONS.length * 100}%`
                            }}
                        />
                    </div>
                </div>

                {step === 1 && renderAngket("Skala Lingkungan Belajar", LINGKUNGAN_BELAJAR_Q, angket1, setAngket1, 1)}
                {step === 2 && renderAngket("Skala Efikasi Diri", EFIKASI_DIRI_Q, angket2, setAngket2, 2)}
                {step === 3 && renderEssay()}
            </div>
        </div>
    );
}

// Custom PRNG for stable shuffling
const getSeededRandom = (seed: number) => {
    return function () {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    };
};

const getStudentShuffle = (studentId: string, stage: number, groupIndex: number, length: number) => {
    let seed = 0;
    for (let i = 0; i < studentId.length; i++) {
        seed += studentId.charCodeAt(i);
    }
    seed += stage * 10000 + groupIndex * 1000;
    const random = getSeededRandom(seed);

    const indices = Array.from({ length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
};

export default function InstrumentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        }>
            <InstrumentContent />
        </Suspense>
    );
}
