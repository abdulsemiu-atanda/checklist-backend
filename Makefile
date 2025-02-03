#
# Checklist Backend
#
PROJECT := "Checklist API"
NODE_PATH := "."

all: install start

environment: ;
	bash ./scripts/dependencies.sh
	bash ./scripts/credentials.sh

database: ; yarn prepare:db

development: ; yarn dev

build: ;
	@echo "Starting production build for ${PROJECT}..."
	yarn build

test: ;
	@echo "Testing ${PROJECT}...."
	yarn test

install: ;
	@echo "Installing ${PROJECT} runtime dependencies..."
	yarn

start: ;
	@echo "Starting production server for ${PROJECT}..."
	yarn start

clean: ;
	rm -rf dist/

.PHONY: test start install clean