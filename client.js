window.__ModuleLoader__.load({
  id: 'dsh-voice-ext',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const base = 'http://127.0.0.1:49234';

    const LOCALE = (() => {
      const lang = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
      return lang.startsWith('ru') ? 'ru' : 'en';
    })();

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
        save: 'Save',
        saved: 'Saved',
        install: 'Download model',
        installing: 'Downloading…',
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
        save: 'Сохранить',
        saved: 'Сохранено',
        install: 'Скачать модель',
        installing: 'Скачивание…',
        selection: 'Текущий выбор',
        unavailable: 'Локальный сервис недоступен',
        loading: 'Загрузка…',
      },
    };

    const t = STRINGS[LOCALE];

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

      const load = () => fetch(`${base}/status`)
        .then((response) => response.json())
        .then((data) => setState({ status: 'ready', ...data }))
        .catch(() => setState({ status: 'error' }));

      React.useEffect(() => {
        let alive = true;
        load().then(() => { if (!alive) return; });
        return () => { alive = false; };
      }, []);

      if (state.status === 'loading') return h('div', { className: 've-set', style: { color: '#8a8a8a' } }, t.loading);
      if (state.status === 'error') return h('div', { className: 've-set', style: { color: '#c0392b' } }, t.unavailable);

      const update = (patch) => setState((current) => ({ ...current, ...patch }));

      const save = async () => {
        setSaving(true);
        setNotice({ text: '', error: false });
        try {
          const response = await fetch(`${base}/settings`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ modelDir: state.modelDir, threads: state.threads, autoDownload: state.autoDownload }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
          setState({ status: 'ready', ...data });
          setNotice({ text: t.saved, error: false });
        } catch (error) {
          setNotice({ text: String(error.message ?? error), error: true });
        } finally {
          setSaving(false);
        }
      };

      const install = async () => {
        setSaving(true);
        setNotice({ text: t.installing, error: false });
        try {
          const response = await fetch(`${base}/prepare`, { method: 'POST' });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
          setState({ status: 'ready', ...data });
          setNotice({ text: '', error: false });
        } catch (error) {
          setNotice({ text: String(error.message ?? error), error: true });
        } finally {
          setSaving(false);
        }
      };

      const megabytes = Math.round((state.bytes ?? 0) / 1024 / 1024);
      const label = state.phase === 'downloading' ? t.statusDownloading : state.installed ? `${t.statusReady} · ${megabytes} MB` : t.statusMissing;

      return h('div', { className: 've-set' },
        h('div', { className: 've-row' },
          h('div', null,
            h('div', { className: 've-label' }, t.title),
            h('div', { className: 've-hint' }, state.selection
              ? `${t.selection}: ${state.selection.providerId} · ${state.selection.language}`
              : t.title),
          ),
          h('span', { className: 've-state' },
            h('span', { className: `ve-dot${state.installed ? ' ve-dot--ok' : ''}` }),
            label,
          ),
        ),
        h('div', null,
          h('div', { className: 've-label' }, t.modelDir),
          h('input', {
            className: 've-input',
            value: state.modelDir ?? '',
            onChange: (event) => update({ modelDir: event.target.value }),
            spellCheck: false,
          }),
          h('div', { className: 've-hint' }, t.modelDirHint),
        ),
        h('div', { className: 've-row' },
          h('div', { className: 've-label' }, t.threads),
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
          h('div', { className: 've-label' }, t.autoDownload),
          h('input', {
            type: 'checkbox',
            className: 've-switch',
            checked: state.autoDownload !== false,
            onChange: (event) => update({ autoDownload: event.target.checked }),
          }),
        ),
        h('div', { className: 've-actions' },
          h('button', { className: 've-btn ve-btn--primary', disabled: saving, onClick: save }, t.save),
          h('button', { className: 've-btn', disabled: saving || state.installed, onClick: install }, t.install),
          notice.text ? h('span', { className: `ve-status${notice.error ? ' ve-status--error' : ''}` }, notice.text) : null,
        ),
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
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
