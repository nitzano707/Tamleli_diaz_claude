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

        let mediaData;
        try {
            mediaData = JSON.parse(mediaResponseText);
        } catch (e) {
            throw new Error(`Failed to parse media response: ${mediaResponseText}`);
        }

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
            throw new Error(`Upload error: ${uploadError}`);
        }

        // 3. יצירת משימת דיאריזציה
        console.log('Starting diarization task');
        const diarizeResponse = await fetch('https://api.pyannote.ai/v1/diarize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: mediaUrl,
                webhook: process.env.WEBHOOK_URL
            })
        });

        const diarizeResponseText = await diarizeResponse.text();
        console.log('Diarize Response:', diarizeResponseText);

        if (!diarizeResponse.ok) {
            throw new Error(`Diarization error: ${diarizeResponseText}`);
        }

        let diarizeData;
        try {
            diarizeData = JSON.parse(diarizeResponseText);
        } catch (e) {
            throw new Error(`Failed to parse diarization response: ${diarizeResponseText}`);
        }

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
                error: error.message,
                stack: error.stack
            })
        };
    }
};
