#!/usr/bin/env bash
# @license
# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
set -e
set -x
rm -rf tests/generated
mkdir -p tests/generated/polymer{1,2}/{baseline,shadow,shadow-no-inline,shady}

build(){
  # require version number
  local version=${1:?"Version number needed!"}
  # require directory
  local outputDir=${2:?"Directory needed!"}
  # use flag if parameter is defined
  local shady=${3:+"--build-for-shady"}
  # use flag if parameter is defined
  local noInline=${4:+"--no-inline-includes"}

  cp -rv tests/app/* "tests/${outputDir}/"

  bin/polymer-css-build --polymer-version=${version} ${shady} ${noInline} --file tests/${outputDir}/index.html tests/${outputDir}/x-app.html tests/${outputDir}/x-app-dom-module.html tests/${outputDir}/x-app-definition.js tests/${outputDir}/x-component.html tests/${outputDir}/shared/shared-style.html tests/${outputDir}/x-nested-apply.html tests/${outputDir}/cr-bug.html tests/${outputDir}/class-element.js tests/${outputDir}/polymer-1-vars.html tests/${outputDir}/shady-unscoped.html

  (cd tests/${outputDir}; npx bower install polymer#${version} web-component-tester)
}

build "1" "generated/polymer1/shadow"
build "1" "generated/polymer1/shadow-no-inline" "" true
build "1" "generated/polymer1/shady" true
(cp -rv tests/app/* tests/generated/polymer1/baseline/; cd tests/generated/polymer1/baseline; npx bower install polymer#1 web-component-tester)
build "2" "generated/polymer2/shadow"
build "2" "generated/polymer2/shadow-no-inline" "" true
build "2" "generated/polymer2/shady" true
(cp -rv tests/app/* tests/generated/polymer2/baseline/; cd tests/generated/polymer2/baseline; npx bower install polymer#2 web-component-tester)