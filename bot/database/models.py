from datetime import datetime
from enum import Enum
from typing import Optional, List
from sqlalchemy import (
    BigInteger, String, Integer, Float, DateTime, ForeignKey,
    Enum as SQLEnum, Boolean, Index
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Platform(str, Enum):
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    accounts: Mapped[List["Account"]] = relationship(
        "Account", back_populates="user", cascade="all, delete-orphan"
    )


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"))
    platform: Mapped[Platform] = mapped_column(SQLEnum(Platform))
    platform_id: Mapped[str] = mapped_column(String(255), index=True)
    username: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_checked: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="accounts")
    videos: Mapped[List["Video"]] = relationship(
        "Video", back_populates="account", cascade="all, delete-orphan"
    )
    stats: Mapped[List["AccountStats"]] = relationship(
        "AccountStats", back_populates="account", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_account_user_platform", "user_id", "platform"),
    )


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"))
    platform_video_id: Mapped[str] = mapped_column(String(255), index=True)
    title: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    video_url: Mapped[str] = mapped_column(String(512))
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    duration: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_notified_views: Mapped[int] = mapped_column(BigInteger, default=0)
    is_viral_notified: Mapped[bool] = mapped_column(Boolean, default=False)

    account: Mapped["Account"] = relationship("Account", back_populates="videos")
    stats: Mapped[List["VideoStats"]] = relationship(
        "VideoStats", back_populates="video", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_video_account", "account_id"),
        Index("idx_video_platform_id", "platform_video_id"),
    )


class VideoStats(Base):
    __tablename__ = "video_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    video_id: Mapped[int] = mapped_column(Integer, ForeignKey("videos.id", ondelete="CASCADE"))
    views: Mapped[int] = mapped_column(BigInteger, default=0)
    likes: Mapped[int] = mapped_column(BigInteger, default=0)
    comments: Mapped[int] = mapped_column(BigInteger, default=0)
    shares: Mapped[int] = mapped_column(BigInteger, default=0)
    saves: Mapped[int] = mapped_column(BigInteger, default=0)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    video: Mapped["Video"] = relationship("Video", back_populates="stats")

    __table_args__ = (
        Index("idx_video_stats_video_time", "video_id", "recorded_at"),
    )


class AccountStats(Base):
    __tablename__ = "account_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"))
    followers: Mapped[int] = mapped_column(BigInteger, default=0)
    following: Mapped[int] = mapped_column(BigInteger, default=0)
    total_videos: Mapped[int] = mapped_column(Integer, default=0)
    total_views: Mapped[int] = mapped_column(BigInteger, default=0)
    total_likes: Mapped[int] = mapped_column(BigInteger, default=0)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    account: Mapped["Account"] = relationship("Account", back_populates="stats")

    __table_args__ = (
        Index("idx_account_stats_account_time", "account_id", "recorded_at"),
    )
