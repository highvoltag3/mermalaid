/**
 * AI-powered error fixer for Mermaid syntax errors
 */

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export async function fixMermaidErrorWithAI(
  code: string,
  errorMessage: string,
  apiKey: string
): Promise<string> {
  const systemPrompt = `You are a Mermaid syntax expert. Fix Mermaid diagram syntax errors while preserving the diagram's intent and structure. Return ONLY the corrected Mermaid code without any explanations, markdown formatting, or code blocks.`

  const userPrompt = `Fix this Mermaid syntax error:

Error: ${errorMessage}

Code:
${code}

Return ONLY the corrected Mermaid code:`

  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data: OpenAIResponse = await response.json()
    const fixedCode = data.choices[0]?.message?.content?.trim()
    
    console.log('AI Response received:', { fixedCode })
    
    if (!fixedCode) {
      throw new Error('No response from AI')
    }

    // Clean up any markdown code blocks if AI returned wrapped code
    const cleanedCode = fixedCode
      .replace(/^```mermaid\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()

    console.log('Cleaned code:', cleanedCode)
    
    return cleanedCode
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error occurred while calling OpenAI API')
  }
}

export function getStoredApiKey(): string | null {
  return localStorage.getItem('openai-api-key')
}

export function storeApiKey(apiKey: string): void {
  localStorage.setItem('openai-api-key', apiKey)
}

export function clearApiKey(): void {
  localStorage.removeItem('openai-api-key')
}

