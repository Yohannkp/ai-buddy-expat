// Supabase Edge Function: summarize via Groq AI
// Deploy with: supabase functions deploy summarize
// Env: GROQ_API_KEY
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface ReqBody { text?: string; max_sentences?: number }

const system = `Vous résumez des posts pour étudiants. Répondez en 1-3 phrases claires, sans détails inutiles.`

serve(async (req) => {
  try {
    const { text, max_sentences = 2 } = await req.json() as ReqBody
    if (!text) return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 })
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing GROQ_API_KEY' }), { status: 500 })
    const prompt = `Résumé (${max_sentences} phrases max):\n${text}`
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [ { role: 'system', content: system }, { role: 'user', content: prompt } ], temperature: 0.2 })
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await res.text() }), { status: 500 })
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content ?? ''
    return new Response(JSON.stringify({ summary: content.trim() }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500 }) }
})
