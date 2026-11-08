window.__ModuleLoader__.load({
  id: 'dsh-voice-ext',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const base = 'http://127.0.0.1:49234';

    /**
     * Interface languages and the resolution order shared by the plugins in
     * this folder: a saved ru/en/zh wins, a saved `auto` follows the
     * application locale, and with no setting at all the default is ru.
     */
    const LANGUAGES = ['ru', 'en', 'zh', 'auto'];
    const DEFAULT_LANGUAGE = 'ru';

    /** The application locale, consulted only when the saved setting is `auto`. */
    const detectLanguage = () => {
      const raw = String(
        (typeof document === 'undefined' ? '' : document.documentElement?.lang)
        || (typeof navigator === 'undefined' ? '' : navigator.language)
        || 'en',
      ).toLowerCase();
      if (raw.startsWith('ru')) return 'ru';
      if (raw.startsWith('zh')) return 'zh';
      return 'en';
    };

    const resolveLanguage = (settings) => {
      const preference = settings?.language;
      if (preference === 'ru' || preference === 'en' || preference === 'zh') return preference;
      if (preference === 'auto') return detectLanguage();
      return DEFAULT_LANGUAGE;
    };

    const STRINGS = {
      en: {
        title: 'Voice ext',
        statusReady: 'Model installed',
        statusMissing: 'Model not installed',
        statusDownloading: 'Downloading the model…',
        modelDir: 'Model directory',
        modelDirHint: 'a folder with model.int8.onnx and tokens.txt',
        threads: 'CPU threads',
        autoDownload: 'Download automatically',
        language: 'Language',
        languageHint: 'Auto follows the application language',
        languageRu: 'Русский',
        languageEn: 'English',
        languageZh: '中文',
        auto: 'Auto',
        unitMb: 'MB',
        save: 'Save',
        saved: 'Saved',
        saveFailed: 'Could not save',
        install: 'Download model',
        installing: 'Downloading…',
        installFailed: 'Could not download the model',
        selection: 'Current selection',
        unavailable: 'Local service is unavailable',
        loading: 'Loading…',
      },
      ru: {
        title: 'Voice ext',
        statusReady: 'Модель установлена',
        statusMissing: 'Модель не установлена',
        statusDownloading: 'Скачивается модель…',
        modelDir: 'Каталог модели',
        modelDirHint: 'папка с model.int8.onnx и tokens.txt',
        threads: 'Потоков CPU',
        autoDownload: 'Скачивать автоматически',
        language: 'Язык',
        languageHint: 'Авто — по языку приложения',
        languageRu: 'Русский',
        languageEn: 'English',
        languageZh: '中文',
        auto: 'Авто',
        unitMb: 'МБ',
        save: 'Сохранить',
        saved: 'Сохранено',
        saveFailed: 'Не удалось сохранить',
        install: 'Скачать модель',
        installing: 'Скачивание…',
        installFailed: 'Не удалось скачать модель',
        selection: 'Текущий выбор',
        unavailable: 'Локальный сервис недоступен',
        loading: 'Загрузка…',
      },
      zh: {
        title: 'Voice ext',
        statusReady: '模型已安装',
        statusMissing: '模型未安装',
        statusDownloading: '正在下载模型…',
        modelDir: '模型目录',
        modelDirHint: '包含 model.int8.onnx 和 tokens.txt 的文件夹',
        threads: 'CPU 线程数',
        autoDownload: '自动下载',
        language: '语言',
        languageHint: '自动 — 跟随应用界面语言',
        languageRu: 'Русский',
        languageEn: 'English',
        languageZh: '中文',
        auto: '自动',
        unitMb: 'MB',
        save: '保存',
        saved: '已保存',
        saveFailed: '保存失败',
        install: '下载模型',
        installing: '正在下载…',
        installFailed: '模型下载失败',
        selection: '当前选择',
        unavailable: '本地服务不可用',
        loading: '加载中…',
      },
    };

    const ensureStyles = () => {
      if (document.querySelector('style[data-plugin="voice-ext-settings"]')) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = 'voice-ext-settings';
      tag.textContent = `
.ve-set { display: flex; flex-direction: column; gap: 16px; max-width: 620px; padding: 4px 0 8px; font-size: 13px; line-height: 20px; }
.ve-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; min-height: 36px; }
.ve-label { color: inherit; }
.ve-hint { margin-top: 2px; font-size: 12px; line-height: 16px; color: #8a8a8a; }
.ve-state { display: inline-flex; align-items: center; gap: 6px; color: #8a8a8a; }
.ve-dot { width: 8px; height: 8px; border-radius: 50%; background: #d9d9d9; }
.ve-dot--ok { background: #2e9e5b; }
.ve-input { width: 100%; height: 32px; padding: 0 10px; border: 1px solid #dcdcdc; border-radius: 10px; background: #fff; color: inherit; font: inherit; outline: none; box-sizing: border-box; }
.ve-input:focus { border-color: #9a9a9a; }
.ve-input--short { width: 88px; }
.ve-select { height: 32px; min-width: 150px; padding: 0 10px; border: 1px solid #dcdcdc; border-radius: 10px; background: #fff; color: inherit; font: inherit; outline: none; box-sizing: border-box; cursor: pointer; }
.ve-select:focus { border-color: #9a9a9a; }
.ve-switch { appearance: none; -webkit-appearance: none; position: relative; width: 36px; height: 20px; margin: 0; border-radius: 999px; background: #d9d9d9; cursor: pointer; transition: background 120ms ease; }
.ve-switch:checked { background: #1f1f1f; }
.ve-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform 120ms ease; }
.ve-switch:checked::after { transform: translateX(16px); }
.ve-actions { display: flex; align-items: center; gap: 12px; padding-top: 6px; }
.ve-btn { height: 34px; padding: 0 16px; border: 1px solid #dcdcdc; border-radius: 10px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.ve-btn--primary { border: none; background: #1f1f1f; color: #fff; }
.ve-btn[disabled] { opacity: 0.45; cursor: default; }
.ve-status { font-size: 12px; color: #8a8a8a; }
.ve-status--error { color: #c0392b; }
`;
      document.head.appendChild(tag);
    };

    function VoiceSettings() {
      ensureStyles();
      const [state, setState] = React.useState({ status: 'loading' });
      const [saving, setSaving] = React.useState(false);
      const [notice, setNotice] = React.useState({ text: '', error: false });

      const load = () => fetch(`${base}/status`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((data) => setState({ status: 'ready', ...data }))
        .catch(() => setState({ status: 'error' }));

      React.useEffect(() => {
        let alive = true;
        load().then(() => { if (!alive) return; });
        return () => { alive = false; };
      }, []);

      // Before the first fetch the settings are unknown, so the default (ru)
      // applies; afterwards the saved preference decides.
      const strings = STRINGS[resolveLanguage(state)];

      if (state.status === 'loading') return h('div', { className: 've-set', style: { color: '#8a8a8a' } }, strings.loading);
      if (state.status === 'error') return h('div', { className: 've-set', style: { color: '#c0392b' } }, strings.unavailable);

      const update = (patch) => setState((current) => ({ ...current, ...patch }));

      const save = async () => {
        setSaving(true);
        setNotice({ text: '', error: false });
        try {
          const response = await fetch(`${base}/settings`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              modelDir: state.modelDir,
              threads: state.threads,
              autoDownload: state.autoDownload,
              language: state.language ?? DEFAULT_LANGUAGE,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
          setState({ status: 'ready', ...data });
          setNotice({ text: STRINGS[resolveLanguage(data)].saved, error: false });
        } catch (error) {
          setNotice({ text: `${strings.saveFailed}: ${String(error.message ?? error)}`, error: true });
        } finally {
          setSaving(false);
        }
      };

      const install = async () => {
        setSaving(true);
        setNotice({ text: strings.installing, error: false });
        try {
          const response = await fetch(`${base}/prepare`, { method: 'POST' });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
          setState({ status: 'ready', ...data });
          setNotice({ text: '', error: false });
        } catch (error) {
          setNotice({ text: `${strings.installFailed}: ${String(error.message ?? error)}`, error: true });
        } finally {
          setSaving(false);
        }
      };

      const megabytes = Math.round((state.bytes ?? 0) / 1024 / 1024);
      const label = state.phase === 'downloading'
        ? strings.statusDownloading
        : state.installed
          ? `${strings.statusReady} · ${megabytes} ${strings.unitMb}`
          : strings.statusMissing;

      const languageLabels = {
        ru: strings.languageRu,
        en: strings.languageEn,
        zh: strings.languageZh,
        auto: strings.auto,
      };

      return h('div', { className: 've-set' },
        h('div', { className: 've-row' },
          h('div', null,
            h('div', { className: 've-label' }, strings.title),
            h('div', { className: 've-hint' }, state.selection
              ? `${strings.selection}: ${state.selection.providerId} · ${state.selection.language}`
              : strings.title),
          ),
          h('span', { className: 've-state' },
            h('span', { className: `ve-dot${state.installed ? ' ve-dot--ok' : ''}` }),
            label,
          ),
        ),
        h('div', { className: 've-row' },
          h('div', null,
            h('div', { className: 've-label' }, strings.language),
            h('div', { className: 've-hint' }, strings.languageHint),
          ),
          h('select', {
            className: 've-select',
            value: state.language ?? DEFAULT_LANGUAGE,
            onChange: (event) => update({ language: event.target.value }),
          }, LANGUAGES.map((value) => h('option', { key: value, value }, languageLabels[value]))),
        ),
        h('div', null,
          h('div', { className: 've-label' }, strings.modelDir),
          h('input', {
            className: 've-input',
            value: state.modelDir ?? '',
            onChange: (event) => update({ modelDir: event.target.value }),
            spellCheck: false,
          }),
          h('div', { className: 've-hint' }, strings.modelDirHint),
        ),
        h('div', { className: 've-row' },
          h('div', { className: 've-label' }, strings.threads),
          h('input', {
            type: 'number',
            min: 1,
            max: 16,
            className: 've-input ve-input--short',
            value: state.threads ?? 2,
            onChange: (event) => update({ threads: Number(event.target.value) }),
          }),
        ),
        h('div', { className: 've-row' },
          h('div', { className: 've-label' }, strings.autoDownload),
          h('input', {
            type: 'checkbox',
            className: 've-switch',
            checked: state.autoDownload !== false,
            onChange: (event) => update({ autoDownload: event.target.checked }),
          }),
        ),
        h('div', { className: 've-actions' },
          h('button', { className: 've-btn ve-btn--primary', disabled: saving, onClick: save }, strings.save),
          h('button', { className: 've-btn', disabled: saving || state.installed, onClick: install }, strings.install),
          notice.text ? h('span', { className: `ve-status${notice.error ? ' ve-status--error' : ''}` }, notice.text) : null,
        ),
      );
    }

    /**
     * Keep dictation alive while the window loses focus.
     *
     * The built-in voice input cancels a recording on window blur and on a
     * hidden document. Both listeners are registered after this plugin applies,
     * so wrapping addEventListener lets an active microphone stream swallow
     * those two event types and keep recording until the user stops it.
     */
    const installBackgroundMicrophone = () => {
      if (window.__dshVoiceBackgroundMicrophone) return;
      window.__dshVoiceBackgroundMicrophone = true;
      const media = navigator.mediaDevices;
      if (!media || typeof media.getUserMedia !== 'function') return;

      let live = 0;
      const original = media.getUserMedia.bind(media);
      media.getUserMedia = async (constraints) => {
        const stream = await original(constraints);
        live += 1;
        const release = () => { live = Math.max(0, live - 1); };
        for (const track of stream.getTracks()) track.addEventListener('ended', release, { once: true });
        return stream;
      };

      const wrap = (target) => {
        const add = target.addEventListener.bind(target);
        const remove = target.removeEventListener.bind(target);
        const registry = new WeakMap();
        target.addEventListener = function (type, listener, options) {
          if (typeof listener === 'function' && (type === 'blur' || type === 'visibilitychange')) {
            let wrapped = registry.get(listener);
            if (wrapped === undefined) {
              wrapped = function (event) {
                if (live > 0) return;
                return listener.call(this, event);
              };
              registry.set(listener, wrapped);
            }
            return add(type, wrapped, options);
          }
          return add(type, listener, options);
        };
        target.removeEventListener = function (type, listener, options) {
          const wrapped = registry.get(listener);
          return remove(type, wrapped ?? listener, options);
        };
      };

      wrap(window);
      wrap(document);
    };

    return {
      inject: ['slots'],
      apply(ctx) {
        installBackgroundMicrophone();
        try {
          ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
            name: 'plugins.row.config',
            key: 'dsh-voice-ext#voice-ext',
          }, VoiceSettings));
        } catch (error) {
          console.warn('dsh-voice-ext: settings slot failed', error);
        }
      },
    };
  },
});
