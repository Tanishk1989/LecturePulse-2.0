/** Leave headroom below GPT-OSS's free-tier 8K token/minute budget. */
export function chatBudget(model: string, system: string, user: string, requested = 4096) {
  const requestedTokens = Math.max(128, Math.min(4096, Math.floor(requested)))
  if (!/^openai\/gpt-oss-(20|120)b$/.test(model)) return {max_completion_tokens: requestedTokens}
  const text = system + user
  const unicode = Array.from(text).filter(char => char.codePointAt(0)! > 127).length
  const inputEstimate = Math.ceil((text.length - unicode) / 3 + unicode * 2)
  return {
    max_completion_tokens: Math.max(128, Math.min(requestedTokens, 7600 - inputEstimate)),
    reasoning_effort: 'low' as const,
  }
}
