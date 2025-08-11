// Supabase Edge Function: moderate via Groq AI
// Deploy with: supabase functions deploy moderate
// Env: set GROQ_API_KEY in project settings

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface ReqBody { text?: string }

const system = `Vous êtes un modérateur. Analysez le texte et retournez un JSON minimal avec ces champs:
{
  "flagged": boolean,
  "labels": string[],
  "reason": string
}
Flagguez pour: propos haineux, harcèlement, violence explicite, arnaques, spam, contenu sexuel explicite, incitation à la haine. Sinon, flagged=false.`

serve(async (req) => {
  try {
    const { text } = await req.json() as ReqBody
    if (!text) return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 })
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing GROQ_API_KEY' }), { status: 500 })

    const prompt = `Texte à modérer:\n${text}\n\nRetour attendu: JSON strict conforme.`
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        temperature: 0
      })
    })
    if (!res.ok) {
      const t = await res.text()
      return new Response(JSON.stringify({ error: 'Groq error', detail: t }), { status: 500 })
    }
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content ?? '{}'
    let out: any = { flagged: false, labels: [], reason: '' }
    try { out = JSON.parse(content) } catch {}
    return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
