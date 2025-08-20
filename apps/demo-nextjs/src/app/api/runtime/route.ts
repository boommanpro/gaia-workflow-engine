/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { NextResponse } from 'next/server';

import { main } from '../../../runtime';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await main(body.json);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Please use POST method' }, { status: 405 });
}
