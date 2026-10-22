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

function isMissingLanguageSource(languageSource) {
  return languageSource == null || languageSource === '';
}

/**
 * An explicit choice, or a legacy choice saved before appLanguageSource existed.
 * Spanish with no source is the old automatic default, so the device locale wins.
 */
function isStoredUserChoice(storedLanguage, languageSource) {
  if (!isSupportedLanguage(storedLanguage)) return false;
  if (languageSource === 'user') return true;
  return isMissingLanguageSource(languageSource) && storedLanguage !== DEFAULT_LANGUAGE;
}

function resolveStartupLanguage({ storedLanguage, languageSource, deviceLocaleTag } = {}) {
  if (isStoredUserChoice(storedLanguage, languageSource)) {
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
  isStoredUserChoice,
  languageFromLocaleTag,
  resolveStartupLanguage,
  readDeviceLocaleTag,
};
