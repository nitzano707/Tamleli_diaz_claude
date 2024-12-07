const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { audioData, fileName } = JSON.parse(event.body);

    // יצירת URL מוחלט עבור PyannoteAI
    const PYANNOTE_API_URL = 'https://api.pyannote.ai';
    
    // צעד 1: יצירת media URL
    const mediaResponse = await fetch(`${PYANNOTE_API_URL}/v1/media/input`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `media://${fileName}`
      })
    });

    if (!mediaResponse.ok) {
      const error = await mediaResponse.text();
      throw new Error(`PyannoteAI media error: ${error}`);
    }

    const mediaData = await mediaResponse.json();
    
    // צעד 2: העלאת הקובץ
    const buffer = Buffer.from(audioData, 'base64');
    const formData = new FormData();
    formData.append('file', buffer, fileName);

    const uploadResponse = await fetch(mediaData.url, {
      method: 'PUT',
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload error: ${await uploadResponse.text()}`);
    }

    // צעד 3: יצירת משימת דיאריזציה
    const diarizeResponse = await fetch(`${PYANNOTE_API_URL}/v1/diarize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `media://${fileName}`,
        webhook: process.env.WEBHOOK_URL
      })
    });

    if (!diarizeResponse.ok) {
      throw new Error(`Diarization error: ${await diarizeResponse.text()}`);
    }

    const diarizeData = await diarizeResponse.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(diarizeData)
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
