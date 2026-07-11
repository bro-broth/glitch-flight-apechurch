# Glitch Flight → Ape Church: гайд по подаче заявки

Эта папка — готовый порт Glitch Flight под требования Ape Church, собранный на официальном шаблоне [ape-church-game-template](https://github.com/ape-church/ape-church-game-template). Игра на вашем сайте не затронута — это отдельный клон.

## Что внутри

```
components/glitch-flight/      ← вся игра (5 файлов)
  MyGame.tsx                   ← лайфсайкл: playGame / handleReset / handlePlayAgain / handleRewatch / handleCashOut
  MyGameWindow.tsx             ← сцена полёта (облака, койны, дроид, глитч, краш)
  MyGameSetupCard.tsx          ← панель ставки / APE OUT / результаты
  myGameConfig.ts              ← конфиг + provably-fair формула crash point (порт с вашего game-server)
  glitch-flight.styles.css     ← анимации
public/glitch-flight/          ← ассеты, всего ~5.1MB (лимит 10MB)
  card.png (1024×1024, 1:1)  banner.png (1024×512, 2:1)
metadata.json                  ← заявка
```

Механика: ставка → он-чейн random word детерминированно задаёт crash point → мультипликатор растёт по экспоненте → APE OUT до краша = выигрыш bet × X, иначе 0. Rewatch воспроизводит раунд из того же random word без новой транзакции.

## ⚠️ Перед подачей ОБЯЗАТЕЛЬНО заполнить

В `metadata.json`:
1. `authors[0].telegram` и `revenueShare[0].telegram` — сейчас стоит `YOUR_TELEGRAM_USERNAME`
2. `revenueShare[0].address` — **ваш реальный ERC-20 адрес** (сейчас нули). На него автоматически идут выплаты revenue share (% от house edge вашей игры)
3. `team` — сейчас `apedroidz`; должен совпадать с именем папки в PR (kebab-case)
4. `submittedAt` — дата подачи

## Проверка локально

```bash
npm install
npm run dev          # http://localhost:3000
npx tsc --noEmit     # 0 ошибок
```

## Шаги подачи

1. **Свой репозиторий из шаблона**: на GitHub у [ape-church-game-template](https://github.com/ape-church/ape-church-game-template) нажать **Use this template → Create a new repository** (НЕ fork). Запушить туда содержимое этой папки:
   ```bash
   git remote add origin git@github.com:ВАШ_АККАУНТ/glitch-flight-apechurch.git
   git push -u origin main
   ```

2. **Fork** репозитория [ape-church-game-submissions](https://github.com/ape-church/ape-church-game-submissions).

3. **Скопировать в fork ровно три вещи** (пути меняются!):
   ```
   components/glitch-flight/  →  components/games/glitch-flight/
   public/glitch-flight/      →  public/submissions/glitch-flight/
   metadata.json              →  submissions/apedroidz/glitch-flight/metadata.json
   ```
   И в `components/games/glitch-flight/myGameConfig.ts` поменять одну строку:
   ```ts
   export const ASSET_BASE = "/submissions/glitch-flight";
   ```
   (все пути к ассетам в коде идут через эту константу).

4. **PR** из fork в `main` репозитория submissions. Заголовок: `[ApeDroidz] Glitch Flight`. Один PR — одна игра, никаких других файлов (никаких package.json / tsconfig / app / lib).

5. Автопроверки PR → ревью команды → мерж → превью на submissions.ape.church → ручная интеграция в прод.

Вопросы: ministry@ape.church · [Discord](https://discord.gg/3Jxeeqt59W) · [Telegram](https://t.me/+wgoE4TSxxcM5Njdh)

## Что платформа подставит сама при интеграции

- Реальную он-чейн транзакцию и random word (Chainlink VRF) — сейчас в `playGame()` мок с `console.log`, как требует шаблон
- Реальный баланс кошелька (сейчас константа 25 APE)
- Финальные house edge / cap (в `myGameConfig.ts` подписаны как protocol-configured)

Файл `SUBMISSION_GUIDE.md` и правка импорта в `app/page.tsx` — только для локальной разработки, в PR они не попадают.
