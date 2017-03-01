# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## Unreleased
* Also support `name="..."` and `is="..."` when identifying `<dom-module>`s

## [0.0.7] - 2016-11-01

### Added
* Don't process CSS in templates with a `preserve-content` attribute.

### Fixed
* Fix support for node v4. (Don't use Array.includes)
* Improve shimming of incorrect `var()` calls, where the fallback value is a custom property that doesn't itself use `var()`
* Improve support for node v6 by updating to the `command-line-args` v3 branch.

