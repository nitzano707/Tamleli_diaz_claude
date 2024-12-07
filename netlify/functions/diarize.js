const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
  console.log('Function started');
  
  if (event.httpMethod !== 'POST') {
    console.log('Invalid method:', event.httpMethod);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('Parsing request body');
    const { audioData, fileName } = JSON.parse(event.body);
    console.log('File name:', fileName);

    // בדיקה שה-API key קיים
    if (!process.env.PYANNOTE_API_KEY) {
      throw new Error('PYANNOTE_API_KEY not configured');
    }

    // 1. יצירת media URL
    console.log('Creating media URL');
    const mediaResponse = await fetch('https://api.pyannote.ai/v1/media/input', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: `media://${fileName.replace(/[^a-zA-Z0-9]/g, '_')}`
      })
    });

    if (!mediaResponse.ok) {
      const mediaError = await mediaResponse.text();
      console.error('Media URL creation failed:', mediaError);
      throw new Error(`Media URL error: ${mediaError}`);
    }

    const mediaData = await mediaResponse.json();
    console.log('Media URL created:', mediaData);

    // 2. העלאת הקובץ
    console.log('Uploading audio file');
    const buffer = Buffer.from(audioData, 'base64');
    const formData = new FormData();
    formData.append('file', buffer, fileName);

    const uploadResponse = await fetch(mediaData.url, {
      method: 'PUT',
      body: formData
    });

    if (!uploadResponse.ok) {
      const uploadError = await uploadResponse.text();
      console.error('File upload failed:', uploadError);
      throw new Error(`Upload error: ${uploadError}`);
    }

    console.log('File uploaded successfully');

    // 3. יצירת משימת דיאריזציה
    console.log('Starting diarization');
    const diarizeResponse = await fetch('https://api.pyannote.ai/v1/diarize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: mediaData.url,
        webhook: process.env.WEBHOOK_URL
      })
    });

    if (!diarizeResponse.ok) {
      const diarizeError = await diarizeResponse.text();
      console.error('Diarization request failed:', diarizeError);
      throw new Error(`Diarization error: ${diarizeError}`);
    }

    const diarizeData = await diarizeResponse.json();
    console.log('Diarization job created:', diarizeData);

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Diarization process started',
        jobId: diarizeData.jobId
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack
      })
    };
  }
};
