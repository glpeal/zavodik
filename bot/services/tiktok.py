import re
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
import httpx

logger = logging.getLogger(__name__)


@dataclass
class TikTokVideoData:
    video_id: str
    title: str
    description: str
    video_url: str
    thumbnail_url: str
    views: int
    likes: int
    comments: int
    shares: int
    saves: int
    published_at: Optional[datetime]
    duration: int


@dataclass
class TikTokAccountData:
    user_id: str
    username: str
    display_name: str
    profile_url: str
    avatar_url: str
    followers: int
    following: int
    total_likes: int
    total_videos: int


class TikTokService:
    BASE_URL = "https://www.tiktok.com"
    API_URL = "https://www.tiktok.com/api"

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.tiktok.com/",
        }

    @staticmethod
    def extract_username_from_url(url: str) -> Optional[str]:
        patterns = [
            r"tiktok\.com/@([^/?]+)",
            r"tiktok\.com/([^/@][^/?]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def extract_video_id_from_url(url: str) -> Optional[str]:
        patterns = [
            r"tiktok\.com/@[^/]+/video/(\d+)",
            r"tiktok\.com/[^/]+/video/(\d+)",
            r"vm\.tiktok\.com/([^/?]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    async def get_account_info(self, username: str) -> Optional[TikTokAccountData]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.BASE_URL}/@{username}"
                response = await client.get(url, headers=self.headers, follow_redirects=True)

                if response.status_code != 200:
                    logger.error(f"Failed to fetch TikTok account {username}: {response.status_code}")
                    return None

                html = response.text

                user_id_match = re.search(r'"uniqueId":"([^"]+)"', html)
                display_name_match = re.search(r'"nickname":"([^"]+)"', html)
                avatar_match = re.search(r'"avatarThumb":"([^"]+)"', html)
                followers_match = re.search(r'"followerCount":(\d+)', html)
                following_match = re.search(r'"followingCount":(\d+)', html)
                likes_match = re.search(r'"heartCount":(\d+)', html)
                videos_match = re.search(r'"videoCount":(\d+)', html)
                uid_match = re.search(r'"id":"(\d+)"', html)

                if not user_id_match:
                    logger.error(f"Could not parse TikTok account data for {username}")
                    return None

                return TikTokAccountData(
                    user_id=uid_match.group(1) if uid_match else username,
                    username=user_id_match.group(1),
                    display_name=display_name_match.group(1) if display_name_match else username,
                    profile_url=f"https://www.tiktok.com/@{username}",
                    avatar_url=avatar_match.group(1).replace("\\u002F", "/") if avatar_match else "",
                    followers=int(followers_match.group(1)) if followers_match else 0,
                    following=int(following_match.group(1)) if following_match else 0,
                    total_likes=int(likes_match.group(1)) if likes_match else 0,
                    total_videos=int(videos_match.group(1)) if videos_match else 0,
                )

        except Exception as e:
            logger.exception(f"Error fetching TikTok account {username}: {e}")
            return None

    async def get_account_videos(self, username: str, limit: int = 30) -> List[TikTokVideoData]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{self.BASE_URL}/@{username}"
                response = await client.get(url, headers=self.headers, follow_redirects=True)

                if response.status_code != 200:
                    logger.error(f"Failed to fetch TikTok videos for {username}: {response.status_code}")
                    return []

                html = response.text

                videos = []
                video_pattern = r'"ItemModule":\s*\{([^}]+\{[^}]*\}[^}]*)\}'

                item_list_match = re.search(r'"ItemModule":\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})', html)
                if not item_list_match:
                    video_blocks = re.findall(
                        r'"video":\s*\{[^}]*"id":\s*"(\d+)"[^}]*\}.*?"desc":\s*"([^"]*)".*?"playCount":\s*(\d+).*?"diggCount":\s*(\d+).*?"commentCount":\s*(\d+).*?"shareCount":\s*(\d+)',
                        html,
                        re.DOTALL
                    )

                    for block in video_blocks[:limit]:
                        video_id, desc, views, likes, comments, shares = block
                        videos.append(TikTokVideoData(
                            video_id=video_id,
                            title=desc[:100] if desc else "",
                            description=desc,
                            video_url=f"https://www.tiktok.com/@{username}/video/{video_id}",
                            thumbnail_url="",
                            views=int(views),
                            likes=int(likes),
                            comments=int(comments),
                            shares=int(shares),
                            saves=0,
                            published_at=None,
                            duration=0,
                        ))

                return videos

        except Exception as e:
            logger.exception(f"Error fetching TikTok videos for {username}: {e}")
            return []

    async def get_video_stats(self, video_url: str) -> Optional[TikTokVideoData]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(video_url, headers=self.headers, follow_redirects=True)

                if response.status_code != 200:
                    logger.error(f"Failed to fetch TikTok video {video_url}: {response.status_code}")
                    return None

                html = response.text

                video_id_match = re.search(r'"id":\s*"(\d+)"', html)
                desc_match = re.search(r'"desc":\s*"([^"]*)"', html)
                views_match = re.search(r'"playCount":\s*(\d+)', html)
                likes_match = re.search(r'"diggCount":\s*(\d+)', html)
                comments_match = re.search(r'"commentCount":\s*(\d+)', html)
                shares_match = re.search(r'"shareCount":\s*(\d+)', html)
                saves_match = re.search(r'"collectCount":\s*(\d+)', html)
                duration_match = re.search(r'"duration":\s*(\d+)', html)
                create_time_match = re.search(r'"createTime":\s*"?(\d+)"?', html)

                if not video_id_match:
                    return None

                published_at = None
                if create_time_match:
                    try:
                        published_at = datetime.fromtimestamp(int(create_time_match.group(1)))
                    except (ValueError, OSError):
                        pass

                return TikTokVideoData(
                    video_id=video_id_match.group(1),
                    title=desc_match.group(1)[:100] if desc_match else "",
                    description=desc_match.group(1) if desc_match else "",
                    video_url=video_url,
                    thumbnail_url="",
                    views=int(views_match.group(1)) if views_match else 0,
                    likes=int(likes_match.group(1)) if likes_match else 0,
                    comments=int(comments_match.group(1)) if comments_match else 0,
                    shares=int(shares_match.group(1)) if shares_match else 0,
                    saves=int(saves_match.group(1)) if saves_match else 0,
                    published_at=published_at,
                    duration=int(duration_match.group(1)) if duration_match else 0,
                )

        except Exception as e:
            logger.exception(f"Error fetching TikTok video stats: {e}")
            return None
