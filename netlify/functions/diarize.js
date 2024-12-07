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

    // יצירת media-id ייחודי
    const mediaId = `media://${Date.now()}-${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // צעד 1: יצירת media URL
    const mediaResponse = await fetch('https://api.pyannote.ai/v1/media/input', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: mediaId  // שימוש במזהה בפורמט הנכון
      })
    });

    if (!mediaResponse.ok) {
      const error = await mediaResponse.text();
      console.error('Media response error:', error);
      throw new Error(`PyannoteAI media error: ${error}`);
    }

    const mediaData = await mediaResponse.json();
    console.log('Media response:', mediaData);
    
    // צעד 2: העלאת הקובץ
    const buffer = Buffer.from(audioData, 'base64');
    const formData = new FormData();
    formData.append('file', buffer, fileName);

    const uploadResponse = await fetch(mediaData.url, {
      method: 'PUT',
      body: formData
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error('Upload error:', uploadError);
      throw new Error(`Upload error: ${uploadError}`);
    }

    // צעד 3: יצירת משימת דיאריזציה
    const diarizeResponse = await fetch('https://api.pyannote.ai/v1/diarize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: mediaId,  // שימוש באותו מזהה
        webhook: process.env.WEBHOOK_URL
      })
    });

    if (!diarizeResponse.ok) {
      const diarizeError = await diarizeResponse.text();
      console.error('Diarize error:', diarizeError);
      throw new Error(`Diarization error: ${diarizeError}`);
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
