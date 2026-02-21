import requests
import json
import time

def test_login_failure():
    print("--- Testing Login with Email ---")
    url_login = "http://localhost:8080/api/v1/auth/login"
    payload = {
        "identifier": "superadmin@tba.sa",
        "password": "Admin@123"
    }
    headers = {"Content-Type": "application/json"}
    
    try:
        response = requests.post(url_login, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 500:
            print("❌ Login Failed with 500 as expected (for debugging)")
            print("Response Body:", response.text)
        elif response.status_code == 200:
            print("✅ Login Succeeded (Issue not reproduced?)")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Login Failed with {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"Error checking login: {e}")

if __name__ == "__main__":
    # Wait for server to potentially start
    time.sleep(5) 
    test_login_failure()
