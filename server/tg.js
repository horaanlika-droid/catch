import { log } from './util.js';

/* Минимальный клиент Telegram Bot API на нативном fetch, без зависимостей. */
export class BotClient {
  constructor(token) {
    this.token = token;
    this.base = `https://api.telegram.org/bot${token}`;
    this.username = '';
    this.id = 0;
    this.started = Date.now();
  }

  async call(method, params = {}, { formData } = {}) {
    const url = `${this.base}/${method}`;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const opts = formData
          ? { method: 'POST', body: formData }
          : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) };
        const res = await fetch(url, opts);
        const json = await res.json().catch(() => ({}));
        if (json.ok) return json.result;
        if (res.status === 429) {
          const wait = (json.parameters?.retry_after || 2) * 1000 + 200;
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        const err = new Error(`${method}: ${json.description || res.status}`);
        err.badRequest = res.status === 400;
        err.telegramErrorCode = json.error_code;
        throw err;
      } catch (e) {
        if (e.badRequest) throw e;
        if (attempt === 5) throw e;
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  async init() {
    const me = await this.call('getMe');
    this.username = me.username;
    this.id = me.id;
    return me;
  }

  async getUpdates(offset, signal) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 50_000);
    signal?.addEventListener('abort', () => ctrl.abort());
    try {
      return await this.call('getUpdates', {
        offset,
        timeout: 40,
        allowed_updates: ['message', 'callback_query', 'edited_message'],
      });
    } finally {
      clearTimeout(t);
      void signal;
    }
  }

  async sendMessage(chatId, text, extra = {}) {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra,
    }).catch((e) => {
      log('sendMessage failed:', e.message);
      return null;
    });
  }

  async editMessage(chatId, messageId, text, extra = {}) {
    return this.call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      ...extra,
    }).catch((e) => {
      if (!/message is not modified/i.test(e.message)) log('edit failed:', e.message);
      return null;
    });
  }

  async deleteMessage(chatId, messageId) {
    return this.call('deleteMessage', { chat_id: chatId, message_id: messageId }).catch(() => null);
  }

  async answerCallback(id, text = '') {
    return this.call('answerCallbackQuery', { callback_query_id: id, ...(text ? { text, show_alert: text.length > 0 } : {}) }).catch(() => null);
  }

  async downloadFile(fileId) {
    const f = await this.call('getFile', { file_id: fileId });
    if (!f?.file_path) throw new Error('no file_path');
    const res = await fetch(`${this.base.replace(/\/bot[^/]+$/, '')}/file/bot${this.token}/${encodeURI(f.file_path)}`);
    if (!res.ok) throw new Error('download ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (f.file_path.match(/\.(\w+)$/) || [, 'jpg'])[1].toLowerCase();
    return { buffer: buf, ext: ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg' };
  }

  // Инициализация бота: имя, команды, кнопка-меню (Mini App), Deep Link
  async setupMiniApp(appUrl) {
    try {
      const cmds = [
        { command: 'start', description: 'Приложение CATCH 22' },
        { command: 'panel', description: 'Админ-панель' },
        { command: 'requests', description: 'Заявки с сайта' },
        { command: 'stop', description: 'Стоп-лист' },
        { command: 'status', description: 'Статус деплоя' },
      ];
      await this.call('setMyCommands', { commands: cmds });
      if (appUrl) {
        await this.call('setChatMenuButton', {
          menu_button: { type: 'web_app', text: 'Открыть приложение', web_app: { url: appUrl } },
        });
      }
    } catch (e) {
      log('setupMiniApp:', e.message);
    }
  }
}
