import React, { useEffect, useRef, useState } from 'react';
import { Bug, Send, Paperclip, Settings, X, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import {
  loadBugReportConfig,
  saveBugReportConfig,
  collectSaveData,
  buildBugReport,
  sendBugReport,
  fileToAttachment,
} from '../../utils/bugReport';
import { getErrorLogs } from '../../utils/errorLog';
import { useI18n } from '../../i18n/I18nContext';

const APP_VERSION = '1.0.0-codewash';

/**
 * Bug report modal.
 *
 * All assembly/validation/sending lives in utils/bugReport.js (fully unit
 * tested). This component is only the form + state. The destination webhook and
 * contact email are configurable (nothing hardcoded) and stored in localStorage.
 *
 * `sendImpl` is injectable for tests/Storybook; defaults to the real sender.
 */
const BugReportModal = ({ isOpen, onClose, sendImpl = sendBugReport }) => {
  const { t } = useI18n();
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [includeSave, setIncludeSave] = useState(true);
  const [includeLogs, setIncludeLogs] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const [config, setConfig] = useState({ endpoint: '', contactEmail: '' });
  const [showConfig, setShowConfig] = useState(false);
  const [status, setStatus] = useState({ state: 'idle', message: '', ticketId: null });
  const fileInputRef = useRef(null);

  // Load the stored config and reset status each time the modal is opened.
  // Legitimate init-from-storage on open: the state genuinely derives from an
  // external source (localStorage) keyed on the isOpen transition.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      const loaded = loadBugReportConfig();
      setConfig(loaded);
      setShowConfig(!loaded.endpoint); // prompt for setup if never configured
      setStatus({ state: 'idle', message: '', ticketId: null });
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!isOpen) return null;

  const handleAttach = async (event) => {
    const files = Array.from(event.target.files || []);
    const read = await Promise.all(files.map((f) => fileToAttachment(f).catch(() => null)));
    setAttachments((prev) => [...prev, ...read.filter(Boolean)]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index) =>
    setAttachments((prev) => prev.filter((_, i) => i !== index));

  const persistConfig = () => {
    const saved = saveBugReportConfig(config);
    setConfig(saved);
    return saved;
  };

  const handleSend = async () => {
    const saved = persistConfig();
    setStatus({ state: 'sending', message: t('bugReport.sendingStatus'), ticketId: null });

    const report = buildBugReport({
      description,
      reporterEmail,
      attachments,
      includeLogs,
      includeSaveData: includeSave,
      logs: getErrorLogs(),
      saveData: includeSave ? collectSaveData() : {},
      meta: { appVersion: APP_VERSION },
    });

    const result = await sendImpl(report, { endpoint: saved.endpoint });
    if (result.ok) {
      setStatus({
        state: 'success',
        message: t('bugReport.reference', { ticketId: result.ticketId }),
        ticketId: result.ticketId,
      });
      setDescription('');
      setAttachments([]);
    } else {
      setStatus({ state: 'error', message: result.error, ticketId: null });
    }
  };

  const sending = status.state === 'sending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-stone-900 border-4 border-stone-600 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-stone-400 hover:text-white"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <Bug size={40} className="text-red-400 mb-2" />
          <h2 className="text-3xl font-bold text-slate-300 uppercase tracking-wider">{t('bugReport.title')}</h2>
          <p className="text-stone-400 text-sm mt-1">{t('bugReport.subtitle')}</p>
        </div>

        {status.state === 'success' ? (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <CheckCircle size={48} className="text-green-400" />
            <p className="text-green-300 text-lg font-bold">{t('bugReport.thankYou')}</p>
            <p className="text-stone-300 text-sm break-all">{status.message}</p>
            <button
              onClick={onClose}
              className="mt-2 bg-stone-700 hover:bg-stone-600 text-white px-6 py-2 rounded-lg font-bold"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-slate-200">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold uppercase text-blue-300">{t('bugReport.whatHappened')} *</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder={t('bugReport.descriptionPlaceholder')}
                className="bg-stone-800 border-2 border-stone-600 rounded-lg p-3 text-slate-100 focus:border-blue-400 outline-none resize-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-bold uppercase text-blue-300">{t('bugReport.yourEmail')}</span>
              <input
                type="email"
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder={t('bugReport.emailPlaceholder')}
                className="bg-stone-800 border-2 border-stone-600 rounded-lg p-2 text-slate-100 focus:border-blue-400 outline-none"
              />
            </label>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 border-2 border-stone-600 rounded-lg p-2 text-sm font-bold"
              >
                <Paperclip size={16} /> {t('bugReport.attach')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleAttach}
                className="hidden"
              />
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((a, i) => (
                    <span
                      key={`${a.name}-${i}`}
                      className="flex items-center gap-1 bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs"
                    >
                      {a.name}
                      <button onClick={() => removeAttachment(i)} aria-label={t('bugReport.removeAttachment', { name: a.name })}>
                        <X size={12} className="text-stone-400 hover:text-red-400" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 bg-stone-800/50 rounded-lg p-3 border border-stone-700">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={includeSave} onChange={(e) => setIncludeSave(e.target.checked)} className="accent-blue-400" />
                {t('bugReport.includeSave')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={includeLogs} onChange={(e) => setIncludeLogs(e.target.checked)} className="accent-blue-400" />
                {t('bugReport.includeLogs', { count: getErrorLogs().length })}
              </label>
            </div>

            {/* Configurable destination — nothing is hardcoded. */}
            <div>
              <button
                type="button"
                onClick={() => setShowConfig((v) => !v)}
                className="flex items-center gap-2 text-xs text-stone-400 hover:text-blue-300"
              >
                <Settings size={14} /> {showConfig ? t('bugReport.hide') : t('bugReport.configure')}
              </button>
              {showConfig && (
                <div className="flex flex-col gap-2 mt-2 bg-stone-800/50 rounded-lg p-3 border border-stone-700">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-stone-400">{t('bugReport.endpointLabel')}</span>
                    <input
                      type="url"
                      value={config.endpoint}
                      onChange={(e) => setConfig((c) => ({ ...c, endpoint: e.target.value }))}
                      placeholder={t('bugReport.endpointPlaceholder')}
                      className="bg-stone-900 border-2 border-stone-600 rounded-lg p-2 text-slate-100 text-sm focus:border-blue-400 outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-stone-400">{t('bugReport.contactLabel')}</span>
                    <input
                      type="email"
                      value={config.contactEmail}
                      onChange={(e) => setConfig((c) => ({ ...c, contactEmail: e.target.value }))}
                      placeholder={t('bugReport.contactPlaceholder')}
                      className="bg-stone-900 border-2 border-stone-600 rounded-lg p-2 text-slate-100 text-sm focus:border-blue-400 outline-none"
                    />
                  </label>
                </div>
              )}
              {config.contactEmail && !showConfig && (
                <p className="text-xs text-stone-500 mt-1">{t('bugReport.reportsTo', { email: config.contactEmail })}</p>
              )}
            </div>

            {status.state === 'error' && (
              <div className="flex items-start gap-2 bg-red-950/50 border border-red-800 rounded-lg p-2 text-sm text-red-300">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{status.message}</span>
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || description.trim().length === 0}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-stone-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold uppercase tracking-wider transition-all"
            >
              {sending ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
              {sending ? t('bugReport.sending') : t('bugReport.send')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BugReportModal;
