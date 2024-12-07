const fetch = require('node-fetch');
const FormData = require('form-data');

exports.handler = async (event, context) => {
    console.log('Diarization function started');

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // חילוץ המידע מהבקשה
        const { audioData, fileName } = JSON.parse(event.body);
        console.log('Processing file:', fileName);

        // בדיקת API key
        if (!process.env.PYANNOTE_API_KEY) {
            throw new Error('PYANNOTE_API_KEY not configured');
        }

        // בדיקת webhook URL
        if (!process.env.WEBHOOK_URL) {
            throw new Error('WEBHOOK_URL not configured');
        }

        // 1. קבלת URL להעלאה
        console.log('Requesting upload URL from PyannoteAI');
        const mediaResponse = await fetch('https://api.pyannote.ai/v1/media/input', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'media://nitzantry1'
            })
        });

        if (!mediaResponse.ok) {
            const errorText = await mediaResponse.text();
            console.error('Media URL error:', errorText);
            throw new Error(`PyannoteAI media error: ${errorText}`);
        }

        const mediaData = await mediaResponse.json();
        console.log('Received upload URL:', mediaData.url);

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
            console.error('Upload error:', uploadError);
            throw new Error(`Upload error: ${uploadError}`);
        }

        console.log('File uploaded successfully');

        // 3. יצירת משימת דיאריזציה
        console.log('Starting diarization task');
        const diarizeResponse = await fetch('https://api.pyannote.ai/v1/diarize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: 'media://nitzantry1',
                webhook: process.env.WEBHOOK_URL
            })
        });

        if (!diarizeResponse.ok) {
            const diarizeError = await diarizeResponse.text();
            console.error('Diarization error:', diarizeError);
            throw new Error(`Diarization error: ${diarizeError}`);
        }

        const diarizeData = await diarizeResponse.json();
        console.log('Diarization job created:', diarizeData);

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
                stack: error.stack
            })
        };
    }
};
