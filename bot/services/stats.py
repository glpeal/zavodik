import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from bot.database.models import (
    Platform, User, Account, Video, VideoStats, AccountStats
)
from bot.services.tiktok import TikTokService
from bot.services.youtube import YouTubeService

logger = logging.getLogger(__name__)


@dataclass
class PeriodStats:
    period: str
    views: int
    views_change: int
    likes: int
    likes_change: int
    comments: int
    comments_change: int
    shares: int
    shares_change: int
    followers: int
    followers_change: int
    new_videos: int


@dataclass
class AggregatedStats:
    platform: Optional[Platform]
    accounts_count: int
    total_followers: int
    total_views: int
    total_likes: int
    total_videos: int
    period_stats: Optional[PeriodStats]


class StatsService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tiktok = TikTokService()
        self.youtube = YouTubeService()

    async def get_or_create_user(self, telegram_id: int, username: str = None,
                                  first_name: str = None) -> User:
        result = await self.session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                telegram_id=telegram_id,
                username=username,
                first_name=first_name
            )
            self.session.add(user)
            await self.session.commit()
            await self.session.refresh(user)

        return user

    async def add_account(self, user: User, platform: Platform,
                           platform_id: str, username: str,
                           display_name: str = None, profile_url: str = None,
                           avatar_url: str = None) -> Account:
        result = await self.session.execute(
            select(Account).where(
                and_(
                    Account.user_id == user.id,
                    Account.platform == platform,
                    Account.platform_id == platform_id
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.username = username
            existing.display_name = display_name
            existing.profile_url = profile_url
            existing.avatar_url = avatar_url
            existing.is_active = True
            await self.session.commit()
            return existing

        account = Account(
            user_id=user.id,
            platform=platform,
            platform_id=platform_id,
            username=username,
            display_name=display_name,
            profile_url=profile_url,
            avatar_url=avatar_url
        )
        self.session.add(account)
        await self.session.commit()
        await self.session.refresh(account)
        return account

    async def remove_account(self, user: User, account_id: int) -> bool:
        result = await self.session.execute(
            select(Account).where(
                and_(
                    Account.id == account_id,
                    Account.user_id == user.id
                )
            )
        )
        account = result.scalar_one_or_none()

        if account:
            await self.session.delete(account)
            await self.session.commit()
            return True
        return False

    async def get_user_accounts(self, user: User,
                                 platform: Platform = None) -> List[Account]:
        query = select(Account).where(
            and_(
                Account.user_id == user.id,
                Account.is_active == True
            )
        )
        if platform:
            query = query.where(Account.platform == platform)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def save_video(self, account: Account, platform_video_id: str,
                          title: str, video_url: str, description: str = None,
                          thumbnail_url: str = None, published_at: datetime = None,
                          duration: int = None) -> Video:
        result = await self.session.execute(
            select(Video).where(
                and_(
                    Video.account_id == account.id,
                    Video.platform_video_id == platform_video_id
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            return existing

        video = Video(
            account_id=account.id,
            platform_video_id=platform_video_id,
            title=title,
            description=description,
            video_url=video_url,
            thumbnail_url=thumbnail_url,
            published_at=published_at,
            duration=duration
        )
        self.session.add(video)
        await self.session.commit()
        await self.session.refresh(video)
        return video

    async def save_video_stats(self, video: Video, views: int, likes: int,
                                comments: int, shares: int = 0,
                                saves: int = 0) -> VideoStats:
        stats = VideoStats(
            video_id=video.id,
            views=views,
            likes=likes,
            comments=comments,
            shares=shares,
            saves=saves
        )
        self.session.add(stats)
        await self.session.commit()
        return stats

    async def save_account_stats(self, account: Account, followers: int,
                                  following: int = 0, total_videos: int = 0,
                                  total_views: int = 0,
                                  total_likes: int = 0) -> AccountStats:
        stats = AccountStats(
            account_id=account.id,
            followers=followers,
            following=following,
            total_videos=total_videos,
            total_views=total_views,
            total_likes=total_likes
        )
        self.session.add(stats)
        await self.session.commit()
        return stats

    async def get_account_videos(self, account: Account) -> List[Video]:
        result = await self.session.execute(
            select(Video).where(
                and_(
                    Video.account_id == account.id,
                    Video.is_active == True
                )
            ).order_by(Video.published_at.desc())
        )
        return list(result.scalars().all())

    async def get_latest_video_stats(self, video: Video) -> Optional[VideoStats]:
        result = await self.session.execute(
            select(VideoStats)
            .where(VideoStats.video_id == video.id)
            .order_by(VideoStats.recorded_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_latest_account_stats(self, account: Account) -> Optional[AccountStats]:
        result = await self.session.execute(
            select(AccountStats)
            .where(AccountStats.account_id == account.id)
            .order_by(AccountStats.recorded_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_stats_at_time(self, account: Account,
                                 target_time: datetime) -> Optional[AccountStats]:
        result = await self.session.execute(
            select(AccountStats)
            .where(
                and_(
                    AccountStats.account_id == account.id,
                    AccountStats.recorded_at <= target_time
                )
            )
            .order_by(AccountStats.recorded_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_video_stats_at_time(self, video: Video,
                                       target_time: datetime) -> Optional[VideoStats]:
        result = await self.session.execute(
            select(VideoStats)
            .where(
                and_(
                    VideoStats.video_id == video.id,
                    VideoStats.recorded_at <= target_time
                )
            )
            .order_by(VideoStats.recorded_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def calculate_period_stats(self, account: Account,
                                      period: str) -> PeriodStats:
        now = datetime.utcnow()

        if period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(weeks=1)
        elif period == "month":
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(days=1)

        current_stats = await self.get_latest_account_stats(account)
        old_stats = await self.get_stats_at_time(account, start_time)

        videos = await self.get_account_videos(account)

        total_views = 0
        total_likes = 0
        total_comments = 0
        total_shares = 0
        old_views = 0
        old_likes = 0
        old_comments = 0
        old_shares = 0
        new_videos = 0

        for video in videos:
            if video.published_at and video.published_at >= start_time:
                new_videos += 1

            current_video_stats = await self.get_latest_video_stats(video)
            if current_video_stats:
                total_views += current_video_stats.views
                total_likes += current_video_stats.likes
                total_comments += current_video_stats.comments
                total_shares += current_video_stats.shares

            old_video_stats = await self.get_video_stats_at_time(video, start_time)
            if old_video_stats:
                old_views += old_video_stats.views
                old_likes += old_video_stats.likes
                old_comments += old_video_stats.comments
                old_shares += old_video_stats.shares

        return PeriodStats(
            period=period,
            views=total_views,
            views_change=total_views - old_views,
            likes=total_likes,
            likes_change=total_likes - old_likes,
            comments=total_comments,
            comments_change=total_comments - old_comments,
            shares=total_shares,
            shares_change=total_shares - old_shares,
            followers=current_stats.followers if current_stats else 0,
            followers_change=(current_stats.followers - old_stats.followers)
                            if current_stats and old_stats else 0,
            new_videos=new_videos
        )

    async def get_aggregated_stats(self, user: User,
                                    platform: Platform = None,
                                    period: str = None) -> AggregatedStats:
        accounts = await self.get_user_accounts(user, platform)

        total_followers = 0
        total_views = 0
        total_likes = 0
        total_videos = 0
        period_views = 0
        period_views_change = 0
        period_likes = 0
        period_likes_change = 0
        period_comments = 0
        period_comments_change = 0
        period_shares = 0
        period_shares_change = 0
        period_followers_change = 0
        period_new_videos = 0

        for account in accounts:
            stats = await self.get_latest_account_stats(account)
            if stats:
                total_followers += stats.followers
                total_views += stats.total_views
                total_likes += stats.total_likes
                total_videos += stats.total_videos

            if period:
                period_stats = await self.calculate_period_stats(account, period)
                period_views += period_stats.views
                period_views_change += period_stats.views_change
                period_likes += period_stats.likes
                period_likes_change += period_stats.likes_change
                period_comments += period_stats.comments
                period_comments_change += period_stats.comments_change
                period_shares += period_stats.shares
                period_shares_change += period_stats.shares_change
                period_followers_change += period_stats.followers_change
                period_new_videos += period_stats.new_videos

        aggregated_period_stats = None
        if period:
            aggregated_period_stats = PeriodStats(
                period=period,
                views=period_views,
                views_change=period_views_change,
                likes=period_likes,
                likes_change=period_likes_change,
                comments=period_comments,
                comments_change=period_comments_change,
                shares=period_shares,
                shares_change=period_shares_change,
                followers=total_followers,
                followers_change=period_followers_change,
                new_videos=period_new_videos
            )

        return AggregatedStats(
            platform=platform,
            accounts_count=len(accounts),
            total_followers=total_followers,
            total_views=total_views,
            total_likes=total_likes,
            total_videos=total_videos,
            period_stats=aggregated_period_stats
        )

    async def check_viral_threshold(self, video: Video,
                                     current_views: int,
                                     threshold: int = 100000,
                                     step: int = 100000) -> Optional[int]:
        last_notified = video.last_notified_views
        current_milestone = (current_views // step) * step

        if current_milestone >= threshold and current_milestone > last_notified:
            video.last_notified_views = current_milestone
            await self.session.commit()
            return current_milestone

        return None

    async def check_growth_rate(self, video: Video,
                                 current_views: int,
                                 time_window_minutes: int = 60,
                                 threshold_percent: float = 50.0) -> bool:
        window_start = datetime.utcnow() - timedelta(minutes=time_window_minutes)
        old_stats = await self.get_video_stats_at_time(video, window_start)

        if not old_stats or old_stats.views == 0:
            return False

        growth_percent = ((current_views - old_stats.views) / old_stats.views) * 100

        return growth_percent >= threshold_percent
