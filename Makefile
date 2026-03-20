.PHONY: install
install:
	pnpm install

.PHONY: build
build:
	pnpm run -r build

.PHONY: test
test:
	pnpm run -r test

.PHONY: fix
fix:
	pnpm prettier ui game --write
	cd game && pnpm eslint . --fix
	cd ui && pnpm eslint . --fix

.PHONY: check
check:
	pnpm prettier ui game --check
	cd game && pnpm eslint . --quiet && pnpm tsc --noEmit --skipLibCheck
	cd ui && pnpm eslint . --quiet && pnpm tsc --noEmit --skipLibCheck

.PHONY: watch
watch:
	pnpm run --parallel -r watch

.PHONY: dev
dev:
	cd ui && pnpm run dev

.PHONY: all
all: fix check test
