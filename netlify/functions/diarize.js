const fetch = require('node-fetch');
const FormData = require('form-data');

// הגדרת קבועים
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const PYANNOTE_API_URL = 'https://api.pyannote.ai/v1';
const MEDIA_ID = 'tamlelitest1'; // מזהה קבוע לכל הבקשות

exports.handler = async (event, context) => {
    console.log('Diarization function started');

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // קבלת המידע מהבקשה
        let requestData;
        try {
            requestData = JSON.parse(event.body);
        } catch (error) {
            console.error('Error parsing request body:', error);
            throw new Error('Invalid JSON in request body');
        }

        const { audioData, fileName, fileSize } = requestData;
        console.log('Processing file:', fileName, 'Size:', fileSize, 'bytes');

        // בדיקות תקינות
        if (!audioData) throw new Error('No audio data provided');
        if (!fileName) throw new Error('No file name provided');
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
        }

        // בדיקת הגדרות
        if (!process.env.PYANNOTE_API_KEY) throw new Error('PYANNOTE_API_KEY not configured');
        if (!process.env.WEBHOOK_URL) throw new Error('WEBHOOK_URL not configured');

        // 1. יצירת URL להעלאה
        console.log('Requesting upload URL from PyannoteAI');
        const mediaResponse = await fetch(`${PYANNOTE_API_URL}/media/input`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: `media://${MEDIA_ID}`
            })
        });

        if (!mediaResponse.ok) {
            const errorText = await mediaResponse.text();
            console.error('Media URL error response:', errorText);
            throw new Error(`Failed to get upload URL: ${errorText}`);
        }

        const mediaData = await mediaResponse.json();
        console.log('Received upload URL successfully');

        // 2. העלאת הקובץ
        console.log('Starting file upload');
        let buffer;
        try {
            buffer = Buffer.from(audioData, 'base64');
        } catch (error) {
            throw new Error('Failed to decode audio data: ' + error.message);
        }

        const formData = new FormData();
        formData.append('file', buffer, {
            filename: fileName,
            contentType: 'audio/mpeg'
        });

        const uploadResponse = await fetch(mediaData.url, {
            method: 'PUT',
            body: formData
        });

        if (!uploadResponse.ok) {
            const uploadError = await uploadResponse.text();
            console.error('Upload error response:', uploadError);
            throw new Error(`Upload failed: ${uploadError}`);
        }

        console.log('File uploaded successfully');

        // 3. יצירת משימת דיאריזציה
        console.log('Initiating diarization task');
        const diarizeResponse = await fetch(`${PYANNOTE_API_URL}/diarize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: `media://${MEDIA_ID}`,
                webhook: process.env.WEBHOOK_URL
            })
        });

        if (!diarizeResponse.ok) {
            const diarizeError = await diarizeResponse.text();
            console.error('Diarization error response:', diarizeError);
            throw new Error(`Diarization request failed: ${diarizeError}`);
        }

        const diarizeData = await diarizeResponse.json();
        console.log('Diarization job created successfully:', diarizeData.jobId);

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
