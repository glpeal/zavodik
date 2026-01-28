import logging
from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command, CommandStart

from bot.database import get_session
from bot.services.stats import StatsService
from bot.keyboards import get_main_menu_keyboard

logger = logging.getLogger(__name__)
router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    async with get_session() as session:
        stats_service = StatsService(session)
        await stats_service.get_or_create_user(
            telegram_id=message.from_user.id,
            username=message.from_user.username,
            first_name=message.from_user.first_name
        )

    welcome_text = (
        "<b>Добро пожаловать в Analytics Bot!</b>\n\n"
        "Я помогу вам отслеживать статистику ваших TikTok и YouTube аккаунтов.\n\n"
        "<b>Возможности:</b>\n"
        " Мониторинг нескольких аккаунтов\n"
        " Уведомления о вирусных видео (100K+)\n"
        " Отслеживание роста просмотров\n"
        " Статистика за день/неделю/месяц\n"
        " Общая статистика по платформам\n\n"
        "Выберите платформу для начала работы:"
    )

    await message.answer(welcome_text, reply_markup=get_main_menu_keyboard())


@router.message(Command("help"))
async def cmd_help(message: Message):
    help_text = (
        "<b>Справка по командам:</b>\n\n"
        "/start - Главное меню\n"
        "/help - Эта справка\n"
        "/stats - Общая статистика\n"
        "/accounts - Список аккаунтов\n"
        "/add - Добавить аккаунт\n\n"
        "<b>Как добавить аккаунт:</b>\n"
        "1. Нажмите на платформу (TikTok/YouTube)\n"
        "2. Выберите 'Добавить аккаунт'\n"
        "3. Отправьте ссылку на профиль\n\n"
        "<b>Уведомления:</b>\n"
        "Бот автоматически уведомит вас когда:\n"
        " Видео достигнет 100K просмотров\n"
        " Каждые следующие 100K просмотров\n"
        " Видео начинает резко расти\n"
    )

    await message.answer(help_text)


@router.message(Command("stats"))
async def cmd_stats(message: Message):
    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=message.from_user.id
        )

        from bot.database.models import Platform
        from bot.utils import format_aggregated_stats

        tiktok_stats = await stats_service.get_aggregated_stats(user, Platform.TIKTOK)
        youtube_stats = await stats_service.get_aggregated_stats(user, Platform.YOUTUBE)
        total_stats = await stats_service.get_aggregated_stats(user)

        if total_stats.accounts_count == 0:
            await message.answer(
                "У вас пока нет добавленных аккаунтов.\n"
                "Добавьте аккаунт через главное меню.",
                reply_markup=get_main_menu_keyboard()
            )
            return

        text = ""
        if tiktok_stats.accounts_count > 0:
            text += format_aggregated_stats(tiktok_stats) + "\n\n"
        if youtube_stats.accounts_count > 0:
            text += format_aggregated_stats(youtube_stats) + "\n\n"

        text += f"<b>Всего аккаунтов:</b> {total_stats.accounts_count}\n"
        text += f"<b>Всего подписчиков:</b> {total_stats.total_followers:,}\n"
        text += f"<b>Всего просмотров:</b> {total_stats.total_views:,}"

        await message.answer(text, reply_markup=get_main_menu_keyboard())


@router.message(Command("accounts"))
async def cmd_accounts(message: Message):
    async with get_session() as session:
        stats_service = StatsService(session)
        user = await stats_service.get_or_create_user(
            telegram_id=message.from_user.id
        )
        accounts = await stats_service.get_user_accounts(user)

        if not accounts:
            await message.answer(
                "У вас пока нет добавленных аккаунтов.\n"
                "Добавьте аккаунт через главное меню.",
                reply_markup=get_main_menu_keyboard()
            )
            return

        from bot.keyboards import get_accounts_keyboard
        await message.answer(
            "Ваши аккаунты:",
            reply_markup=get_accounts_keyboard(accounts)
        )


@router.message(Command("add"))
async def cmd_add(message: Message):
    await message.answer(
        "Выберите платформу для добавления аккаунта:",
        reply_markup=get_main_menu_keyboard()
    )
