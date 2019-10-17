# Change Log

## [0.7.0] - 2019-10-16
- Fix `shady-unscoped` style imports and add tests
- Add build support for `:dir()` for Polymer 2 Shadow DOM
- Drop nodejs 8 support
- Fix testing on travis by moving to `xenial`

## [0.6.0] - 2018-09-17
* Add support for Polymer v1 `var(--foo, --bar)` => `var(--foo,var(--bar))` transform

## [0.5.0] - 2018-09-13
* Add support for inline HTML documents set with `.innerHTML=` syntax
* Add support for parsing `Polymer({})` elements from Closure Compiler output
* Add support for `--build-for-shady` and Polymer v1 `::content` selectors
* Drop `esm` module for manual `rollup` build of `@webcomponents/shadycss`
  * Too many weird loader issues for various customers
* Do not mark polymer v1 templates with `css-build` attribute.

## [0.4.0] - 2018-08-21
* Add support for class based elements and inlined templates
  * `class MyElement extends Polymer.Element {}` + `<dom-module id="my-element">`
  * ```Polymer({is: 'legacy-inline-element', _template: Polymer.html``})```;
  * ```class MyInlineElement extends Polymer.Element {static get template(){ return Polymer.html``}}```
  * ```template.innerHTML = html`<custom-style><style is="custom-style></style></custom-style>`; document.body.appendChild(template.content.cloneNode(true))```
* Remove support for polymer-analyzer v2
  * Inlined templates require features found in polymer-analyzer v3

## [0.3.3] - 2018-09-28
* Rebuild shadycss bundle with changes from https://github.com/webcomponents/shadycss/pull/215

## [0.3.2] - 2018-09-12
* Fix typo in package.json
* Do not mark polymer v1 templates with `css-build` attribute.

## [0.3.1] - 2018-09-12
* Add support for `--build-for-shady` and Polymer v1 `::content` selectors
* Drop `esm` module for manual `rollup` build of `@webcomponents/shadycss`
  * Too many weird loader issues for various customers

## [0.3.0] - 2018-08-10
* Upgrade to using @webcomponents/shadydom for Polymer v2 support
* Use polymer-analyzer instead of hydrolysis
* Remove vulcanize step of Polymer v1
* Add `--polymer-version` flag to specify v1 or v2
  * `--polymer-version=2` is default
* Also mark `<template>` in `<dom-module>` with `css-build` attribute
* Rewrite tests to test Polymer v1 and Polymer v2
* **NOTE**: Only `Polymer({})` elements are supported for now!

## [0.2.2] - 2017-10-17
### Fixed
* Don't distribute development git submodule

## [0.2.1] - 2017-10-17
### Fixed
* Removed broken package-lock.json that was breaking tests

## [0.2.0] - 2017-10-17
### Fixed
* Fix selectors of the form `html:not([foo]) *`
* Support the `:dir()` selector

## [0.1.1] - 2017-05-23
### Fixed
* Fix `--no-inline-includes` to collect includes when collating styles

## [0.1.0] - 2017-03-07
### Fixed
* Also support `name="..."` and `is="..."` when identifying `<dom-module>`s
* Handle Polymer 1.7+ Hybrid elements using `::slotted()` syntax

## [0.0.9] - 2017-02-23
### Fixed
* Respin node module

## [0.0.8] - 2017-02-23
### Added
* Added `--no-inline-includes` to optionally not inline `<style include>` elements

### Fixed
* Fixed ordering of when `<custom-style>` is processed

## [0.0.7] - 2016-11-01

### Added
* Don't process CSS in templates with a `preserve-content` attribute.

### Fixed
* Fix support for node v4. (Don't use Array.includes)
* Improve shimming of incorrect `var()` calls, where the fallback value is a custom property that doesn't itself use `var()`
* Improve support for node v6 by updating to the `command-line-args` v3 branch.
