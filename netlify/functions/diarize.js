const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  // בדיקה שהבקשה היא POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    const { audioData, fileName } = JSON.parse(event.body);

    // צעד 1: יצירת media URL
    const mediaResponse = await fetch('https://api.pyannote.ai/v1/media/input', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `media://${fileName}`
      })
    });

    const mediaData = await mediaResponse.json();
    
    // צעד 2: העלאת הקובץ
    const formData = new FormData();
    formData.append('file', Buffer.from(audioData, 'base64'), fileName);

    await fetch(mediaData.url, {
      method: 'PUT',
      body: formData
    });

    // צעד 3: יצירת משימת דיאריזציה
    const diarizeResponse = await fetch('https://api.pyannote.ai/v1/diarize', {
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

    const diarizeData = await diarizeResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify(diarizeData)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
