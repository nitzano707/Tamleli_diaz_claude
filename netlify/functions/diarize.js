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

    // שימוש בשם קובץ מנוקה למזהה הקובץ
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, '');
    const mediaUrl = `media://${cleanFileName}`;

    console.log('Attempting to create media URL:', mediaUrl);

    // יצירת Media URL
    const mediaResponse = await fetch('https://api.pyannote.ai/v1/media/input', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: mediaUrl })
    });

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      console.error('Media creation error:', errorText);
      throw new Error(errorText);
    }

    const mediaData = await mediaResponse.json();
    console.log('Media URL created successfully:', mediaData);

    // שלב זה בינתיים מוחזר בהצלחה - נוסיף את השאר בהמשך
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'media_url_created',
        mediaUrl: mediaUrl
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      })
    };
  }
};
