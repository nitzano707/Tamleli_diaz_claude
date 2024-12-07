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

    // יצירת מזהה ייחודי לקובץ
    const timestamp = Date.now();
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, '');
    const mediaId = `object_${timestamp}_${cleanFileName}`;
    const mediaUrl = `media://${mediaId}`;

    console.log('Generated media URL:', mediaUrl);

    // 1. יצירת media URL
    console.log('Creating media URL request');
    const mediaResponse = await fetch('https://api.pyannote.ai/v1/media/input', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: mediaUrl })
    });

    const mediaResponseText = await mediaResponse.text();
    console.log('Media Response:', mediaResponseText);

    if (!mediaResponse.ok) {
      throw new Error(`Media URL error: ${mediaResponseText}`);
    }

    const mediaData = JSON.parse(mediaResponseText);
    console.log('Media URL created successfully:', mediaData);

    // המשך הקוד זהה...
