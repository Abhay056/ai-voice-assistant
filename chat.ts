import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
if (!process.env.GEMINI_API_KEY || !genAI) {
  throw new Error('Google Generative AI client initialization failed. Check your API key in .env.local');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ message: 'Text is required' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(text);
    const response = await result.response;
    const reply = response.text();

    res.status(200).json({ reply });
  } catch (error) {
    console.error('Google Gemini API error:', error);
    res.status(500).json({ message: 'Error communicating with Google Gemini' });
  }
}