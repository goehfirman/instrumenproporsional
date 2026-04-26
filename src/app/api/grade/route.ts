import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API Key tidak ditemukan di server." }, { status: 500 });
        }

        const { questionText, studentAnswer, rubric, indicator, cognitiveLevel } = await req.json();

        if (!studentAnswer || studentAnswer.trim().length < 2) {
            return NextResponse.json({ score: 0, feedback: "Jawaban kosong atau terlalu singkat." });
        }

        // Using gemini-2.0-flash (confirmed available for this API key)
        const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const prompt = `
            Anda adalah pakar evaluasi pendidikan matematika. Tugas Anda adalah menilai jawaban siswa pada soal esai penalaran proporsional (0-4).

            DATA SOAL:
            Teks Soal: "${questionText}"
            Indikator: "${indicator}"
            Level Kognitif: "${cognitiveLevel}"
            Rambu-rambu Jawaban Ideal:
            ${rubric.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n")}

            JAWABAN SISWA:
            "${studentAnswer}"

            RUBRIK PENILAIAN (0-4):
            4: Benar, lengkap, alasan valid.
            3: Benar/Hampir benar, pemahaman cukup, alasan kurang lengkap.
            2: Sebagian benar, ada kesalahan signifikan.
            1: Pemahaman minimal, sebagian kecil benar.
            0: Salah/Kosong.

            FORMAT OUTPUT (JSON):
            {
                "score": [angka 0-4],
                "feedback": "[maks 2 kalimat]"
            }
        `;

        const response = await fetch(URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error:", data);
            return NextResponse.json({
                error: `API ${response.status}: ${data.error?.message || "Error tidak dikenal"}`
            }, { status: response.status });
        }

        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidate) {
            return NextResponse.json({ error: "AI tidak memberikan respons valid." }, { status: 500 });
        }

        const jsonMatch = candidate.match(/\{[\s\S]*\}/);
        const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { score: 1, feedback: "Gagal memproses JSON AI." };

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("AI Grading Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
