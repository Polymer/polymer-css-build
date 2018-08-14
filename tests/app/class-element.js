/**
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

class ClassElement extends Polymer.Element {
  static get is() {
    return 'class-element';
  }
  static get template() {
    return Polymer.html`
    <style include="module-shared">
      :host {
        @apply --module-mixin;
      }
      #inner {
        color: var(--distributed);
      }
    </style>
    <div id="inner"></div>
    `;
  }
}

customElements.define(ClassElement.is, ClassElement);

class OtherElement extends Polymer.Element {
  static get is() {return 'other-element'}
  static get template() {
    return Polymer.html`<style>:host{@apply --module-mixin}</style>`;
  }
}

customElements.define(OtherElement.is, OtherElement);

const template = Polymer.html`
<dom-module id="module-shared">
  <template>
    <style>
      div {
        border: 20px solid black;
      }
    </style>
  </template>
</dom-module>

<custom-style>
  <style>
    html {
      --module-mixin: {
        background-color: rgb(0, 0, 128);
      }
    }
  </style>
</custom-style>
`
document.head.appendChild(template.content.cloneNode(true));