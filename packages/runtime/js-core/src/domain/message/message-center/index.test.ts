/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { WorkflowMessageType, MessageData } from '@flowgram.ai/runtime-interface';

import { WorkflowRuntimeMessageCenter } from './index';

describe('WorkflowRuntimeMessageCenter', () => {
  let messageCenter: WorkflowRuntimeMessageCenter;
  const mockMessageData: MessageData = {
    nodeID: 'test-node-1',
    message: 'Test message',
    timestamp: Date.now(),
  };

  beforeEach(() => {
    messageCenter = new WorkflowRuntimeMessageCenter();
    messageCenter.init();
  });

  describe('init', () => {
    it('should initialize with empty messages object', () => {
      const messages = messageCenter.export();
      expect(messages).toEqual({
        [WorkflowMessageType.Log]: [],
        [WorkflowMessageType.Info]: [],
        [WorkflowMessageType.Debug]: [],
        [WorkflowMessageType.Error]: [],
        [WorkflowMessageType.Warn]: [],
      });
    });

    it('should clear existing messages when called', () => {
      messageCenter.log(mockMessageData);
      const messagesAfterLog = messageCenter.export();
      expect(messagesAfterLog[WorkflowMessageType.Log]).toHaveLength(1);

      messageCenter.init();
      const messagesAfterInit = messageCenter.export();
      expect(messagesAfterInit).toEqual({
        [WorkflowMessageType.Log]: [],
        [WorkflowMessageType.Info]: [],
        [WorkflowMessageType.Debug]: [],
        [WorkflowMessageType.Error]: [],
        [WorkflowMessageType.Warn]: [],
      });
    });
  });

  describe('dispose', () => {
    it('should not throw error when called', () => {
      expect(() => messageCenter.dispose()).not.toThrow();
    });
  });

  describe('log', () => {
    it('should create and store log message', () => {
      const message = messageCenter.log(mockMessageData);

      expect(message.type).toBe(WorkflowMessageType.Log);
      expect(message.nodeID).toBe(mockMessageData.nodeID);
      expect(message.message).toBe(mockMessageData.message);
      expect(message.timestamp).toBe(mockMessageData.timestamp);
      expect(message.id).toBeDefined();
      expect(typeof message.id).toBe('string');

      const messages = messageCenter.export();
      expect(messages[WorkflowMessageType.Log]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Log][0]).toBe(message);
    });

    it('should handle message without nodeID', () => {
      const dataWithoutNodeID = {
        message: 'Test message without nodeID',
        timestamp: Date.now(),
      };

      const message = messageCenter.log(dataWithoutNodeID);
      expect(message.nodeID).toBeUndefined();
      expect(message.message).toBe(dataWithoutNodeID.message);
    });
  });

  describe('info', () => {
    it('should create and store info message', () => {
      const message = messageCenter.info(mockMessageData);

      expect(message.type).toBe(WorkflowMessageType.Info);
      expect(message.nodeID).toBe(mockMessageData.nodeID);
      expect(message.message).toBe(mockMessageData.message);
      expect(message.timestamp).toBe(mockMessageData.timestamp);
      expect(message.id).toBeDefined();

      const messages = messageCenter.export();
      expect(messages[WorkflowMessageType.Info]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Info][0]).toBe(message);
    });
  });

  describe('debug', () => {
    it('should create and store debug message', () => {
      const message = messageCenter.debug(mockMessageData);

      expect(message.type).toBe(WorkflowMessageType.Debug);
      expect(message.nodeID).toBe(mockMessageData.nodeID);
      expect(message.message).toBe(mockMessageData.message);
      expect(message.timestamp).toBe(mockMessageData.timestamp);
      expect(message.id).toBeDefined();

      const messages = messageCenter.export();
      expect(messages[WorkflowMessageType.Debug]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Debug][0]).toBe(message);
    });
  });

  describe('error', () => {
    it('should create and store error message', () => {
      const message = messageCenter.error(mockMessageData);

      expect(message.type).toBe(WorkflowMessageType.Error);
      expect(message.nodeID).toBe(mockMessageData.nodeID);
      expect(message.message).toBe(mockMessageData.message);
      expect(message.timestamp).toBe(mockMessageData.timestamp);
      expect(message.id).toBeDefined();

      const messages = messageCenter.export();
      expect(messages[WorkflowMessageType.Error]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Error][0]).toBe(message);
    });
  });

  describe('warn', () => {
    it('should create and store warning message', () => {
      const message = messageCenter.warn(mockMessageData);

      expect(message.type).toBe(WorkflowMessageType.Warn);
      expect(message.nodeID).toBe(mockMessageData.nodeID);
      expect(message.message).toBe(mockMessageData.message);
      expect(message.timestamp).toBe(mockMessageData.timestamp);
      expect(message.id).toBeDefined();

      const messages = messageCenter.export();
      expect(messages[WorkflowMessageType.Warn]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Warn][0]).toBe(message);
    });
  });

  describe('export', () => {
    beforeEach(() => {
      // Add different types of messages
      messageCenter.log({ message: 'Log message', timestamp: 1 });
      messageCenter.info({ message: 'Info message', timestamp: 2 });
      messageCenter.debug({ message: 'Debug message', timestamp: 3 });
      messageCenter.error({ message: 'Error message', timestamp: 4 });
      messageCenter.warn({ message: 'Warning message', timestamp: 5 });
    });

    it('should return all messages grouped by type', () => {
      const messages = messageCenter.export();

      expect(messages[WorkflowMessageType.Log]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Info]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Debug]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Error]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Warn]).toHaveLength(1);

      // Verify that a copy is returned, not the original array
      messages[WorkflowMessageType.Log].pop();
      const newMessages = messageCenter.export();
      expect(newMessages[WorkflowMessageType.Log]).toHaveLength(1);
    });

    it('should return correct log messages', () => {
      const messages = messageCenter.export();
      const logMessages = messages[WorkflowMessageType.Log];
      expect(logMessages).toHaveLength(1);
      expect(logMessages[0].type).toBe(WorkflowMessageType.Log);
      expect(logMessages[0].message).toBe('Log message');
    });

    it('should return correct info messages', () => {
      const messages = messageCenter.export();
      const infoMessages = messages[WorkflowMessageType.Info];
      expect(infoMessages).toHaveLength(1);
      expect(infoMessages[0].type).toBe(WorkflowMessageType.Info);
      expect(infoMessages[0].message).toBe('Info message');
    });

    it('should return correct debug messages', () => {
      const messages = messageCenter.export();
      const debugMessages = messages[WorkflowMessageType.Debug];
      expect(debugMessages).toHaveLength(1);
      expect(debugMessages[0].type).toBe(WorkflowMessageType.Debug);
      expect(debugMessages[0].message).toBe('Debug message');
    });

    it('should return correct error messages', () => {
      const messages = messageCenter.export();
      const errorMessages = messages[WorkflowMessageType.Error];
      expect(errorMessages).toHaveLength(1);
      expect(errorMessages[0].type).toBe(WorkflowMessageType.Error);
      expect(errorMessages[0].message).toBe('Error message');
    });

    it('should return correct warning messages', () => {
      const messages = messageCenter.export();
      const warnMessages = messages[WorkflowMessageType.Warn];
      expect(warnMessages).toHaveLength(1);
      expect(warnMessages[0].type).toBe(WorkflowMessageType.Warn);
      expect(warnMessages[0].message).toBe('Warning message');
    });

    it('should return empty arrays when no messages exist', () => {
      messageCenter.init(); // Clear all messages

      const messages = messageCenter.export();
      expect(messages[WorkflowMessageType.Log]).toEqual([]);
      expect(messages[WorkflowMessageType.Info]).toEqual([]);
      expect(messages[WorkflowMessageType.Debug]).toEqual([]);
      expect(messages[WorkflowMessageType.Error]).toEqual([]);
      expect(messages[WorkflowMessageType.Warn]).toEqual([]);
    });

    it('should maintain message order within each type', () => {
      // Add multiple messages of the same type
      messageCenter.log({ message: 'Log message 2', timestamp: 6 });
      messageCenter.log({ message: 'Log message 3', timestamp: 7 });

      const messages = messageCenter.export();
      const logMessages = messages[WorkflowMessageType.Log];

      expect(logMessages).toHaveLength(3);
      expect(logMessages[0].message).toBe('Log message');
      expect(logMessages[1].message).toBe('Log message 2');
      expect(logMessages[2].message).toBe('Log message 3');
    });
  });

  describe('message uniqueness', () => {
    it('should generate unique IDs for each message', () => {
      const message1 = messageCenter.log(mockMessageData);
      const message2 = messageCenter.log(mockMessageData);
      const message3 = messageCenter.info(mockMessageData);

      expect(message1.id).not.toBe(message2.id);
      expect(message1.id).not.toBe(message3.id);
      expect(message2.id).not.toBe(message3.id);
    });
  });

  describe('integration tests', () => {
    it('should handle multiple operations correctly', () => {
      // Add various types of messages
      const logMsg = messageCenter.log({ message: 'Log 1', timestamp: 1 });
      const infoMsg = messageCenter.info({ message: 'Info 1', timestamp: 2 });
      const errorMsg = messageCenter.error({ message: 'Error 1', timestamp: 3 });

      expect(logMsg.type).toBe(WorkflowMessageType.Log);
      expect(infoMsg.type).toBe(WorkflowMessageType.Info);
      expect(errorMsg.type).toBe(WorkflowMessageType.Error);

      // Verify messages are grouped by type
      const messages = messageCenter.export();
      expect(messages[WorkflowMessageType.Log]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Info]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Error]).toHaveLength(1);
      expect(messages[WorkflowMessageType.Debug]).toHaveLength(0);
      expect(messages[WorkflowMessageType.Warn]).toHaveLength(0);

      // Verify message content
      expect(messages[WorkflowMessageType.Log][0]).toBe(logMsg);
      expect(messages[WorkflowMessageType.Info][0]).toBe(infoMsg);
      expect(messages[WorkflowMessageType.Error][0]).toBe(errorMsg);

      // Reinitialize
      messageCenter.init();
      const emptyMessages = messageCenter.export();
      expect(emptyMessages[WorkflowMessageType.Log]).toHaveLength(0);
      expect(emptyMessages[WorkflowMessageType.Info]).toHaveLength(0);
      expect(emptyMessages[WorkflowMessageType.Error]).toHaveLength(0);
      expect(emptyMessages[WorkflowMessageType.Debug]).toHaveLength(0);
      expect(emptyMessages[WorkflowMessageType.Warn]).toHaveLength(0);

      // Add new message
      const newMsg = messageCenter.debug({ message: 'Debug after init', timestamp: 4 });
      const newMessages = messageCenter.export();
      expect(newMessages[WorkflowMessageType.Debug]).toHaveLength(1);
      expect(newMessages[WorkflowMessageType.Debug][0]).toBe(newMsg);
    });
  });
});
