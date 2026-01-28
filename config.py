import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot
BOT_TOKEN = os.getenv("BOT_TOKEN", "")

# YouTube API
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./analytics.db")

# Monitoring intervals (in minutes)
VIDEO_CHECK_INTERVAL = int(os.getenv("VIDEO_CHECK_INTERVAL", "10"))
STATS_COLLECT_INTERVAL = int(os.getenv("STATS_COLLECT_INTERVAL", "30"))

# Notification thresholds
VIRAL_VIEW_THRESHOLD = int(os.getenv("VIRAL_VIEW_THRESHOLD", "100000"))
VIRAL_NOTIFICATION_STEP = int(os.getenv("VIRAL_NOTIFICATION_STEP", "100000"))

# Growth detection (percentage increase in short time)
GROWTH_RATE_THRESHOLD = float(os.getenv("GROWTH_RATE_THRESHOLD", "50.0"))
GROWTH_TIME_WINDOW = int(os.getenv("GROWTH_TIME_WINDOW", "60"))  # minutes
