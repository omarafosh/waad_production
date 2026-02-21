import asyncio
import aiohttp
import time
import json

async def login(session, url, username, password):
    async with session.post(f"{url}/api/auth/login", json={
        "identifier": username,
        "password": password
    }) as response:
        if response.status == 200:
            data = await response.json()
            return data['data']['token']
        return None

async def post_request(session, url, endpoint, token, payload):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    start_time = time.time()
    try:
        async with session.post(f"{url}{endpoint}", json=payload, headers=headers) as response:
            status = response.status
            return status, time.time() - start_time
    except:
        return 500, time.time() - start_time

async def run_test(num_requests, concurrent_users):
    url = "http://localhost:8080"
    async with aiohttp.ClientSession() as session:
        print("Logging in...")
        token = await login(session, url, "superadmin", "Admin@123")
        if not token:
            print("Login failed")
            return

        payload = {
            "memberId": 1,
            "visitId": 1,
            "claimType": "DIRECT_BILLING",
            "serviceType": "OUTPATIENT",
            "serviceDate": "2026-02-20",
            "claimedAmount": 100.0,
            "diagnosisCode": "R51",
            "diagnosisDescription": "Headache",
            "lines": [{"medicalServiceId": 1, "quantity": 1}]
        }

        print(f"Starting Claim Submission Load Test: {num_requests} requests...")
        start_test = time.time()
        
        # Batching for concurrency
        results = []
        for i in range(0, num_requests, concurrent_users):
            batch = [post_request(session, url, "/api/provider/submit-claim", token, payload) 
                     for _ in range(min(concurrent_users, num_requests - i))]
            results.extend(await asyncio.gather(*batch))
        
        total_time = time.time() - start_test
        
        success_count = sum(1 for status, d in results if status in [200, 201])
        durations = [d for s, d in results]
        avg_latency = sum(durations) / len(durations) if durations else 0
        
        print("\n--- Performance Report ---")
        print(f"Total Requests:   {num_requests}")
        print(f"Successful:       {success_count}")
        print(f"Failed:           {num_requests - success_count}")
        print(f"Total Execution:  {total_time:.2f}s")
        print(f"Throughput:       {num_requests / total_time:.2f} req/s")
        print(f"Average Latency:  {avg_latency * 1000:.2f}ms")
        print(f"P95 Latency:      {sorted(durations)[int(len(durations)*0.95)] * 1000:.2f}ms" if durations else "N/A")

if __name__ == "__main__":
    asyncio.run(run_test(500, 50))
    # Also run login test separately if needed
