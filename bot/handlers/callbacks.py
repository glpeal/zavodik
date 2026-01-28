import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery

from bot.database import get_session
from bot.database.models import Platform
from bot.services.stats import StatsService
from bot.keyboards import (
    get_main_menu_keyboard,
    get_platform_keyboard,
    get_accounts_keyboard,
    get_account_actions_keyboard,
    get_stats_period_keyboard,
    get_stats_type_keyboard,
    get_confirm_keyboard,
    get_notifications_keyboard,
    get_back_keyboard,
)
from bot.utils import (
    format_account_stats,
    format_period_stats,
    format_aggregated_stats,
)

logger = logging.getLogger(__name__)
router = Router()


@router.callback_query(F.data == "menu")
async def callback_menu(callback: CallbackQuery):
    await callback.message.edit_text(
        "Выберите платформу или действие:",
        reply_markup=get_main_menu_keyboard()
    )
    await callback.answer()


@router.callback_query(F.data.startswith("platform:"))
async def callback_platform(callback: CallbackQuery):
    platform = callback.data.split(":")[1]
    platform_name = "TikTok" if platform == "tiktok" else "YouTube"

    await callback.message.edit_text(
        f"<b>{platform_name}</b>\n\nВыберите действие:",
        reply_markup=get_platform_keyboard(platform)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("accounts:"))
async def callback_accounts(callback: CallbackQuery):
    platform_str = callback.data.split(":")[1]

    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=callback.from_user.id
        )

        if platform_str == "all":
            accounts = await stats_service.get_user_accounts(user)
            text = "Все ваши аккаунты:"
            keyboard = get_accounts_keyboard(accounts)
        else:
            platform = Platform.TIKTOK if platform_str == "tiktok" else Platform.YOUTUBE
            accounts = await stats_service.get_user_accounts(user, platform)
            platform_name = "TikTok" if platform_str == "tiktok" else "YouTube"
            text = f"Ваши аккаунты {platform_name}:"
            keyboard = get_accounts_keyboard(accounts, platform_str)

        if not accounts:
            text = "У вас пока нет аккаунтов на этой платформе."

        await callback.message.edit_text(text, reply_markup=keyboard)
        await callback.answer()


@router.callback_query(F.data.startswith("account:"))
async def callback_account(callback: CallbackQuery):
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

        stats = await stats_service.get_latest_account_stats(account)
        text = format_account_stats(account, stats)
        platform_str = "tiktok" if account.platform == Platform.TIKTOK else "youtube"

        await callback.message.edit_text(
            text,
            reply_markup=get_account_actions_keyboard(account_id, platform_str)
        )
        await callback.answer()


@router.callback_query(F.data.startswith("account_stats:"))
async def callback_account_stats(callback: CallbackQuery):
    parts = callback.data.split(":")
    account_id = int(parts[1])
    period = parts[2]

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

        if period == "current":
            stats = await stats_service.get_latest_account_stats(account)
            text = format_account_stats(account, stats)
        else:
            period_stats = await stats_service.calculate_period_stats(account, period)
            text = format_period_stats(account, period_stats)

        platform_str = "tiktok" if account.platform == Platform.TIKTOK else "youtube"

        await callback.message.edit_text(
            text,
            reply_markup=get_account_actions_keyboard(account_id, platform_str)
        )
        await callback.answer()


@router.callback_query(F.data.startswith("delete_account:"))
async def callback_delete_account(callback: CallbackQuery):
    account_id = int(callback.data.split(":")[1])

    await callback.message.edit_text(
        "Вы уверены, что хотите удалить этот аккаунт?\n"
        "Вся история статистики будет потеряна.",
        reply_markup=get_confirm_keyboard("delete", account_id)
    )
    await callback.answer()


@router.callback_query(F.data.startswith("confirm_delete:"))
async def callback_confirm_delete(callback: CallbackQuery):
    account_id = int(callback.data.split(":")[1])

    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=callback.from_user.id
        )

        success = await stats_service.remove_account(user, account_id)

        if success:
            await callback.message.edit_text(
                "Аккаунт успешно удален.",
                reply_markup=get_main_menu_keyboard()
            )
        else:
            await callback.answer("Не удалось удалить аккаунт", show_alert=True)

        await callback.answer()


@router.callback_query(F.data == "stats:total")
async def callback_stats_total(callback: CallbackQuery):
    await callback.message.edit_text(
        "Выберите тип статистики:",
        reply_markup=get_stats_type_keyboard()
    )
    await callback.answer()


@router.callback_query(F.data.startswith("total_stats:"))
async def callback_total_stats(callback: CallbackQuery):
    platform_str = callback.data.split(":")[1]

    await callback.message.edit_text(
        "Выберите период:",
        reply_markup=get_stats_period_keyboard(f"show_total_stats:{platform_str}")
    )
    await callback.answer()


@router.callback_query(F.data.startswith("show_total_stats:"))
async def callback_show_total_stats(callback: CallbackQuery):
    parts = callback.data.split(":")
    platform_str = parts[1]
    period = parts[2]

    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=callback.from_user.id
        )

        if platform_str == "all":
            platform = None
        elif platform_str == "tiktok":
            platform = Platform.TIKTOK
        else:
            platform = Platform.YOUTUBE

        agg_stats = await stats_service.get_aggregated_stats(user, platform, period)
        text = format_aggregated_stats(agg_stats)

        await callback.message.edit_text(
            text,
            reply_markup=get_back_keyboard("stats:total")
        )
        await callback.answer()


@router.callback_query(F.data.startswith("platform_stats:"))
async def callback_platform_stats(callback: CallbackQuery):
    platform_str = callback.data.split(":")[1]

    await callback.message.edit_text(
        "Выберите период:",
        reply_markup=get_stats_period_keyboard(f"show_platform_stats:{platform_str}")
    )
    await callback.answer()


@router.callback_query(F.data.startswith("show_platform_stats:"))
async def callback_show_platform_stats(callback: CallbackQuery):
    parts = callback.data.split(":")
    platform_str = parts[1]
    period = parts[2]

    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=callback.from_user.id
        )

        platform = Platform.TIKTOK if platform_str == "tiktok" else Platform.YOUTUBE
        agg_stats = await stats_service.get_aggregated_stats(user, platform, period)
        text = format_aggregated_stats(agg_stats)

        await callback.message.edit_text(
            text,
            reply_markup=get_back_keyboard(f"platform:{platform_str}")
        )
        await callback.answer()


@router.callback_query(F.data == "settings")
async def callback_settings(callback: CallbackQuery):
    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=callback.from_user.id
        )

        text = (
            "<b>Настройки</b>\n\n"
            f"Уведомления: {'Включены' if user.notifications_enabled else 'Выключены'}\n\n"
            "Уведомления включают:\n"
            " Достижение 100K+ просмотров\n"
            " Уведомление каждые 100K просмотров\n"
            " Резкий рост просмотров видео"
        )

        await callback.message.edit_text(
            text,
            reply_markup=get_notifications_keyboard(user.notifications_enabled)
        )
        await callback.answer()


@router.callback_query(F.data.startswith("notifications:"))
async def callback_notifications(callback: CallbackQuery):
    action = callback.data.split(":")[1]

    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=callback.from_user.id
        )

        user.notifications_enabled = action == "on"
        await session.commit()

        status = "включены" if user.notifications_enabled else "выключены"
        await callback.answer(f"Уведомления {status}")

        text = (
            "<b>Настройки</b>\n\n"
            f"Уведомления: {'Включены' if user.notifications_enabled else 'Выключены'}\n\n"
            "Уведомления включают:\n"
            " Достижение 100K+ просмотров\n"
            " Уведомление каждые 100K просмотров\n"
            " Резкий рост просмотров видео"
        )

        await callback.message.edit_text(
            text,
            reply_markup=get_notifications_keyboard(user.notifications_enabled)
        )
