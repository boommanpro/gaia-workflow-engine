/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import React from 'react';

import type { Meta, StoryObj } from 'storybook-react-rsbuild';

interface HelloWorldProps {
  name?: string;
  message?: string;
}

const HelloWorld: React.FC<HelloWorldProps> = ({
  name = 'World',
  message = 'Welcome to Flowgram Materials!',
}) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      padding: '40px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '12px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    }}
  >
    <h1
      style={{
        margin: 0,
        fontSize: '2.5rem',
        fontWeight: 'bold',
        marginBottom: '10px',
      }}
    >
      Hello, {name}! 👋
    </h1>
    <p
      style={{
        margin: 0,
        fontSize: '1.2rem',
        opacity: 0.9,
      }}
    >
      {message}
    </p>
    <div
      style={{
        marginTop: '20px',
        padding: '10px 20px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '20px',
        fontSize: '0.9rem',
      }}
    >
      ✨ Powered by Flowgram
    </div>
  </div>
);

const meta: Meta<typeof HelloWorld> = {
  title: 'Welcome/HelloWorld',
  component: HelloWorld,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A beautiful hello world component to welcome users to Flowgram materials.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
      description: 'Name to greet',
      defaultValue: 'World',
    },
    message: {
      control: 'text',
      description: 'Welcome message',
      defaultValue: 'Welcome to Flowgram Materials!',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const CustomGreeting: Story = {
  args: {
    name: 'Flowgram Developer',
    message: 'Ready to build amazing workflows! 🚀',
  },
};

export const Simple: Story = {
  args: {
    name: 'Friend',
    message: "Let's get started!",
  },
};
