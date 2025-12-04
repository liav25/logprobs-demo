# Logprobs Explorer

A client-side web app that visualizes OpenAI token probabilities to help understand model confidence and detect potential hallucinations.

## Features

- **Token Probability Visualization**: See individual token confidence with color-coded bars
- **Seq-Logprob Analysis**: Overall sequence confidence metric for hallucination detection
- **Multiple Models**: Support for GPT-3.5 Turbo, GPT-4o, GPT-4o Mini, and GPT-4 Turbo
- **Client-Side Only**: Your API key stays in your browser (localStorage)

## How It Works

When you send a prompt, the app requests a completion from OpenAI with `logprobs: true`. This returns the log-probability for each generated token, which indicates how confident the model was when generating that token.

### Confidence Colors

| Color | Probability | Meaning |
|-------|-------------|---------|
| 🟢 Green | > 80% | High confidence |
| 🟡 Yellow | 50-80% | Medium confidence |
| 🟠 Orange | 20-50% | Low confidence |
| 🔴 Red | < 20% | Very low confidence (likely hallucination) |

### Seq-Logprob

The sequence log-probability (Seq-Logprob) is the average of all token log-probabilities:

```
Seq-Logprob = (1/L) × Σ logprob(token_k)
```

Lower values (more negative) suggest the model is less confident about the entire response, potentially indicating hallucination.

## Local Development

Simply open `index.html` in your browser. No build step required.

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```

Then visit `http://localhost:8000`

## Deployment to GitHub Pages

1. Push this repository to GitHub
2. Go to repository **Settings** → **Pages**
3. Under "Source", select **Deploy from a branch**
4. Choose **main** branch and **/ (root)** folder
5. Click **Save**

Your app will be live at `https://yourusername.github.io/logprobs_demo/`

## File Structure

```
logprobs_demo/
├── index.html    # Main HTML structure
├── styles.css    # Gemini-style UI styling
├── app.js        # Core logic and API integration
└── README.md     # This file
```

## Security Note

Your OpenAI API key is stored in your browser's localStorage and is only sent directly to OpenAI's API. It never touches any other server. However, for production use cases, consider implementing a backend proxy to avoid exposing your API key in client-side code.

## License

MIT

