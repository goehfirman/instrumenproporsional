"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function StudentLogin() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      // Bypassing Firebase temporarily
      const studentId = "local-" + Date.now();
      sessionStorage.setItem("studentId", studentId);
      sessionStorage.setItem("studentName", name.trim().toUpperCase());

      // Read local progress or default to 1
      const localData = localStorage.getItem("localStudentsData");
      let students = localData ? JSON.parse(localData) : {};

      // Simple lookup by name
      const existingStudent = Object.values(students).find((s: any) => s.name === name.trim().toUpperCase());

      if (existingStudent) {
        sessionStorage.setItem("studentId", (existingStudent as any).id);
      } else {
        students[studentId] = {
          id: studentId,
          name: name.trim().toUpperCase(),
          status_progres: 0,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem("localStudentsData", JSON.stringify(students));
      }

      router.push("/student");
    } catch (error) {
      console.error("Error logging in: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="bg-primary p-8 text-center text-white">
          <img
            src="https://i.ibb.co.com/20ZD2sSB/unindra.png"
            alt="Logo Unindra"
            className="h-20 w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-black mb-3 uppercase tracking-wide">
            Portal Instrumen
          </h1>
          <h2 className="text-xs md:text-sm font-medium mb-4 leading-relaxed px-4 opacity-80">
            (Pengaruh Lingkungan Belajar dan Efikasi Diri terhadap Kemampuan Penalaran Proporsional Matematika)
          </h2>
          <div className="bg-white/10 rounded-2xl p-4 text-[10px] md:text-xs text-white/90 border border-white/5 leading-relaxed backdrop-blur-sm mx-4">
            <p>
              Semua data akan tersimpan otomatis. Jika ingin masuk lagi dengan memulihkan progres pengerjaan, cukup masukkan nama lengkap sesuai pengisian awal.
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="p-8 pb-6">
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
              Masukkan Nama Lengkap Sesuai Absen
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-primary hover:bg-primary-hover text-white font-bold text-lg py-4 rounded-xl transition-all shadow-lg hover:shadow-primary/50 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-6 h-6" />
                Memproses...
              </>
            ) : (
              "Mulai"
            )}
          </button>

          <div className="mt-6 text-center">
            <button type="button" onClick={() => router.push('/admin/login')} className="text-slate-400 hover:text-primary text-xs font-medium transition-colors">
              Masuk sebagai Peneliti (Admin)
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
