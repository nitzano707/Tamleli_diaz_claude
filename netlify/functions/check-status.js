const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    console.log('Check status function started');

    // בדיקה שזו בקשת GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        // קבלת מזהה העבודה מפרמטרי ה-URL
        const params = new URLSearchParams(event.rawQuery);
        const jobId = params.get('jobId');

        if (!jobId) {
            throw new Error('No jobId provided');
        }

        // בדיקת מפתח ה-API
        if (!process.env.PYANNOTE_API_KEY) {
            throw new Error('PYANNOTE_API_KEY not configured');
        }

        console.log('Checking status for job:', jobId);

        // בדיקת סטטוס העבודה מול PyannoteAI
        const response = await fetch(`https://api.pyannote.ai/v1/jobs/${jobId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.PYANNOTE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Status check error:', errorText);
            throw new Error(`PyannoteAI status check error: ${errorText}`);
        }

        const data = await response.json();
        console.log('Job status:', data.status);

        // אם העבודה הסתיימה בהצלחה, מחזירים את התוצאות
        if (data.status === 'succeeded') {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'succeeded',
                    results: data.output.diarization
                })
            };
        }

        // אם העבודה נכשלה
        if (data.status === 'failed') {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    status: 'failed',
                    error: data.error || 'Unknown error'
                })
            };
        }

        // אם העבודה עדיין בתהליך
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'pending',
                message: 'Job is still processing'
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
