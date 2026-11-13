const translations = require('../../src/i18n/translation/ui.ru.json');

const presentationFields = new Set([
  'label', 'title', 'text', 'description', 'desc', 'placeholder', 'tooltip',
  'confirmText', 'cancelText', 'submitText', 'heading', 'subtitle', 'hint',
  'aria-label', 'aria-description', 'ariaLabel', 'buttonText'
]);

// Use React's JSX whitespace rules so inline links and code retain their spacing.
const jsxText = (value) => {
  const lines = value.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  lines.forEach((line, index) => {
    if (/[^ \t]/.test(line)) lastNonEmpty = index;
  });
  return lines.map((line, index) => {
    let text = line.replace(/\t/g, ' ');
    if (index !== 0) text = text.replace(/^ +/, '');
    if (index !== lines.length - 1) text = text.replace(/ +$/, '');
    return text && index !== lastNonEmpty ? `${text} ` : text;
  }).join('');
};

const getUiText = (nodePath) => {
  if (nodePath.findParent((parent) => parent.isJSXElement()
    && ['code', 'pre'].includes(parent.node.openingElement.name.name))) return null;
  if (nodePath.isJSXText()) return jsxText(nodePath.node.value);
  if (!nodePath.isStringLiteral() && !nodePath.isTemplateLiteral()) return null;
  const value = nodePath.isTemplateLiteral()
    ? nodePath.node.quasis.map((part, index) => part.value.cooked + (index < nodePath.node.expressions.length ? `{{value${index}}}` : '')).join('')
    : nodePath.node.value;
  let parent = nodePath.parentPath;
  if (parent.isJSXAttribute()) {
    return presentationFields.has(parent.node.name.name) ? value : null;
  }
  if (parent.isObjectProperty() && parent.node.value === nodePath.node && !parent.node.computed) {
    const key = parent.node.key.name || parent.node.key.value;
    if (key === 'name' && parent.parentPath.node.properties.some((property) => ['width', 'isKeyField', 'render'].includes(property.key?.name))) return value;
    return presentationFields.has(key) ? value : null;
  }
  if (parent.isCallExpression()) {
    const callee = parent.node.callee;
    if (callee.type === 'MemberExpression' && callee.object.name === 'toast') return value;
    if (callee.type === 'Identifier' && callee.name === 'toast') return value;
  }
  // Text directly rendered in JSX, including ternary and logical branches.
  while (parent.isConditionalExpression() || parent.isLogicalExpression()) {
    if (parent.isConditionalExpression() && parent.node.test === nodePath.node) return null;
    parent = parent.parentPath;
  }
  if (parent.isAssignmentPattern() || parent.isAssignmentExpression()) {
    return presentationFields.has(parent.node.left.name) ? value : null;
  }
  if (parent.isJSXExpressionContainer()) {
    if (parent.parentPath.isJSXAttribute()) {
      return presentationFields.has(parent.parentPath.node.name.name) ? value : null;
    }
    return value;
  }
  return null;
};

module.exports = ({ types: t }) => ({
  name: 'bruno-clean-ui-translations',
  visitor: {
    Program(programPath, state) {
      const filename = (state.filename || '').replace(/\\/g, '/');
      if (!/\/src\/(components|ui|pages|hooks)\//.test(filename) || /\.(spec|test)\./.test(filename)) return;
      const translationId = programPath.scope.generateUidIdentifier('translateUi');
      let used = false;
      // Finish localization before React Compiler's Program visitor hoists JSX
      // expressions into temporaries and removes their presentation context.
      programPath.traverse({
        'JSXText|StringLiteral|TemplateLiteral'(nodePath) {
          const text = getUiText(nodePath);
          if (!text || !Object.hasOwn(translations, text.trim())) return;
          const args = [t.stringLiteral(text)];
          if (nodePath.isTemplateLiteral() && nodePath.node.expressions.length) {
            args.push(t.objectExpression(nodePath.node.expressions.map((expression, index) =>
              t.objectProperty(t.identifier(`value${index}`), expression)
            )));
          }
          if (nodePath.isJSXText() && nodePath.parentPath.isJSXElement()) {
            const opening = nodePath.parentPath.node.openingElement;
            if (opening.name.name === 'option' && !opening.attributes.some((attribute) => attribute.name?.name === 'value')) {
              opening.attributes.push(t.jsxAttribute(t.jsxIdentifier('value'), t.stringLiteral(text.trim())));
            }
          }
          const call = t.callExpression(t.cloneNode(translationId), args);
          const needsContainer = nodePath.isJSXText() || nodePath.parentPath.isJSXAttribute();
          nodePath.replaceWith(needsContainer ? t.jsxExpressionContainer(call) : call);
          used = true;
          nodePath.skip();
        }
      });
      if (used) {
        programPath.unshiftContainer('body', t.importDeclaration([
          t.importSpecifier(translationId, t.identifier('translateUi'))
        ], t.stringLiteral('src/i18n/ui')));
      }
    }
  }
});

module.exports.getUiText = getUiText;
