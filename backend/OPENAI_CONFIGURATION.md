# OpenAI Configuration Guide

## Current Setup

The application uses OpenAI for AI-powered medical document analysis and discharge summary generation. The integration is located in the `openai_integration` app.

## Configuration

### 1. Environment Variables

Add these to your `.env` file:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.3
```

### 2. Django Settings

The OpenAI configuration is already set up in `api/settings.py`:

```python
# OpenAI Configuration
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')
```

## Quota Management

### Current Issue
You're experiencing OpenAI quota limits (429 error). Here are solutions:

### Solution 1: Upgrade OpenAI Plan
1. Go to [OpenAI Billing](https://platform.openai.com/account/billing)
2. Upgrade your plan to increase rate limits
3. Set up usage alerts

### Solution 2: Implement Rate Limiting
Add rate limiting to prevent quota exhaustion:

```python
# In openai_integration/services.py
from django.core.cache import cache
import time

class OpenAIService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.rate_limit_key = "openai_rate_limit"
    
    def _check_rate_limit(self):
        """Check if we're within rate limits"""
        current_time = time.time()
        requests = cache.get(self.rate_limit_key, [])
        
        # Remove requests older than 1 minute
        requests = [req for req in requests if current_time - req < 60]
        
        # Check if we've made too many requests
        if len(requests) >= 10:  # Max 10 requests per minute
            return False
        
        # Add current request
        requests.append(current_time)
        cache.set(self.rate_limit_key, requests, 60)
        return True
```

### Solution 3: Fallback Mode
The system now includes fallback mechanisms when OpenAI is unavailable:

- **Mock Analysis**: Generates placeholder document analysis
- **Fallback Summary**: Creates basic discharge summary templates
- **Manual Mode**: Allows manual summary creation

## API Endpoints

### Document Analysis
- **POST** `/api/openai/analyze-document/`
- Analyzes uploaded medical documents

### Discharge Summary Generation
- **POST** `/api/openai/generate-discharge-summary/`
- Generates comprehensive discharge summaries

### Get Analysis Results
- **GET** `/api/openai/analysis/<id>/`
- Retrieves document analysis results

### Get Discharge Summary
- **GET** `/api/openai/discharge-summary/<id>/`
- Retrieves generated discharge summary

## Error Handling

The system now handles these OpenAI errors gracefully:

1. **Rate Limit Exceeded (429)**
   - Returns user-friendly error message
   - Suggests manual summary creation
   - Logs the error for monitoring

2. **Quota Exceeded**
   - Falls back to mock analysis
   - Generates template summaries
   - Continues to function without AI

3. **API Key Issues**
   - Validates API key on startup
   - Provides clear error messages
   - Falls back to manual mode

## Monitoring

### Logs to Watch
```bash
# Check for OpenAI errors
grep "OpenAI" logs/django.log

# Check for quota issues
grep "quota" logs/django.log

# Check for rate limiting
grep "rate limit" logs/django.log
```

### Metrics to Track
- API calls per day
- Success/failure rates
- Token usage
- Cost per request

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Check your `.env` file
   - Verify `OPENAI_API_KEY` is set
   - Restart Django server

2. **"Quota exceeded"**
   - Check OpenAI billing dashboard
   - Upgrade plan if needed
   - Wait for quota reset

3. **"Rate limit exceeded"**
   - Implement rate limiting
   - Reduce concurrent requests
   - Use fallback mode

### Testing

Test the integration:

```bash
# Test OpenAI connection
python manage.py shell
>>> from openai_integration.services import OpenAIService
>>> service = OpenAIService()
>>> # Test with mock data
```

## Future Improvements

1. **Caching**: Cache analysis results to reduce API calls
2. **Batch Processing**: Process multiple documents together
3. **Alternative Models**: Support for other AI providers
4. **Offline Mode**: Enhanced fallback capabilities

## Support

If you continue experiencing issues:

1. Check OpenAI status: https://status.openai.com/
2. Review your usage: https://platform.openai.com/usage
3. Contact OpenAI support for quota increases
4. Consider implementing alternative AI providers
