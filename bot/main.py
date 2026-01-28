import asyncio
import logging
import sys
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

import config
from bot.database import init_db
from bot.handlers import main_router
from bot.scheduler import MonitoringScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)


async def on_startup(bot: Bot, scheduler: MonitoringScheduler):
    logger.info("Initializing database...")
    await init_db()

    logger.info("Starting monitoring scheduler...")
    scheduler.start()

    logger.info("Bot started successfully!")


async def on_shutdown(scheduler: MonitoringScheduler):
    logger.info("Stopping monitoring scheduler...")
    scheduler.stop()

    logger.info("Bot stopped.")


async def main():
    if not config.BOT_TOKEN:
        logger.error("BOT_TOKEN is not set. Please set it in .env file.")
        sys.exit(1)

    bot = Bot(
        token=config.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )

    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)

    dp.include_router(main_router)

    scheduler = MonitoringScheduler(bot)

    await on_startup(bot, scheduler)

    try:
        logger.info("Starting polling...")
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        await on_shutdown(scheduler)
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
