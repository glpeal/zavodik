import logging
from datetime import datetime, timedelta
from typing import Optional
from aiogram import Bot
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import config
from bot.database import get_session
from bot.database.models import User, Account, Video, Platform
from bot.services.stats import StatsService
from bot.services.tiktok import TikTokService
from bot.services.youtube import YouTubeService
from bot.utils import format_viral_notification, format_growth_notification

logger = logging.getLogger(__name__)


class MonitoringScheduler:
    def __init__(self, bot: Bot):
        self.bot = bot
        self.scheduler = AsyncIOScheduler()
        self.tiktok = TikTokService()
        self.youtube = YouTubeService()

    def start(self):
        self.scheduler.add_job(
            self.check_all_videos,
            IntervalTrigger(minutes=config.VIDEO_CHECK_INTERVAL),
            id="check_videos",
            replace_existing=True,
            next_run_time=datetime.utcnow() + timedelta(minutes=1)
        )

        self.scheduler.add_job(
            self.collect_all_stats,
            IntervalTrigger(minutes=config.STATS_COLLECT_INTERVAL),
            id="collect_stats",
            replace_existing=True,
            next_run_time=datetime.utcnow() + timedelta(minutes=2)
        )

        self.scheduler.start()
        logger.info("Monitoring scheduler started")

    def stop(self):
        self.scheduler.shutdown(wait=False)
        logger.info("Monitoring scheduler stopped")

    async def check_all_videos(self):
        logger.info("Starting video check cycle")

        try:
            async with get_session() as session:
                result = await session.execute(
                    select(User).where(
                        User.is_active == True,
                        User.notifications_enabled == True
                    )
                )
                users = result.scalars().all()

                for user in users:
                    await self.check_user_videos(session, user)

        except Exception as e:
            logger.exception(f"Error in video check cycle: {e}")

        logger.info("Video check cycle completed")

    async def check_user_videos(self, session: AsyncSession, user: User):
        try:
            stats_service = StatsService(session)
            accounts = await stats_service.get_user_accounts(user)

            for account in accounts:
                await self.check_account_videos(session, user, account, stats_service)

        except Exception as e:
            logger.exception(f"Error checking videos for user {user.telegram_id}: {e}")

    async def check_account_videos(self, session: AsyncSession, user: User,
                                    account: Account, stats_service: StatsService):
        try:
            videos = await stats_service.get_account_videos(account)

            for video in videos:
                if account.platform == Platform.TIKTOK:
                    video_data = await self.tiktok.get_video_stats(video.video_url)
                    if video_data:
                        current_views = video_data.views
                        likes = video_data.likes
                        comments = video_data.comments
                        shares = video_data.shares
                        saves = video_data.saves
                    else:
                        continue
                else:
                    video_data = await self.youtube.get_video_stats(video.platform_video_id)
                    if video_data:
                        current_views = video_data.views
                        likes = video_data.likes
                        comments = video_data.comments
                        shares = 0
                        saves = 0
                    else:
                        continue

                await stats_service.save_video_stats(
                    video=video,
                    views=current_views,
                    likes=likes,
                    comments=comments,
                    shares=shares,
                    saves=saves
                )

                milestone = await stats_service.check_viral_threshold(
                    video=video,
                    current_views=current_views,
                    threshold=config.VIRAL_VIEW_THRESHOLD,
                    step=config.VIRAL_NOTIFICATION_STEP
                )

                if milestone:
                    await self.send_viral_notification(
                        user=user,
                        account=account,
                        video=video,
                        current_views=current_views,
                        milestone=milestone
                    )

                is_growing = await stats_service.check_growth_rate(
                    video=video,
                    current_views=current_views,
                    time_window_minutes=config.GROWTH_TIME_WINDOW,
                    threshold_percent=config.GROWTH_RATE_THRESHOLD
                )

                if is_growing and not video.is_viral_notified:
                    video.is_viral_notified = True
                    await session.commit()

                    old_stats = await stats_service.get_video_stats_at_time(
                        video,
                        datetime.utcnow() - timedelta(minutes=config.GROWTH_TIME_WINDOW)
                    )
                    if old_stats and old_stats.views > 0:
                        growth_percent = ((current_views - old_stats.views) / old_stats.views) * 100
                        await self.send_growth_notification(
                            user=user,
                            account=account,
                            video=video,
                            current_views=current_views,
                            growth_percent=growth_percent
                        )

        except Exception as e:
            logger.exception(f"Error checking videos for account {account.username}: {e}")

    async def send_viral_notification(self, user: User, account: Account,
                                       video: Video, current_views: int,
                                       milestone: int):
        try:
            text = format_viral_notification(
                account_name=account.display_name or account.username,
                video_title=video.title or "Без названия",
                video_url=video.video_url,
                views=current_views,
                milestone=milestone,
                platform=account.platform
            )

            await self.bot.send_message(
                chat_id=user.telegram_id,
                text=text,
                parse_mode="HTML",
                disable_web_page_preview=False
            )

            logger.info(
                f"Sent viral notification to {user.telegram_id} "
                f"for video {video.platform_video_id} ({milestone} views)"
            )

        except Exception as e:
            logger.exception(f"Error sending viral notification: {e}")

    async def send_growth_notification(self, user: User, account: Account,
                                        video: Video, current_views: int,
                                        growth_percent: float):
        try:
            text = format_growth_notification(
                account_name=account.display_name or account.username,
                video_title=video.title or "Без названия",
                video_url=video.video_url,
                views=current_views,
                growth_percent=growth_percent,
                platform=account.platform
            )

            await self.bot.send_message(
                chat_id=user.telegram_id,
                text=text,
                parse_mode="HTML",
                disable_web_page_preview=False
            )

            logger.info(
                f"Sent growth notification to {user.telegram_id} "
                f"for video {video.platform_video_id} ({growth_percent:.0f}% growth)"
            )

        except Exception as e:
            logger.exception(f"Error sending growth notification: {e}")

    async def collect_all_stats(self):
        logger.info("Starting stats collection cycle")

        try:
            async with get_session() as session:
                result = await session.execute(
                    select(Account).where(Account.is_active == True)
                )
                accounts = result.scalars().all()

                for account in accounts:
                    await self.collect_account_stats(session, account)

        except Exception as e:
            logger.exception(f"Error in stats collection cycle: {e}")

        logger.info("Stats collection cycle completed")

    async def collect_account_stats(self, session: AsyncSession, account: Account):
        try:
            stats_service = StatsService(session)

            if account.platform == Platform.TIKTOK:
                account_info = await self.tiktok.get_account_info(account.username)

                if account_info:
                    await stats_service.save_account_stats(
                        account=account,
                        followers=account_info.followers,
                        following=account_info.following,
                        total_videos=account_info.total_videos,
                        total_views=0,
                        total_likes=account_info.total_likes
                    )

            else:
                channel_info = await self.youtube.get_channel_info(account.platform_id)

                if channel_info:
                    await stats_service.save_account_stats(
                        account=account,
                        followers=channel_info.subscribers,
                        following=0,
                        total_videos=channel_info.total_videos,
                        total_views=channel_info.total_views,
                        total_likes=0
                    )

            account.last_checked = datetime.utcnow()
            await session.commit()

        except Exception as e:
            logger.exception(f"Error collecting stats for account {account.username}: {e}")
