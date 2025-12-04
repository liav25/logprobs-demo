/**
 * Logprobs Explorer - Token Probability Visualizer
 * Educational tool to visualize OpenAI token probabilities
 */

// ============================================
// State Management
// ============================================

const state = {
    apiKey: '',
    isLoading: false
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    promptInput: document.getElementById('prompt-input'),
    modelSelect: document.getElementById('model-select'),
    temperatureWrapper: document.getElementById('temperature-wrapper'),
    temperatureInput: document.getElementById('temperature-input'),
    submitBtn: document.getElementById('submit-btn'),
    apiKeyInput: document.getElementById('api-key-input'),
    clearKeyBtn: document.getElementById('clear-key-btn'),
    resultsSection: document.getElementById('results-section'),
    loading: document.getElementById('loading'),
    errorDisplay: document.getElementById('error-display')
};

// Models that don't support temperature parameter
const GPT5_MODELS = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano'];

// ============================================
// API Key Management
// ============================================

/**
 * Mask API key showing only first 10 characters
 */
function maskApiKey(key) {
    if (key.length <= 10) return key;
    return key.substring(0, 10) + '•'.repeat(Math.min(key.length - 10, 40));
}

/**
 * Load API key from localStorage
 */
function loadApiKey() {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
        state.apiKey = savedKey;
        elements.apiKeyInput.value = maskApiKey(savedKey);
        updateSubmitButton();
    }
}

/**
 * Save API key to localStorage
 */
function saveApiKey(key) {
    state.apiKey = key;
    localStorage.setItem('openai_api_key', key);
    updateSubmitButton();
}

/**
 * Clear API key from localStorage
 */
function clearApiKey() {
    state.apiKey = '';
    localStorage.removeItem('openai_api_key');
    elements.apiKeyInput.value = '';
    updateSubmitButton();
}

/**
 * Handle API key input changes
 */
function handleApiKeyInput(e) {
    const value = e.target.value;
    
    // If user is pasting a new key (no dots), save it
    if (!value.includes('•')) {
        if (value.startsWith('sk-')) {
            saveApiKey(value);
            elements.apiKeyInput.value = maskApiKey(value);
        } else if (value === '') {
            clearApiKey();
        }
    }
}

// ============================================
// UI State Management
// ============================================

/**
 * Check if model supports temperature parameter
 */
function modelSupportsTemperature(model) {
    return !GPT5_MODELS.some(gpt5 => model.startsWith(gpt5));
}

/**
 * Update temperature field visibility based on selected model
 */
function updateTemperatureVisibility() {
    const model = elements.modelSelect.value;
    const supportsTemp = modelSupportsTemperature(model);
    
    if (supportsTemp) {
        elements.temperatureWrapper.classList.add('visible');
    } else {
        elements.temperatureWrapper.classList.remove('visible');
    }
}

/**
 * Validate temperature input (0-2)
 */
function validateTemperature() {
    const value = parseFloat(elements.temperatureInput.value);
    const isValid = !isNaN(value) && value >= 0 && value <= 2;
    
    if (isValid) {
        elements.temperatureInput.classList.remove('invalid');
    } else {
        elements.temperatureInput.classList.add('invalid');
    }
    
    return isValid;
}

/**
 * Get current temperature value (validated)
 */
function getTemperature() {
    const model = elements.modelSelect.value;
    if (!modelSupportsTemperature(model)) {
        return undefined; // Don't send temperature for GPT-5 models
    }
    
    const value = parseFloat(elements.temperatureInput.value);
    if (isNaN(value) || value < 0 || value > 2) {
        return 0; // Default to 0 if invalid
    }
    return value;
}

/**
 * Update submit button state based on inputs
 */
function updateSubmitButton() {
    const hasPrompt = elements.promptInput.value.trim().length > 0;
    const hasApiKey = state.apiKey.length > 0;
    const validTemp = !modelSupportsTemperature(elements.modelSelect.value) || validateTemperature();
    elements.submitBtn.disabled = !hasPrompt || !hasApiKey || !validTemp || state.isLoading;
}

/**
 * Show loading state
 */
function showLoading() {
    state.isLoading = true;
    elements.loading.classList.remove('hidden');
    elements.submitBtn.disabled = true;
}

/**
 * Hide loading state
 */
function hideLoading() {
    state.isLoading = false;
    elements.loading.classList.add('hidden');
    updateSubmitButton();
}

/**
 * Show error message
 */
function showError(message) {
    elements.errorDisplay.textContent = message;
    elements.errorDisplay.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideError() {
    elements.errorDisplay.classList.add('hidden');
}

// ============================================
// OpenAI API Integration
// ============================================

/**
 * Get completion from OpenAI with logprobs
 */
async function getCompletionWithLogprobs(prompt, model, temperature) {
    const requestBody = {
        model: model,
        messages: [
            {
                role: 'system',
                content: 'Complete the following sentence with factual information.'
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        max_tokens: 30,
        logprobs: true
    };
    
    // Only include temperature for models that support it
    if (temperature !== undefined) {
        requestBody.temperature = temperature;
    }
    
    console.log('=== API Request ===');
    console.log('Model:', model);
    console.log('Temperature:', temperature);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    console.log('=== API Response ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
        const error = await response.json();
        console.log('Error response:', JSON.stringify(error, null, 2));
        throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    console.log('Success response:', JSON.stringify(data, null, 2));
    return data;
}

// ============================================
// Probability Calculations
// ============================================

/**
 * Extract token probabilities from API response
 */
function extractTokenProbabilities(logprobs) {
    if (!logprobs || !logprobs.content) return [];
    
    return logprobs.content.map(tokenInfo => ({
        token: tokenInfo.token,
        probability: Math.pow(2, tokenInfo.logprob),
        logprob: tokenInfo.logprob
    }));
}

/**
 * Calculate sequence log-probability stats
 */
function calculateSeqLogprob(logprobs) {
    if (!logprobs || !logprobs.content || logprobs.content.length === 0) {
        return null;
    }
    
    const tokenLogprobs = logprobs.content.map(t => t.logprob);
    const numTokens = tokenLogprobs.length;
    const sumLogprob = tokenLogprobs.reduce((a, b) => a + b, 0);
    const avgLogprob = sumLogprob / numTokens;
    const perplexity = Math.exp(-avgLogprob);
    const avgProbability = Math.pow(2, avgLogprob);
    
    return {
        avgLogprob,
        avgProbability,
        perplexity,
        numTokens,
        sumLogprob
    };
}

/**
 * Get color based on probability (confidence level)
 */
function getColorForProbability(prob) {
    if (prob >= 0.8) return '#28a745';  // Green - high confidence
    if (prob >= 0.5) return '#ffc107';  // Yellow - medium confidence
    if (prob >= 0.2) return '#fd7e14';  // Orange - low confidence
    return '#dc3545';                    // Red - very low confidence
}

// ============================================
// Visualization Rendering
// ============================================

/**
 * Format token for display (handle special characters)
 */
function formatTokenDisplay(token) {
    if (token === ' ' || token === '') return '␣';
    if (token === '\n') return '↵';
    return token.replace(/ /g, '&nbsp;');
}

/**
 * Render token visualization
 */
function renderTokenVisualization(prompt, model, temperature, completion, tokens, seqStats) {
    const seqColor = seqStats ? getColorForProbability(seqStats.avgProbability) : '#dc3545';
    
    const tokensHTML = tokens.map(t => {
        const color = getColorForProbability(t.probability);
        const displayToken = formatTokenDisplay(t.token);
        const heightPercent = (t.probability * 100).toFixed(1);
        
        return `
            <div class="token-item">
                <div class="token-text">${displayToken}</div>
                <div class="token-bar-container">
                    <div class="token-bar" style="background: ${color}; height: ${heightPercent}%;"></div>
                </div>
                <div class="token-prob">${(t.probability * 100).toFixed(1)}%</div>
            </div>
        `;
    }).join('');
    
    const seqLogprobHTML = seqStats ? `
        <div class="seq-logprob-section" style="border-left-color: ${seqColor};">
            <div class="seq-logprob-label">Seq-Logprob (Overall Confidence)</div>
            <div class="seq-logprob-content">
                <div class="seq-logprob-value">${seqStats.avgLogprob.toFixed(4)}</div>
                <div class="seq-logprob-bar">
                    <div class="seq-logprob-bar-fill" style="background: ${seqColor}; width: ${(seqStats.avgProbability * 100).toFixed(1)}%;"></div>
                </div>
                <div class="seq-logprob-percent">${(seqStats.avgProbability * 100).toFixed(1)}% avg prob</div>
            </div>
            <div class="seq-logprob-meta">
                Seq-Logprob = (1/L) × Σ logprob(token_k) where L = ${seqStats.numTokens} tokens | Perplexity = ${seqStats.perplexity.toFixed(2)}
            </div>
        </div>
    ` : '';
    
    const tempDisplay = temperature !== undefined ? ` | <strong>Temperature:</strong> ${temperature}` : '';
    
    return `
        <div class="token-viz-card">
            <div class="token-viz-header">
                <div class="token-viz-prompt"><strong>Prompt:</strong> ${escapeHtml(prompt)}</div>
                <div class="token-viz-prompt"><strong>Model:</strong> ${model}${tempDisplay}</div>
            </div>
            ${seqLogprobHTML}
            <div class="token-grid">
                ${tokensHTML}
            </div>
            <div class="complete-text">
                <div class="complete-text-label">Complete Response</div>
                ${escapeHtml(completion)}
            </div>
        </div>
    `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// Main Submit Handler
// ============================================

async function handleSubmit() {
    const prompt = elements.promptInput.value.trim();
    const model = elements.modelSelect.value;
    const temperature = getTemperature();
    
    if (!prompt || !state.apiKey) return;
    
    // Validate temperature if applicable
    if (modelSupportsTemperature(model) && !validateTemperature()) {
        showError('Temperature must be between 0 and 2');
        return;
    }
    
    hideError();
    showLoading();
    
    try {
        const response = await getCompletionWithLogprobs(prompt, model, temperature);
        const choice = response.choices[0];
        const completion = choice.message.content;
        const logprobs = choice.logprobs;
        
        const tokens = extractTokenProbabilities(logprobs);
        const seqStats = calculateSeqLogprob(logprobs);
        
        const vizHTML = renderTokenVisualization(prompt, model, temperature, completion, tokens, seqStats);
        
        // Prepend new result (most recent at top)
        elements.resultsSection.insertAdjacentHTML('afterbegin', vizHTML);
        
    } catch (error) {
        showError(`Error: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// ============================================
// Event Listeners
// ============================================

function initEventListeners() {
    // Prompt input
    elements.promptInput.addEventListener('input', updateSubmitButton);
    elements.promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    });
    
    // Model select - update temperature visibility
    elements.modelSelect.addEventListener('change', () => {
        updateTemperatureVisibility();
        updateSubmitButton();
    });
    
    // Temperature input - validate on change
    elements.temperatureInput.addEventListener('input', () => {
        validateTemperature();
        updateSubmitButton();
    });
    
    // API key input
    elements.apiKeyInput.addEventListener('input', handleApiKeyInput);
    elements.apiKeyInput.addEventListener('paste', (e) => {
        // Handle paste event for API key
        setTimeout(() => handleApiKeyInput({ target: elements.apiKeyInput }), 0);
    });
    
    // Clear API key button
    elements.clearKeyBtn.addEventListener('click', clearApiKey);
    
    // Submit button
    elements.submitBtn.addEventListener('click', handleSubmit);
}

// ============================================
// Initialize App
// ============================================

function init() {
    loadApiKey();
    initEventListeners();
    updateTemperatureVisibility();
    updateSubmitButton();
}

// Start the app
init();

