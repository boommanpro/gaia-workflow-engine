/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

/**
 * How to use it:
 * - cd apps/docs
 * - Add apps/docs/.env file, to set OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
 * - Use `git add .` to add all changed docs to git staged changes
 * - Run `npm run translate:zh` to translate all zh files to en
 */

import * as process from 'process';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

import { ChatCompletionMessageParam } from 'openai/resources/chat';
import OpenAI from 'openai';

// eslint-disable-next-line import/no-extraneous-dependencies
import 'dotenv/config';

const languages = ['zh', 'en'];
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});
const model = process.env.OPENAI_MODEL!;

const sourceLang = process.argv[2];

if (!languages.includes(sourceLang)) {
  console.error(`Invalid language: ${sourceLang}`);
  process.exit(1);
}

const targetLangs = languages.filter((_lang) => _lang !== sourceLang);

async function translateContent(
  content: string,
  targetLang: string,
  previousTargetContent?: string
) {
  let systemPrompts = `
You are a translator.
You will translate the following content from ${sourceLang} to ${targetLang}.\n
`;

  console.log('previousTargetContent', previousTargetContent);

  //   if (previousTargetContent) {
  //     systemPrompts += `
  // The target file is translated previously, here is the content:
  // ${previousTargetContent}
  // Only translate the content that is different in ${sourceLang}.\n
  // `;
  //   }

  systemPrompts += `
Constraint:
- ONLY RETURN THE TRANSLATED CONTENT, NO OTHER TEXT.
  `;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompts,
    },
    { role: 'user', content },
  ];

  const response = await ai.chat.completions.create({
    model,
    messages,
  });

  return response.choices[0].message.content ?? '';
}

async function translateFiles() {
  // 1. Get Stage Changed Documentations for source language
  const gitDiffOutput = execSync('git diff --cached --name-only', {
    encoding: 'utf-8',
  });
  const allChangedFiles: string[] = gitDiffOutput.split('\n').filter(Boolean);

  console.log('Get Diff files:', allChangedFiles);

  const sourceLangFolder = path.join(__dirname, '../src', sourceLang);
  const sourceLangFolderAbs = path.join('apps/docs/src', sourceLang);

  // Find all *.md, *.mdx files in sourceLangFolder
  const diffMarkdownFiles: string[] = allChangedFiles
    .filter(
      (file) =>
        file.includes(sourceLangFolderAbs) && (file.endsWith('.md') || file.endsWith('.mdx'))
    )
    .map((file) => path.relative(sourceLangFolderAbs, file));

  console.log('Files to be translated:', diffMarkdownFiles);

  // 2. For each file, translate it to other language
  await Promise.all(
    diffMarkdownFiles.map(async (file) => {
      for (const targetLang of targetLangs) {
        const targetLangFolder = path.join(__dirname, '../src', targetLang);

        const sourceFile = path.join(sourceLangFolder, file);
        const targetFile = path.join(targetLangFolder, file);

        if (!fs.existsSync(sourceFile)) {
          console.error(`Source file not found: ${sourceFile}`);
          continue;
        }

        // 2.1. Read the file
        const sourceContent = fs.readFileSync(sourceFile, 'utf-8');

        console.log(`Translate ${sourceFile} to ${targetFile}`);
        console.log(sourceContent);
        console.log('\n\n\n\n\n');

        const previousTargetContent = fs.existsSync(targetFile)
          ? fs.readFileSync(targetFile, 'utf-8')
          : undefined;

        // 2.2. Translate the content
        const targetContent = await translateContent(
          sourceContent,
          targetLang,
          previousTargetContent
        );

        // 2.3. Write the translated file
        if (!fs.existsSync(path.dirname(targetFile))) {
          fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        }
        fs.writeFileSync(targetFile, targetContent);

        console.log(`Translated: ${targetFile}`);
        console.log(targetContent);
        console.log('\n\n\n\n\n');
      }
    })
  );
}

translateFiles().catch((err) => {
  console.error('Error generating docs:', err);
});
