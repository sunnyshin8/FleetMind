import redis
import time
import json
import sys
from colorama import init, Fore, Style
import pandas as pd

# Initialize colorama
init()

# Connect to Redis (Same URL as Next.js app)
# Using localhost by default, or env var if set
REDIS_URL = "redis://localhost:6379"

def connect_redis():
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        print(f"{Fore.GREEN}✓ Connected to FleetMind Redis Loop{Style.RESET_ALL}")
        return r
    except redis.ConnectionError:
        print(f"{Fore.RED}✗ Failed to connect to Redis. Is it running?{Style.RESET_ALL}")
        return None

def monitor_fleet():
    r = connect_redis()
    if not r:
        return

    print(f"{Fore.CYAN}Starting Fleet Telemetry Monitor... (Press Ctrl+C to stop){Style.RESET_ALL}")
    print("-" * 50)

    try:
        while True:
            # Fetch state from the same key Next.js writes to
            data = r.get("fleet_state")
            
            if data:
                robots = json.loads(data)
                
                if not robots:
                    print(f"\r{Fore.YELLOW}Waiting for active robots...{Style.RESET_ALL}", end="")
                else:
                    # Convert to Pandas DataFrame for quick analysis
                    df = pd.DataFrame(robots)
                    
                    # Calculate Stats
                    avg_battery = df['battery'].mean()
                    active_count = len(df)
                    
                    # visual output
                    sys.stdout.write("\033[K") # Clear line
                    status_color = Fore.GREEN if avg_battery > 20 else Fore.RED
                    
                    output = (
                        f"[{time.strftime('%H:%M:%S')}] "
                        f"Active Agents: {Fore.BOLD}{active_count}{Style.RESET_ALL} | "
                        f"Fleet Battery Health: {status_color}{avg_battery:.1f}%{Style.RESET_ALL} | "
                        f"Raw Data Stream: {len(data)} bytes"
                    )
                    print(f"\r{output}", end="")
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print(f"\n{Fore.CYAN}Telemetry Monitor Stopped.{Style.RESET_ALL}")

if __name__ == "__main__":
    monitor_fleet()
