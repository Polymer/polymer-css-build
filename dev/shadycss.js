/**!
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
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
/**
 * @fileoverview
 *
 * A library that bundles all the parts of ShadyCSS that polymer-css-build
 * needs.
 */

import * as StyleUtil from '@webcomponents/shadycss/src/style-util.js';
import * as CssParse from '@webcomponents/shadycss/src/css-parse.js';

export {default as StyleTransformer} from '@webcomponents/shadycss/src/style-transformer.js';
export {default as ApplyShim} from '@webcomponents/shadycss/src/apply-shim.js';
export {scopingAttribute as ShadyUnscopedAttribute} from '@webcomponents/shadycss/src/unscoped-style-handler.js';

export {StyleUtil, CssParse};