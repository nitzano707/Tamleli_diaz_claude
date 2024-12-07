const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
    console.log('Function started');
  
    try {
        console.log('Parsing request body');
        const { audioData, fileName } = JSON.parse(event.body);
        console.log('File name:', fileName);

        if (!process.env.PYANNOTE_API_KEY) {
            throw new Error('PYANNOTE_API_KEY not configured');
        }

        // 1. קבלת URL להעלאה
        console.log('Requesting upload URL');
        const mediaResponse = await fetch('https://api.pyannote.ai/v1/media/input', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: `media://temp_${Date.now()}`  // שימוש במזהה זמני
            })
        });

        console.log('Media Response Status:', mediaResponse.status);
        const mediaData = await mediaResponse.json();
        console.log('Got upload URL:', mediaData.url);

        // 2. העלאת הקובץ ל-URL שקיבלנו
        const buffer = Buffer.from(audioData, 'base64');
        const formData = new FormData();
        formData.append('file', buffer, fileName);

        const uploadResponse = await fetch(mediaData.url, {
            method: 'PUT',
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed with status ${uploadResponse.status}`);
        }

        // 3. יצירת משימת דיאריזציה עם ה-URL המקורי
        const diarizeResponse = await fetch('https://api.pyannote.ai/v1/diarize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: mediaData.url,  // שימוש ב-URL שקיבלנו מהשרת
                webhook: process.env.WEBHOOK_URL
            })
        });

        const diarizeData = await diarizeResponse.json();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
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
                error: error.message
            })
        };
    }
};
