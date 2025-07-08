// backend/routes/deepseekRoutes.js

const express = require("express");
const router = express.Router();
const axios = require("axios");

// POST /api/deepseek-chat
router.post("/", async (req, res) => {
  const { messages, refine, existingTrip } = req.body;

  console.log("✅ Received messages:", messages);

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: [
          {
            role: "system",
            content: `
You are a travel assistant who ONLY helps refine a specific trip.

- You may ONLY answer questions related to the current trip plan.
- If the user asks about any other topic (e.g. politics, coding, general knowledge), politely refuse and say:

"Sorry, I can only help refine the trip we have planned. Please ask about your trip."

If refining, here is the current trip info you can reference:

${existingTrip ? JSON.stringify(existingTrip, null, 2) : "No trip yet."}
            `.trim(),
          },
          ...messages,
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = response.data.choices[0].message.content;

    console.log("✅ DeepSeek reply:", reply);

    res.json({ reply });
  } catch (error) {
    console.error(
      "❌ DeepSeek API error:",
      error?.response?.data || error.message
    );
    res.status(500).json({
      msg: "OpenRouter API call failed.",
      error: error?.response?.data || error.message,
    });
  }
});

module.exports = router;
