export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        listIds: [2],
        updateEnabled: true,
      }),
    });

    // 204 = contact already existed and was updated, 201 = created — both are success
    if (response.status === 201 || response.status === 204) {
      return res.status(200).json({ ok: true });
    }

    const data = await response.json();
    // Brevo returns 400 with code "duplicate_parameter" when contact already exists in list
    if (data.code === 'duplicate_parameter') {
      return res.status(200).json({ ok: true });
    }

    console.error('Brevo error:', data);
    return res.status(500).json({ error: 'Failed to subscribe' });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
