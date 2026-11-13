const roleLabels = {
  undo: 'Undo',
  redo: 'Redo',
  cut: 'Cut',
  copy: 'Copy',
  paste: 'Paste',
  selectAll: 'Select All',
  minimize: 'Minimize',
  close: 'Close',
  window: 'View',
  help: 'Help'
};

const localizeMenu = (items, language, translations) => items.map((item) => {
  const label = item.label || roleLabels[item.role];
  return {
    ...item,
    ...(language === 'ru' && label && translations[label] ? { label: translations[label] } : {}),
    ...(Array.isArray(item.submenu) ? { submenu: localizeMenu(item.submenu, language, translations) } : {})
  };
});

module.exports = localizeMenu;
