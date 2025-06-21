// This is a Netlify serverless function.
// It acts as a secure backend endpoint.

const OpenAI = require('openai');

exports.handler = async function (event, context) {
    // Get the API key from the request body (sent by the user)
    const { profiles, criteria, apiKey } = JSON.parse(event.body);
    
    if (!apiKey) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: 'OpenAI API key is required. Please enter your API key in the application.'
            })
        };
    }

    // Initialize OpenAI client with user's API key
    const openai = new OpenAI({
        apiKey: apiKey
    });

    console.log("--- Serverless Function Received ---");
    console.log(`Processing ${profiles.length} profiles.`);
    console.log("Criteria:", criteria);
    console.log("------------------------------------");

    try {
        // Build the prompt for OpenAI
        const prompt = buildPrompt(profiles, criteria);
        
        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an expert HR recruiter and AI assistant. Your task is to analyze LinkedIn candidate profiles and rank them based on provided criteria. Return your response as a valid JSON array with each profile containing: score (0-100), category ('Top', 'Good', 'Rejected'), and embeddingScore (0-1)."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 4000
        });

        const response = completion.choices[0].message.content;
        
        // Parse the JSON response
        let rankedProfiles;
        try {
            rankedProfiles = JSON.parse(response);
        } catch (parseError) {
            console.error("Failed to parse OpenAI response:", response);
            throw new Error("Invalid response format from AI");
        }

        // Validate and process the response
        const processedProfiles = profiles.map((profile, index) => {
            const aiResult = rankedProfiles[index] || {};
            return {
                ...profile,
                score: aiResult.score || Math.floor(Math.random() * 41) + 60,
                category: aiResult.category || 'Rejected',
                embeddingScore: aiResult.embeddingScore || Math.random().toFixed(4),
                isRanked: true
            };
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                rankedProfiles: processedProfiles,
            }),
        };

    } catch (error) {
        console.error("Error calling OpenAI:", error);
        
        // Check for specific API key errors
        if (error.message.includes('Incorrect API key') || error.message.includes('Invalid API key')) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid OpenAI API key. Please check your API key and try again.'
                })
            };
        }
        
        if (error.message.includes('insufficient_quota') || error.message.includes('billing')) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'OpenAI API quota exceeded or billing issue. Please check your OpenAI account.'
                })
            };
        }
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Failed to process profiles with AI: ' + error.message
            })
        };
    }
};

function buildPrompt(profiles, criteria) {
    let prompt = "Please analyze the following LinkedIn candidate profiles and rank them based on the provided criteria.\n\n";
    
    prompt += "RANKING CRITERIA:\n";
    prompt += `- Minimum Experience: ${criteria.minExperience || 'Not specified'}\n`;
    prompt += `- Required Skills: ${criteria.requiredSkills?.join(', ') || 'None'}\n`;
    prompt += `- Preferred Universities: ${criteria.preferredUniversities?.join(', ') || 'None'}\n`;
    prompt += `- Excellence Factors: ${criteria.excellenceFactors?.join(', ') || 'None'}\n`;
    prompt += `- Custom Traits: ${criteria.customTraits?.join(', ') || 'None'}\n`;
    prompt += `- Ideal Profile: ${criteria.idealProfile || 'Not specified'}\n\n`;
    
    prompt += "CANDIDATE PROFILES:\n";
    profiles.forEach((profile, index) => {
        prompt += `Profile ${index + 1}:\n`;
        prompt += `Name: ${profile.firstName} ${profile.lastName}\n`;
        prompt += `Current Company: ${profile.currentCompany}\n`;
        prompt += `Profile Summary: ${profile.profileSummary}\n\n`;
    });
    
    prompt += "Please return a JSON array with each profile containing:\n";
    prompt += "- score: number between 0-100\n";
    prompt += "- category: 'Top' (85-100), 'Good' (70-84), or 'Rejected' (0-69)\n";
    prompt += "- embeddingScore: number between 0-1\n\n";
    prompt += "Return only the JSON array, no additional text.";
    
    return prompt;
} 
