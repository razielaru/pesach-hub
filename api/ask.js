import { AUDIT_QUESTIONNAIRE_DB } from './auditQuestionnaire.js'
import { HALACHA_DB } from './knowledge.js'

export const config = { runtime: 'edge' }

const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'
const DEFAULT_SYSTEM_PROMPT = 'אתה עוזר AI של רבנות צבאית. ענה בעברית ברורה, מלאה ומעשית.'
const CLASSIFICATION_SYSTEM_PROMPT = 'אתה מסווג חריגים צבאיים. ענה במילה אחת בלבד מתוך: critical, high, medium, low. ללא פיסוק.'
const MAX_HISTORY_MESSAGES = 8
const CONTEXT_RADIUS = 650
const MAX_CONTEXT_SNIPPETS = 6
const CONTEXT_DIVIDER = '\n\n---\n\n'

const KNOWLEDGE_SOURCES = {
  halacha: {
    label: 'ספר הכשרות והכשרת כלים לפסח',
    text: HALACHA_DB,
  },
  audit: {
    label: 'שאלון ביקורת אכ"א',
    text: AUDIT_QUESTIONNAIRE_DB,
  },
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function normalizeMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter(message => typeof message?.content === 'string' && message.content.trim())
    .slice(-MAX_HISTORY_MESSAGES)
    .map(message => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content.trim(),
    }))
}

function getLastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'user') return messages[i].content
  }
  return ''
}

function tokenizeQuery(text) {
  return [...new Set(
    (text || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s"]/gu, ' ')
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length >= 2)
  )].slice(0, 12)
}

function detectKnowledgeMode(text) {
  const normalized = (text || '').toLowerCase()
  const auditHints = [
    'ביקורת', 'אכא', 'אכ"א', 'מבקר', 'שאלון', 'רעו"ת', 'חיילת דתית',
    'מתגייר', 'ניהול משרד', 'זהות ותודעה', 'יומן כשרות', 'תקין', 'לא תקין',
    'פוסל ביקורת', 'נספח הלכתי', 'רכש חוץ',
  ]
  return auditHints.some(hint => normalized.includes(hint)) ? 'audit' : 'halacha'
}

function getContextSnippets(sourceText, query) {
  const tokens = tokenizeQuery(query)
  const snippets = []
  const seen = new Set()

  for (const token of tokens) {
    let startAt = 0
    let matchesForToken = 0

    while (matchesForToken < 2) {
      const index = sourceText.indexOf(token, startAt)
      if (index === -1) break

      const sliceStart = Math.max(0, index - CONTEXT_RADIUS)
      const sliceEnd = Math.min(sourceText.length, index + CONTEXT_RADIUS)
      const snippet = sourceText.slice(sliceStart, sliceEnd).trim()
      const key = snippet.slice(0, 160)

      if (snippet && !seen.has(key)) {
        snippets.push(snippet)
        seen.add(key)
      }

      matchesForToken += 1
      startAt = index + token.length
      if (snippets.length >= MAX_CONTEXT_SNIPPETS) return snippets
    }
  }

  return snippets
}

function buildKnowledgeContext(requestedMode, query) {
  const knowledgeMode = requestedMode === 'auto' ? detectKnowledgeMode(query) : requestedMode
  if (!knowledgeMode || knowledgeMode === 'none') {
    return { knowledgeMode: 'none', knowledgeLabel: '', knowledgeContext: '' }
  }

  const source = KNOWLEDGE_SOURCES[knowledgeMode] || KNOWLEDGE_SOURCES.halacha
  const snippets = getContextSnippets(source.text, query)

  return {
    knowledgeMode,
    knowledgeLabel: source.label,
    knowledgeContext: snippets.join(CONTEXT_DIVIDER),
  }
}

function formatConversation(messages) {
  return messages
    .map(message => `${message.role === 'assistant' ? 'עוזר' : 'משתמש'}: ${message.content}`)
    .join('\n\n')
}

function buildBaseSystemPrompt(systemPrompt, knowledgeMode) {
  const base = systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT

  if (knowledgeMode === 'audit') {
    return `${base}

כאשר השאלה קשורה לביקורת אכ"א:
- ענה לפי סעיפי השאלון והמסמכים, הפרסומים, הנהלים והציוד שהמבקר בודק.
- אם המשתמש שואל "איך להיות תקין", החזר checklist ברור.
- אם יש פער, ציין מה חסר, מה צריך לתעד, מי צריך לאשר, ומה נדרש לפרסם או להחזיק ביחידה.`
  }

  return `${base}

כאשר השאלה קשורה להלכות פסח:
- ענה תשובה מעשית ולא רק עקרונית.
- תן שלבים לביצוע כשהדבר מתאים.
- אם מדובר בשאלה מורכבת או מסופקת, ציין זאת במפורש.
- בסוף כל תשובה הוסף: "בכל ספק — פנה לרב היחידה."`
}

function buildKnowledgeBlock(knowledgeLabel, knowledgeContext) {
  if (!knowledgeContext) {
    return 'לא נמצאו קטעים תואמים במאגר הידע. אם המידע חסר, אמור זאת במפורש ואל תמציא.'
  }

  return `מאגר ידע רלוונטי מתוך: ${knowledgeLabel}

${knowledgeContext}`
}

function buildPrimaryPrompt({ messages, knowledgeLabel, knowledgeContext }) {
  return `שיחה אחרונה:
${formatConversation(messages)}

${buildKnowledgeBlock(knowledgeLabel, knowledgeContext)}

הנחיות:
- ענה בעברית.
- תן תשובה מלאה ולא חצי תשובה.
- הישען קודם כל על מאגר הידע שסופק.
- אם חסר מידע, אמור בקצרה מה לא ניתן לקבוע.`
}

function buildReviewerPrompt({ messages, knowledgeLabel, knowledgeContext, draft }) {
  return `שאלה ושיחה:
${formatConversation(messages)}

${buildKnowledgeBlock(knowledgeLabel, knowledgeContext)}

טיוטת Gemini:
${draft}

הנחיות למשיב הסופי:
- הפק תשובה סופית אחת, שלמה, קוהרנטית ולא חוזרת על עצמה.
- השלם פרטים חסרים רק אם הם נתמכים על ידי מאגר הידע.
- אם Gemini פספס checklist או שלבים חשובים, הוסף אותם.
- אם אין בסיס מספיק, כתוב במפורש שחסר בסיס בשאלון או במאגר.`
}

function extractGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map(part => part?.text || '')
    .join('')
    .trim()
}

function extractOpenAIText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim()
  }

  const parts = data?.output
    ?.flatMap(item => item?.content || [])
    ?.filter(content => content?.type === 'output_text')
    ?.map(content => content?.text || '')
    ?.join('')
    .trim()

  return parts || ''
}

async function callGemini({ systemPrompt, userPrompt, temperature = 0.1, maxOutputTokens = 900 }) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY לא מוגדר')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature, maxOutputTokens },
      }),
    }
  )

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || `שגיאה מ-Gemini (${response.status})`)
  }

  return extractGeminiText(data)
}

async function callOpenAI({ systemPrompt, userPrompt, maxOutputTokens = 900 }) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY לא מוגדר')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      reasoning: { effort: 'medium' },
      instructions: systemPrompt,
      input: [{
        role: 'user',
        content: [{ type: 'input_text', text: userPrompt }],
      }],
      max_output_tokens: maxOutputTokens,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data?.error?.message || `שגיאה מ-OpenAI (${response.status})`)
  }

  return extractOpenAIText(data)
}

async function answerWithSingleProvider({ provider, systemPrompt, userPrompt }) {
  if (provider === 'openai') {
    return callOpenAI({ systemPrompt, userPrompt })
  }
  return callGemini({ systemPrompt, userPrompt })
}

async function generateChatReply({ messages, systemPrompt, knowledgeMode, useDualAI }) {
  const lastUserMessage = getLastUserMessage(messages)
  const context = buildKnowledgeContext(knowledgeMode, lastUserMessage)
  const baseSystemPrompt = buildBaseSystemPrompt(systemPrompt, context.knowledgeMode)
  const primaryPrompt = buildPrimaryPrompt({
    messages,
    knowledgeLabel: context.knowledgeLabel,
    knowledgeContext: context.knowledgeContext,
  })

  const hasGemini = Boolean(process.env.GEMINI_API_KEY)
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY)

  if (!hasGemini && !hasOpenAI) {
    throw new Error('לא הוגדרו מפתחות API ל-Gemini או ל-OpenAI')
  }

  if (useDualAI && hasGemini && hasOpenAI) {
    const draft = await callGemini({
      systemPrompt: `${baseSystemPrompt}

אתה המנוע הראשוני. המשימה שלך היא להפיק טיוטה מלאה, מדויקת וקצרה יחסית, בלי להמציא.`,
      userPrompt: primaryPrompt,
    })

    const finalText = await callOpenAI({
      systemPrompt: `${baseSystemPrompt}

אתה המנוע המשלים והמבקר הסופי. קבל טיוטת Gemini, בדוק שלמות, סדר ובהירות, והפק תשובה סופית אחת.`,
      userPrompt: buildReviewerPrompt({
        messages,
        knowledgeLabel: context.knowledgeLabel,
        knowledgeContext: context.knowledgeContext,
        draft,
      }),
    })

    return {
      text: finalText || draft || 'לא התקבלה תשובה',
      meta: {
        task: 'chat',
        knowledgeMode: context.knowledgeMode,
        knowledgeLabel: context.knowledgeLabel,
        providers: ['gemini', 'openai'],
      },
    }
  }

  const provider = hasGemini ? 'gemini' : 'openai'
  const text = await answerWithSingleProvider({
    provider,
    systemPrompt: baseSystemPrompt,
    userPrompt: primaryPrompt,
  })

  return {
    text: text || 'לא התקבלה תשובה',
    meta: {
      task: 'chat',
      knowledgeMode: context.knowledgeMode,
      knowledgeLabel: context.knowledgeLabel,
      providers: [provider],
    },
  }
}

async function generateClassification({ messages, systemPrompt }) {
  const prompt = getLastUserMessage(messages)
  const finalSystemPrompt = (systemPrompt || CLASSIFICATION_SYSTEM_PROMPT).trim()
  const provider = process.env.OPENAI_API_KEY ? 'openai' : 'gemini'

  const text = await answerWithSingleProvider({
    provider,
    systemPrompt: finalSystemPrompt,
    userPrompt: `${prompt}\n\nענה במילה אחת בלבד.`,
  })

  return {
    text: text || '',
    meta: {
      task: 'classify',
      providers: [provider],
      knowledgeMode: 'none',
    },
  }
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const messages = normalizeMessages(body?.messages)
    const task = body?.task === 'classify' ? 'classify' : 'chat'
    const knowledgeMode = body?.knowledgeMode || 'auto'
    const useDualAI = body?.useDualAI !== false
    const systemPrompt = typeof body?.systemPrompt === 'string' ? body.systemPrompt : ''

    if (!messages.length) {
      return jsonResponse({ text: '', error: 'לא התקבלה שאלה לעיבוד' }, 400)
    }

    const result = task === 'classify'
      ? await generateClassification({ messages, systemPrompt })
      : await generateChatReply({ messages, systemPrompt, knowledgeMode, useDualAI })

    return jsonResponse(result)
  } catch (error) {
    return jsonResponse({
      text: `❌ ${error.message}`,
      error: error.message,
    }, 500)
  }
}
