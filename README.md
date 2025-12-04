# Logprobs Explorer

**[Try the Web App →](https://yourusername.github.io/logprobs-demo/)**

Visualize OpenAI token probabilities to understand model confidence and detect potential hallucinations.

![Terminal Output](screenshot.png)

## Features

- **Token Probability Visualization**: See individual token confidence with color-coded output
- **Seq-Logprob Analysis**: Overall sequence confidence metric for hallucination detection
- **Multiple Models**: Works with GPT-4o, GPT-4o Mini, GPT-3.5 Turbo, and more

## Installation

```bash
pip install openai
```

## Usage

1. Open `logprobs_demo.py` and set your API key:

```python
OPENAI_API_KEY = "sk-your-key-here"
```

2. Run the script:

```bash
python logprobs_demo.py
```

## How It Works

When you send a prompt, the script requests a completion from OpenAI with `logprobs=True`. This returns the log-probability for each generated token, indicating how confident the model was.

### Confidence Colors

| Color | Probability | Meaning |
|-------|-------------|---------|
| 🟢 Green | > 80% | High confidence |
| 🟡 Yellow | 50-80% | Medium confidence |
| 🔴 Red | < 50% | Low confidence (potential hallucination) |

### Seq-Logprob

The sequence log-probability (Seq-Logprob) is the average of all token log-probabilities:

```
Seq-Logprob = (1/L) × Σ logprob(token_k)
```

Lower values (more negative) suggest the model is less confident about the entire response, potentially indicating hallucination.

## Customization

Edit the prompts at the bottom of `logprobs_demo.py`:

```python
prompts = [
    "Harry Potter's sister was named",
    "The capital of France is",
]

for prompt in prompts:
    for temp in [0, 1]:
        analyze_prompt(client, prompt, model="gpt-4o-mini", temperature=temp)
```

## License

MIT
