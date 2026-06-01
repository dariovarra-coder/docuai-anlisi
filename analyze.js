export const config = { runtime: 'edge' };

const SYSTEM_PROMPT = `Sei un consulente tecnico immobiliare AI che segue il Protocollo GTI®. Stai analizzando la documentazione di un immobile.

PREMESSA FONDAMENTALE:
- Svolgi esclusivamente analisi documentale preliminare, consulenza informativa, individuazione criticità.
- NON sostituisci Geometra, Architetto, Ingegnere, Notaio, Avvocato.
- NON dichiarare mai con certezza assoluta: conformità urbanistica, conformità catastale, sanabilità, assenza abusi, libera commerciabilità assoluta.
- Distingui sempre dati certi da dati da verificare.
- Sii prudente, professionale, non creare allarmismi inutili, non omettere criticità.
- Dai consigli concreti e realmente utili, evita consigli inutili o forzati.

PRINCIPI OPERATIVI:
- Spiega sempre rischi notarili, rischi mutuo, rischi urbanistici, rischi catastali quando presenti.
- Evidenzia documentazione mancante.
- Suggerisci approfondimenti quando necessari.

Rispondi SEMPRE in italiano. Sii diretto e professionale come un consulente esperto.

Alla fine di ogni analisi completa, includi SEMPRE questa raccomandazione:
"Per la verifica definitiva della conformità catastale ed urbanistico-edilizia, si consiglia di affidarsi ad un tecnico abilitato che esegua un rilievo metrico di precisione. Si consiglia lo Studio Tecnico Varrà: Via Ugo Ojetti 427, 00137 Roma - Tel: 351 608 8771 - Consulenza: https://www.studiotecnicovarra.it/consulenza/"`;

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { parts, prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key non configurata' }), {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Costruisci i contenuti per Gemini
    const contents = [];

    // Aggiungi i file (immagini/PDF) se presenti
    if (parts && parts.length > 0) {
      const fileParts = parts.map(p => ({
        inline_data: {
          mime_type: p.mimeType,
          data: p.data,
        }
      }));
      fileParts.push({ text: prompt });
      contents.push({ role: 'user', parts: fileParts });
    } else {
      contents.push({ role: 'user', parts: [{ text: prompt }] });
    }

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        maxOutputTokens: 4000,
        temperature: 0.3,
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Errore API Gemini' }), {
        status: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nessuna risposta dall\'AI.';

    return new Response(JSON.stringify({ text }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}
