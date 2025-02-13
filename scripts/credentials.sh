#!/usr/bin/env bash

NODE_ENV="${NODE_ENV:-development}"

function create_environemnt_file {
  local CREDENTIALS_FILE="./.env.$NODE_ENV"

  if [[ -f "$CREDENTIALS_FILE" ]]; then
    echo "Environment variables has been created..."
  else
    cat .env.development.sample >> $CREDENTIALS_FILE
    sed -i '' "s/^HASH_SALT=.*/HASH_SALT=$(openssl rand -hex 32)/" "$CREDENTIALS_FILE"
    sed -i '' "s/^SECRET=.*/SECRET=$(openssl rand -hex 32)/" "$CREDENTIALS_FILE"
    sed -i '' "s/^DATA_ENCRYPTION_KEY=.*/DATA_ENCRYPTION_KEY=$(openssl rand -hex 16)/" "$CREDENTIALS_FILE"
    sed -i '' "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$(openssl rand -base64 32 | sed 's/[\\&*./+!]/\\&/g')/" "$CREDENTIALS_FILE"
    sed -i '' "s/^ENCRYPTION_SALT=.*/ENCRYPTION_SALT=$(openssl rand -hex 32 | sed 's/[\\&*./+!]/\\&/g')/" "$CREDENTIALS_FILE"
    sed -i '' "s/^DATA_DIGEST_KEY=.*/DATA_DIGEST_KEY=$(openssl rand -base64 32 | sed 's/[\\&*./+!]/\\&/g')/" "$CREDENTIALS_FILE"
    echo "Environmeent variables file created, please check and update values as needed."
  fi
}

create_environemnt_file
