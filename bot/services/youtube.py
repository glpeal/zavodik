import re
import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
import httpx
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import config

logger = logging.getLogger(__name__)


@dataclass
class YouTubeVideoData:
    video_id: str
    title: str
    description: str
    video_url: str
    thumbnail_url: str
    views: int
    likes: int
    comments: int
    published_at: Optional[datetime]
    duration: int


@dataclass
class YouTubeChannelData:
    channel_id: str
    username: str
    display_name: str
    profile_url: str
    avatar_url: str
    subscribers: int
    total_views: int
    total_videos: int


class YouTubeService:
    def __init__(self):
        self.api_key = config.YOUTUBE_API_KEY
        self._youtube = None

    @property
    def youtube(self):
        if self._youtube is None and self.api_key:
            self._youtube = build("youtube", "v3", developerKey=self.api_key)
        return self._youtube

    @staticmethod
    def extract_channel_id_from_url(url: str) -> Optional[tuple[str, str]]:
        patterns = [
            (r"youtube\.com/channel/([^/?]+)", "channel"),
            (r"youtube\.com/@([^/?]+)", "handle"),
            (r"youtube\.com/c/([^/?]+)", "custom"),
            (r"youtube\.com/user/([^/?]+)", "user"),
        ]
        for pattern, id_type in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1), id_type
        return None

    @staticmethod
    def extract_video_id_from_url(url: str) -> Optional[str]:
        patterns = [
            r"youtube\.com/watch\?v=([^&]+)",
            r"youtu\.be/([^?]+)",
            r"youtube\.com/embed/([^?]+)",
            r"youtube\.com/shorts/([^?]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        return None

    @staticmethod
    def parse_duration(duration_str: str) -> int:
        match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration_str)
        if not match:
            return 0
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        return hours * 3600 + minutes * 60 + seconds

    async def resolve_channel_id(self, identifier: str, id_type: str) -> Optional[str]:
        if not self.youtube:
            logger.error("YouTube API key not configured")
            return None

        try:
            if id_type == "channel":
                return identifier

            if id_type == "handle":
                request = self.youtube.search().list(
                    part="snippet",
                    q=f"@{identifier}",
                    type="channel",
                    maxResults=1
                )
                response = request.execute()
                if response.get("items"):
                    return response["items"][0]["snippet"]["channelId"]

            elif id_type in ("custom", "user"):
                request = self.youtube.search().list(
                    part="snippet",
                    q=identifier,
                    type="channel",
                    maxResults=1
                )
                response = request.execute()
                if response.get("items"):
                    return response["items"][0]["snippet"]["channelId"]

            return None

        except HttpError as e:
            logger.exception(f"YouTube API error resolving channel: {e}")
            return None

    async def get_channel_info(self, channel_id: str) -> Optional[YouTubeChannelData]:
        if not self.youtube:
            logger.error("YouTube API key not configured")
            return None

        try:
            request = self.youtube.channels().list(
                part="snippet,statistics",
                id=channel_id
            )
            response = request.execute()

            if not response.get("items"):
                logger.error(f"Channel not found: {channel_id}")
                return None

            channel = response["items"][0]
            snippet = channel.get("snippet", {})
            stats = channel.get("statistics", {})

            return YouTubeChannelData(
                channel_id=channel_id,
                username=snippet.get("customUrl", "").lstrip("@") or channel_id,
                display_name=snippet.get("title", ""),
                profile_url=f"https://www.youtube.com/channel/{channel_id}",
                avatar_url=snippet.get("thumbnails", {}).get("default", {}).get("url", ""),
                subscribers=int(stats.get("subscriberCount", 0)),
                total_views=int(stats.get("viewCount", 0)),
                total_videos=int(stats.get("videoCount", 0)),
            )

        except HttpError as e:
            logger.exception(f"YouTube API error fetching channel info: {e}")
            return None

    async def get_channel_videos(self, channel_id: str, limit: int = 30) -> List[YouTubeVideoData]:
        if not self.youtube:
            logger.error("YouTube API key not configured")
            return []

        try:
            request = self.youtube.search().list(
                part="snippet",
                channelId=channel_id,
                order="date",
                type="video",
                maxResults=min(limit, 50)
            )
            response = request.execute()

            video_ids = [item["id"]["videoId"] for item in response.get("items", [])]
            if not video_ids:
                return []

            stats_request = self.youtube.videos().list(
                part="statistics,contentDetails",
                id=",".join(video_ids)
            )
            stats_response = stats_request.execute()

            stats_map = {}
            for item in stats_response.get("items", []):
                stats_map[item["id"]] = {
                    "statistics": item.get("statistics", {}),
                    "contentDetails": item.get("contentDetails", {}),
                }

            videos = []
            for item in response.get("items", []):
                video_id = item["id"]["videoId"]
                snippet = item.get("snippet", {})
                stats = stats_map.get(video_id, {}).get("statistics", {})
                content = stats_map.get(video_id, {}).get("contentDetails", {})

                published_at = None
                if snippet.get("publishedAt"):
                    try:
                        published_at = datetime.fromisoformat(
                            snippet["publishedAt"].replace("Z", "+00:00")
                        )
                    except ValueError:
                        pass

                videos.append(YouTubeVideoData(
                    video_id=video_id,
                    title=snippet.get("title", ""),
                    description=snippet.get("description", "")[:500],
                    video_url=f"https://www.youtube.com/watch?v={video_id}",
                    thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                    views=int(stats.get("viewCount", 0)),
                    likes=int(stats.get("likeCount", 0)),
                    comments=int(stats.get("commentCount", 0)),
                    published_at=published_at,
                    duration=self.parse_duration(content.get("duration", "PT0S")),
                ))

            return videos

        except HttpError as e:
            logger.exception(f"YouTube API error fetching videos: {e}")
            return []

    async def get_video_stats(self, video_id: str) -> Optional[YouTubeVideoData]:
        if not self.youtube:
            logger.error("YouTube API key not configured")
            return None

        try:
            request = self.youtube.videos().list(
                part="snippet,statistics,contentDetails",
                id=video_id
            )
            response = request.execute()

            if not response.get("items"):
                return None

            item = response["items"][0]
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            content = item.get("contentDetails", {})

            published_at = None
            if snippet.get("publishedAt"):
                try:
                    published_at = datetime.fromisoformat(
                        snippet["publishedAt"].replace("Z", "+00:00")
                    )
                except ValueError:
                    pass

            return YouTubeVideoData(
                video_id=video_id,
                title=snippet.get("title", ""),
                description=snippet.get("description", "")[:500],
                video_url=f"https://www.youtube.com/watch?v={video_id}",
                thumbnail_url=snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                views=int(stats.get("viewCount", 0)),
                likes=int(stats.get("likeCount", 0)),
                comments=int(stats.get("commentCount", 0)),
                published_at=published_at,
                duration=self.parse_duration(content.get("duration", "PT0S")),
            )

        except HttpError as e:
            logger.exception(f"YouTube API error fetching video stats: {e}")
            return None
