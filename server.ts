import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "harmonic-field-engine", timestamp: new Date().toISOString() });
  });

  // AI Somatic Insight Extraction Endpoint
  app.post("/api/extract-insight", async (req, res) => {
    try {
      const { text, sessionType, dominantFrequency, currentScore } = req.body;

      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'text' payload." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `You are the Harmonic Field somatic engine. Analyze this post-session voice insight or somatic reflection from a user who just completed a '${sessionType || "General"}' frequency realignment session (Dominant Solfeggio: ${dominantFrequency || "432Hz"}).
User Reflection: "${text}"

Respond with ONLY a valid JSON object (no markdown, no backticks, no wrapping text) adhering to this schema:
{
  "themes": ["theme1", "theme2"],
  "symbols": ["symbol1", "symbol2"],
  "somaticLocation": "primary body area (e.g. Solar Plexus, Vagus Nerve, Chest/Heart Space, Base of Spine, Throat, Brow)",
  "summary": "1-2 sentence grounded synthesis honoring their nervous system state",
  "scoreDelta": 5,
  "vagalState": "Ventral Vagal (Safe & Connected) | Sympathetic Regulated | Dorsal Restored",
  "affirmation": "A grounding, warm 1-sentence frequency anchor"
}`;

          const response = await ai.models.generateContent({
            model: "gemini-3.7-flash",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.4,
            }
          });

          const rawText = response.text || "{}";
          const parsed = JSON.parse(rawText);
          return res.json({
            success: true,
            insight: {
              themes: parsed.themes || ["Somatic Alignment", "Presence"],
              symbols: parsed.symbols || ["Resonance", "Breath"],
              somaticLocation: parsed.somaticLocation || "Solar Plexus & Chest",
              summary: parsed.summary || text.slice(0, 150),
              scoreDelta: Number(parsed.scoreDelta) || 5,
              vagalState: parsed.vagalState || "Ventral Vagal (Safe & Connected)",
              affirmation: parsed.affirmation || "The field remains steady within you."
            }
          });
        } catch (aiErr: any) {
          console.error("Gemini API insight error:", aiErr);
          // Fallback to grounded heuristic extraction
        }
      }

      // Heuristic fallback if Gemini API key isn't configured
      const commonLocations = [
        { regex: /heart|chest|breast|breath/i, name: "Heart Space & Chest" },
        { regex: /throat|neck|voice|speak/i, name: "Throat & Vagus Pathway" },
        { regex: /solar|stomach|gut|belly|plexus/i, name: "Solar Plexus & Gut" },
        { regex: /head|brow|third eye|mind|forehead/i, name: "Brow & Cranial Rhythm" },
        { regex: /feet|ground|legs|root|spine|pelvis/i, name: "Base of Spine & Grounding Roots" },
        { regex: /shoulders|back|scapula|tension/i, name: "Upper Back & Cervical Spine" }
      ];

      let detectedLocation = "Solar Plexus & Heart Space";
      for (const loc of commonLocations) {
        if (loc.regex.test(text)) {
          detectedLocation = loc.name;
          break;
        }
      }

      return res.json({
        success: true,
        insight: {
          themes: ["Energetic Rebalancing", "Nervous System Integration"],
          symbols: ["Harmonic Spiral", "Grounding Anchor"],
          somaticLocation: detectedLocation,
          summary: text.length > 120 ? text.slice(0, 120) + "..." : text,
          scoreDelta: 6,
          vagalState: "Ventral Vagal (Safe & Connected)",
          affirmation: "Your nervous system has safely integrated this frequency shift."
        }
      });
    } catch (err: any) {
      console.error("Extract insight endpoint error:", err);
      res.status(500).json({ error: "Internal error processing insight." });
    }
  });

  // Deep Grounding Text-to-Speech Generation Endpoint (Gemini TTS)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'text' payload." });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ success: false, fallback: true, message: "Gemini API key not configured, using client synthesis." });
      }

      const ai = new GoogleGenAI({ apiKey });
      // Voice options: 'Charon' (deep, resonant, grounding) or 'Aoede' (calm, meditative, warm)
      const selectedVoice = voice === "Aoede" ? "Aoede" : "Charon";
      const guidedMeditationPrompt = `Speak in a slow, deep, warm, calm, and grounding vocal tone with reduced speech rate and intentional somatic pauses for guided meditation: ${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: guidedMeditationPrompt }] }],
        config: {
          temperature: 0.4,
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.[0];
      const base64Audio = audioPart?.inlineData?.data;
      const mimeType = audioPart?.inlineData?.mimeType || "audio/pcm;rate=24000";

      if (base64Audio) {
        return res.json({
          success: true,
          audioData: base64Audio,
          mimeType: mimeType,
          sampleRate: 24000,
          voice: selectedVoice
        });
      }

      return res.json({ success: false, fallback: true, message: "No audio stream returned." });
    } catch (ttsErr: any) {
      console.error("Gemini TTS synthesis notice:", ttsErr.message);
      return res.json({ success: false, fallback: true, error: ttsErr.message });
    }
  });

  // Make.com Webhook Forwarder & Pipeline Endpoint
  app.post("/api/make-webhook", async (req, res) => {
    try {
      const { webhookUrl, payload } = req.body;

      if (!payload) {
        return res.status(400).json({ error: "Missing payload for Make.com webhook." });
      }

      const structuredPayload = {
        user_id: payload.user_id || "user_" + Math.random().toString(36).substring(2, 9),
        session_type: payload.session_type || "Mid-Day",
        dominant_frequency: payload.dominant_frequency || "432Hz",
        somatic_location: payload.somatic_location || "Chest & Vagus Nerve",
        extracted_insight: payload.extracted_insight || "Session realignment completed.",
        harmonic_field_score: payload.harmonic_field_score || 88,
        timestamp: new Date().toISOString()
      };

      if (webhookUrl && typeof webhookUrl === "string" && webhookUrl.startsWith("http")) {
        try {
          const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "HarmonicFieldCoreEngine/1.0"
            },
            body: JSON.stringify(structuredPayload)
          });

          const responseText = await response.text();
          return res.json({
            success: true,
            status: response.status,
            dispatchedTo: webhookUrl,
            payload: structuredPayload,
            responseBody: responseText || "Accepted"
          });
        } catch (fetchErr: any) {
          return res.status(502).json({
            success: false,
            error: `Failed to dispatch to Make.com: ${fetchErr.message}`,
            payload: structuredPayload
          });
        }
      }

      // If no external URL is specified, simulate successful pipeline integration
      return res.json({
        success: true,
        mode: "simulated_pipeline",
        status: 200,
        payload: structuredPayload,
        responseBody: "Harmonic Field score updated and synced to offline storage."
      });
    } catch (err: any) {
      console.error("Make.com pipeline error:", err);
      res.status(500).json({ error: "Pipeline processing failed." });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Harmonic Field Core Engine server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Harmonic Field server:", err);
});
