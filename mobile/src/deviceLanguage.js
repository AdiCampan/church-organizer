const SUPPORTED_LANGUAGES = ['es', 'ro', 'en'];
const DEFAULT_LANGUAGE = 'es';

function isSupportedLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value);
}

function languageFromLocaleTag(localeTag) {
  if (typeof localeTag !== 'string') return null;
  const primary = localeTag.trim().toLowerCase().split(/[-_]/)[0];
  return isSupportedLanguage(primary) ? primary : null;
}

/**
 * Stored language counts only when the user picked it.
 * A missing source means the previous build auto-saved Spanish on first launch.
 */
function resolveStartupLanguage({ storedLanguage, languageSource, deviceLocaleTag } = {}) {
  if (languageSource === 'user' && isSupportedLanguage(storedLanguage)) {
    return storedLanguage;
  }
  return languageFromLocaleTag(deviceLocaleTag) || DEFAULT_LANGUAGE;
}

function readNativeLocaleIdentifier() {
  try {
    const { I18nManager } = require('react-native');
    const identifier = I18nManager?.getConstants?.().localeIdentifier;
    if (typeof identifier === 'string' && identifier.trim()) {
      return identifier;
    }
  } catch {
    // react-native is unavailable outside the app runtime
  }
  return '';
}

function readDeviceLocaleTag() {
  const nativeLocale = readNativeLocaleIdentifier();
  if (nativeLocale) return nativeLocale;

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return typeof locale === 'string' ? locale : '';
  } catch {
    return '';
  }
}

module.exports = {
  DEFAULT_LANGUAGE,
  isSupportedLanguage,
  languageFromLocaleTag,
  resolveStartupLanguage,
  readDeviceLocaleTag,
};
