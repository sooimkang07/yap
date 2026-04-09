export function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY)
}

export function openAIHeaders(contentType?: string) {
  const headers = new Headers({
    Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
  })

  if (contentType) headers.set('Content-Type', contentType)
  return headers
}

export async function parseOpenAIError(response: Response) {
  const text = await response.text()

  try {
    const json = JSON.parse(text) as { error?: { message?: string } }
    return json.error?.message ?? text
  } catch {
    return text || `OpenAI request failed with ${response.status}`
  }
}
