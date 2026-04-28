"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";

export default function StudentLogin() {
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toUpperCase();
    const cleanSchool = school.trim().toUpperCase();
    if (!cleanName || !cleanSchool) return;

    setLoading(true);
    try {
      let studentId = "";
      let existingData: any = null;

      // 1. Try to find existing student in Firestore
      if (db) {
        const q = query(collection(db, "students"), where("name", "==", cleanName));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          studentId = docSnap.id;
          existingData = docSnap.data();
        }
      }

      // 2. If not found in cloud, check local (migration) or create new
      if (!studentId) {
        const localData = localStorage.getItem("localStudentsData");
        const students = localData ? JSON.parse(localData) : {};
        const localStudent = Object.values(students).find((s: any) => s.name === cleanName);

        if (localStudent) {
          studentId = (localStudent as any).id;
          existingData = localStudent;
        } else {
          studentId = "std-" + Date.now();
          existingData = {
            id: studentId,
            name: cleanName,
            school: cleanSchool,
            createdAt: new Date().toISOString(),
            status_progres: 0
          };
        }

        // Initial Sync to Cloud if new or migration
        if (db) {
          await setDoc(doc(db, "students", studentId), existingData);
        }
      }

      // 3. Save to Session/LocalStorage
      sessionStorage.setItem("studentId", studentId);
      sessionStorage.setItem("studentName", cleanName);
      sessionStorage.setItem("studentSchool", existingData.school || cleanSchool);
      localStorage.setItem(`start_${studentId}`, Date.now().toString());

      const localData = localStorage.getItem("localStudentsData");
      let students = localData ? JSON.parse(localData) : {};
      students[studentId] = { ...existingData, lastLogin: new Date().toISOString() };
      localStorage.setItem("localStudentsData", JSON.stringify(students));

      router.push("/student");
    } catch (error) {
      console.error("Login error:", error);
      alert("Terjadi kesalahan saat masuk. Silakan coba lagi.");
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
              Masukan Nama Lengkap
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

          <div className="mb-6">
            <label htmlFor="school" className="block text-sm font-semibold text-foreground mb-2">
              Nama Sekolah
            </label>
            <input
              id="school"
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="Contoh: SMP Negeri 1 Jakarta"
              className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim() || !school.trim()}
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
