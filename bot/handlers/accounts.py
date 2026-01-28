import logging
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from bot.database import get_session
from bot.database.models import Platform
from bot.services.stats import StatsService
from bot.services.tiktok import TikTokService
from bot.services.youtube import YouTubeService
from bot.keyboards import (
    get_main_menu_keyboard,
    get_platform_keyboard,
    get_account_actions_keyboard,
    get_back_keyboard,
)
from bot.utils import format_account_stats

logger = logging.getLogger(__name__)
router = Router()


class AddAccountStates(StatesGroup):
    waiting_for_url = State()


@router.callback_query(F.data.startswith("add_account:"))
async def callback_add_account(callback: CallbackQuery, state: FSMContext):
    platform = callback.data.split(":")[1]
    await state.set_state(AddAccountStates.waiting_for_url)
    await state.update_data(platform=platform)

    platform_name = "TikTok" if platform == "tiktok" else "YouTube"

    if platform == "tiktok":
        example = "https://www.tiktok.com/@username"
    else:
        example = "https://www.youtube.com/@username\nhttps://www.youtube.com/channel/ID"

    await callback.message.edit_text(
        f"<b>Добавление аккаунта {platform_name}</b>\n\n"
        f"Отправьте ссылку на профиль:\n<code>{example}</code>\n\n"
        "Или отправьте /cancel для отмены",
    )
    await callback.answer()


@router.message(AddAccountStates.waiting_for_url, F.text == "/cancel")
async def cancel_add_account(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "Добавление аккаунта отменено.",
        reply_markup=get_main_menu_keyboard()
    )


@router.message(AddAccountStates.waiting_for_url)
async def process_account_url(message: Message, state: FSMContext):
    data = await state.get_data()
    platform = data.get("platform")
    url = message.text.strip()

    processing_msg = await message.answer("Загружаю информацию об аккаунте...")

    try:
        if platform == "tiktok":
            account_data = await add_tiktok_account(message.from_user.id, url)
        else:
            account_data = await add_youtube_account(message.from_user.id, url)

        if account_data:
            await state.clear()

            async with get_session() as session:
                stats_service = StatsService(session)
                user = await stats_service.get_or_create_user(
                    telegram_id=message.from_user.id
                )
                accounts = await stats_service.get_user_accounts(user)
                account = next(
                    (a for a in accounts if a.platform_id == account_data["platform_id"]),
                    None
                )

                if account:
                    stats = await stats_service.get_latest_account_stats(account)
                    text = f"Аккаунт успешно добавлен!\n\n{format_account_stats(account, stats)}"
                    await processing_msg.edit_text(
                        text,
                        reply_markup=get_account_actions_keyboard(account.id, platform)
                    )
                else:
                    await processing_msg.edit_text(
                        "Аккаунт добавлен!",
                        reply_markup=get_platform_keyboard(platform)
                    )
        else:
            await processing_msg.edit_text(
                "Не удалось найти аккаунт по этой ссылке.\n"
                "Проверьте правильность ссылки и попробуйте снова.\n\n"
                "Отправьте /cancel для отмены."
            )

    except Exception as e:
        logger.exception(f"Error adding account: {e}")
        await processing_msg.edit_text(
            f"Произошла ошибка: {str(e)}\n"
            "Попробуйте позже или отправьте /cancel для отмены."
        )


async def add_tiktok_account(telegram_id: int, url: str) -> dict | None:
    tiktok = TikTokService()

    username = tiktok.extract_username_from_url(url)
    if not username:
        if not url.startswith("http"):
            username = url.lstrip("@")
        else:
            return None

    account_info = await tiktok.get_account_info(username)
    if not account_info:
        return None

    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(telegram_id=telegram_id)

        account = await stats_service.add_account(
            user=user,
            platform=Platform.TIKTOK,
            platform_id=account_info.user_id,
            username=account_info.username,
            display_name=account_info.display_name,
            profile_url=account_info.profile_url,
            avatar_url=account_info.avatar_url
        )

        await stats_service.save_account_stats(
            account=account,
            followers=account_info.followers,
            following=account_info.following,
            total_videos=account_info.total_videos,
            total_views=0,
            total_likes=account_info.total_likes
        )

        videos = await tiktok.get_account_videos(username, limit=20)
        for video_data in videos:
            video = await stats_service.save_video(
                account=account,
                platform_video_id=video_data.video_id,
                title=video_data.title,
                video_url=video_data.video_url,
                description=video_data.description,
                thumbnail_url=video_data.thumbnail_url,
                published_at=video_data.published_at,
                duration=video_data.duration
            )

            await stats_service.save_video_stats(
                video=video,
                views=video_data.views,
                likes=video_data.likes,
                comments=video_data.comments,
                shares=video_data.shares,
                saves=video_data.saves
            )

        return {"platform_id": account_info.user_id}


async def add_youtube_account(telegram_id: int, url: str) -> dict | None:
    youtube = YouTubeService()

    result = youtube.extract_channel_id_from_url(url)
    if not result:
        return None

    identifier, id_type = result
    channel_id = await youtube.resolve_channel_id(identifier, id_type)
    if not channel_id:
        return None

    channel_info = await youtube.get_channel_info(channel_id)
    if not channel_info:
        return None

    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(telegram_id=telegram_id)

        account = await stats_service.add_account(
            user=user,
            platform=Platform.YOUTUBE,
            platform_id=channel_info.channel_id,
            username=channel_info.username,
            display_name=channel_info.display_name,
            profile_url=channel_info.profile_url,
            avatar_url=channel_info.avatar_url
        )

        await stats_service.save_account_stats(
            account=account,
            followers=channel_info.subscribers,
            following=0,
            total_videos=channel_info.total_videos,
            total_views=channel_info.total_views,
            total_likes=0
        )

        videos = await youtube.get_channel_videos(channel_id, limit=20)
        for video_data in videos:
            video = await stats_service.save_video(
                account=account,
                platform_video_id=video_data.video_id,
                title=video_data.title,
                video_url=video_data.video_url,
                description=video_data.description,
                thumbnail_url=video_data.thumbnail_url,
                published_at=video_data.published_at,
                duration=video_data.duration
            )

            await stats_service.save_video_stats(
                video=video,
                views=video_data.views,
                likes=video_data.likes,
                comments=video_data.comments,
                shares=0,
                saves=0
            )

        return {"platform_id": channel_info.channel_id}


@router.callback_query(F.data.startswith("refresh_account:"))
async def callback_refresh_account(callback: CallbackQuery):
    account_id = int(callback.data.split(":")[1])

    await callback.answer("Обновляю данные...")

    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=callback.from_user.id
        )
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
                        account=account,
                        followers=account_info.followers,
                        following=account_info.following,
                        total_videos=account_info.total_videos,
                        total_views=0,
                        total_likes=account_info.total_likes
                    )

                    videos = await tiktok.get_account_videos(account.username, limit=10)
                    for video_data in videos:
                        video = await stats_service.save_video(
                            account=account,
                            platform_video_id=video_data.video_id,
                            title=video_data.title,
                            video_url=video_data.video_url,
                            description=video_data.description,
                            thumbnail_url=video_data.thumbnail_url,
                            published_at=video_data.published_at,
                            duration=video_data.duration
                        )

                        await stats_service.save_video_stats(
                            video=video,
                            views=video_data.views,
                            likes=video_data.likes,
                            comments=video_data.comments,
                            shares=video_data.shares,
                            saves=video_data.saves
                        )

            else:
                youtube = YouTubeService()
                channel_info = await youtube.get_channel_info(account.platform_id)

                if channel_info:
                    await stats_service.save_account_stats(
                        account=account,
                        followers=channel_info.subscribers,
                        following=0,
                        total_videos=channel_info.total_videos,
                        total_views=channel_info.total_views,
                        total_likes=0
                    )

                    videos = await youtube.get_channel_videos(account.platform_id, limit=10)
                    for video_data in videos:
                        video = await stats_service.save_video(
                            account=account,
                            platform_video_id=video_data.video_id,
                            title=video_data.title,
                            video_url=video_data.video_url,
                            description=video_data.description,
                            thumbnail_url=video_data.thumbnail_url,
                            published_at=video_data.published_at,
                            duration=video_data.duration
                        )

                        await stats_service.save_video_stats(
                            video=video,
                            views=video_data.views,
                            likes=video_data.likes,
                            comments=video_data.comments,
                            shares=0,
                            saves=0
                        )

            stats = await stats_service.get_latest_account_stats(account)
            text = f"Данные обновлены!\n\n{format_account_stats(account, stats)}"
            platform_str = "tiktok" if account.platform == Platform.TIKTOK else "youtube"

            await callback.message.edit_text(
                text,
                reply_markup=get_account_actions_keyboard(account_id, platform_str)
            )

        except Exception as e:
            logger.exception(f"Error refreshing account: {e}")
            await callback.answer(
                "Ошибка при обновлении данных. Попробуйте позже.",
                show_alert=True
            )


@router.callback_query(F.data.startswith("account_videos:"))
async def callback_account_videos(callback: CallbackQuery):
    account_id = int(callback.data.split(":")[1])

    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=callback.from_user.id
        )
        accounts = await stats_service.get_user_accounts(user)
        account = next((a for a in accounts if a.id == account_id), None)

        if not account:
            await callback.answer("Аккаунт не найден", show_alert=True)
            return

        videos = await stats_service.get_account_videos(account)

        if not videos:
            await callback.answer("Видео не найдены", show_alert=True)
            return

        text = f"<b>Видео аккаунта {account.display_name or account.username}</b>\n\n"

        for i, video in enumerate(videos[:10], 1):
            stats = await stats_service.get_latest_video_stats(video)
            title = video.title[:30] + "..." if len(video.title or "") > 30 else (video.title or "Без названия")

            text += f"{i}. <a href='{video.video_url}'>{title}</a>\n"
            if stats:
                text += f"   Просмотры: {stats.views:,} | Лайки: {stats.likes:,}\n"
            text += "\n"

        platform_str = "tiktok" if account.platform == Platform.TIKTOK else "youtube"

        await callback.message.edit_text(
            text,
            reply_markup=get_back_keyboard(f"account:{account_id}"),
            disable_web_page_preview=True
        )
        await callback.answer()
