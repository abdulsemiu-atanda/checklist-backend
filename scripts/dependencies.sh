#!/usr/bin/env bash

function install_homebrew {
  curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh
}

function install_redis {
  brew install redis-cli
}

function install_postgres {
  brew install postgres
}

function install_node {
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  nvm install 22
}

function install_yarn {
  curl -o- -L https://yarnpkg.com/install.sh | bash
}

function install_dependencies {
  requirements='brew redis-cli postgres node yarn'

  for requirement in $requirements; do
    if which $requirement >/dev/null 2>&1; then
      echo "$requirement dependency exists"
      echo "version: $($requirement --version)"
    else
      echo "$requirement dependency does not exist"
      echo 'Installing...'
      case $requirement in
      "brew")
        install_homebrew
        ;;
      "redis-cli")
        install_redis
        ;;
      "postgres")
        install_postgres
        ;;
      "node")
        install_node
        ;;
      "yarn")
        install_yarn
        ;;
      *)
        echo 'Nothing to do...'
        ;;
      esac
    fi
  done
}

function brew_start_services {
  if [[ $(brew services list | awk '/redis/ { print $1 }') == "redis" ]] && [[ $(brew services list | awk '/redis/ { print $2 }') != "started" ]]; then
    brew services start redis
  elif [[ $(brew services list | awk '/postgres/ { print $1 }') == "postgres" ]] && [[ $(brew services list | awk '/postgres/ { print $2 }') != "started" ]]; then
    brew service start postgres
  else
    echo "Brew has started all services..."
  fi
}

install_dependencies
brew_start_services
