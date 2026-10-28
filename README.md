# dsh-voice-ext

Локальное распознавание **русской** речи для DeepSeek Harness.

Плагин не заменяет встроенный Voice input: он добавляет провайдера в общий сервис
`ctx.speechToText`, поэтому кнопка микрофона, запись и вставка текста остаются штатными.

```
кнопка микрофона → ctx.speechToText → провайдер dsh-voice-ext → GigaAM v3 (sherpa-onnx)
```

## Модель

[GigaAM v3 CTC](https://github.com/salute-developers/GigaAM) (MIT), ONNX-конвертация
[sherpa-onnx-nemo-ctc-giga-am-v3-russian](https://huggingface.co/csukuangfj/sherpa-onnx-nemo-ctc-giga-am-v3-russian-2025-12-16).

- `model.int8.onnx` — 224 721 476 байт, SHA-256 проверяется после скачивания;
- `tokens.txt` — словарь модели;
- каталог по умолчанию: `%LOCALAPPDATA%\dsh-voice-ext\models\gigaam-v3`;
- CPU, ~1.1 с на 5.5-секундную фразу, без Python и GPU.

## Настройки

Страница **Plugins → Voice ext**:

| Поле | По умолчанию | Смысл |
|---|---|---|
| Каталог модели | `%LOCALAPPDATA%\dsh-voice-ext\models\gigaam-v3` | любой каталог с `model.int8.onnx` и `tokens.txt` |
| Потоков CPU | 2 | `numThreads` узнавателя |
| Скачивать автоматически | включено | докачать модель при старте, если её нет |

Выбор провайдера и языка живёт в самом Voice input (сервис `speechToText`);
этот плагин объявляет языки `ru` и `auto`.

Мост для формы: `127.0.0.1:49234` — `GET /status`, `POST /settings`, `POST /prepare`.

## Конфигурация в профиле

```yaml
- insert:
    - id: voice-ext
      name: 'dsh-voice-ext'
      config:
        providerId: dsh-voice-ext
        language: ru
        threads: 2
        autoDownload: true
```

Чтобы плагин стал провайдером по умолчанию, укажите его в записи `speech-to-text`:

```yaml
- id: speech-to-text
  config:
    defaultProvider: dsh-voice-ext
    language: ru
```

## Установка

```json
"dsh-voice-ext": "github:machine202502/dsh-voice-ext#main"
```

и добавить `dsh-voice-ext` в `dsh.profile.bundles`. При установке подтягиваются
`sherpa-onnx-node@1.13.8` и платформенный бинарник (`sherpa-onnx-win-x64` на Windows).
После перезапуска провайдер регистрируется; если модель не найдена и `autoDownload`
включён, она скачается при старте (224 МБ).

## Проверка

```bash
node tests/probe.mjs      # распознаёт tests/fixtures/sample-ru-16k.wav напрямую
node tests/provider.mjs   # регистрирует провайдера и распознаёт через его API
```

Эталон: «Вот мой голос, меня же слышно хорошо».

Диагностический прогон через общий сервис включается конфигом `selfTest: <путь к wav>`;
результат пишется в `%LOCALAPPDATA%\dsh-voice-ext\selftest.json`.

## Зависимости

`sherpa-onnx-node@1.13.8` и платформенный бинарник (`sherpa-onnx-win-x64` и т.п.).

## Лицензия

MIT. Модель GigaAM распространяется по MIT; конвертация — по лицензии sherpa-onnx (Apache-2.0).
