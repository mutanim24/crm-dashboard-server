/**
 * Workflow JSON Schema for GoHighLevel-like CRM
 * 
 * This schema defines the structure for storing workflows in the database.
 * It's designed to be flexible and scalable for different node types.
 */

// Base node interface
const BaseNode = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Unique identifier for the node'
    },
    type: {
      type: 'string',
      enum: ['trigger', 'action', 'form', 'wait', 'condition', 'webhook'],
      description: 'Type of the node'
    },
    position: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' }
      },
      required: ['x', 'y']
    },
    data: {
      type: 'object',
      description: 'Node-specific configuration data'
    },
    config: {
      type: 'object',
      description: 'Additional configuration for the node'
    }
  },
  required: ['id', 'type', 'position', 'data']
};

// Trigger node schema
const TriggerNode = {
  ...BaseNode,
  type: 'object',
  properties: {
    ...BaseNode.properties,
    type: {
      type: 'string',
      enum: ['trigger'],
      const: 'trigger'
    },
    data: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        description: { type: 'string' },
        triggerType: {
          type: 'string',
          enum: ['tag_added', 'form_submission', 'webhook', 'contact_created', 'contact_updated'],
          description: 'Type of trigger event'
        },
        tagId: {
          type: 'string',
          description: 'Tag ID for tag_added trigger (optional)'
        },
        formId: {
          type: 'string',
          description: 'Form ID for form_submission trigger (optional)'
        },
        webhookUrl: {
          type: 'string',
          format: 'uri',
          description: 'Webhook URL for webhook trigger (optional)'
        }
      },
      required: ['label', 'description', 'triggerType']
    }
  }
};

// Action node schema
const ActionNode = {
  ...BaseNode,
  type: 'object',
  properties: {
    ...BaseNode.properties,
    type: {
      type: 'string',
      enum: ['action'],
      const: 'action'
    },
    data: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        description: { type: 'string' },
        actionType: {
          type: 'string',
          enum: ['send_email', 'send_sms', 'add_tag', 'remove_tag', 'create_task', 'update_contact'],
          description: 'Type of action'
        },
        emailConfig: {
          type: 'object',
          properties: {
            to: { type: 'string', format: 'email' },
            subject: { type: 'string' },
            body: { type: 'string' },
            templateId: { type: 'string' }
          },
          required: ['to', 'subject', 'body']
        },
        smsConfig: {
          type: 'object',
          properties: {
            to: { type: 'string', format: 'phone' },
            message: { type: 'string' }
          },
          required: ['to', 'message']
        },
        tagConfig: {
          type: 'object',
          properties: {
            tagId: { type: 'string' },
            tagName: { type: 'string' }
          },
          required: ['tagId']
        },
        taskConfig: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            dueDate: { type: 'string', format: 'date-time' },
            assigneeId: { type: 'string' }
          },
          required: ['title']
        },
        contactUpdateConfig: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            value: { type: ['string', 'number', 'boolean'] }
          },
          required: ['field', 'value']
        }
      },
      required: ['label', 'description', 'actionType']
    }
  }
};

// Form node schema
const FormNode = {
  ...BaseNode,
  type: 'object',
  properties: {
    ...BaseNode.properties,
    type: {
      type: 'string',
      enum: ['form'],
      const: 'form'
    },
    data: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        description: { type: 'string' },
        formTitle: { type: 'string' },
        formFields: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: {
                type: 'string',
                enum: ['text', 'email', 'number', 'select', 'textarea', 'checkbox', 'radio']
              },
              required: { type: 'boolean', default: false },
              options: {
                type: 'array',
                items: { type: 'string' },
                description: 'For select, checkbox, or radio types'
              },
              validation: {
                type: 'object',
                properties: {
                  min: { type: 'number' },
                  max: { type: 'number' },
                  pattern: { type: 'string' }
                }
              }
            },
            required: ['id', 'name', 'type']
          }
        },
        submitButtonText: { type: 'string', default: 'Submit' }
      },
      required: ['label', 'description', 'formTitle', 'formFields']
    }
  }
};

// Wait node schema
const WaitNode = {
  ...BaseNode,
  type: 'object',
  properties: {
    ...BaseNode.properties,
    type: {
      type: 'string',
      enum: ['wait'],
      const: 'wait'
    },
    data: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        description: { type: 'string' },
        waitType: {
          type: 'string',
          enum: ['delay', 'until', 'date'],
          description: 'Type of wait condition'
        },
        delayAmount: {
          type: 'number',
          description: 'Number of time units to wait (for delay type)'
        },
        delayUnit: {
          type: 'string',
          enum: ['minutes', 'hours', 'days', 'weeks'],
          description: 'Unit of time for delay (for delay type)'
        },
        waitUntil: {
          type: 'string',
          format: 'date-time',
          description: 'Date/time to wait until (for until type)'
        },
        specificDate: {
          type: 'string',
          format: 'date',
          description: 'Specific date to wait for (for date type)'
        }
      },
      required: ['label', 'description', 'waitType']
    }
  }
};

// Condition node schema
const ConditionNode = {
  ...BaseNode,
  type: 'object',
  properties: {
    ...BaseNode.properties,
    type: {
      type: 'string',
      enum: ['condition'],
      const: 'condition'
    },
    data: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        description: { type: 'string' },
        conditionType: {
          type: 'string',
          enum: ['if_field_equals', 'if_tag_exists', 'if_date_passed', 'if_custom'],
          description: 'Type of condition'
        },
        field: { type: 'string', description: 'Field to check (for field conditions)' },
        operator: {
          type: 'string',
          enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'],
          description: 'Comparison operator'
        },
        value: { 
          type: ['string', 'number', 'boolean'], 
          description: 'Value to compare against' 
        },
        tagId: { type: 'string', description: 'Tag to check for (for tag conditions)' },
        dateField: { type: 'string', description: 'Date field to check (for date conditions)' },
        daysOffset: { type: 'number', description: 'Days offset from now (for date conditions)' },
        customLogic: { type: 'string', description: 'Custom logic expression (for custom conditions)' }
      },
      required: ['label', 'description', 'conditionType']
    }
  }
};

// Webhook node schema
const WebhookNode = {
  ...BaseNode,
  type: 'object',
  properties: {
    ...BaseNode.properties,
    type: {
      type: 'string',
      enum: ['webhook'],
      const: 'webhook'
    },
    data: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        description: { type: 'string' },
        endpoint: { type: 'string', format: 'uri' },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          default: 'POST'
        },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'HTTP headers to include'
        },
        payload: {
          type: 'object',
          description: 'Request payload/body'
        },
        authentication: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['none', 'bearer', 'basic', 'api_key']
            },
            token: { type: 'string' },
            username: { type: 'string' },
            password: { type: 'string' },
            apiKey: { type: 'string' },
            apiKeyHeader: { type: 'string', default: 'X-API-Key' }
          }
        },
        responseMapping: {
          type: 'object',
          description: 'Map webhook response to contact fields'
        }
      },
      required: ['label', 'description', 'endpoint']
    }
  }
};

// Edge schema
const Edge = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Unique identifier for the edge'
    },
    source: {
      type: 'string',
      description: 'ID of the source node'
    },
    target: {
      type: 'string',
      description: 'ID of the target node'
    },
    sourceHandle: {
      type: 'string',
      description: 'Handle ID of the source node (optional)'
    },
    targetHandle: {
      type: 'string',
      description: 'Handle ID of the target node (optional)'
    },
    condition: {
      type: 'object',
      description: 'Condition for edge traversal (optional)',
      properties: {
        field: { type: 'string' },
        operator: { type: 'string' },
        value: { type: ['string', 'number', 'boolean'] }
      }
    },
    label: {
      type: 'string',
      description: 'Label for the edge (optional)'
    }
  },
  required: ['id', 'source', 'target']
};

// Workflow schema
const WorkflowSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Unique identifier for the workflow'
    },
    name: {
      type: 'string',
      description: 'Name of the workflow'
    },
    description: {
      type: 'string',
      description: 'Description of the workflow'
    },
    nodes: {
      type: 'array',
      items: {
        oneOf: [
          TriggerNode,
          ActionNode,
          FormNode,
          WaitNode,
          ConditionNode,
          WebhookNode
        ]
      },
      description: 'Array of nodes in the workflow'
    },
    edges: {
      type: 'array',
      items: Edge,
      description: 'Array of edges connecting nodes'
    },
    viewport: {
      type: 'object',
      properties: {
        x: { type: 'number' },
        y: { type: 'number' },
        zoom: { type: 'number' }
      },
      description: 'Canvas viewport state'
    },
    metadata: {
      type: 'object',
      properties: {
        version: { type: 'string' },
        author: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string' }
        },
        category: { type: 'string' }
      },
      description: 'Additional workflow metadata'
    },
    settings: {
      type: 'object',
      properties: {
        isActive: { type: 'boolean', default: true },
        runOn: {
          type: 'string',
          enum: ['creation', 'update', 'manual'],
          default: 'creation'
        },
        errorHandling: {
          type: 'object',
          properties: {
            continueOnError: { type: 'boolean', default: false },
            maxRetries: { type: 'number', default: 3 },
            retryDelay: { type: 'number', default: 60 }
          }
        }
      },
      description: 'Workflow settings and configuration'
    }
  },
  required: ['id', 'name', 'nodes', 'edges']
};

// Mock example workflow
const mockWorkflow = {
  id: "workflow-001",
  name: "New Contact Welcome Sequence",
  description: "Automated welcome sequence for new contacts",
  nodes: [
    {
      id: "node-001",
      type: "trigger",
      position: { x: 100, y: 100 },
      data: {
        label: "When Contact is Created",
        description: "Starts when a new contact is created",
        triggerType: "contact_created"
      }
    },
    {
      id: "node-002",
      type: "action",
      position: { x: 300, y: 100 },
      data: {
        label: "Send Welcome Email",
        description: "Send a welcome email to the new contact",
        actionType: "send_email",
        emailConfig: {
          to: "{{contact.email}}",
          subject: "Welcome to Our Service!",
          body: "Hi {{contact.firstName}},\n\nWelcome to our service. We're excited to have you on board!"
        }
      }
    },
    {
      id: "node-003",
      type: "wait",
      position: { x: 500, y: 100 },
      data: {
        label: "Wait 24 Hours",
        description: "Wait for 24 hours before next action",
        waitType: "delay",
        delayAmount: 24,
        delayUnit: "hours"
      }
    },
    {
      id: "node-004",
      type: "action",
      position: { x: 700, y: 100 },
      data: {
        label: "Send Follow-up Email",
        description: "Send a follow-up email after 24 hours",
        actionType: "send_email",
        emailConfig: {
          to: "{{contact.email}}",
          subject: "Checking In",
          body: "Hi {{contact.firstName}},\n\nJust checking in to see how you're doing with our service."
        }
      }
    }
  ],
  edges: [
    {
      id: "edge-001",
      source: "node-001",
      target: "node-002"
    },
    {
      id: "edge-002",
      source: "node-002",
      target: "node-003"
    },
    {
      id: "edge-003",
      source: "node-003",
      target: "node-004"
    }
  ],
  viewport: {
    x: 0,
    y: 0,
    zoom: 1
  },
  metadata: {
    version: "1.0.0",
    author: "System",
    tags: ["welcome", "onboarding", "email"],
    category: "onboarding"
  },
  settings: {
    isActive: true,
    runOn: "creation",
    errorHandling: {
      continueOnError: false,
      maxRetries: 3,
      retryDelay: 60
    }
  }
};

// Export schema and types
module.exports = {
  WorkflowSchema,
  TriggerNode,
  ActionNode,
  FormNode,
  WaitNode,
  ConditionNode,
  WebhookNode,
  Edge,
  mockWorkflow
};
