# Vinyl Tracker

![React](https://img.shields.io/badge/React-19.2.5-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)
![TanStack Router](https://img.shields.io/badge/TanStack%20Router-1.168.25-blue)
![Zustand](https://img.shields.io/badge/Zustand-5.0.8-blue)

**Простой учёт коллекции виниловых пластинок** на базе публичного API Discogs. Приложение позволяет искать альбомы, добавлять их в коллекцию и отслеживать личные записи с дополнительными метаданными.

## Обзор приложения

**Vinyl Tracker** решает следующую задачу:

Поклонники виниловых пластинок часто покупают альбомы, но теряют информацию о своей коллекции. Существующие решения (Discogs) не очень удобны:
- **Discogs** — сложный интерфейс, много лишней информации.

**Vinyl Tracker** предоставляет:
1. **Быстрый поиск виниловых альбомов** по названию или исполнителю (через Discogs API)
2. **Управление коллекцией** — добавить альбом в коллекцию в папки
3. **Личные записи** — хранить свои заметки об альбомах (год покупки, комментарий, обложка)

### Целевая аудитория
- Коллекционеры виниловых пластинок

### Основные сущности:

1. **Release (Альбом)** — виниловая пластинка на Discogs
   - ID, название, исполнитель, год, жанр, обложка, и т.д.

2. **Collection (Коллекция)** — коллекция альбомов пользователя на Discogs
  - В каждой папке может быть много альбомов

3. **My Record (Моя запись)** — личная заметка об альбоме
   - Отдельно от Discogs, хранится только в браузере
   - Содержит: название, исполнитель, год покупки, описание, обложка
   - Привязана к папке коллекции

---

## Стек технологий

| Технология | Версия | Назначение |
|---|---|---|
| **React** | 19.2.5 | UI фреймворк |
| **TypeScript** | 6.0 | Типизация и статический анализ |
| **TanStack Router** | 1.168.25 | Клиентская маршрутизация |
| **Zustand** | 5.0.8 | Управление состоянием приложения |
| **Vite** | 8.0 | Сборщик проекта |
| **CSS Modules** | Встроено | Изолированные стили компонентов |
| **ESLint** | 10.2.1 | Проверка кода |
| **Prettier** | 3.8.3 | Форматирование кода |

### Внешние API:
- **Discogs API** (https://www.discogs.com/developers/) — поиск альбомов и управление коллекцией

---

## Архитектура проекта

### 🏛️ Слоистая архитектура (Layered Architecture)

Проект разделён на **чёткие слои**, каждый со своей ответственностью

### Почему такая архитектура?

- **Разделение ответственности**: каждый слой делает одно
- **Тестируемость**: логика отделена от UI
- **Переиспользуемость**: компоненты UI не содержат бизнес-логики
- **Масштабируемость**: легко добавлять новые функции

---

## Структура папок

```
src/
├── app/
│   ├── App.tsx              // Главный компонент (шапка, сайдбар, роутинг)
│   ├── App.module.css       // Стили главного компонента
│   ├── router.tsx           // Конфигурация маршрутов и защита
│   ├── main.tsx             // Вход в приложение
│   └── styles/
│       └── index.css        // Глобальные стили (переменные, сброс)
│
├── entities/
│   └── myRecord/
│       ├── index.ts         // Экспорты сущности
│       └── model/
│           ├── store.ts     // Zustand store для личных записей
│           └── types.ts     // TypeScript интерфейсы
│
├── features/
│   └── auth/
│       ├── index.ts         // Экспорты фичи
│       └── model/
│           └── authStore.ts // Zustand store для авторизации
│
├── hooks/
│   ├── useAuth.ts           // Хук для работы с авторизацией
│   └── useIdentity.ts       // Хук для проверки личности пользователя
│
├── pages/
│   ├── SearchPage.tsx       // Поиск альбомов
│   ├── CollectionPage.tsx   // Управление коллекцией
│   ├── AlbumDetailPage.tsx  // Детали альбома
│   └── *.module.css         // CSS модули для каждой страницы
│
└── shared/
    ├── api/
    │   ├── http.ts          // HTTP клиент (Fetch API)
    │   └── discogs/
    │       ├── client.ts    // Discogs API клиент
    │       ├── types.ts     // TypeScript типы для Discogs API
    │       └── index.ts     // Экспорты
    ├── config/
    │   └── env.ts           // Конфигурация переменных окружения
    └── ui/
        ├── index.ts         // Экспорты компонентов
        ├── Alert/           // Компонент с сообщениями
        ├── Badge/           // Компонент для меток
        ├── Button/          // Компонент кнопки
        ├── Card/            // Компонент для блоков контента
        ├── Input/           // Компонент для ввода текста
        └── Spinner/         // Компонент загрузки
```

### Объяснение структуры:

- **app/** — точка входа приложения, глобальная разметка
- **entities/** — самостоятельные сущности (MyRecord), их store и типы
- **features/** — функциональные модули (Auth), их store
- **hooks/** — кастомные хуки для бизнес-логики
- **pages/** — полностраничные компоненты (страницы маршрутов)
- **shared/** — универсальные утилиты, компоненты, конфиги

---

## Как запустить

1. **Создать `.env` файл в корне проекта:**
   # Получить токен на https://www.discogs.com/settings/developers
   VITE_DISCOGS_TOKEN=your_token_here
   ```

2. **Запустить dev-сервер:**
   npm run dev
   ```
   Приложение откроется на http://localhost

3. **Собрать для production:**
   npm run build
   ```

4. **Проверить код:**
   npm run lint
   ```

---

## Как пользоваться

### 1. Поиск (главная страница `/`)
- Введите название альбома или исполнителя
- Нажмите поиск
- Выберите нужный альбом из результатов (только виниловые пластинки)
- Нажмите "Добавить в коллекцию" и выберите папку
- Альбом добавится в вашу коллекцию на Discogs

### 2. Коллекция (`/collection`)
- Требуется:подключённый Discogs токен
- Видите все альбомы из вашей коллекции на Discogs
- Можете фильтровать назв или создатели  
- Для каждого альбома можете создать "Мою запись" — добавить локальные заметки

### 3. Альбом (_Album Detail Page_ `/album/:id`)
- Показывает полную информацию об альбоме

---

## Как всё работает: подробно

### 📱 Поток данных в приложении

```
Пользователь вводит текст в SearchPage
         ↓
Хук useAuth предоставляет DiscogsClient
         ↓
DiscogsClient.searchDatabase() выполняет запрос
         ↓
HttpClient формирует HTTP GET запрос с токеном
         ↓
Fetch API отправляет запрос на https://api.discogs.com
         ↓
Сервер Discogs возвращает JSON
         ↓
HttpClient парсит JSON и проверяет ошибки
         ↓
SearchPage получает результаты и отображает
         ↓
Пользователь нажимает "Добавить в коллекцию"
         ↓
DiscogsClient.addReleaseToCollection() выполняет POST
         ↓
Альбом добавляется в коллекцию на Discogs
```

### 🔐 Авторизация и идентификация

**Процесс:**

1. Пользователь добавляет `VITE_DISCOGS_TOKEN` в `.env`
2. При старте приложения `useIdentity()` проверяет токен
3. Если токен есть — выполняется запрос `/oauth/identity` на Discogs API
4. API возвращает `username` текущего пользователя
5. Username сохраняется в `useAuthStore` (в localStorage)
6. Защитные маршруты (`/collection`, `/album/:id`) проверяют `identityStatus === 'ok'`
7. Если не авторизован — редирект на `/`

**Файлы:**
- [src/hooks/useIdentity.ts](src/hooks/useIdentity.ts) — хук проверки идентификации
- [src/features/auth/model/authStore.ts](src/features/auth/model/authStore.ts) — store авторизации
- [src/app/router.tsx](src/app/router.tsx) — защита маршрутов в `beforeLoad`

### 🌐 Работа с API (HttpClient + DiscogsClient)

**Двухуровневая архитектура API:**

1. **HttpClient** ([src/shared/api/http.ts](src/shared/api/http.ts)) — низкоуровневый HTTP клиент
   - Абстрагирует Fetch API
   - Управляет заголовками, параметрами запроса
   - Обрабатывает HTTP ошибки (4xx, 5xx)
   - Поддерживает `AbortSignal` для отмены запросов

   ```typescript
   const http = new HttpClient(baseUrl, defaultHeaders)
   const json = await http.requestJson({ method: 'GET', path: '/path', query: {...} })
   ```

2. **DiscogsClient** ([src/shared/api/discogs/client.ts](src/shared/api/discogs/client.ts)) — высокоуровневый клиент
   - Использует HttpClient внутри
   - Содержит специфичные для Discogs методы
   - Типизированные параметры и возврат (TypeScript)

   ```typescript
   const client = new DiscogsClient({ token })
   const results = await client.searchDatabase({ q: 'Pink Floyd', type: 'release' })
   const collection = await client.getCollectionReleases({ username, folderId })
   ```

**Обработка ошибок:**
- Сеть недоступна? → `HttpError` с сообщением
- Токен невалидный? → `HttpError 401`
- Лимит API? → `HttpError 429`
- Все ошибки перехватываются в компонентах и показываются в UI

**Отмена запросов:**
- При размонтировании компонента вызывается `ac.abort()`
- Fetch прерывается, не будет утечки памяти

### 💾 Состояние приложения (Zustand Stores)

#### AuthStore ([src/features/auth/model/authStore.ts](src/features/auth/model/authStore.ts))

Хранит данные авторизации:
```typescript
{
  username?: string           // Username Discogs пользователя
  identityStatus: 'idle' | 'loading' | 'ok' | 'error'
  identityError?: string      // Сообщение об ошибке
  tokenFingerprint?: string   // Сокращённый токен (для отслеживания изменений)
}
```

**Методы:**
- `setUsername(username)` — установить username
- `setIdentityStatus(status, error)` — обновить статус авторизации
- `logout()` — выход (очистить всё)
- `resetForTokenChange(fingerprint)` — сбросить при смене токена

**Персистентность:**
- Используется `persist` middleware
- Данные сохраняются в `localStorage` ключе `vinyl-tracker/auth`
- При перезагрузке браузера данные восстанавливаются

#### MyRecordStore ([src/entities/myRecord/model/store.ts](src/entities/myRecord/model/store.ts))

Хранит личные записи об альбомах:
```typescript
{
  records: MyRecord[]  // Массив личных записей
}
```

**MyRecord:**
```typescript
{
  id: string                    // UUID
  folderId: number             // Папка коллекции
  title: string                // Название альбома
  artist: string               // Исполнитель
  year?: number                // Год покупки
  description?: string         // Заметка пользователя
  coverDataUrl?: string        // Base64 обложка
  createdAt: number            // Дата создания (миллисекунды)
  updatedAt: number            // Дата обновления
}
```

**Методы:**
- `add(draft)` — добавить новую запись
- `update(id, patch)` — обновить существующую запись
- `remove(id)` — удалить запись

**Персистентность:**
- Используется `persist` middleware
- Данные сохраняются в `localStorage` ключе `vinyl-tracker/my-records`
- Данные сохраняются только в браузере (не на сервере)

### 🎣 Кастомные хуки

#### useAuth ([src/hooks/useAuth.ts](src/hooks/useAuth.ts))

**Что делает:**
- Объединяет авторизацию и API клиент в один интерфейс
- Предоставляет удобный доступ к токену, username, клиенту

**Возвращает:**
```typescript
{
  token: string | undefined         // Токен Discogs из .env
  username: string | undefined      // Username из store
  client: DiscogsClient              // Инстанс API клиента
  setUsername: (username?) => void  // Функция установки username
  logout: () => void                // Выход
  isAuthed: boolean                 // true если есть токен И username
}
```

**Использование:**
```typescript
const { client, username, isAuthed } = useAuth()
// Теперь можно использовать client.searchDatabase(), etc.
```

#### useIdentity ([src/hooks/useIdentity.ts](src/hooks/useIdentity.ts))

**Что делает:**
- Проверяет идентичность пользователя при старте
- Отслеживает изменения токена
- Перехватывает ошибки авторизации

**Возвращает:**
```typescript
{
  identityStatus: 'idle' | 'loading' | 'ok' | 'error'
  identityError?: string
  username?: string
}
```

**Логика:**
1. Если токена нет → `status = 'error'`
2. Если токен изменился → сброс и новая проверка
3. Если статус `loading` или `ok` → ничего не делать (избежать повтора)
4. Иначе → выполнить запрос `/oauth/identity`
5. Если успешно → `status = 'ok'`, сохранить username
6. Если ошибка → `status = 'error'`, сохранить сообщение об ошибке

**Использование в компонентах:**
```typescript
const { identityStatus } = useIdentity()
if (identityStatus === 'loading') return <Spinner />
if (identityStatus === 'error') return <Alert variant="danger" />
if (identityStatus === 'ok') return <YourContent />
```

### 🎫 UI Компоненты (shared/ui)

Все компоненты переиспользуемые и **не содержат бизнес-логики**:

- **Alert** — показ сообщений (info, success, warning, danger)
- **Badge** — меньшие метки (статусы, жанры)
- **Button** — кнопки с разными вариантами
- **Card** — контейнеры для контента
- **Input** (InputField) — поля для ввода сLabel
- **Spinner** — индикатор загрузки

**Правило:** компоненты получают данные как props, сами не обращаются к store или API.

### 🛣️ Маршрутизация (TanStack Router)

**Файл:** [src/app/router.tsx](src/app/router.tsx)

**Маршруты:**

| Путь | Компонент | Защита | Описание |
|---|---|---|---|
| `/` | SearchPage | ❌ | Поиск альбомов |
| `/collection` | CollectionPage | ✅ | Управление коллекцией |
| `/album/:id` | AlbumDetailPage | ✅ | Детали альбома |

**Защита маршрутов:**
```typescript
const collectionRoute = createRoute({
  path: '/collection',
  component: CollectionPage,
  beforeLoad: () => {
    const { username, identityStatus } = useAuthStore.getState()
    if (identityStatus !== 'ok' || !username) {
      throw redirect({ to: '/' })  // Редирект если не авторизован
    }
  },
})
```

**Как работает:**
1. Пользователь нажимает на `/collection`
2. TanStack Router вызывает `beforeLoad` хук
3. Хук проверяет `useAuthStore`
4. Если не авторизован → выполняется `redirect({ to: '/' })`
5. Если авторизован → компонент загружается

### 🎨 CSS Modules

**Философия:**
- Каждый компонент имеет свой `.module.css`
- Классы изолированы
- Глобальные стили только для переменных и сброса

**Пример:**
```typescript
// SearchPage.tsx
import styles from './SearchPage.module.css'

export default function SearchPage() {
  return <div className={styles.searchContainer}>...</div>
}
```

```css
/* SearchPage.module.css */
.searchContainer {
  display: flex;
  gap: 1rem;
}
```