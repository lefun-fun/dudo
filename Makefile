.PHONY: build
build:
	pnpm run -r build

.PHONY: test
test:
	pnpm run -r test

.PHONY: format
format:
	pnpm prettier ui game --write

.PHONY: watch
watch:
	pnpm run -r watch
