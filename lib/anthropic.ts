import Anthropic from '@anthropic-ai/sdk';
import { Tone } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a professional video script writer. Your job is to convert written document content into a natural, engaging spoken-word script for a talking-head video.

RULES:
1. Write in first person as if you are directly speaking to the viewer.
2. Use a {tone} tone.
3. Target approximately {maxLengthSeconds} seconds of speaking time. Estimate ~150 words per minute of speech.
4. Start with a brief, engaging hook — do NOT start with "Hello" or "Welcome".
5. Summarize the key points of the document. Do not try to cover every detail.
6. Use transition phrases naturally: "Now, here's the interesting part...", "What this means is...", "Let's look at..."
7. End with a clear conclusion or call to action.
8. Do NOT include any stage directions, speaker labels, timestamps, or formatting.
9. Output ONLY the script text that will be spoken. Nothing else.
10. Do NOT use markdown formatting, headers, bullet points, or any special characters.
11. Keep sentences short and punchy — this will be spoken aloud, not read.`;

export async function generateScript(
  text: string,
  tone: Tone,
  maxLengthSeconds: number
): Promise<{ script: string; wordCount: number; estimatedDurationSeconds: number }> {
  // Truncate text if too long
  const truncatedText = text.length > 50000 ? text.substring(0, 50000) : text;

  const targetWordCount = Math.round((maxLengthSeconds / 60) * 150);

  const systemPrompt = SYSTEM_PROMPT
    .replace('{tone}', tone)
    .replace('{maxLengthSeconds}', String(maxLengthSeconds));

  const userMessage = `Convert the following document content into a video script.

Tone: ${tone}
Target duration: ${maxLengthSeconds} seconds (~${targetWordCount} words)

DOCUMENT CONTENT:
${truncatedText}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const script = message.content
    .filter((block) => block.type === 'text')
    .map((block) => {
      if (block.type === 'text') return block.text;
      return '';
    })
    .join('')
    .trim();

  const wordCount = script.split(/\s+/).length;
  const estimatedDurationSeconds = Math.round((wordCount / 150) * 60);

  return {
    script,
    wordCount,
    estimatedDurationSeconds,
  };
}
