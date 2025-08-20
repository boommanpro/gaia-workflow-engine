/**
 * Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import { WorkflowSchema } from '@flowgram.ai/runtime-interface';

export interface ValidateInputsSchemaInputs {
  AA: string;
  BB: number;
  CC?: {
    CA: string;
    CB: number;
    CC: number;
    CD: boolean;
    CE: {
      CEA: string;
    };
    CF: string[];
  };
  DD?: Array<{
    DA?: string;
    DB?: {
      DBA: string;
    };
  }>;
  EE: {
    EA: {
      EAA: string;
    };
    EB?: string;
  };
}

export const validateInputsSchema: WorkflowSchema = {
  nodes: [
    {
      id: 'start_0',
      type: 'start',
      meta: {
        position: {
          x: 180,
          y: 0,
        },
      },
      data: {
        title: 'Start',
        outputs: {
          type: 'object',
          properties: {
            AA: {
              type: 'string',
              extra: {
                index: 0,
              },
            },
            BB: {
              type: 'integer',
              extra: {
                index: 1,
              },
            },
            CC: {
              type: 'object',
              extra: {
                index: 2,
              },
              properties: {
                CA: {
                  type: 'string',
                  extra: {
                    index: 0,
                  },
                },
                CB: {
                  type: 'integer',
                  extra: {
                    index: 1,
                  },
                },
                CC: {
                  type: 'number',
                  extra: {
                    index: 3,
                  },
                },
                CD: {
                  type: 'boolean',
                  extra: {
                    index: 4,
                  },
                },
                CE: {
                  type: 'object',
                  extra: {
                    index: 5,
                  },
                  properties: {
                    CEA: {
                      type: 'string',
                      extra: {
                        index: 1,
                      },
                    },
                  },
                  required: ['CEA'],
                },
                CF: {
                  type: 'array',
                  extra: {
                    index: 6,
                  },
                  items: {
                    type: 'string',
                  },
                },
              },
              required: ['CA', 'CB', 'CC', 'CD', 'CE', 'CF'],
            },
            DD: {
              type: 'array',
              extra: {
                index: 3,
              },
              items: {
                type: 'object',
                properties: {
                  DA: {
                    type: 'string',
                    extra: {
                      index: 1,
                    },
                  },
                  DB: {
                    type: 'object',
                    extra: {
                      index: 2,
                    },
                    properties: {
                      DBA: {
                        type: 'string',
                        extra: {
                          index: 1,
                        },
                      },
                    },
                    required: ['DBA'],
                  },
                },
                required: [],
              },
            },
            EE: {
              type: 'object',
              extra: {
                index: 4,
              },
              properties: {
                EA: {
                  type: 'object',
                  extra: {
                    index: 1,
                  },
                  properties: {
                    EAA: {
                      type: 'string',
                      extra: {
                        index: 1,
                      },
                    },
                  },
                  required: ['EAA'],
                },
                EB: {
                  type: 'string',
                  extra: {
                    index: 2,
                  },
                },
              },
              required: ['EA'],
            },
          },
          required: ['AA', 'EE'],
        },
      },
    },
    {
      id: 'end_0',
      type: 'end',
      meta: {
        position: {
          x: 640,
          y: 0,
        },
      },
      data: {
        title: 'End',
        inputs: {
          type: 'object',
          properties: {
            AA: {
              type: 'string',
            },
            BB: {
              type: 'integer',
            },
            CC: {
              type: 'object',
            },
            DD: {
              type: 'array',
            },
            EE: {
              type: 'object',
            },
          },
        },
        inputsValues: {
          AA: {
            type: 'ref',
            content: ['start_0', 'AA'],
          },
          BB: {
            type: 'ref',
            content: ['start_0', 'BB'],
          },
          CC: {
            type: 'ref',
            content: ['start_0', 'CC'],
          },
          DD: {
            type: 'ref',
            content: ['start_0', 'DD'],
          },
          EE: {
            type: 'ref',
            content: ['start_0', 'EE'],
          },
        },
      },
    },
  ],
  edges: [
    {
      sourceNodeID: 'start_0',
      targetNodeID: 'end_0',
    },
  ],
};
