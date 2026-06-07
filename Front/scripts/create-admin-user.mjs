#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const DEFAULT_EMAIL = 'lucio.horcajada@gmail.com';
const DEFAULT_NAME = 'Lucio Horcajada';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CANDIDATE_ENV_FILES = [resolve(process.cwd(), '.env'), resolve(SCRIPT_DIR, '..', '.env')];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    if (value.startsWith('export ')) {
      value = value.slice(7).trim();
    }

    const quoted = value.match(/^(['"])(.*)\1$/);

    if (quoted) {
      value = quoted[2];
    }

    process.env[key] = value;
  }
}

function loadLocalEnv() {
  for (const filePath of CANDIDATE_ENV_FILES) {
    loadEnvFile(filePath);
  }
}

loadLocalEnv();

function readArgValue(flagName) {
  const flagIndex = process.argv.findIndex((argument) => argument === flagName);

  if (flagIndex === -1) {
    return null;
  }

  return process.argv[flagIndex + 1] ?? null;
}

function readInput() {
  const email =
    readArgValue('--email') ?? process.env.ADMIN_EMAIL ?? process.env.npm_config_email ?? DEFAULT_EMAIL;
  const name = readArgValue('--name') ?? process.env.ADMIN_NAME ?? process.env.npm_config_name ?? DEFAULT_NAME;
  const password =
    readArgValue('--password') ?? process.env.ADMIN_PASSWORD ?? process.env.npm_config_password ?? '';

  return {
    email: email.trim().toLowerCase(),
    name: name.trim(),
    password: password.trim(),
  };
}

function readSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Falta SUPABASE_URL o VITE_SUPABASE_URL.');
  }

  if (!serviceRoleKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY.');
  }

  return { url, serviceRoleKey };
}

function generatePassword() {
  return randomBytes(18).toString('base64url');
}

async function findAuthUserByEmail(adminClient, email) {
  let page = 1;

  while (page < 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    const user = data.users.find((currentUser) => currentUser.email?.toLowerCase() === email);

    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function upsertProfile(adminClient, userId, email, name) {
  const { error } = await adminClient.from('profiles').upsert(
    {
      id: userId,
      email,
      display_name: name,
      role: 'admin',
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw error;
  }
}

async function main() {
  const { email, name, password: inputPassword } = readInput();
  const { url, serviceRoleKey } = readSupabaseConfig();
  const password = inputPassword || generatePassword();
  const adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const existingUser = await findAuthUserByEmail(adminClient, email);
  let userId = existingUser?.id ?? null;

  if (existingUser) {
    const { data, error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: name,
        full_name: name,
      },
    });

    if (error) {
      throw error;
    }

    userId = data.user?.id ?? existingUser.id;
  } else {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: name,
        full_name: name,
      },
    });

    if (error) {
      throw error;
    }

    userId = data.user?.id ?? null;
  }

  if (!userId) {
    throw new Error('No se pudo resolver el id del usuario creado.');
  }

  await upsertProfile(adminClient, userId, email, name);

  console.log(`Admin listo: ${email}`);
  console.log(`User id: ${userId}`);
  console.log(`Password: ${password}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});