# TikTok & YouTube Analytics Bot

Telegram бот для аналитики TikTok и YouTube аккаунтов с уведомлениями о вирусных видео и отслеживанием статистики.

## Возможности

- **Мониторинг нескольких аккаунтов** TikTok и YouTube
- **Уведомления о вирусных видео** - оповещение при достижении 100K+ просмотров
- **Отслеживание роста** - уведомление каждые 100K просмотров
- **Детекция быстрого роста** - оповещение когда видео "набирает обороты"
- **Статистика за период** - день, неделя, месяц
- **Агрегированная статистика** - общая статистика по платформе и всем аккаунтам
- **Отслеживание метрик**:
  - Просмотры
  - Лайки
  - Комментарии
  - Репосты
  - Подписчики

## Установка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd zavodik
```

### 2. Создание виртуального окружения

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

### 3. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 4. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните параметры:

```bash
cp .env.example .env
```

Обязательные параметры:
- `BOT_TOKEN` - токен бота от [@BotFather](https://t.me/BotFather)
- `YOUTUBE_API_KEY` - API ключ YouTube Data API v3 из [Google Cloud Console](https://console.cloud.google.com/)

### 5. Запуск бота

```bash
python -m bot.main
```

## Настройка YouTube API

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Перейдите в "APIs & Services" -> "Library"
4. Найдите и включите "YouTube Data API v3"
5. Перейдите в "APIs & Services" -> "Credentials"
6. Создайте API key
7. Скопируйте ключ в `.env` файл

## Команды бота

- `/start` - Главное меню
- `/help` - Справка
- `/stats` - Общая статистика
- `/accounts` - Список аккаунтов
- `/add` - Добавить аккаунт

## Архитектура

```
bot/
├── main.py              # Точка входа
├── handlers/            # Обработчики команд и callback
│   ├── commands.py      # Команды /start, /help и т.д.
│   ├── callbacks.py     # Callback-обработчики кнопок
│   └── accounts.py      # Управление аккаунтами
├── services/            # Бизнес-логика
│   ├── tiktok.py        # TikTok API
│   ├── youtube.py       # YouTube API
│   └── stats.py         # Статистика
├── database/            # База данных
│   ├── models.py        # SQLAlchemy модели
│   └── session.py       # Сессии БД
├── scheduler/           # Планировщик задач
│   └── monitoring.py    # Мониторинг и уведомления
├── keyboards/           # Клавиатуры Telegram
│   └── inline.py        # Inline кнопки
└── utils/               # Утилиты
    └── formatting.py    # Форматирование сообщений
```

## Конфигурация

| Параметр | По умолчанию | Описание |
|----------|--------------|----------|
| `VIDEO_CHECK_INTERVAL` | 10 | Интервал проверки видео (минуты) |
| `STATS_COLLECT_INTERVAL` | 30 | Интервал сбора статистики (минуты) |
| `VIRAL_VIEW_THRESHOLD` | 100000 | Порог для вирусного видео |
| `VIRAL_NOTIFICATION_STEP` | 100000 | Шаг уведомлений |
| `GROWTH_RATE_THRESHOLD` | 50.0 | Порог роста (%) |
| `GROWTH_TIME_WINDOW` | 60 | Окно для расчета роста (минуты) |

## Docker

```bash
docker build -t analytics-bot .
docker run -d --env-file .env analytics-bot
```

## Лицензия

MIT
