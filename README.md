# Checklist API
Todo App that helps users add, create and share todo items

# Getting Started
## Prerequisites
- Unix based systems (Mac OSX, Linux, Windows Subsystem for Linux)
  - openssl
  - Homebrew
  - Redis
  - Postgres
  - NodeJS
  - Yarn

# Requirements
- NodeJS v20.9.0 and later

# Installation
- Clone repository
```bash
git clone git@github.com:abdulsemiu-atanda/checklist-backend.git
```
- Change directory
```bash
cd checklist-backend
```
- Install system dependencies and intialize environment variables.
```bash
make environment
```
- Update local environment variable as needed. Encryption related variables are auto-generated.

# Usage
- Start development server
```bash
yarn dev
```
- List of available endpoints are listed once the Express server starts running.

# Testing
Run tests with the following
```bash
yarn test
```

# Learn
- [NodeJS](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- [ExpressJS](https://expressjs.com/)
- [Mocha](https://mochajs.org/#getting-started)
- [Postgres](https://www.postgresql.org/about/)
- [Redis](https://redis.io/learn)

# Contributing
## Project Structure
```
├── config
├── scripts
├── src
│   ├── app
│   ├──config
│   ├──db
│   ├──setup
│   └──util
└──tests
```
