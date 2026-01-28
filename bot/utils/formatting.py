from typing import Optional
from bot.database.models import Account, Platform, AccountStats
from bot.services.stats import PeriodStats, AggregatedStats


def format_number(num: int) -> str:
    if num >= 1_000_000_000:
        return f"{num / 1_000_000_000:.1f}B"
    elif num >= 1_000_000:
        return f"{num / 1_000_000:.1f}M"
    elif num >= 1_000:
        return f"{num / 1_000:.1f}K"
    return str(num)


def format_change(value: int, show_plus: bool = True) -> str:
    formatted = format_number(abs(value))
    if value > 0:
        return f"+{formatted}" if show_plus else formatted
    elif value < 0:
        return f"-{formatted}"
    return "0"


def get_platform_name(platform: Platform) -> str:
    return "TikTok" if platform == Platform.TIKTOK else "YouTube"


def get_platform_emoji(platform: Platform) -> str:
    return "" if platform == Platform.TIKTOK else ""


def format_account_stats(account: Account, stats: Optional[AccountStats]) -> str:
    platform_emoji = get_platform_emoji(account.platform)
    platform_name = get_platform_name(account.platform)

    text = f"{platform_emoji} <b>{account.display_name or account.username}</b>\n"
    text += f"Платформа: {platform_name}\n"
    text += f"Username: @{account.username}\n\n"

    if stats:
        text += f"Подписчики: <b>{format_number(stats.followers)}</b>\n"
        if account.platform == Platform.TIKTOK:
            text += f"Подписки: {format_number(stats.following)}\n"
        text += f"Всего видео: {format_number(stats.total_videos)}\n"
        text += f"Всего просмотров: {format_number(stats.total_views)}\n"
        text += f"Всего лайков: {format_number(stats.total_likes)}\n"
    else:
        text += "Статистика еще не собрана. Подождите обновления данных."

    return text


def format_period_stats(account: Account, period_stats: PeriodStats) -> str:
    platform_emoji = get_platform_emoji(account.platform)
    period_names = {
        "day": "за день",
        "week": "за неделю",
        "month": "за месяц"
    }
    period_name = period_names.get(period_stats.period, period_stats.period)

    text = f"{platform_emoji} <b>{account.display_name or account.username}</b>\n"
    text += f"Статистика {period_name}:\n\n"

    text += f"Подписчики: <b>{format_number(period_stats.followers)}</b> "
    text += f"({format_change(period_stats.followers_change)})\n"

    text += f"Просмотры: <b>{format_number(period_stats.views)}</b> "
    text += f"({format_change(period_stats.views_change)})\n"

    text += f"Лайки: <b>{format_number(period_stats.likes)}</b> "
    text += f"({format_change(period_stats.likes_change)})\n"

    text += f"Комментарии: <b>{format_number(period_stats.comments)}</b> "
    text += f"({format_change(period_stats.comments_change)})\n"

    if period_stats.shares > 0 or period_stats.shares_change != 0:
        text += f"Репосты: <b>{format_number(period_stats.shares)}</b> "
        text += f"({format_change(period_stats.shares_change)})\n"

    text += f"\nНовых видео: <b>{period_stats.new_videos}</b>"

    return text


def format_aggregated_stats(agg_stats: AggregatedStats,
                            period_name: Optional[str] = None) -> str:
    if agg_stats.platform == Platform.TIKTOK:
        text = " <b>Общая статистика TikTok</b>\n\n"
    elif agg_stats.platform == Platform.YOUTUBE:
        text = " <b>Общая статистика YouTube</b>\n\n"
    else:
        text = " <b>Общая статистика всех платформ</b>\n\n"

    text += f"Аккаунтов: <b>{agg_stats.accounts_count}</b>\n"
    text += f"Всего подписчиков: <b>{format_number(agg_stats.total_followers)}</b>\n"
    text += f"Всего просмотров: <b>{format_number(agg_stats.total_views)}</b>\n"
    text += f"Всего лайков: <b>{format_number(agg_stats.total_likes)}</b>\n"
    text += f"Всего видео: <b>{format_number(agg_stats.total_videos)}</b>\n"

    if agg_stats.period_stats:
        period_names = {
            "day": "за день",
            "week": "за неделю",
            "month": "за месяц"
        }
        pn = period_names.get(agg_stats.period_stats.period, agg_stats.period_stats.period)
        ps = agg_stats.period_stats

        text += f"\n<b>Изменения {pn}:</b>\n"
        text += f"Подписчики: {format_change(ps.followers_change)}\n"
        text += f"Просмотры: {format_change(ps.views_change)}\n"
        text += f"Лайки: {format_change(ps.likes_change)}\n"
        text += f"Комментарии: {format_change(ps.comments_change)}\n"
        if ps.shares_change != 0:
            text += f"Репосты: {format_change(ps.shares_change)}\n"
        text += f"Новых видео: <b>{ps.new_videos}</b>"

    return text


def format_video_stats(video_title: str, video_url: str,
                       views: int, likes: int, comments: int,
                       shares: int = 0, platform: Platform = None) -> str:
    platform_emoji = get_platform_emoji(platform) if platform else ""

    text = f"{platform_emoji} <b>{video_title[:50]}{'...' if len(video_title) > 50 else ''}</b>\n\n"
    text += f"Просмотры: <b>{format_number(views)}</b>\n"
    text += f"Лайки: <b>{format_number(likes)}</b>\n"
    text += f"Комментарии: <b>{format_number(comments)}</b>\n"
    if shares > 0:
        text += f"Репосты: <b>{format_number(shares)}</b>\n"
    text += f"\n<a href='{video_url}'>Смотреть видео</a>"

    return text


def format_viral_notification(account_name: str, video_title: str,
                               video_url: str, views: int,
                               milestone: int, platform: Platform) -> str:
    platform_emoji = get_platform_emoji(platform)

    text = f" <b>ВИРУСНОЕ ВИДЕО!</b>\n\n"
    text += f"{platform_emoji} Аккаунт: <b>{account_name}</b>\n"
    text += f"Видео: <b>{video_title[:40]}{'...' if len(video_title) > 40 else ''}</b>\n\n"
    text += f"Достигнут рубеж: <b>{format_number(milestone)}</b> просмотров!\n"
    text += f"Текущие просмотры: <b>{format_number(views)}</b>\n\n"
    text += f"<a href='{video_url}'>Смотреть видео</a>"

    return text


def format_growth_notification(account_name: str, video_title: str,
                                video_url: str, views: int,
                                growth_percent: float,
                                platform: Platform) -> str:
    platform_emoji = get_platform_emoji(platform)

    text = f" <b>ВИДЕО НАБИРАЕТ ОБОРОТЫ!</b>\n\n"
    text += f"{platform_emoji} Аккаунт: <b>{account_name}</b>\n"
    text += f"Видео: <b>{video_title[:40]}{'...' if len(video_title) > 40 else ''}</b>\n\n"
    text += f"Рост просмотров: <b>+{growth_percent:.0f}%</b> за час\n"
    text += f"Текущие просмотры: <b>{format_number(views)}</b>\n\n"
    text += f"<a href='{video_url}'>Смотреть видео</a>"

    return text
