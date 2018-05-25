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
mkdir -p tests/generated/polymer{1,2}/{shadow,shadow-no-inline,shady}
# cp -r tests/app/ tests/generated/polymer1/shadow
# cp -r tests/app/ tests/generated/polymer1/shadow-no-inline
cp -r tests/app/ tests/generated/polymer1/shady
cp -r tests/app/ tests/generated/polymer2/shadow
# cp -r tests/app/ tests/generated/polymer2/shadow-no-inline
# cp -r tests/app/ tests/generated/polymer2/shady

build(){
  local version=${1}
  local shady=${2:+"--build-for-shady"}
  local noInline=${3:+"--no-inline-includes"}
  local outputDir=${4}

  bin/polymer-css-build --polymer-version=${version} ${shady} ${noInline} --file tests/${outputDir}/index.html tests/${outputDir}/x-app.html tests/${outputDir}/x-component.html tests/${outputDir}/shared/shared-style.html

  (cd tests/${outputDir}; npx bower install polymer#${version})
}

build "2" "" "" "generated/polymer2/shadow"