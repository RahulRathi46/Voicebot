import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { twiml } from "twilio";
import OpenAI from "openai";
import { getCookie, setCookie } from "hono/cookie";

const openai = new OpenAI();
const app = new Hono();

app.use("*", logger());

const INITIAL_MESSAGE = "Hello, how are you?";

app.post("/incoming-call", (c) => {
  const voiceResponse = new twiml.VoiceResponse();

  if (!getCookie(c, "messages")) {
    // This is a new conversation!
    voiceResponse.say(INITIAL_MESSAGE);
    setCookie(
      c,
      "messages",
      JSON.stringify([
        {
          role: "system",
          content: `
         You are a helpful phone assistant for a pizza restaurant.
         The restaurant is open between 10-12 pm.
         You can help the customer reserve a table for the restaurant.
       `,
        },
        { role: "assistant", content: INITIAL_MESSAGE },
      ])
    );
  }
  voiceResponse.gather({
    input: ["speech"],
    speechTimeout: "auto",
    speechModel: "experimental_conversations",
    enhanced: true,
    action: "/respond",
  });
  c.header("Content-Type", "application/xml");
  return c.body(voiceResponse.toString());
});

app.post("/respond", async (c) => {
  const formData = await c.req.formData();
  const voiceInput = formData.get("SpeechResult")?.toString()!;
  let messages = JSON.parse(getCookie(c, "messages")!);
  messages.push({ role: "user", content: voiceInput });
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0,
  });

  const assistantResponse = chatCompletion.choices[0].message.content;
  messages.push({ role: "assistant", content: assistantResponse });
  console.log(messages);
  setCookie(c, "messages", JSON.stringify(messages));
  const voiceResponse = new twiml.VoiceResponse();
  voiceResponse.say(assistantResponse!);
  voiceResponse.redirect({ method: "POST" }, "/incoming-call");
  c.header("Content-Type", "application/xml");
  return c.body(voiceResponse.toString());
});

const port = 3000;

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
