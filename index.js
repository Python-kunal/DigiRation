import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Server setup
dotenv.config();
const app = express();
app.use(cors()); // Allow React app to call this server
app.use(express.json()); // Allow server to read JSON data

const PORT = process.env.PORT || 3001;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Yeh system instruction hai jo bot ko batayega ki woh kya hai.
const systemInstruction = `Aap "Sahayata" hain, Ration and Welfare Transparency System ke liye ek AI assistant.
Aapka kaam hai citizens ko unke ration card, welfare schemes (jaise Pradhan Mantri Garib Kalyan Anna Yojana),
distribution status, aur portal ka upyog karne mein madad karna.
Jawaab hamesha saral Hindi ya Hinglish mein dein. Professional aur madadgaar (helpful) rahein.`;

// API endpoint jise React app call karega
app.post("/chat", async (req, res) => {
  try {
    const { history, message } = req.body;

    // ===== Sabse Standard Model ka istemal: 'gemini-pro' =====
    const model = genAI.getGenerativeModel({
      model: "gemini-pro", // Hum 'gemini-pro' istemal kar rahe hain
    });

    // Safety settings
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    // History ko format karein (System Instruction + User History)
    const chatHistory = [
      // System Instruction ko pehle message ke roop mein add karein
      { role: "user", parts: [{ text: systemInstruction }] },
      { role: "model", parts: [{ text: "Theek hai, main 'Sahayata' AI assistant hoon." }] }, // Bot ka dummy response
      // Ab user ki asli history add karein (pehla welcome message chhod kar)
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.parts[0].text }],
      }))
    ];

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 1000,
      },
      safetySettings,
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    const botMessage = response.text();

    res.json({ message: botMessage });

  } catch (error) {
    // Error ko poora print karein taaki hum dekh sakein
    console.error("Error in /chat endpoint:", error.message);
    if (error.response && error.response.promptFeedback) {
        return res.status(400).json({ error: "Jawaab ko safety reasons se block kar diya gaya." });
    }
    res.status(500).json({ error: "Bot se baat karne mein kuch problem aa rahi hai." });
  }
});

app.listen(PORT, () => {
  console.log(`Chatbot server http://localhost:${PORT} par chal raha hai`);
});

