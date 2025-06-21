# Scorely AddedValue - AI-Powered LinkedIn Profile Ranking

A web application that uses AI to rank LinkedIn candidate profiles based on user-defined criteria.

## Features

- **Multi-step wizard** for data input, filtering, and ranking
- **AI-powered ranking** using OpenAI GPT-4
- **Interactive dashboard** with detailed candidate analysis
- **Feedback system** to improve AI accuracy
- **Export functionality** for results
- **User-friendly API key input** - no server configuration needed

## Quick Start

### 1. Deploy to Netlify

1. Push this code to a GitHub repository
2. Connect your repository to Netlify
3. Deploy the site

### 2. Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 3. Use the Application

1. **Step 1**: Upload CSV data or paste LinkedIn profiles
2. **Step 2**: Configure filters (hot signals, blacklisted companies, etc.)
3. **Step 3**: Set ranking criteria and weights
4. **Step 4**: Enter your OpenAI API key and start ranking

## How It Works

- **No server configuration required** - each user enters their own API key
- **Secure processing** - API keys are sent directly to Netlify functions
- **Local storage** - your API key is stored locally in the browser (never shared)
- **Real AI analysis** - uses OpenAI GPT-4 for intelligent profile ranking

## File Structure

- `ScorelyMVP.html` - Main application
- `ScorelyMVP.js` - Frontend logic
- `ScorelyMVP.css` - Styling
- `netlify/functions/rank_profiles.js` - Serverless function for AI ranking
- `package.json` - Dependencies for Netlify functions

## Troubleshooting

### "Invalid API key" Error
- Make sure your API key starts with `sk-`
- Check that you copied the entire key correctly
- Verify your OpenAI account has credits

### "Quota exceeded" Error
- Check your OpenAI account billing
- You may need to add payment method or purchase credits

### Ranking Not Working
- Ensure your CSV data is properly formatted
- Check the browser console for detailed error messages
- Verify your API key is valid and has credits

## Technical Details

- **Frontend**: Pure HTML/CSS/JavaScript (no build process required)
- **Backend**: Netlify Serverless Functions
- **AI**: OpenAI GPT-4 for profile analysis and ranking
- **Deployment**: GitHub + Netlify (automatic deployments)
- **Security**: API keys sent directly to serverless functions, not stored on server

## Privacy & Security

- **API keys are never stored on the server** - only sent during processing
- **Local storage** - your API key stays in your browser
- **No sensitive data logging** - API keys are not logged
- **Secure transmission** - all data sent over HTTPS

## Cost Information

- **OpenAI API costs**: ~$0.01-0.05 per profile analyzed
- **Netlify hosting**: Free tier available
- **No additional costs** - you only pay for OpenAI usage 
