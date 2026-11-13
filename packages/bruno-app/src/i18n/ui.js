import i18n from './index';

// These English templates interpolate a plural suffix. Supply the whole Russian
// noun through the same placeholder and let i18next choose its plural form.
const pluralSources = {
  '{{value0}} request{{value1}} in collection': ['value1', 'value0', 'request'],
  'Export {{value0}} Environment{{value1}}': ['value1', 'value0', 'environment'],
  '{{value0}} result{{value1}} found': ['value1', 'value0', 'result'],
  '{{value0}} file{{value1}}': ['value1', 'value0', 'file'],
  '{{value0}} more file{{value1}}': ['value1', 'value0', 'file'],
  'This section has {{value0}} endpoint{{value1}} modified in both the spec and your collection. Expand to review and resolve.': ['value1', 'value0', 'endpoint'],
  '{{value0}}/{{value1}} model{{value2}}': ['value2', 'value1', 'model'],
  'Failed to open {{value0}} collection{{value1}}': ['value1', 'value0', 'collection'],
  'Failed to scan {{value0}} folder{{value1}} for collections': ['value1', 'value0', 'folder'],
  'Installed {{value0}} package{{value1}}': ['value1', 'value0', 'package']
};

export const translateUi = (text, values = {}) => {
  const key = text.trim();
  const start = text.indexOf(key);
  const plural = i18n.language === 'ru' ? pluralSources[key] : null;
  const localizedValues = plural ? {
    ...values,
    [plural[0]]: i18n.t(plural[2], { ns: 'nouns', count: Number(values[plural[1]]) })
  } : values;
  const translated = i18n.t(key, {
    ...localizedValues,
    ns: 'ui',
    keySeparator: false,
    nsSeparator: false,
    defaultValue: key
  });
  return text.slice(0, start) + translated + text.slice(start + key.length);
};
