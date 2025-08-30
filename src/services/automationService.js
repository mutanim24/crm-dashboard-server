/**
 * Service for handling internal automation workflows
 */

const { prisma } = require('./db');

/**
 * Triggers an internal workflow based on an event
 * @param {string} eventName - The name of the event that triggered the workflow
 * @param {number} contactId - The ID of the contact associated with the event
 */
async function triggerWorkflow(eventName, contactId) {
  console.log(`[Automation Service] Triggering workflow for event '${eventName}' on contact ID ${contactId}`);
  
  try {
    // Find the contact to ensure it exists
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        deals: {
          include: {
            stage: true,
            pipeline: true
          }
        },
        user: true
      }
    });
    
    if (!contact) {
      console.error(`[Automation Service] Contact with ID ${contactId} not found`);
      return { success: false, message: 'Contact not found' };
    }
    
    // Find active workflows that match this event type
    const workflows = await prisma.workflow.findMany({
      where: {
        isActive: true,
        triggers: {
          some: {
            eventType: eventName
          }
        }
      },
      include: {
        triggers: true,
        actions: true
      }
    });
    
    console.log(`[Automation Service] Found ${workflows.length} active workflows for event '${eventName}'`);
    
    // Process each matching workflow
    for (const workflow of workflows) {
      try {
        // Check if workflow conditions are met
        const conditionsMet = await evaluateWorkflowConditions(workflow, contact);
        
        if (conditionsMet) {
          console.log(`[Automation Service] Executing workflow '${workflow.name}' for contact ${contactId}`);
          
          // Execute workflow actions
          const executionResult = await executeWorkflowActions(workflow, contact);
          
          // Log workflow execution
          await prisma.activity.create({
            data: {
              type: 'workflow_executed',
              note: `Workflow '${workflow.name}' executed successfully for event '${eventName}'`,
              userId: contact.userId,
              contactId: contact.id,
              data: {
                workflowId: workflow.id,
                eventName,
                executionResult
              }
            }
          });
          
          console.log(`[Automation Service] Workflow '${workflow.name}' executed successfully`);
        } else {
          console.log(`[Automation Service] Workflow '${workflow.name}' conditions not met for contact ${contactId}`);
        }
      } catch (error) {
        console.error(`[Automation Service] Error executing workflow '${workflow.name}':`, error);
        
        // Log workflow execution failure
        await prisma.activity.create({
          data: {
            type: 'workflow_failed',
            note: `Workflow '${workflow.name}' failed to execute for event '${eventName}': ${error.message}`,
            userId: contact.userId,
            contactId: contact.id,
            data: {
              workflowId: workflow.id,
              eventName,
              error: error.message
            }
          }
        });
      }
    }
    
    return { success: true, message: `Processed ${workflows.length} workflows for event '${eventName}'` };
  } catch (error) {
    console.error('[Automation Service] Error triggering workflow:', error);
    return { success: false, message: error.message };
  }
}

/**
 * Evaluates workflow conditions for a contact
 * @param {object} workflow - The workflow object
 * @param {object} contact - The contact object
 * @returns {boolean} - True if conditions are met
 */
async function evaluateWorkflowConditions(workflow, contact) {
  // If no conditions are specified, the workflow should always run
  if (!workflow.conditions || !workflow.conditions.conditions || workflow.conditions.conditions.length === 0) {
    return true;
  }
  
  // Simple condition evaluation - can be expanded for more complex logic
  for (const condition of workflow.conditions.conditions) {
    switch (condition.field) {
      case 'deal_value':
        const dealValue = contact.deals[0]?.value || 0;
        if (condition.operator === 'greater_than' && dealValue <= condition.value) {
          return false;
        }
        if (condition.operator === 'less_than' && dealValue >= condition.value) {
          return false;
        }
        break;
        
      case 'deal_stage':
        const dealStage = contact.deals[0]?.stage?.name;
        if (condition.operator === 'equals' && dealStage !== condition.value) {
          return false;
        }
        if (condition.operator === 'contains' && !dealStage?.includes(condition.value)) {
          return false;
        }
        break;
        
      case 'contact_tag':
        // This would require tags to be implemented in the contact model
        break;
    }
  }
  
  return true;
}

/**
 * Executes workflow actions for a contact
 * @param {object} workflow - The workflow object
 * @param {object} contact - The contact object
 * @returns {object} - Execution result
 */
async function executeWorkflowActions(workflow, contact) {
  const results = [];
  
  for (const action of workflow.actions) {
    try {
      switch (action.type) {
        case 'send_email':
          // This would integrate with an email service
          console.log(`[Automation Service] Would send email to ${contact.email} with template ${action.templateId}`);
          results.push({ actionType: 'send_email', status: 'simulated' });
          break;
          
        case 'create_task':
          // Create a task for the contact
          const task = await prisma.task.create({
            data: {
              title: action.title || `Task for ${contact.firstName} ${contact.lastName}`,
              description: action.description || '',
              dueDate: action.dueDate ? new Date(action.dueDate) : null,
              assignedTo: contact.userId,
              contactId: contact.id
            }
          });
          results.push({ actionType: 'create_task', status: 'success', taskId: task.id });
          break;
          
        case 'add_tag':
          // This would require tags to be implemented in the contact model
          console.log(`[Automation Service] Would add tag '${action.tag}' to contact ${contact.id}`);
          results.push({ actionType: 'add_tag', status: 'simulated', tag: action.tag });
          break;
          
        case 'move_deal_stage':
          if (contact.deals.length > 0) {
            const deal = contact.deals[0];
            const targetStage = await prisma.pipelineStage.findFirst({
              where: {
                name: action.targetStage,
                pipelineId: deal.pipelineId
              }
            });
            
            if (targetStage) {
              await prisma.deal.update({
                where: { id: deal.id },
                data: { stageId: targetStage.id }
              });
              results.push({ actionType: 'move_deal_stage', status: 'success', fromStage: deal.stage.name, toStage: targetStage.name });
            } else {
              results.push({ actionType: 'move_deal_stage', status: 'failed', error: 'Target stage not found' });
            }
          }
          break;
          
        default:
          console.log(`[Automation Service] Unknown action type: ${action.type}`);
          results.push({ actionType: action.type, status: 'unknown' });
      }
    } catch (error) {
      console.error(`[Automation Service] Error executing action ${action.type}:`, error);
      results.push({ actionType: action.type, status: 'failed', error: error.message });
    }
  }
  
  return { results };
}

module.exports = {
  triggerWorkflow
};
