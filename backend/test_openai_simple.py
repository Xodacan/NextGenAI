#!/usr/bin/env python
"""
Simple test for OpenAI API key
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from django.conf import settings
import openai

def test_openai_api():
    """Test if OpenAI API key is working"""
    
    print("🧪 Testing OpenAI API Key...")
    
    try:
        # Check if API key is set
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            print("❌ OPENAI_API_KEY not found in settings")
            return False
        
        print(f"✅ OpenAI API Key found: {api_key[:10]}...")
        
        # Test OpenAI client
        client = openai.OpenAI(api_key=api_key)
        
        # Simple test request
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "user", "content": "Say 'Hello, OpenAI is working!'"}
            ],
            max_tokens=50
        )
        
        result = response.choices[0].message.content
        print(f"✅ OpenAI API test successful!")
        print(f"🤖 Response: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ OpenAI API test failed: {str(e)}")
        return False

if __name__ == "__main__":
    test_openai_api()
