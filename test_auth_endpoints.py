import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_registration():
    """Test user registration endpoint"""
    url = f"{BASE_URL}/auth/register"
    data = {
        "username": "testuser",
        "email": "test@example.com", 
        "password": "SecurePass123!",
        "full_name": "Test User"
    }
    
    response = requests.post(url, json=data)
    print(f"Registration Status: {response.status_code}")
    print(f"Registration Response: {json.dumps(response.json(), indent=2)}")
    return response

def test_login():
    """Test user login endpoint"""
    url = f"{BASE_URL}/auth/login"
    data = {
        "username": "testuser",
        "password": "SecurePass123!"
    }
    
    response = requests.post(url, json=data)
    print(f"Login Status: {response.status_code}")
    print(f"Login Response: {json.dumps(response.json(), indent=2)}")
    return response

def test_profile(access_token):
    """Test user profile endpoint with authentication"""
    url = f"{BASE_URL}/auth/me"
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.get(url, headers=headers)
    print(f"Profile Status: {response.status_code}")
    print(f"Profile Response: {json.dumps(response.json(), indent=2)}")
    return response

def test_demo_user_login():
    """Test login with demo user that was seeded"""
    url = f"{BASE_URL}/auth/login"
    data = {
        "username": "demo",
        "password": "123456"
    }
    
    response = requests.post(url, json=data)
    print(f"Demo Login Status: {response.status_code}")
    print(f"Demo Login Response: {json.dumps(response.json(), indent=2)}")
    return response

if __name__ == "__main__":
    print("🧪 Testing Finance-AI Mockup Authentication Endpoints")
    print("=" * 50)
    
    # Test server health
    try:
        health_response = requests.get(f"{BASE_URL}/health")
        print(f"Health Check: {health_response.status_code} - {health_response.json()}")
    except Exception as e:
        print(f"❌ Server not running: {e}")
        exit(1)
    
    print("\n1. Testing Demo User Login:")
    demo_response = test_demo_user_login()
    
    if demo_response.status_code == 200:
        demo_tokens = demo_response.json()
        print("\n   Testing Demo User Profile:")
        test_profile(demo_tokens["access_token"])
    
    print("\n2. Testing New User Registration:")
    reg_response = test_registration()
    
    if reg_response.status_code == 201:
        print("\n3. Testing New User Login:")
        login_response = test_login()
        
        if login_response.status_code == 200:
            tokens = login_response.json()
            print("\n4. Testing Authenticated Profile Access:")
            test_profile(tokens["access_token"])
    
    print("\n✅ Authentication endpoint testing complete!") 