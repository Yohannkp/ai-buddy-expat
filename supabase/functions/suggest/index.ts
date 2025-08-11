// Supabase Edge Function: suggest via Groq AI
// Deploy with: supabase functions deploy suggest
// Env: GROQ_API_KEY
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface ReqBody { text?: string }

const system = `Vous suggérez des hashtags (3-6) et un court titre (<=60 caractères) pertinents pour des posts étudiants.
Répondez en JSON: { "title": string, "hashtags": string[] }`

serve(async (req) => {
  try {
    const { text } = await req.json() as ReqBody
    if (!text) return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 })
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing GROQ_API_KEY' }), { status: 500 })
    const prompt = `Post:\n${text}\n\nJSON attendu`;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [ { role: 'system', content: system }, { role: 'user', content: prompt } ], temperature: 0.3 })
    })
    if (!res.ok) return new Response(JSON.stringify({ error: await res.text() }), { status: 500 })
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content ?? '{}'
    let out: any = { title: '', hashtags: [] }
    try { out = JSON.parse(content) } catch {}
    return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) { return new Response(JSON.stringify({ error: String(e) }), { status: 500 }) }
})
