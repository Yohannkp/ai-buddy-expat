// Supabase Edge Function: translate via Groq AI
// Deploy with: supabase functions deploy translate
// Env: set GROQ_API_KEY in project settings

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

interface ReqBody { text?: string; target_lang?: string }

serve(async (req) => {
  try {
    const { text, target_lang } = await req.json() as ReqBody
    if (!text || !target_lang) return new Response(JSON.stringify({ error: 'Missing text/target_lang' }), { status: 400 })
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing GROQ_API_KEY' }), { status: 500 })

    const prompt = `Traduisez le texte suivant vers la langue ${target_lang} en conservant le sens et un ton naturel. Réponse: uniquement le texte traduit.\n\nTexte:\n${text}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    })
    if (!res.ok) {
      const t = await res.text()
      return new Response(JSON.stringify({ error: 'Groq error', detail: t }), { status: 500 })
    }
    const data = await res.json()
    const translated = data?.choices?.[0]?.message?.content ?? ''
    return new Response(JSON.stringify({ translated, detected_lang: 'auto' }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
