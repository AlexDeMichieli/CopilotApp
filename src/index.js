import express from 'express';
import { Octokit } from '@octokit/rest';
import bodyParser from 'body-parser';
import fetch from 'node-fetch'; // Use built-in fetch for Node.js 18+

const app = express();
const PORT = process.env.PORT || 5010;

const yourGitHubAppName = 'chatbot-alex-test';
const githubCopilotCompletionsUrl = 'https://api.githubcopilot.com/chat/completions';

app.use(bodyParser.json());

// GET "/"
app.get('/', (req, res) => {
  res.send('Hello Copilot!');
});

// POST "/agent"
app.post('/agent', async (req, res) => {
  const githubToken = req.header('X-GitHub-Token');
  let userRequest = req.body;

  if (!githubToken) {
    console.error('GitHub token is missing.');
    return res.status(400).send('GitHub token is missing.');
  }

  try {
    const octokit = new Octokit({ auth: githubToken });

    // Get authenticated user info
    const { data: user } = await octokit.rest.users.getAuthenticated();

    // Simplify the messages array
    userRequest.messages = [
      {
        role: 'system',
        content: `Start every response with the user's name, which is @${user.login}`,
      },
      {
        role: 'system',
        content: 'You are a helpful assistant that replies as if you were Blackbeard the Pirate.',
      },
      ...userRequest.messages.filter(msg => msg.role && msg.content) // Filter out invalid messages
    ];

    // Ensure only necessary fields are sent
    const payload = {
      messages: userRequest.messages,
      stream: true,
    };

    // Log the payload for debugging
    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Send the request to the Copilot API
    const response = await fetch(githubCopilotCompletionsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body: ${responseText}`);

    if (!response.ok) {
      return res.status(response.status).send(`Error from Copilot API: ${responseText}`);
    }

    // Stream the response back to the client
    res.setHeader('Content-Type', 'application/json');
    res.send(responseText);
  } catch (error) {
    console.error('Error in /agent handler:', error);
    res.status(500).send('Internal Server Error.');
  }
});


// GET "/callback"
app.get('/callback', (req, res) => {
  res.send('You may close this tab and return to GitHub.com.');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`App running on http://localhost:${PORT}`);
});
