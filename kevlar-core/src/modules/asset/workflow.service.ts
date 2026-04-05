import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';
import { AssetFamily } from './schemas/asset-family.schema'; 
import { AssetStatus } from './enums/asset-status.enum';

const FSM_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  [AssetStatus.DRAFT]: [AssetStatus.IN_REVIEW, AssetStatus.ARCHIVED],
  [AssetStatus.IN_REVIEW]: [AssetStatus.APPROVED, AssetStatus.REJECTED, AssetStatus.DRAFT],
  [AssetStatus.REJECTED]: [AssetStatus.DRAFT, AssetStatus.ARCHIVED],
  [AssetStatus.APPROVED]: [AssetStatus.PUBLISHED, AssetStatus.ARCHIVED],
  [AssetStatus.PUBLISHED]: [AssetStatus.ARCHIVED],
  [AssetStatus.ARCHIVED]: [AssetStatus.DRAFT],
};

@Injectable()
export class WorkflowService {
  constructor(
    @InjectModel(AssetFamily.name) private familyModel: Model<AssetFamily>,
    private auditService: AuditService
  ) {}

  async transitionState(
    tenantId: string,
    familyId: string,
    userId: string,
    requestedState: AssetStatus,
    notes?: string 
  ) {
    const family = await this.familyModel.findOne({ _id: familyId, tenantId });
    
    if (!family) {
      throw new NotFoundException(`Asset Family ${familyId} not found or access denied.`);
    }

    const currentState = family.status as AssetStatus;

    const allowedNextStates = FSM_TRANSITIONS[currentState];
    if (!allowedNextStates.includes(requestedState)) {
      throw new BadRequestException(
        `FSM Violation: Cannot transition asset from [${currentState}] directly to [${requestedState}]. Allowed states: ${allowedNextStates.join(', ')}`
      );
    }

    family.status = requestedState;
    const updatedFamily = await family.save();

    await this.auditService.logEvent(
      tenantId,
      familyId,
      userId,
      AuditAction.WORKFLOW_STATE_CHANGED,
      {
        previousState: currentState,
        newState: requestedState,
        notes: notes || 'No notes provided',
      }
    );

    return updatedFamily;
  }


  async submitForReview(tenantId: string, familyId: string, userId: string) {
    return this.transitionState(tenantId, familyId, userId, AssetStatus.IN_REVIEW);
  }

  async approveAsset(tenantId: string, familyId: string, userId: string, notes?: string) {
    return this.transitionState(tenantId, familyId, userId, AssetStatus.APPROVED, notes);
  }

  async rejectAsset(tenantId: string, familyId: string, userId: string, notes: string) {
    if (!notes) {
      throw new BadRequestException('Rejection requires notes explaining why it failed review.');
    }
    return this.transitionState(tenantId, familyId, userId, AssetStatus.REJECTED, notes);
  }

  async resetToDraft(tenantId: string, familyId: string, userId: string) {
    return this.transitionState(tenantId, familyId, userId, AssetStatus.DRAFT, 'New version uploaded. FSM reset to DRAFT.');
  }
}
