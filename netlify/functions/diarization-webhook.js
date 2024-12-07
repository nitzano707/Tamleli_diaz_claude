exports.handler = async (event, context) => {
  console.log('Webhook function called');

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    console.log('Received webhook data:', data);

    // בדיקה שקיבלנו את כל המידע הנדרש
    if (!data.jobId || !data.status) {
      throw new Error('Missing required fields in webhook data');
    }

    if (data.status === 'succeeded' && data.output && data.output.diarization) {
      // שמירת התוצאות או עדכון הממשק
      console.log('Diarization results:', data.output.diarization);

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Results processed successfully',
          results: data.output.diarization
        })
      };
    } else if (data.status === 'failed') {
      console.error('Diarization job failed:', data.error);
      throw new Error(`Job failed: ${data.error || 'Unknown error'}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Job status: ${data.status}` })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
