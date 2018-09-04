/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const {ScannedInlineDocument} = require('polymer-analyzer/lib/model/model.js');

const {getIdentifierName, expressionToValue} = require('polymer-analyzer/lib/javascript/ast-value.js');

/**
 * Finds inline HTML documents in Javascript source.
 *
 * e.g.
 *     html`<div></div>`;
 */
class ClosureHtmlTemplateScanner {
  async scan(document, visit) {
    const features = [];

    let possibleCookedTemplateVariable;
    let possibleCookedTemplateLiteral;
    const myVisitor = {
      enterVariableDeclarator(node, _parent, path) {
        const value = node.init;
        if (value.type === 'ArrayExpression' && value.elements.every((e) => e.type === 'StringLiteral')) {
          possibleCookedTemplateVariable = getIdentifierName(node.id);
          possibleCookedTemplateLiteral = value;
        }
      },
      enterAssignmentExpression(node) {
        if (!possibleCookedTemplateVariable || !possibleCookedTemplateLiteral) {
          return;
        }
        const leftName = getIdentifierName(node.left);
        if (leftName === `${possibleCookedTemplateVariable}.raw`) {
          const inlineDocument = getInlineDocument(possibleCookedTemplateLiteral, document);
          if (inlineDocument !== undefined) {
            features.push(inlineDocument);
          }
        }
      }
    };

    await visit(myVisitor);

    return {features};
  }
}

/**
 * Parses the given string as an inline HTML document.
 */
function getInlineDocument(node, parsedDocument) {
  const sourceRangeForLiteral = parsedDocument.sourceRangeForNode(node);
  if (sourceRangeForLiteral === undefined) {
    return;
  }
  const sourceRangeForContents = {
    file: sourceRangeForLiteral.file,
    start: {
      line: sourceRangeForLiteral.start.line,
      column: sourceRangeForLiteral.start.column + 1
    },
    end: {
      line: sourceRangeForLiteral.end.line,
      column: sourceRangeForLiteral.end.column - 1
    }
  };

  let contents = expressionToValue(node);
  if (!Array.isArray(contents)) {
    return;
  } else {
    contents = contents.join();
  }
  let commentText;
  if (node.leadingComments != null) {
    commentText = node.leadingComments.map((c) => c.value).join('\n');
  } else {
    commentText = '';
  }

  return new ScannedInlineDocument(
      'html',
      contents,
      {
        filename: sourceRangeForContents.file,
        col: sourceRangeForContents.start.column,
        line: sourceRangeForContents.start.line
      },
      commentText,
      sourceRangeForContents,
      {language: 'js', node, containingDocument: parsedDocument});
}

exports.ClosureHtmlTemplateScanner = ClosureHtmlTemplateScanner;