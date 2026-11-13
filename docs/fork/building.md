# Сборка и запуск

## Окружение

Нужны Git, Node.js из корневого `.nvmrc` и npm из этой версии Node.js.
Команды выполняются из корня репозитория. Упаковывайте приложение на целевой ОС:
Windows x64 для NSIS, Linux x64 для AppImage.

```bash
npm ci --legacy-peer-deps
npm run build:shared
```

`build:shared` повторяет порядок сборки библиотек из GitHub Actions.
Альтернатива для первого запуска — `npm run setup`: удаляет старые `node_modules`,
устанавливает зависимости и собирает библиотеки.

## Разработка

```bash
npm run dev
```

Скрипт запускает Rsbuild и Electron.

| Путь | Назначение |
| --- | --- |
| `packages/bruno-app` | React-интерфейс и локализация |
| `packages/bruno-electron` | Desktop-приложение, IPC, упаковка |
| `packages/bruno-app/src/i18n` | Словари и настройки языка |
| `packages/bruno-app/plugins/ui-translations` | Подстановка переводов при сборке |
| `scripts/tests` | Проверки форка и запуск упакованного приложения |
| `.github/workflows/clean-build.yml` | CI и выпуск Windows/Linux |

## Проверки исходников

```bash
npm run version:check
npm run test:fork
npm run lint -- path/to/changed-file.js
```

Проверки перевода используют установленный i18next, проверяют подстановки, формы множественного
числа и сохранность пользовательских значений. Также проверяется маскирование
чувствительных значений mock-сервером после удаления ИИ-модулей.

## Упаковка

После установки зависимостей и сборки общих библиотек:

```bash
npm run build:web
node scripts/prepare-clean-electron.cjs
```

На Windows:

```powershell
npm run dist:win --workspace=packages/bruno-electron -- --x64 --publish never
```

На Linux:

```bash
npm run dist:linux --workspace=packages/bruno-electron -- --x64 --publish never
```

Файлы появятся в `packages/bruno-electron/out/`. При версии `2.1.0`:

- `bruno_2.1.0_x64_setup.exe` — Windows x64.
- `bruno_2.1.0_x86_64_linux.AppImage` — Linux x64.

Linux-сборка проверяется командой `xvfb-run -a node scripts/tests/clean-smoke.cjs`.
На Windows скрипт использует `out/win-unpacked/bruno.exe` либо путь из переменной
`BRUNO_CLEAN_EXECUTABLE`. CI сначала устанавливает NSIS-пакет во временную папку и проверяет установленный файл.
Профили smoke-тестов изолированы от пользовательских настроек.

## Если AppImage не запускается

Если система не поддерживает запуск через FUSE, распакуйте AppImage:

```bash
./bruno_2.1.0_x86_64_linux.AppImage --appimage-extract
./squashfs-root/AppRun
```

Если приложение работает, но окно не видно в Wayland или виртуальной машине, попробуйте:

```bash
./squashfs-root/AppRun --ozone-platform=x11 --disable-gpu
```

Для окна нужен графический сеанс. Эти параметры не требуются на всех системах.
Настройки упаковки находятся в `packages/bruno-electron/electron-builder-config.js`.

## Публикация

Правила версий и создания тегов — в [versioning.md](versioning.md).
Локальная упаковка сама по себе не публикует файлы в GitHub Releases.
