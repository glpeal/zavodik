from typing import List, Optional
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder

from bot.database.models import Account, Platform


def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="TikTok", callback_data="platform:tiktok"),
        InlineKeyboardButton(text="YouTube", callback_data="platform:youtube")
    )
    builder.row(
        InlineKeyboardButton(text="Все аккаунты", callback_data="accounts:all")
    )
    builder.row(
        InlineKeyboardButton(text="Общая статистика", callback_data="stats:total")
    )
    builder.row(
        InlineKeyboardButton(text="Настройки", callback_data="settings")
    )
    return builder.as_markup()


def get_platform_keyboard(platform: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(
            text="Мои аккаунты",
            callback_data=f"accounts:{platform}"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Добавить аккаунт",
            callback_data=f"add_account:{platform}"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Статистика платформы",
            callback_data=f"platform_stats:{platform}"
        )
    )
    builder.row(
        InlineKeyboardButton(text="Назад", callback_data="menu")
    )
    return builder.as_markup()


def get_accounts_keyboard(accounts: List[Account],
                          platform: Optional[str] = None) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()

    for account in accounts:
        platform_emoji = "" if account.platform == Platform.TIKTOK else ""
        builder.row(
            InlineKeyboardButton(
                text=f"{platform_emoji} {account.display_name or account.username}",
                callback_data=f"account:{account.id}"
            )
        )

    if platform:
        builder.row(
            InlineKeyboardButton(
                text="Добавить аккаунт",
                callback_data=f"add_account:{platform}"
            )
        )
        builder.row(
            InlineKeyboardButton(text="Назад", callback_data=f"platform:{platform}")
        )
    else:
        builder.row(
            InlineKeyboardButton(text="Назад", callback_data="menu")
        )

    return builder.as_markup()


def get_account_actions_keyboard(account_id: int,
                                  platform: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(
            text="Текущая статистика",
            callback_data=f"account_stats:{account_id}:current"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Статистика за день",
            callback_data=f"account_stats:{account_id}:day"
        ),
        InlineKeyboardButton(
            text="За неделю",
            callback_data=f"account_stats:{account_id}:week"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="За месяц",
            callback_data=f"account_stats:{account_id}:month"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Видео аккаунта",
            callback_data=f"account_videos:{account_id}"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Обновить данные",
            callback_data=f"refresh_account:{account_id}"
        )
    )
    builder.row(
        InlineKeyboardButton(
            text="Удалить аккаунт",
            callback_data=f"delete_account:{account_id}"
        )
    )
    builder.row(
        InlineKeyboardButton(text="Назад", callback_data=f"accounts:{platform}")
    )
    return builder.as_markup()


def get_stats_period_keyboard(prefix: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="За день", callback_data=f"{prefix}:day"),
        InlineKeyboardButton(text="За неделю", callback_data=f"{prefix}:week")
    )
    builder.row(
        InlineKeyboardButton(text="За месяц", callback_data=f"{prefix}:month")
    )
    builder.row(
        InlineKeyboardButton(text="Назад", callback_data="menu")
    )
    return builder.as_markup()


def get_stats_type_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="TikTok", callback_data="total_stats:tiktok"),
        InlineKeyboardButton(text="YouTube", callback_data="total_stats:youtube")
    )
    builder.row(
        InlineKeyboardButton(text="Все платформы", callback_data="total_stats:all")
    )
    builder.row(
        InlineKeyboardButton(text="Назад", callback_data="menu")
    )
    return builder.as_markup()


def get_back_keyboard(callback_data: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="Назад", callback_data=callback_data)
    )
    return builder.as_markup()


def get_confirm_keyboard(action: str, target_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(
            text="Да, удалить",
            callback_data=f"confirm_{action}:{target_id}"
        ),
        InlineKeyboardButton(
            text="Отмена",
            callback_data=f"account:{target_id}"
        )
    )
    return builder.as_markup()


def get_notifications_keyboard(enabled: bool) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    if enabled:
        builder.row(
            InlineKeyboardButton(
                text="Выключить уведомления",
                callback_data="notifications:off"
            )
        )
    else:
        builder.row(
            InlineKeyboardButton(
                text="Включить уведомления",
                callback_data="notifications:on"
            )
        )
    builder.row(
        InlineKeyboardButton(text="Назад", callback_data="menu")
    )
    return builder.as_markup()
