import { groqChatCompletion } from '../_shared/groq.ts'
import { serveProtectedFunction } from '../_shared/handler.ts'
import { jsonResponse } from '../_shared/cors.ts'

serveProtectedFunction('groq-chat', 60, async (req) => {
  const body = await req.json()
  const systemPrompt = body.systemPrompt
  const userPrompt = body.userPrompt
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.4
  const model = typeof body.model === 'string' ? body.model : undefined

  if (!systemPrompt || !userPrompt) {
    return jsonResponse({ error: 'systemPrompt and userPrompt are required.' }, 400)
  }

  const content = await groqChatCompletion(systemPrompt, userPrompt, { temperature, model })
  return jsonResponse({ content })
})
