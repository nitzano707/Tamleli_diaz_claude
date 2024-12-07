const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
    console.log('Function started');
  
    try {
        console.log('Parsing request body');
        const { audioData, fileName } = JSON.parse(event.body);
        
        // 1. יצירת media URL פשוט
        const mediaUrlRequest = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'media://nitzantry1'  // URL פשוט כמו בדוגמה
            })
        };

        console.log('Requesting media URL...');
        const mediaResponse = await fetch('https://api.pyannote.ai/v1/media/input', mediaUrlRequest);

        if (!mediaResponse.ok) {
            const errorText = await mediaResponse.text();
            console.error('Media URL error:', errorText);
            throw new Error(errorText);
        }

        const mediaData = await mediaResponse.json();
        console.log('Media URL response:', mediaData);

        // 2. העלאת הקובץ
        console.log('Uploading file...');
        const buffer = Buffer.from(audioData, 'base64');
        const formData = new FormData();
        formData.append('file', buffer, fileName);

        const uploadResponse = await fetch(mediaData.url, {
            method: 'PUT',
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload error: ${errorText}`);
        }

        // 3. יצירת משימת דיאריזציה
        const diarizeRequest = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'media://nitzantry1',  // שימוש באותו URL פשוט
                webhook: process.env.WEBHOOK_URL
            })
        };

        const diarizeResponse = await fetch('https://api.pyannote.ai/v1/diarize', diarizeRequest);

        if (!diarizeResponse.ok) {
            const errorText = await diarizeResponse.text();
            throw new Error(`Diarization error: ${errorText}`);
        }

        const diarizeData = await diarizeResponse.json();
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'success',
                message: 'Diarization process started',
                jobId: diarizeData.jobId,
                uploadUrl: mediaData.url
            })
        };

    } catch (error) {
        console.error('Function error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message,
                details: error.stack
            })
        };
    }
};
