"""
Telegram Bot для аналитики TikTok и YouTube
Все в одном файле - просто запусти: python bot_single.py

Установи зависимости:
pip install aiogram aiosqlite sqlalchemy apscheduler httpx google-api-python-client
"""

import asyncio
import logging
import sys
import re
import enum
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional, List

import httpx
from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Enum, ForeignKey, Float, create_engine, select, and_
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from aiogram import Bot, Dispatcher, Router, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.filters import CommandStart, Command
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

# ============== НАСТРОЙКИ ==============
# ВСТАВЬ СВОЙ ТОКЕН СЮДА:
BOT_TOKEN = "ВСТАВЬ_СВОЙ_ТОКЕН_СЮДА"

# YouTube API ключ (опционально, для YouTube)
YOUTUBE_API_KEY = ""

# Настройки мониторинга
VIDEO_CHECK_INTERVAL = 10  # минут
STATS_COLLECT_INTERVAL = 30  # минут
VIRAL_VIEW_THRESHOLD = 100000  # порог вирусности
VIRAL_NOTIFICATION_STEP = 100000  # шаг уведомлений
GROWTH_RATE_THRESHOLD = 50.0  # % роста для уведомления
GROWTH_TIME_WINDOW = 60  # минут

# База данных
DATABASE_URL = "sqlite+aiosqlite:///analytics.db"

# ============== ЛОГИРОВАНИЕ ==============
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# ============== БАЗА ДАННЫХ ==============
Base = declarative_base()


class Platform(enum.Enum):
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False)
    username = Column(String(255))
    first_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    notifications_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")


class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform = Column(Enum(Platform), nullable=False)
    platform_id = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    display_name = Column(String(255))
    profile_url = Column(String(500))
    avatar_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    last_checked = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="accounts")
    videos = relationship("Video", back_populates="account", cascade="all, delete-orphan")
    stats = relationship("AccountStats", back_populates="account", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    platform_video_id = Column(String(255), nullable=False)
    title = Column(String(500))
    description = Column(String(2000))
    video_url = Column(String(500))
    thumbnail_url = Column(String(500))
    duration = Column(Integer)
    published_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    is_viral_notified = Column(Boolean, default=False)
    last_notified_views = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    account = relationship("Account", back_populates="videos")
    stats = relationship("VideoStats", back_populates="video", cascade="all, delete-orphan")


class VideoStats(Base):
    __tablename__ = "video_stats"
    id = Column(Integer, primary_key=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    video = relationship("Video", back_populates="stats")


class AccountStats(Base):
    __tablename__ = "account_stats"
    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    followers = Column(Integer, default=0)
    following = Column(Integer, default=0)
    total_videos = Column(Integer, default=0)
    total_views = Column(BigInteger, default=0)
    total_likes = Column(BigInteger, default=0)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    account = relationship("Account", back_populates="stats")


# Database session
engine = create_async_engine(DATABASE_URL, echo=False)
async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session():
    async with async_session_factory() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ============== TIKTOK СЕРВИС ==============
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


class TikTokService:
    def __init__(self):
        self.base_url = "https://www.tiktok.com"

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

    async def get_account_info(self, username: str) -> Optional[TikTokAccountData]:
        """Получение информации об аккаунте TikTok через веб-скрапинг"""
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
                response = await client.get(
                    f"{self.base_url}/@{username}",
                    headers=headers,
                    follow_redirects=True
                )

                if response.status_code != 200:
                    return None

                # Парсим данные из HTML (упрощенная версия)
                html = response.text

                # Ищем JSON данные в странице
                import json
                match = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)</script>', html)
                if match:
                    try:
                        data = json.loads(match.group(1))
                        user_data = data.get("__DEFAULT_SCOPE__", {}).get("webapp.user-detail", {}).get("userInfo", {})
                        user = user_data.get("user", {})
                        stats = user_data.get("stats", {})

                        return TikTokAccountData(
                            user_id=user.get("id", username),
                            username=user.get("uniqueId", username),
                            display_name=user.get("nickname", username),
                            profile_url=f"https://www.tiktok.com/@{username}",
                            avatar_url=user.get("avatarThumb", ""),
                            followers=stats.get("followerCount", 0),
                            following=stats.get("followingCount", 0),
                            total_likes=stats.get("heartCount", 0),
                            total_videos=stats.get("videoCount", 0),
                        )
                    except json.JSONDecodeError:
                        pass

                # Фолбэк - возвращаем базовые данные
                return TikTokAccountData(
                    user_id=username,
                    username=username,
                    display_name=username,
                    profile_url=f"https://www.tiktok.com/@{username}",
                    avatar_url="",
                    followers=0,
                    following=0,
                    total_likes=0,
                    total_videos=0,
                )

        except Exception as e:
            logger.exception(f"Error fetching TikTok account: {e}")
            return None

    async def get_account_videos(self, username: str, limit: int = 10) -> List[TikTokVideoData]:
        """Получение видео аккаунта - заглушка, TikTok сложно парсить"""
        return []


# ============== YOUTUBE СЕРВИС ==============
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
        self.api_key = YOUTUBE_API_KEY
        self._youtube = None

    @property
    def youtube(self):
        if self._youtube is None and self.api_key:
            try:
                from googleapiclient.discovery import build
                self._youtube = build("youtube", "v3", developerKey=self.api_key)
            except Exception as e:
                logger.error(f"Failed to init YouTube API: {e}")
        return self._youtube

    @staticmethod
    def extract_channel_id_from_url(url: str) -> Optional[tuple]:
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

    async def resolve_channel_id(self, identifier: str, id_type: str) -> Optional[str]:
        if not self.youtube:
            return None
        try:
            if id_type == "channel":
                return identifier
            request = self.youtube.search().list(
                part="snippet",
                q=f"@{identifier}" if id_type == "handle" else identifier,
                type="channel",
                maxResults=1
            )
            response = request.execute()
            if response.get("items"):
                return response["items"][0]["snippet"]["channelId"]
            return None
        except Exception as e:
            logger.exception(f"YouTube API error: {e}")
            return None

    async def get_channel_info(self, channel_id: str) -> Optional[YouTubeChannelData]:
        if not self.youtube:
            return None
        try:
            request = self.youtube.channels().list(part="snippet,statistics", id=channel_id)
            response = request.execute()
            if not response.get("items"):
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
        except Exception as e:
            logger.exception(f"YouTube API error: {e}")
            return None

    async def get_channel_videos(self, channel_id: str, limit: int = 10) -> List[YouTubeVideoData]:
        if not self.youtube:
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

            stats_request = self.youtube.videos().list(part="statistics,contentDetails", id=",".join(video_ids))
            stats_response = stats_request.execute()
            stats_map = {item["id"]: item for item in stats_response.get("items", [])}

            videos = []
            for item in response.get("items", []):
                video_id = item["id"]["videoId"]
                snippet = item.get("snippet", {})
                stats = stats_map.get(video_id, {}).get("statistics", {})

                published_at = None
                if snippet.get("publishedAt"):
                    try:
                        published_at = datetime.fromisoformat(snippet["publishedAt"].replace("Z", "+00:00"))
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
                    duration=0,
                ))
            return videos
        except Exception as e:
            logger.exception(f"YouTube API error: {e}")
            return []


# ============== ФОРМАТИРОВАНИЕ ==============
def format_number(num: int) -> str:
    if num >= 1_000_000_000:
        return f"{num / 1_000_000_000:.1f}B"
    elif num >= 1_000_000:
        return f"{num / 1_000_000:.1f}M"
    elif num >= 1_000:
        return f"{num / 1_000:.1f}K"
    return str(num)


def format_change(value: int) -> str:
    formatted = format_number(abs(value))
    if value > 0:
        return f"+{formatted}"
    elif value < 0:
        return f"-{formatted}"
    return "0"


# ============== КЛАВИАТУРЫ ==============
def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🎵 TikTok", callback_data="platform:tiktok"),
        InlineKeyboardButton(text="📺 YouTube", callback_data="platform:youtube")
    )
    builder.row(InlineKeyboardButton(text="📊 Все аккаунты", callback_data="accounts:all"))
    builder.row(InlineKeyboardButton(text="📈 Общая статистика", callback_data="stats:total"))
    builder.row(InlineKeyboardButton(text="⚙️ Настройки", callback_data="settings"))
    return builder.as_markup()


def get_platform_keyboard(platform: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="📋 Мои аккаунты", callback_data=f"accounts:{platform}"))
    builder.row(InlineKeyboardButton(text="➕ Добавить аккаунт", callback_data=f"add_account:{platform}"))
    builder.row(InlineKeyboardButton(text="📊 Статистика платформы", callback_data=f"platform_stats:{platform}"))
    builder.row(InlineKeyboardButton(text="◀️ Назад", callback_data="menu"))
    return builder.as_markup()


def get_accounts_keyboard(accounts: List[Account], platform: Optional[str] = None) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for account in accounts:
        emoji = "🎵" if account.platform == Platform.TIKTOK else "📺"
        builder.row(InlineKeyboardButton(
            text=f"{emoji} {account.display_name or account.username}",
            callback_data=f"account:{account.id}"
        ))
    if platform:
        builder.row(InlineKeyboardButton(text="➕ Добавить", callback_data=f"add_account:{platform}"))
        builder.row(InlineKeyboardButton(text="◀️ Назад", callback_data=f"platform:{platform}"))
    else:
        builder.row(InlineKeyboardButton(text="◀️ Назад", callback_data="menu"))
    return builder.as_markup()


def get_account_actions_keyboard(account_id: int, platform: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="📊 Текущая статистика", callback_data=f"account_stats:{account_id}:current"))
    builder.row(
        InlineKeyboardButton(text="📅 День", callback_data=f"account_stats:{account_id}:day"),
        InlineKeyboardButton(text="📅 Неделя", callback_data=f"account_stats:{account_id}:week")
    )
    builder.row(InlineKeyboardButton(text="📅 Месяц", callback_data=f"account_stats:{account_id}:month"))
    builder.row(InlineKeyboardButton(text="🎬 Видео", callback_data=f"account_videos:{account_id}"))
    builder.row(InlineKeyboardButton(text="🔄 Обновить", callback_data=f"refresh_account:{account_id}"))
    builder.row(InlineKeyboardButton(text="🗑 Удалить", callback_data=f"delete_account:{account_id}"))
    builder.row(InlineKeyboardButton(text="◀️ Назад", callback_data=f"accounts:{platform}"))
    return builder.as_markup()


def get_stats_type_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="🎵 TikTok", callback_data="total_stats:tiktok"),
        InlineKeyboardButton(text="📺 YouTube", callback_data="total_stats:youtube")
    )
    builder.row(InlineKeyboardButton(text="🌐 Все платформы", callback_data="total_stats:all"))
    builder.row(InlineKeyboardButton(text="◀️ Назад", callback_data="menu"))
    return builder.as_markup()


def get_back_keyboard(callback_data: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="◀️ Назад", callback_data=callback_data))
    return builder.as_markup()


def get_confirm_delete_keyboard(account_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="✅ Да, удалить", callback_data=f"confirm_delete:{account_id}"),
        InlineKeyboardButton(text="❌ Отмена", callback_data=f"account:{account_id}")
    )
    return builder.as_markup()


# ============== СЕРВИС СТАТИСТИКИ ==============
class StatsService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.tiktok = TikTokService()
        self.youtube = YouTubeService()

    async def get_or_create_user(self, telegram_id: int, username: str = None, first_name: str = None) -> User:
        result = await self.session.execute(select(User).where(User.telegram_id == telegram_id))
        user = result.scalar_one_or_none()
        if not user:
            user = User(telegram_id=telegram_id, username=username, first_name=first_name)
            self.session.add(user)
            await self.session.commit()
            await self.session.refresh(user)
        return user

    async def add_account(self, user: User, platform: Platform, platform_id: str, username: str,
                          display_name: str = None, profile_url: str = None, avatar_url: str = None) -> Account:
        result = await self.session.execute(
            select(Account).where(and_(
                Account.user_id == user.id,
                Account.platform == platform,
                Account.platform_id == platform_id
            ))
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
            user_id=user.id, platform=platform, platform_id=platform_id,
            username=username, display_name=display_name,
            profile_url=profile_url, avatar_url=avatar_url
        )
        self.session.add(account)
        await self.session.commit()
        await self.session.refresh(account)
        return account

    async def remove_account(self, user: User, account_id: int) -> bool:
        result = await self.session.execute(
            select(Account).where(and_(Account.id == account_id, Account.user_id == user.id))
        )
        account = result.scalar_one_or_none()
        if account:
            await self.session.delete(account)
            await self.session.commit()
            return True
        return False

    async def get_user_accounts(self, user: User, platform: Platform = None) -> List[Account]:
        query = select(Account).where(and_(Account.user_id == user.id, Account.is_active == True))
        if platform:
            query = query.where(Account.platform == platform)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def save_account_stats(self, account: Account, followers: int, following: int = 0,
                                  total_videos: int = 0, total_views: int = 0, total_likes: int = 0) -> AccountStats:
        stats = AccountStats(
            account_id=account.id, followers=followers, following=following,
            total_videos=total_videos, total_views=total_views, total_likes=total_likes
        )
        self.session.add(stats)
        await self.session.commit()
        return stats

    async def get_latest_account_stats(self, account: Account) -> Optional[AccountStats]:
        result = await self.session.execute(
            select(AccountStats).where(AccountStats.account_id == account.id)
            .order_by(AccountStats.recorded_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_stats_at_time(self, account: Account, target_time: datetime) -> Optional[AccountStats]:
        result = await self.session.execute(
            select(AccountStats).where(and_(
                AccountStats.account_id == account.id,
                AccountStats.recorded_at <= target_time
            )).order_by(AccountStats.recorded_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()


# ============== РОУТЕР ==============
router = Router()


class AddAccountStates(StatesGroup):
    waiting_for_url = State()


@router.message(CommandStart())
async def cmd_start(message: Message):
    async with async_session_factory() as session:
        stats_service = StatsService(session)
        await stats_service.get_or_create_user(
            telegram_id=message.from_user.id,
            username=message.from_user.username,
            first_name=message.from_user.first_name
        )

    await message.answer(
        "🎬 <b>Analytics Bot</b>\n\n"
        "Бот для аналитики TikTok и YouTube аккаунтов.\n\n"
        "📊 Отслеживание статистики\n"
        "🔔 Уведомления о вирусных видео (100K+ просмотров)\n"
        "📈 Статистика за день/неделю/месяц\n\n"
        "Выберите платформу:",
        reply_markup=get_main_menu_keyboard()
    )


@router.message(Command("menu"))
async def cmd_menu(message: Message):
    await message.answer("📱 Главное меню:", reply_markup=get_main_menu_keyboard())


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(
        "📖 <b>Помощь</b>\n\n"
        "/start - Запуск бота\n"
        "/menu - Главное меню\n"
        "/stats - Общая статистика\n"
        "/help - Эта справка\n\n"
        "🔔 <b>Уведомления:</b>\n"
        f"• При достижении {format_number(VIRAL_VIEW_THRESHOLD)}+ просмотров\n"
        f"• Каждые {format_number(VIRAL_NOTIFICATION_STEP)} просмотров\n"
        f"• При росте просмотров на {GROWTH_RATE_THRESHOLD}%+ за час"
    )


@router.callback_query(F.data == "menu")
async def callback_menu(callback: CallbackQuery):
    await callback.message.edit_text("📱 Главное меню:", reply_markup=get_main_menu_keyboard())
    await callback.answer()


@router.callback_query(F.data.startswith("platform:"))
async def callback_platform(callback: CallbackQuery):
    platform = callback.data.split(":")[1]
    name = "TikTok" if platform == "tiktok" else "YouTube"
    emoji = "🎵" if platform == "tiktok" else "📺"
    await callback.message.edit_text(f"{emoji} <b>{name}</b>", reply_markup=get_platform_keyboard(platform))
    await callback.answer()


@router.callback_query(F.data.startswith("accounts:"))
async def callback_accounts(callback: CallbackQuery):
    platform_str = callback.data.split(":")[1]

    async with async_session_factory() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(telegram_id=callback.from_user.id)

        if platform_str == "all":
            accounts = await stats_service.get_user_accounts(user)
            title = "📋 Все аккаунты"
            back_platform = None
        else:
            platform = Platform.TIKTOK if platform_str == "tiktok" else Platform.YOUTUBE
            accounts = await stats_service.get_user_accounts(user, platform)
            emoji = "🎵" if platform_str == "tiktok" else "📺"
            title = f"{emoji} Аккаунты"
            back_platform = platform_str

        if not accounts:
            text = f"{title}\n\nУ вас пока нет добавленных аккаунтов."
        else:
            text = f"{title}\n\nВыберите аккаунт:"

        await callback.message.edit_text(text, reply_markup=get_accounts_keyboard(accounts, back_platform))
    await callback.answer()


@router.callback_query(F.data.startswith("add_account:"))
async def callback_add_account(callback: CallbackQuery, state: FSMContext):
    platform = callback.data.split(":")[1]
    await state.set_state(AddAccountStates.waiting_for_url)
    await state.update_data(platform=platform)

    name = "TikTok" if platform == "tiktok" else "YouTube"
    example = "https://www.tiktok.com/@username" if platform == "tiktok" else "https://www.youtube.com/@username"

    await callback.message.edit_text(
        f"➕ <b>Добавление аккаунта {name}</b>\n\n"
        f"Отправьте ссылку на профиль:\n<code>{example}</code>\n\n"
        "Или отправьте /cancel для отмены"
    )
    await callback.answer()


@router.message(AddAccountStates.waiting_for_url, Command("cancel"))
async def cancel_add_account(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("Добавление отменено.", reply_markup=get_main_menu_keyboard())


@router.message(AddAccountStates.waiting_for_url)
async def process_account_url(message: Message, state: FSMContext):
    data = await state.get_data()
    platform = data.get("platform")
    url = message.text.strip()

    processing_msg = await message.answer("⏳ Загружаю информацию...")

    try:
        async with async_session_factory() as session:
            stats_service = StatsService(session)
            user = await stats_service.get_or_create_user(telegram_id=message.from_user.id)

            if platform == "tiktok":
                tiktok = TikTokService()
                username = tiktok.extract_username_from_url(url)
                if not username:
                    username = url.lstrip("@").split("/")[-1]

                account_info = await tiktok.get_account_info(username)
                if not account_info:
                    await processing_msg.edit_text("❌ Не удалось найти аккаунт. Проверьте ссылку.")
                    return

                account = await stats_service.add_account(
                    user=user, platform=Platform.TIKTOK,
                    platform_id=account_info.user_id, username=account_info.username,
                    display_name=account_info.display_name, profile_url=account_info.profile_url,
                    avatar_url=account_info.avatar_url
                )
                await stats_service.save_account_stats(
                    account=account, followers=account_info.followers,
                    following=account_info.following, total_videos=account_info.total_videos,
                    total_likes=account_info.total_likes
                )
            else:
                youtube = YouTubeService()
                result = youtube.extract_channel_id_from_url(url)
                if not result:
                    await processing_msg.edit_text("❌ Неверная ссылка на YouTube канал.")
                    return

                identifier, id_type = result
                channel_id = await youtube.resolve_channel_id(identifier, id_type)
                if not channel_id:
                    await processing_msg.edit_text("❌ Канал не найден. Проверьте YouTube API ключ.")
                    return

                channel_info = await youtube.get_channel_info(channel_id)
                if not channel_info:
                    await processing_msg.edit_text("❌ Не удалось получить информацию о канале.")
                    return

                account = await stats_service.add_account(
                    user=user, platform=Platform.YOUTUBE,
                    platform_id=channel_info.channel_id, username=channel_info.username,
                    display_name=channel_info.display_name, profile_url=channel_info.profile_url,
                    avatar_url=channel_info.avatar_url
                )
                await stats_service.save_account_stats(
                    account=account, followers=channel_info.subscribers,
                    total_videos=channel_info.total_videos, total_views=channel_info.total_views
                )

            await state.clear()
            stats = await stats_service.get_latest_account_stats(account)

            emoji = "🎵" if platform == "tiktok" else "📺"
            text = f"✅ <b>Аккаунт добавлен!</b>\n\n"
            text += f"{emoji} <b>{account.display_name or account.username}</b>\n"
            text += f"@{account.username}\n\n"
            if stats:
                text += f"👥 Подписчики: <b>{format_number(stats.followers)}</b>\n"
                text += f"🎬 Видео: <b>{format_number(stats.total_videos)}</b>\n"
                if stats.total_views:
                    text += f"👁 Просмотры: <b>{format_number(stats.total_views)}</b>\n"
                if stats.total_likes:
                    text += f"❤️ Лайки: <b>{format_number(stats.total_likes)}</b>\n"

            await processing_msg.edit_text(text, reply_markup=get_account_actions_keyboard(account.id, platform))

    except Exception as e:
        logger.exception(f"Error adding account: {e}")
        await processing_msg.edit_text(f"❌ Ошибка: {str(e)}")


@router.callback_query(F.data.startswith("account:"))
async def callback_account(callback: CallbackQuery):
    account_id = int(callback.data.split(":")[1])

    async with async_session_factory() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(telegram_id=callback.from_user.id)
        accounts = await stats_service.get_user_accounts(user)
        account = next((a for a in accounts if a.id == account_id), None)

        if not account:
            await callback.answer("Аккаунт не найден", show_alert=True)
            return

        stats = await stats_service.get_latest_account_stats(account)
        platform_str = "tiktok" if account.platform == Platform.TIKTOK else "youtube"
        emoji = "🎵" if account.platform == Platform.TIKTOK else "📺"

        text = f"{emoji} <b>{account.display_name or account.username}</b>\n"
        text += f"@{account.username}\n\n"
        if stats:
            text += f"👥 Подписчики: <b>{format_number(stats.followers)}</b>\n"
            text += f"🎬 Видео: <b>{format_number(stats.total_videos)}</b>\n"
            if stats.total_views:
                text += f"👁 Просмотры: <b>{format_number(stats.total_views)}</b>\n"
            if stats.total_likes:
                text += f"❤️ Лайки: <b>{format_number(stats.total_likes)}</b>\n"

        await callback.message.edit_text(text, reply_markup=get_account_actions_keyboard(account_id, platform_str))
    await callback.answer()


@router.callback_query(F.data.startswith("account_stats:"))
async def callback_account_stats(callback: CallbackQuery):
    parts = callback.data.split(":")
    account_id = int(parts[1])
    period = parts[2]

    async with async_session_factory() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(telegram_id=callback.from_user.id)
        accounts = await stats_service.get_user_accounts(user)
        account = next((a for a in accounts if a.id == account_id), None)

        if not account:
            await callback.answer("Аккаунт не найден", show_alert=True)
            return

        current_stats = await stats_service.get_latest_account_stats(account)
        platform_str = "tiktok" if account.platform == Platform.TIKTOK else "youtube"
        emoji = "🎵" if account.platform == Platform.TIKTOK else "📺"

        if period == "current":
            text = f"{emoji} <b>{account.display_name or account.username}</b>\n"
            text += f"📊 Текущая статистика\n\n"
            if current_stats:
                text += f"👥 Подписчики: <b>{format_number(current_stats.followers)}</b>\n"
                text += f"🎬 Видео: <b>{format_number(current_stats.total_videos)}</b>\n"
                if current_stats.total_views:
                    text += f"👁 Просмотры: <b>{format_number(current_stats.total_views)}</b>\n"
                if current_stats.total_likes:
                    text += f"❤️ Лайки: <b>{format_number(current_stats.total_likes)}</b>\n"
            else:
                text += "Статистика еще не собрана"
        else:
            period_names = {"day": "за день", "week": "за неделю", "month": "за месяц"}
            period_deltas = {
                "day": timedelta(days=1),
                "week": timedelta(weeks=1),
                "month": timedelta(days=30)
            }

            old_stats = await stats_service.get_stats_at_time(
                account, datetime.utcnow() - period_deltas[period]
            )

            text = f"{emoji} <b>{account.display_name or account.username}</b>\n"
            text += f"📊 Статистика {period_names[period]}\n\n"

            if current_stats:
                followers_change = (current_stats.followers - old_stats.followers) if old_stats else 0
                text += f"👥 Подписчики: <b>{format_number(current_stats.followers)}</b> ({format_change(followers_change)})\n"

                if current_stats.total_views and old_stats:
                    views_change = current_stats.total_views - old_stats.total_views
                    text += f"👁 Просмотры: <b>{format_number(current_stats.total_views)}</b> ({format_change(views_change)})\n"
            else:
                text += "Статистика еще не собрана"

        await callback.message.edit_text(text, reply_markup=get_back_keyboard(f"account:{account_id}"))
    await callback.answer()


@router.callback_query(F.data.startswith("delete_account:"))
async def callback_delete_account(callback: CallbackQuery):
    account_id = int(callback.data.split(":")[1])
    await callback.message.edit_text(
        "🗑 <b>Удалить аккаунт?</b>\n\nВся история статистики будет удалена.",
        reply_markup=get_confirm_delete_keyboard(account_id)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("confirm_delete:"))
async def callback_confirm_delete(callback: CallbackQuery):
    account_id = int(callback.data.split(":")[1])

    async with async_session_factory() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(telegram_id=callback.from_user.id)
        result = await stats_service.remove_account(user, account_id)

        if result:
            await callback.message.edit_text("✅ Аккаунт удален", reply_markup=get_main_menu_keyboard())
        else:
            await callback.answer("Ошибка удаления", show_alert=True)
    await callback.answer()


@router.callback_query(F.data.startswith("refresh_account:"))
async def callback_refresh_account(callback: CallbackQuery):
    account_id = int(callback.data.split(":")[1])
    await callback.answer("🔄 Обновляю...")

    async with async_session_factory() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(telegram_id=callback.from_user.id)
        accounts = await stats_service.get_user_accounts(user)
        account = next((a for a in accounts if a.id == account_id), None)

        if not account:
            await callback.answer("Аккаунт не найден", show_alert=True)
            return

        try:
            if account.platform == Platform.TIKTOK:
                tiktok = TikTokService()
                account_info = await tiktok.get_account_info(account.username)
                if account_info:
                    await stats_service.save_account_stats(
                        account=account, followers=account_info.followers,
                        following=account_info.following, total_videos=account_info.total_videos,
                        total_likes=account_info.total_likes
                    )
            else:
                youtube = YouTubeService()
                channel_info = await youtube.get_channel_info(account.platform_id)
                if channel_info:
                    await stats_service.save_account_stats(
                        account=account, followers=channel_info.subscribers,
                        total_videos=channel_info.total_videos, total_views=channel_info.total_views
                    )

            account.last_checked = datetime.utcnow()
            await session.commit()

            stats = await stats_service.get_latest_account_stats(account)
            platform_str = "tiktok" if account.platform == Platform.TIKTOK else "youtube"
            emoji = "🎵" if account.platform == Platform.TIKTOK else "📺"

            text = f"✅ <b>Данные обновлены!</b>\n\n"
            text += f"{emoji} <b>{account.display_name or account.username}</b>\n\n"
            if stats:
                text += f"👥 Подписчики: <b>{format_number(stats.followers)}</b>\n"
                text += f"🎬 Видео: <b>{format_number(stats.total_videos)}</b>\n"

            await callback.message.edit_text(text, reply_markup=get_account_actions_keyboard(account_id, platform_str))

        except Exception as e:
            logger.exception(f"Error refreshing: {e}")
            await callback.answer("Ошибка обновления", show_alert=True)


@router.callback_query(F.data == "stats:total")
async def callback_stats_total(callback: CallbackQuery):
    await callback.message.edit_text("📈 <b>Общая статистика</b>\n\nВыберите платформу:", reply_markup=get_stats_type_keyboard())
    await callback.answer()


@router.callback_query(F.data.startswith("total_stats:"))
async def callback_total_stats(callback: CallbackQuery):
    platform_str = callback.data.split(":")[1]

    async with async_session_factory() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(telegram_id=callback.from_user.id)

        if platform_str == "all":
            accounts = await stats_service.get_user_accounts(user)
            title = "🌐 Общая статистика всех платформ"
        elif platform_str == "tiktok":
            accounts = await stats_service.get_user_accounts(user, Platform.TIKTOK)
            title = "🎵 Общая статистика TikTok"
        else:
            accounts = await stats_service.get_user_accounts(user, Platform.YOUTUBE)
            title = "📺 Общая статистика YouTube"

        total_followers = 0
        total_views = 0
        total_likes = 0
        total_videos = 0

        for account in accounts:
            stats = await stats_service.get_latest_account_stats(account)
            if stats:
                total_followers += stats.followers
                total_views += stats.total_views
                total_likes += stats.total_likes
                total_videos += stats.total_videos

        text = f"{title}\n\n"
        text += f"📋 Аккаунтов: <b>{len(accounts)}</b>\n"
        text += f"👥 Подписчики: <b>{format_number(total_followers)}</b>\n"
        text += f"👁 Просмотры: <b>{format_number(total_views)}</b>\n"
        text += f"❤️ Лайки: <b>{format_number(total_likes)}</b>\n"
        text += f"🎬 Видео: <b>{format_number(total_videos)}</b>\n"

        await callback.message.edit_text(text, reply_markup=get_back_keyboard("stats:total"))
    await callback.answer()


@router.callback_query(F.data == "settings")
async def callback_settings(callback: CallbackQuery):
    text = "⚙️ <b>Настройки</b>\n\n"
    text += f"🔔 Порог вирусности: {format_number(VIRAL_VIEW_THRESHOLD)} просмотров\n"
    text += f"📊 Шаг уведомлений: каждые {format_number(VIRAL_NOTIFICATION_STEP)}\n"
    text += f"📈 Порог роста: {GROWTH_RATE_THRESHOLD}% за {GROWTH_TIME_WINDOW} мин\n"
    text += f"⏱ Интервал проверки: {VIDEO_CHECK_INTERVAL} мин\n"
    await callback.message.edit_text(text, reply_markup=get_back_keyboard("menu"))
    await callback.answer()


# ============== МОНИТОРИНГ ==============
class MonitoringScheduler:
    def __init__(self, bot: Bot):
        self.bot = bot
        self.scheduler = AsyncIOScheduler()
        self.tiktok = TikTokService()
        self.youtube = YouTubeService()

    def start(self):
        self.scheduler.add_job(
            self.collect_all_stats,
            IntervalTrigger(minutes=STATS_COLLECT_INTERVAL),
            id="collect_stats",
            replace_existing=True,
            next_run_time=datetime.utcnow() + timedelta(minutes=2)
        )
        self.scheduler.start()
        logger.info("Scheduler started")

    def stop(self):
        self.scheduler.shutdown(wait=False)

    async def collect_all_stats(self):
        logger.info("Collecting stats...")
        try:
            async with async_session_factory() as session:
                result = await session.execute(select(Account).where(Account.is_active == True))
                accounts = result.scalars().all()

                for account in accounts:
                    try:
                        stats_service = StatsService(session)
                        if account.platform == Platform.TIKTOK:
                            info = await self.tiktok.get_account_info(account.username)
                            if info:
                                await stats_service.save_account_stats(
                                    account=account, followers=info.followers,
                                    following=info.following, total_videos=info.total_videos,
                                    total_likes=info.total_likes
                                )
                        else:
                            info = await self.youtube.get_channel_info(account.platform_id)
                            if info:
                                await stats_service.save_account_stats(
                                    account=account, followers=info.subscribers,
                                    total_videos=info.total_videos, total_views=info.total_views
                                )
                        account.last_checked = datetime.utcnow()
                        await session.commit()
                    except Exception as e:
                        logger.exception(f"Error collecting stats for {account.username}: {e}")
        except Exception as e:
            logger.exception(f"Error in stats collection: {e}")


# ============== ЗАПУСК ==============
async def main():
    if BOT_TOKEN == "ВСТАВЬ_СВОЙ_ТОКЕН_СЮДА" or not BOT_TOKEN:
        print("\n" + "="*50)
        print("ОШИБКА: Вставь свой BOT_TOKEN в начало файла!")
        print("Получи токен у @BotFather в Telegram")
        print("="*50 + "\n")
        sys.exit(1)

    logger.info("Initializing database...")
    await init_db()

    bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)

    scheduler = MonitoringScheduler(bot)
    scheduler.start()

    logger.info("Bot started!")
    try:
        await dp.start_polling(bot)
    finally:
        scheduler.stop()
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped")
