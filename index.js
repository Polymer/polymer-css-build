/**
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';
const dom5 = require('dom5');

const pathResolver = require('./lib/pathresolver.js');

let ApplyShim, CssParse, StyleTransformer, StyleUtil;
const loadShadyCSS = require('./lib/shadycss-entrypoint.js');

const {Analyzer, InMemoryOverlayUrlLoader} = require('polymer-analyzer');

// Use types from polymer-analyzer
/* eslint-disable no-unused-vars */
const {Analysis} = require('polymer-analyzer/lib/model/model.js');
const {ParsedHtmlDocument} = require('polymer-analyzer');
/* eslint-enable */

const {traverse} = require('polymer-analyzer/lib/javascript/estraverse-shim.js');

const {dirShadowTransform, slottedToContent} = require('./lib/polymer-1-transforms.js');

const pred = dom5.predicates;

/**
 * Map of dom-module id to <dom-module> element in the HTML AST
 * @type {!Map<string, !Object>}
 */
const domModuleMap = Object.create(null);

// TODO: upstream to dom5
const styleMatch = pred.AND(
  pred.hasTagName('style'),
  pred.OR(
    pred.NOT(
      pred.hasAttr('type')
    ),
    pred.hasAttrValue('type', 'text/css')
  )
);

const notStyleMatch = pred.NOT(styleMatch);

const customStyleMatchV1 = pred.AND(
  styleMatch,
  pred.hasAttrValue('is', 'custom-style')
);

const customStyleMatchV2 = pred.AND(
  styleMatch,
  pred.parentMatches(
    pred.hasTagName('custom-style')
  )
);

const styleIncludeMatch = pred.AND(styleMatch, pred.hasAttr('include'));

/**
 * Map of <style> ast node to element name that defines it
 * @type {!WeakMap<!Object, string>}
 */
const scopeMap = new WeakMap();

/**
 * Map of <style> ast node to inline HTML documents from analyzer
 * @type {!WeakMap<!Object, !ParsedHtmlDocument>}
 */
const inlineHTMLDocumentMap = new WeakMap();

function prepend(parent, node) {
  if (parent.childNodes.length > 0) {
    dom5.insertBefore(parent, parent.childNodes[0], node);
  } else {
    dom5.append(parent, node);
  }
}

/*
 * Collect styles from dom-module
 * In addition, make sure those styles are inside a template
 */
function getAndFixDomModuleStyles(domModule) {
  // TODO: support `.styleModules = ['module-id', ...]` ?
  const styles = getStyles(domModule);
  if (!styles.length) {
    return [];
  }
  let template = dom5.query(domModule, pred.hasTagName('template'));
  if (!template) {
    template = dom5.constructors.element('template');
    const content = dom5.constructors.fragment();
    styles.forEach(s => dom5.append(content, s));
    dom5.append(template, content);
    dom5.append(domModule, template);
  } else {
    styles.forEach((s) => {
      let templateContent = template.content;
      // ensure element styles are inside the template element
      const parent = dom5.nodeWalkAncestors(s, (n) =>
        n === templateContent || n === domModule
      );
      if (parent !== templateContent) {
        prepend(templateContent, s);
      }
    })
  }
  return styles;
}

function getStyles(astNode) {
  return dom5.queryAll(astNode, styleMatch, undefined, dom5.childNodesIncludeTemplate)
}

// TODO: consider upstreaming to dom5
function getAttributeArray(node, attribute) {
  const attr = dom5.getAttribute(node, attribute);
  let array;
  if (!attr) {
    array = [];
  } else {
    array = attr.split(' ');
  }
  return array;
}

function inlineStyleIncludes(style) {
  if (!styleIncludeMatch(style)) {
    return;
  }
  const styleText = [];
  const includes = getAttributeArray(style, 'include');
  const leftover = [];
  const baseDocument = style.__ownerDocument;
  includes.forEach((id) => {
    const domModule = domModuleMap[id];
    if (!domModule) {
      // we missed this one, put it back on later
      leftover.push(id);
      return;
    }
    const includedStyles = getAndFixDomModuleStyles(domModule);
    // gather included styles
    includedStyles.forEach((ism) => {
      // this style may also have includes
      inlineStyleIncludes(ism);
      const inlineDocument = domModule.__ownerDocument;
      let includeText = dom5.getTextContent(ism);
      // adjust paths
      includeText = pathResolver.rewriteURL(inlineDocument, baseDocument, includeText);
      styleText.push(includeText);
    });
  });
  // remove inlined includes
  if (leftover.length) {
    dom5.setAttribute(style, 'include', leftover.join(' '));
  } else {
    dom5.removeAttribute(style, 'include');
  }
  // prepend included styles
  if (styleText.length) {
    let text = dom5.getTextContent(style);
    text = styleText.join('') + text;
    dom5.setTextContent(style, text);
  }
}

function applyShim(ast) {
  /*
   * `transform` expects an array of decorated <style> elements
   *
   * Decorated <style> elements are ones with `__cssRules` property
   * with a value of the CSS ast
   */
  StyleUtil.forEachRule(ast, (rule) => ApplyShim.transformRule(rule));
}

function getModuleDefinition(moduleName, elementDescriptors) {
  for (let ed of elementDescriptors) {
    if (ed.tagName && ed.tagName.toLowerCase() === moduleName) {
      return ed;
    }
  }
  return null;
}

function shadyShim(ast, style, analysis) {
  const scope = scopeMap.get(style);
  const moduleDefinition = getModuleDefinition(scope, analysis.getFeatures({kind: 'element'}));
  // only shim if module is a full polymer element, not just a style module
  if (!scope || !moduleDefinition) {
    return;
  }
  const ext = moduleDefinition.extends;
  StyleTransformer.css(ast, scope, ext);
}

function addClass(node, className) {
  const classList = getAttributeArray(node, 'class');
  if (classList.indexOf('style-scope') === -1) {
    classList.push('style-scope');
  }
  if (classList.indexOf(className) === -1) {
    classList.push(className);
  }
  dom5.setAttribute(node, 'class', classList.join(' '));
}

function markElement(element, useNativeShadow) {
  dom5.setAttribute(element, 'css-build', useNativeShadow ? 'shadow' : 'shady');
}

function markDomModule(domModule, scope, useNativeShadow) {
  // apply scoping to dom-module
  markElement(domModule, useNativeShadow);
  // apply scoping to template
  const template = dom5.query(domModule, pred.hasTagName('template'));
  if (template) {
    markElement(template, useNativeShadow);
    // mark elements' subtree under shady build
    if (!useNativeShadow && scope) {
      shadyScopeElementsInTemplate(template, scope);
    }
  }
}

function shadyScopeElementsInTemplate(template, scope) {
  const elements = dom5.queryAll(template, notStyleMatch, undefined, dom5.childNodesIncludeTemplate);
  elements.forEach((el) => addClass(el, scope));
}

// For forward compatibility with ShadowDOM v1 and Polymer 2.x,
// replace ::slotted(${inner}) with ::content > ${inner}
function slottedTransform(ast) {
  StyleUtil.forEachRule(ast, (rule) => {
    rule.selector = slottedToContent(rule.selector);
  });
}

function dirTransform(ast) {
  StyleUtil.forEachRule(ast, (rule) => {
    rule.selector = dirShadowTransform(rule.selector);
  });
}

function setUpLibraries(useNativeShadow) {
  ({
    ApplyShim,
    CssParse,
    StyleTransformer,
    StyleUtil
  } = loadShadyCSS(useNativeShadow));
}

function setNodeFileLocation(node, analysisKind) {
  if (!node.__ownerDocument) {
    node.__ownerDocument = analysisKind.sourceRange.file;
  }
}

/**
 *
 * @param {Analysis} analysis
 * @param {Function} query
 * @param {Function=} queryOptions
 * @return {Array}
 */
function nodeWalkAllDocuments(analysis, query, queryOptions = undefined) {
  const results = [];
  for (const document of analysis.getFeatures({kind: 'html-document'})) {
    const matches = dom5.nodeWalkAll(document.parsedDocument.ast, query, undefined, queryOptions);
    matches.forEach((match) => {
      setNodeFileLocation(match, document);
      if (document.isInline) {
        inlineHTMLDocumentMap.set(match, document.parsedDocument);
      }
    });
    results.push(...matches);
  }
  return results;
}

/**
 * Handle the difference between analyzer 2 and 3 Analyzer::getDocument
 * @param {!Analysis} analysis
 * @param {string} url
 * @return {!Document}
 */
function getDocument(analysis, url) {
  const res = analysis.getDocument(url);
  if (res.error) {
    throw res.error;
  }
  return res.value;
}

function getAstNode(feature) {
  return feature.astNode.node;
}

function getContainingDocument(feature) {
  return feature.astNode.containingDocument;
}

function getOrderedPolymerElements(analysis) {
  const polymerElements = new Set();
  for (const document of analysis.getFeatures({kind: 'document'})) {
    for (const element of document.getFeatures({kind: 'polymer-element'})) {
      polymerElements.add(element);
    }
  }
  return Array.from(polymerElements);
}

function updateInlineDocument(inlineDocument) {
  if (!inlineDocument || !inlineDocument.isInline) {
    return;
  }
  // this is a hack and bad
  // get the containing JavascriptDocument for the inline document
  const jsNode = getAstNode(inlineDocument);
  // Get the to the node representing the inside of the TaggedTemplateLiteral
  // NOTE: this assumes there's only one, and will need more complicated logic
  // for handling interpolations.
  const templateLiteral = jsNode.quasi.quasis[0];
  // set the value of the TaggedTemplateLiteral interior to the stringified document
  // the AST has both "cooked" and "raw" versions of the string, but they should be the same in practice
  templateLiteral.value = {
    cooked: inlineDocument.stringify(),
    raw: inlineDocument.stringify()
  };
}

function searchAst(polymerElement, templateDocument) {
  const polymerElementNode = getAstNode(polymerElement);
  const templateNode = getAstNode(templateDocument);
  let match = false;
  // Note: in visitor, return 'skip' to skip subtree, and 'break' to exit early
  let visitor;
  if (polymerElement.isLegacyFactoryCall) {
    // this is a Polymer({}) call with `_template`
    visitor = {
      enterObjectProperty(current) {
        if (current.key.name === '_template') {
          match = current.value === templateNode;
          if (match) {
            return 'break';
          }
        }
      }
    };
  } else {
    // this is a class element with `static get template() {}`
    visitor = {
      enterClassMethod(current) {
        if (!current.static || current.kind !== 'get' || current.key.name !== 'template') {
          return 'skip';
        }
      },
      enterTaggedTemplateExpression(current) {
        match = current === templateNode;
        if (match) {
          return 'break';
        }
      }
    };
  }
  // walk the AST from the `Polymer({})` or `class {}` definition
  traverse(polymerElementNode, visitor);
  return match;
}

function getInlinedTemplateDocument(polymerElement, analysis) {
  // lookup from cache
  if (inlineHTMLDocumentMap.has(polymerElement)) {
    return inlineHTMLDocumentMap.get(polymerElement);
  }
  // find InlinedHTMLDocuments inside of the "parsed" js document containing this PolymerElement
  const jsDocument = getContainingDocument(polymerElement);
  const parsedJsDocument = getDocument(analysis, jsDocument.url);
  const inlineHTMLDocumentSet = parsedJsDocument.getFeatures({kind: 'html-document'});
  let inlinedDocument = null;
  // search all inlined html-documents in this js document for the one that is
  // inside the class definition for this polymer element scanning the AST
  for (const htmlDocument of inlineHTMLDocumentSet) {
    if (searchAst(polymerElement, htmlDocument)) {
      inlinedDocument = htmlDocument;
      break;
    }
  }
  if (!inlinedDocument) {
    return null;
  }
  // cache template lookup
  inlineHTMLDocumentMap.set(polymerElement, inlinedDocument.parsedDocument);
  return inlinedDocument.parsedDocument;
}

function getInlinedStyles(polymerElement, analysis) {
  const document = getInlinedTemplateDocument(polymerElement, analysis);
  if (!document) {
    return [];
  }
  const styles = getStyles(document.ast);
  styles.forEach((s) => {
    inlineHTMLDocumentMap.set(s, document);
  });
  return styles;
}

function findDisconnectedDomModule(polymerElement, analysis) {
  // search analysis for a dom-module with the same id as the polymerElement's
  const domModuleSet = analysis.getFeatures({kind: 'dom-module', id: polymerElement.tagName});
  const domModuleFeature = Array.from(domModuleSet)[0];
  if (domModuleFeature) {
    // polymerElement.domModule is assumed to the the HTML node
    const domModuleNode = getAstNode(domModuleFeature);
    // if the `<dom-module>` is inlined into another document, make sure to
    // associate the styles with that document so that modifications are
    // represented in the output
    const domModuleContainingDoc = getContainingDocument(domModuleFeature);
    if (domModuleContainingDoc && domModuleContainingDoc.isInline) {
      const styles = getAndFixDomModuleStyles(domModuleNode);
      styles.forEach((s) => {
        inlineHTMLDocumentMap.set(s, domModuleContainingDoc);
      });
      // update the document with any changes `getAndFixDomModuleStyles` may have caused
      updateInlineDocument(domModuleContainingDoc);
    }
    polymerElement.domModule = domModuleNode;
  }
}

function markPolymerElement(polymerElement, useNativeShadow, analysis) {
  const document = getInlinedTemplateDocument(polymerElement, analysis);
  if (!document) {
    return;
  }
  const template = document.ast;
  // add a comment of the form `<!--css-build:shadow-->` to the template as the first child
  const buildComment = dom5.constructors.comment(`css-build:${useNativeShadow ? 'shadow' : 'shady'}`);
  prepend(template, buildComment);
  if (!useNativeShadow) {
    shadyScopeElementsInTemplate(template, polymerElement.tagName);
  }
  // make sure the inlined template is reprocessed in the containing JS document
  updateInlineDocument(document);
}

async function polymerCssBuild(paths, options = {}) {
  const nativeShadow = options ? !options['build-for-shady'] : true;
  const polymerVersion = options['polymer-version'] || 2;
  const customStyleMatch = polymerVersion === 2 ? customStyleMatchV2 : customStyleMatchV1;
  setUpLibraries(nativeShadow);
  // build analyzer loader
  const loader = new InMemoryOverlayUrlLoader();
  const analyzer = new Analyzer({urlLoader: loader});
  // load given files as strings
  paths.forEach((p) => {
    loader.urlContentsMap.set(analyzer.resolveUrl(p.url), p.content);
  });
  // run analyzer on all given files
  /** @type {Analysis} */
  const analysis = await analyzer.analyze(paths.map((p) => p.url));
  // populate the dom module map
  for (const domModule of analysis.getFeatures({kind: 'dom-module'})) {
    const scope = domModule.id.toLowerCase();
    const astNode = getAstNode(domModule);
    domModuleMap[scope] = astNode;
    setNodeFileLocation(astNode, domModule);
  }
  // map polymer elements to styles
  const moduleStyles = [];
  for (const polymerElement of getOrderedPolymerElements(analysis)) {
    const scope = polymerElement.tagName;
    let styles = [];
    if (!polymerElement.domModule) {
      // there can be cases where a polymerElement is defined in a way that
      // analyzer can't get associate it with the <dom-module>, so try to find
      // it before assuming the polymerElement has an inline template
      findDisconnectedDomModule(polymerElement, analysis);
    }
    if (polymerElement.domModule) {
      const domModule = polymerElement.domModule;
      markDomModule(domModule, scope, nativeShadow);
      styles = getAndFixDomModuleStyles(domModule);
    } else {
      markPolymerElement(polymerElement, nativeShadow, analysis);
      styles = getInlinedStyles(polymerElement, analysis);
    }
    styles.forEach((s) => {
      scopeMap.set(s, scope);
      setNodeFileLocation(s, polymerElement);
    });
    moduleStyles.push(styles);
  }
  // inline and flatten styles into a single list
  const flatStyles = [];
  moduleStyles.forEach((styles) => {
    if (!styles.length) {
      return;
    }
    // do style includes
    if (options ? !options['no-inline-includes'] : true) {
      styles.forEach((s) => inlineStyleIncludes(s));
    }
    // reduce styles to one
    const finalStyle = styles[styles.length - 1];
    dom5.setAttribute(finalStyle, 'scope', scopeMap.get(finalStyle));
    if (styles.length > 1) {
      const consumed = styles.slice(0, -1);
      const text = styles.map((s) => dom5.getTextContent(s));
      const includes = styles.map((s) => getAttributeArray(s, 'include')).reduce((acc, inc) => acc.concat(inc));
      consumed.forEach((c) => dom5.remove(c));
      dom5.setTextContent(finalStyle, text.join(''));
      const oldInclude = getAttributeArray(finalStyle, 'include');
      const newInclude = oldInclude.concat(includes).join(' ');
      if (newInclude) {
        dom5.setAttribute(finalStyle, 'include', newInclude);
      }
    }
    flatStyles.push(finalStyle);
  });
  // find custom styles
  const customStyles = nodeWalkAllDocuments(analysis, customStyleMatch);
  // inline custom styles with includes
  if (options ? !options['no-inline-includes'] : true) {
    customStyles.forEach((s) => inlineStyleIncludes(s));
  }
  // add custom styles to the front
  // custom styles may define mixins for the whole tree
  flatStyles.unshift(...customStyles);
  // populate mixin map
  flatStyles.forEach((s) => {
    const text = dom5.getTextContent(s);
    const ast = CssParse.parse(text);
    applyShim(ast);
  });
  // parse, transform, emit
  flatStyles.forEach((s) => {
    let text = dom5.getTextContent(s);
    const ast = CssParse.parse(text);
    if (customStyleMatch(s)) {
      // custom-style `:root` selectors need to be processed to `html`
      StyleUtil.forEachRule(ast, (rule) => {
        if (options && options['build-for-shady']) {
          StyleTransformer.documentRule(rule);
        } else {
          StyleTransformer.normalizeRootSelector(rule);
        }
      });
      // mark the style as built
      markElement(s, nativeShadow);
    }
    applyShim(ast);
    if (nativeShadow) {
      if (polymerVersion === 1) {
        slottedTransform(ast);
        dirTransform(ast);
      }
    } else {
      shadyShim(ast, s, analysis);
    }
    text = CssParse.stringify(ast, true);
    dom5.setTextContent(s, text);
    // if the style is in an inlined HTML Document, update the outer JS Document
    updateInlineDocument(inlineHTMLDocumentMap.get(s));
  });
  return paths.map((p) => {
    const doc = getDocument(analysis, p.url);
    return {
      url: p.url,
      content: doc.parsedDocument.stringify()
    };
  });
}

exports.polymerCssBuild = polymerCssBuild;
