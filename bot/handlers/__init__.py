from aiogram import Router

from bot.handlers.commands import router as commands_router
from bot.handlers.callbacks import router as callbacks_router
from bot.handlers.accounts import router as accounts_router

main_router = Router()
main_router.include_router(commands_router)
main_router.include_router(callbacks_router)
main_router.include_router(accounts_router)

__all__ = ["main_router"]
