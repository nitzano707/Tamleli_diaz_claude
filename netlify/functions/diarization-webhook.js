exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    // כאן נטפל בתוצאות הדיאריזציה
    // לדוגמה, נוכל לשמור אותן ב-database או לשלוח אותן לחזית דרך WebSocket

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'received' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
