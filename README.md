# Polymer CSS Builder
> Statically apply Polymer's CSS Mixin shim and ShadyDOM scoping

## Use
1. (Optionally) Bundle your project
1. Checkout this tool
1. `npm install`
1. `node bin/polymer-css-build path/to/vulcanized-file.html`
1. Set `--polymer-version` flag to `1` or `2`
1. If multiple files are passed, they are expected to be all of the dependencies used during the lifecycle of the application.
1. Output file names should be specified in the same order as input files

## Build Types, Targeted Builds, and Polymer DOM modes

We define "targeted builds" to mean that when using the the defaults of Polymer 2, and `{dom: shadow}` option for Polymer 1,
no work will be done by ShadyCSS at runtime.

By default, `polymer-css-build` will produce built styles that are targeted for ShadowDOM.
This is done because ShadowDOM is the default for Polymer v2, and these styles can still be used in ShadyDOM mode with some runtime work,
and the built styles are portable to both Polymer ShadyDOM and ShadowDOM scoping modes.

### `--build-for-shady` flag
Polymer 1.x by default uses ShadyDOM, a lightweight shim of the ShadowDOM spec.

If your app only uses ShadyDOM, then some runtime work is still done to convert CSS selectors under the default settings.

To produce a targeted build for ShadyDOM, pass the `--build-for-shady` flag on the command line, or `{'build-for-shady': true}` to the library.
However, these styles will _only_ work with ShadyDOM enabled, and the modifications for ShadyDOM remove some CSS selector information necessary for ShadowDOM.

### `--polymer-version` flag
`polymer-css-build` uses `@webcomponents/shadycss` for transforming stylesheets since v0.3.0, which is what Polymer 2 and 3 use for ShadyDOM support and `@apply` mixins.

Polymer 1.x uses a few style transforms that are either deprecated, or behave differently from what is implemented in ShadyCSS.
Setting `--polymer-version=1` on the command line, or `{'polymer-version': '1'}` via the library will enable these transforms for use with projects using Polymer 1.x

By default, the version of Polymer is assumed to be "2".

## Inline Templates
Polymer 2 and 3 support inlining templates either with the legacy `Polymer()` syntax, or extending `Polymer.Element`.

### Caveats
- In both cases, `polymer-css-build` only supports inlined templates if they are made using the `html` tagged template function, and are not referenced via a variable, as illustrated by the samples below.

- Also, interpolations such as
  ```js
  Polymer.html`<style>${variable}</style><div></div>`
  ```
  are not supported.

### Legacy Function Example
```js
Polymer({
  is: 'legacy-inline-element',
  _template: Polymer.html`
  <style>...</style>
  <div id="hello"></div>
  `;
})
```

### Class Example
```js
class InlineElement extends Polymer.Element {
  static get is() {
    return 'inline-element'
  }
  static get template() {
    return Polymer.html`
    <style>...</style>
    <div id="hello"></div>
    `
  }
}
```
