#!/usr/bin/env bash
set -e

prep_shadow() {
  rm -rf test/shadow
  cp -r polymer test/shadow

  bin/polymer-css-build test/shadow/test/unit/styling-scoped-elements.html test/shadow/test/unit/styling-scoped.html
  bin/polymer-css-build test/shadow/test/unit/styling-cross-scope-unknown-host-shadow.html
  bin/polymer-css-build test/shadow/test/unit/styling-cross-scope-var.html
  bin/polymer-css-build test/shadow/test/unit/styling-cross-scope-apply.html
  bin/polymer-css-build test/shadow/test/unit/custom-style.html test/shadow/test/unit/custom-style-import.html test/shadow/test/unit/sub/style-import.html
  bin/polymer-css-build test/shadow/test/unit/custom-style-late.html test/shadow/test/unit/custom-style-late-import.html
  bin/polymer-css-build test/shadow/test/unit/dir.html
  bin/polymer-css-build test/shadow/test/unit/custom-style-transformed.html

  bin/polymer-css-build --no-inline-includes test/shadow/test/unit/preserve-style-include/styling-scoped.html test/shadow/test/unit/preserve-style-include/styling-scoped-elements-built.html

  cp test/issue-13.html test/shadow/test/unit/issue-13.html
  bin/polymer-css-build --no-inline-includes test/shadow/test/unit/issue-13.html
}

prep_shady() {
  rm -rf test/shady
  cp -r polymer test/shady

  bin/polymer-css-build --build-for-shady test/shady/test/unit/styling-scoped-elements.html test/shady/test/unit/styling-scoped.html
  bin/polymer-css-build --build-for-shady test/shady/test/unit/styling-cross-scope-var.html
  bin/polymer-css-build --build-for-shady test/shady/test/unit/styling-cross-scope-apply.html
  bin/polymer-css-build --build-for-shady test/shady/test/unit/custom-style.html test/shady/test/unit/custom-style-import.html test/shady/test/unit/sub/style-import.html
  bin/polymer-css-build --build-for-shady test/shady/test/unit/custom-style-late.html test/shady/test/unit/custom-style-late-import.html
  bin/polymer-css-build --build-for-shady test/shady/test/unit/dir.html
  bin/polymer-css-build --build-for-shady test/shady/test/unit/custom-style-transformed.html
}

test_all() {
  if [ ! -d test/webcomponentsjs ]; then
    ln -s ../node_modules/webcomponents.js test/webcomponentsjs
  fi
  wct test/index.html
}

if [ "$0" == "${BASH_SOURCE}" ]; then
  prep_shadow
  prep_shady
  test_all
fi
