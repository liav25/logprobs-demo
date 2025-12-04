"""
Logprobs Demo - Token Probability Visualizer

Visualize OpenAI token probabilities to understand model confidence
and detect potential hallucinations.

Usage:
    python logprobs_demo.py
"""

import math
from openai import OpenAI
from typing import Dict, Any, List

# ============================================
# Configuration
# ============================================

OPENAI_API_KEY = "YOUR_API_KEY_HERE"

# ============================================
# Core Functions
# ============================================


def get_completion_with_logprobs(
    client: OpenAI, prompt: str, temperature: float = 1, model: str = "gpt-4o-mini"
) -> Dict[str, Any]:
    """Get completion from OpenAI with logprobs for confidence analysis."""
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "Complete the following sentence with factual information.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        max_tokens=30,
        logprobs=True,
    )

    return {
        "completion": response.choices[0].message.content,
        "logprobs": response.choices[0].logprobs,
    }


def extract_token_probabilities(logprobs_data) -> List[Dict]:
    """Extract tokens and their probabilities from logprobs data."""
    if not logprobs_data or not logprobs_data.content:
        return []

    tokens = []
    for token_info in logprobs_data.content:
        prob = 2**token_info.logprob
        tokens.append(
            {
                "token": token_info.token,
                "probability": prob,
                "logprob": token_info.logprob,
            }
        )

    return tokens


def calculate_seq_logprob(logprobs_data) -> Dict[str, Any]:
    """
    Calculate sequence log-probability stats.
    Seq-Logprob from Guerreiro et al. 2022
    """
    if not logprobs_data or not logprobs_data.content:
        return None

    token_logprobs = [t.logprob for t in logprobs_data.content]
    num_tokens = len(token_logprobs)
    sum_logprob = sum(token_logprobs)
    avg_logprob = sum_logprob / num_tokens

    # Clamp to avoid overflow
    clamped = max(min(-avg_logprob, 700), -700)
    perplexity = math.exp(clamped)

    return {
        "avg_logprob": avg_logprob,
        "avg_probability": 2**avg_logprob,
        "perplexity": perplexity,
        "num_tokens": num_tokens,
    }


# ============================================
# Terminal Visualization
# ============================================


def get_confidence_label(prob: float) -> str:
    """Get confidence label and color code for terminal."""
    if prob >= 0.8:
        return "HIGH", "\033[92m"  # Green
    elif prob >= 0.5:
        return "MED ", "\033[93m"  # Yellow
    elif prob >= 0.2:
        return "LOW ", "\033[91m"  # Light red
    else:
        return "VLOW", "\033[91m"  # Red


def print_bar(prob: float, width: int = 20) -> str:
    """Create a simple ASCII progress bar."""
    filled = int(prob * width)
    bar = "█" * filled + "░" * (width - filled)
    return bar


def print_token_analysis(
    prompt: str,
    model: str,
    temperature: float,
    completion: str,
    tokens: List[Dict],
    seq_stats: Dict,
):
    """Print token analysis in a formatted way."""
    reset = "\033[0m"
    bold = "\033[1m"
    dim = "\033[2m"

    print("\n" + "=" * 70)
    print(f"{bold}Prompt:{reset} {prompt}")
    print(f"{bold}Model:{reset} {model} | {bold}Temperature:{reset} {temperature}")
    print("=" * 70)

    # Seq-Logprob summary
    if seq_stats:
        label, color = get_confidence_label(seq_stats["avg_probability"])
        print(f"\n{bold}Overall Confidence (Seq-Logprob):{reset}")
        print(
            f"  {color}{print_bar(seq_stats['avg_probability'])}{reset} "
            f"{seq_stats['avg_probability']:.1%} avg | "
            f"logprob: {seq_stats['avg_logprob']:.4f} | "
            f"perplexity: {seq_stats['perplexity']:.2f}"
        )

    # Token-by-token analysis
    print(f"\n{bold}Token Analysis:{reset}")
    print(f"  {'Token':<15} {'Prob':>8} {'Logprob':>10}  Bar")
    print("  " + "-" * 55)

    for t in tokens:
        label, color = get_confidence_label(t["probability"])
        token_display = repr(t["token"])[1:-1]  # Remove quotes, show escapes
        if len(token_display) > 12:
            token_display = token_display[:12] + "…"

        print(
            f"  {token_display:<15} {color}{t['probability']:>7.1%}{reset} "
            f"{t['logprob']:>10.4f}  {color}{print_bar(t['probability'], 15)}{reset}"
        )

    # Complete response
    print(f"\n{bold}Complete Response:{reset}")
    print(f"  {dim}{completion}{reset}")
    print()


def analyze_prompt(
    client: OpenAI, prompt: str, model: str = "gpt-4o-mini", temperature: float = 0
):
    """Analyze a prompt and print results."""
    result = get_completion_with_logprobs(client, prompt, temperature, model)
    tokens = extract_token_probabilities(result["logprobs"])
    seq_stats = calculate_seq_logprob(result["logprobs"])

    print_token_analysis(
        prompt=prompt,
        model=model,
        temperature=temperature,
        completion=result["completion"],
        tokens=tokens,
        seq_stats=seq_stats,
    )


# ============================================
# Main
# ============================================

if __name__ == "__main__":
    # Initialize client
    if OPENAI_API_KEY == "YOUR_API_KEY_HERE":
        print("⚠️  Please set your OPENAI_API_KEY at the top of this file")
        exit(1)

    client = OpenAI(api_key=OPENAI_API_KEY)
    print("✅ OpenAI client initialized\n")

    # Example prompts to test

    prompt = (
        "In which episode of Friends Rachel shoves up a marshmallow in Monica's nose?"
    )

    analyze_prompt(client, prompt, model="gpt-4o-mini", temperature=1.1)
