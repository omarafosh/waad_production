import requests
import time

def wait_for_up(url):
    for i in range(60):
        try:
            resp = requests.get(f"{url}/actuator/health", timeout=1)
            if resp.status_code == 200:
                print("UP")
                return True
        except:
            pass
        time.sleep(2)
    print("TIMEOUT")
    return False

if __name__ == "__main__":
    wait_for_up("http://localhost:8080")
