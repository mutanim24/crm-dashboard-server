# Workflow JSON Schema Documentation

This document describes the JSON schema for storing workflows in the CRM system. The schema is designed to be flexible and scalable for different node types.

## Overview

The workflow schema consists of:
- **Workflow**: The top-level container for a workflow definition
- **Nodes**: Individual workflow elements (triggers, actions, forms, etc.)
- **Edges**: Connections between nodes
- **Metadata**: Additional workflow information and settings

## Workflow Structure

### Basic Workflow Object

```json
{
  "id": "workflow-001",
  "name": "Workflow Name",
  "description": "Optional description",
  "nodes": [...],
  "edges": [...],
  "viewport": {...},
  "metadata": {...},
  "settings": {...}
}
```

### Workflow Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | Yes | Unique identifier for the workflow |
| name | string | Yes | Name of the workflow |
| description | string | No | Description of the workflow |
| nodes | array | Yes | Array of workflow nodes |
| edges | array | Yes | Array of edges connecting nodes |
| viewport | object | No | Canvas viewport state (x, y, zoom) |
| metadata | object | No | Additional workflow metadata |
| settings | object | No | Workflow settings and configuration |

## Node Types

### Base Node Structure

All nodes share a common structure:

```json
{
  "id": "node-001",
  "type": "trigger",
  "position": {
    "x": 100,
    "y": 100
  },
  "data": {
    // Node-specific configuration
  },
  "config": {
    // Additional configuration (optional)
  }
}
```

### Trigger Node

Triggers start a workflow when a specific event occurs.

```json
{
  "id": "node-001",
  "type": "trigger",
  "position": {"x": 100, "y": 100},
  "data": {
    "label": "When Contact is Created",
    "description": "Starts when a new contact is created",
    "triggerType": "contact_created"
  }
}
```

**Trigger Types:**
- `tag_added`: When a tag is added to a contact
- `form_submission`: When a form is submitted
- `webhook`: When a webhook is received
- `contact_created`: When a new contact is created
- `contact_updated`: When a contact is updated

### Action Node

Actions perform specific operations in the workflow.

```json
{
  "id": "node-002",
  "type": "action",
  "position": {"x": 300, "y": 100},
  "data": {
    "label": "Send Welcome Email",
    "description": "Send a welcome email",
    "actionType": "send_email",
    "emailConfig": {
      "to": "{{contact.email}}",
      "subject": "Welcome!",
      "body": "Welcome to our service!"
    }
  }
}
```

**Action Types:**
- `send_email`: Send an email
- `send_sms`: Send an SMS message
- `add_tag`: Add a tag to a contact
- `remove_tag`: Remove a tag from a contact
- `create_task`: Create a task
- `update_contact`: Update a contact field

### Form Node

Forms collect data from users.

```json
{
  "id": "node-003",
  "type": "form",
  "position": {"x": 500, "y": 100},
  "data": {
    "label": "Contact Information",
    "description": "Collect contact details",
    "formTitle": "Contact Information",
    "formFields": [
      {
        "id": "name",
        "name": "Full Name",
        "type": "text",
        "required": true
      },
      {
        "id": "email",
        "name": "Email Address",
        "type": "email",
        "required": true
      }
    ]
  }
}
```

### Wait Node

Waits pause the workflow for a specified time or until a condition is met.

```json
{
  "id": "node-004",
  "type": "wait",
  "position": {"x": 700, "y": 100},
  "data": {
    "label": "Wait 24 Hours",
    "description": "Wait for 24 hours",
    "waitType": "delay",
    "delayAmount": 24,
    "delayUnit": "hours"
  }
}
```

**Wait Types:**
- `delay`: Wait for a specified amount of time
- `until`: Wait until a specific date/time
- `date`: Wait until a specific date

### Condition Node

Conditions branch the workflow based on specific criteria.

```json
{
  "id": "node-005",
  "type": "condition",
  "position": {"x": 900, "y": 100},
  "data": {
    "label": "Check Status",
    "description": "Check contact status",
    "conditionType": "if_field_equals",
    "field": "status",
    "operator": "equals",
    "value": "active"
  }
}
```

**Condition Types:**
- `if_field_equals`: Check if a field equals a value
- `if_tag_exists`: Check if a tag exists
- `if_date_passed`: Check if a date has passed
- `if_custom`: Custom logic expression

### Webhook Node

Webhooks make HTTP requests to external services.

```json
{
  "id": "node-006",
  "type": "webhook",
  "position": {"x": 1100, "y": 100},
  "data": {
    "label": "Send to External API",
    "description": "Send data to external service",
    "endpoint": "https://api.example.com/webhook",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer token"
    },
    "payload": {
      "contactId": "{{contact.id}}"
    }
  }
}
```

## Edges

Edges connect nodes and define the flow of the workflow.

```json
{
  "id": "edge-001",
  "source": "node-001",
  "target": "node-002",
  "condition": {
    "field": "status",
    "operator": "equals",
    "value": "active"
  },
  "label": "Active Path"
}
```

### Edge Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | Yes | Unique identifier for the edge |
| source | string | Yes | ID of the source node |
| target | string | Yes | ID of the target node |
| sourceHandle | string | No | Handle ID of the source node |
| targetHandle | string | No | Handle ID of the target node |
| condition | object | No | Condition for edge traversal |
| label | string | No | Label for the edge |

## Metadata and Settings

### Metadata

Additional information about the workflow.

```json
{
  "metadata": {
    "version": "1.0.0",
    "author": "John Doe",
    "tags": ["welcome", "onboarding"],
    "category": "onboarding"
  }
}
```

### Settings

Workflow configuration and behavior settings.

```json
{
  "settings": {
    "isActive": true,
    "runOn": "creation",
    "errorHandling": {
      "continueOnError": false,
      "maxRetries": 3,
      "retryDelay": 60
    }
  }
}
```

**Settings Properties:**
- `isActive`: Whether the workflow is active
- `runOn`: When to run the workflow (`creation`, `update`, `manual`)
- `errorHandling`: Error handling configuration
  - `continueOnError`: Continue workflow even if an error occurs
  - `maxRetries`: Maximum number of retry attempts
  - `retryDelay`: Delay between retries in seconds

## Usage Examples

### Creating a Simple Workflow

```javascript
const { WorkflowSchema, mockWorkflow } = require('./workflowSchema');

// Validate a workflow against the schema
const isValid = validate(workflow, WorkflowSchema);

// Use the mock workflow as a starting point
const newWorkflow = {
  ...mockWorkflow,
  name: "My Custom Workflow",
  description: "A custom workflow example"
};
```

### Adding a New Node

```javascript
const newNode = {
  id: `node-${Date.now()}`,
  type: 'action',
  position: { x: 100, y: 200 },
  data: {
    label: 'Send Notification',
    description: 'Send a notification email',
    actionType: 'send_email',
    emailConfig: {
      to: '{{contact.email}}',
      subject: 'Update',
      body: 'Your record has been updated.'
    }
  }
};

const updatedWorkflow = {
  ...workflow,
  nodes: [...workflow.nodes, newNode]
};
```

## Frontend Integration

### TypeScript Interfaces

Import the TypeScript interfaces for type safety:

```typescript
import { 
  Workflow, 
  TriggerNode, 
  ActionNode, 
  Edge,
  NODE_TYPES 
} from '../types/workflow';

// Use the interfaces in your components
const workflow: Workflow = {
  id: 'workflow-001',
  name: 'My Workflow',
  nodes: [],
  edges: []
};
```

### JSDoc Types

For JavaScript projects, use the JSDoc types:

```javascript
/**
 * @type {import('../types/workflow').Workflow}
 */
const workflow = {
  id: 'workflow-001',
  name: 'My Workflow',
  nodes: [],
  edges: []
};
```

## Backend Integration

### Database Storage

The workflow definition is stored as JSON in the `definition` field of the `AutomationWorkflow` model.

```javascript
// Save a workflow to the database
const workflow = await prisma.automationWorkflow.create({
  data: {
    name: 'My Workflow',
    definition: workflowJson, // The complete workflow object
    userId: req.user.id
  }
});
```

### Validation

Validate workflow data before saving:

```javascript
const { WorkflowSchema } = require('./workflowSchema');
const Ajv = require('ajv');

const ajv = new Ajv();
const validate = ajv.compile(WorkflowSchema);

const isValid = validate(workflowJson);
if (!isValid) {
  console.error('Validation errors:', validate.errors);
}
```

## Future Extensions

The schema is designed to be extensible. To add new node types:

1. Define a new node schema extending `BaseNode`
2. Add the new node type to the `oneOf` array in the `WorkflowSchema`
3. Update the frontend interfaces and components
4. Add the new node type to the `NODE_TYPES` constant

## Contributing

When modifying the schema:

1. Update both the backend schema and frontend interfaces
2. Ensure backward compatibility where possible
3. Update this documentation with any changes
4. Add tests for new functionality
