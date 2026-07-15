import type { Handler } from '@netlify/functions'

const handler: Handler = async (event) => {
  const { queryStringParameters } = event
  const imageUrl = queryStringParameters?.url

  if (!imageUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing url parameter' }),
    }
  }

  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: `Failed to fetch image: ${response.status}` }),
      }
    }

    const contentType = response.headers.get('Content-Type') || 'image/png'
    const data = await response.arrayBuffer()
    const buffer = Buffer.from(data)

    const extension = contentType.includes('jpeg') ? 'jpg' : contentType.includes('png') ? 'png' : 'png'
    const filename = `wenyun_pattern_${Date.now()}.${extension}`

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to download image', message: error.message || 'Unknown error' }),
    }
  }
}

export { handler }