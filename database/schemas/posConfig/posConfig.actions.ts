import bcrypt from "bcrypt";
import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {AUTHENTICATION, clientHostFor} from "@coreModule/environment";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {getModelCollectedData} from "@coreModule/database/collections";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {generateRandomString} from "@coreModule/utilities/helpers";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {setManagerPinFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/setManagerPin.form.validator";
import {changeManagerPinFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/changeManagerPin.form.validator";
import {clearManagerPinFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/clearManagerPin.form.validator";
import {openManagerPinResetLinkFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/openManagerPinResetLink.form.validator";
import {resetManagerPinFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/resetManagerPin.form.validator";
import {
    pauseAllPosConfigsFormSchema,
    pausePosConfigFormSchema,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/pausePosConfig.form.validator";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {dispatchManagerPinResetEmail} from "@eCommerceModule/utilities/emails/dispatchManagerPinResetEmail";
import {
    findManagerPin,
    getManagerPins,
    isAssignedManager,
    removeManagerPin,
    upsertManagerPin,
    userRefId,
} from "@eCommerceModule/utilities/services/posManagerPin";
import {
    forceCloseOpenSessionsForConfig,
    forceCloseOpenSessionsForConfigs,
    getCompanyPosLock,
    isCompanyPosLockActive,
    notifyPosTillsKilled,
    upsertCompanyPosLock,
    type PosKillReason,
} from "@eCommerceModule/utilities/services/posKillSwitch";
import PosConfigModel from "./posConfig";
import {posConfigService} from "./posConfig.service";
import "@eCommerceModule/database/schemas/posCompanyPosLock/posCompanyPosLock";

const RESET_TTL_MS = 24 * 60 * 60 * 1000;

async function hashManagerPin(pin: string): Promise<string> {
    const salt = await bcrypt.genSalt(AUTHENTICATION.SALT || 10);
    return bcrypt.hash(pin.trim(), salt);
}

function assertResetNotExpired(reset: {date?: Date} | undefined, languageCode: string) {
    if (!reset?.date) {
        throw apiValidationException("pos_manager_pin_reset_invalid", "resetCode", null, languageCode);
    }
    if (Date.now() - new Date(reset.date).getTime() > RESET_TTL_MS) {
        throw apiValidationException("pos_manager_pin_reset_expired", "resetCode", null, languageCode);
    }
}

function assertCurrentUserIsManager(config: any, userId: string, languageCode: string) {
    if (!isAssignedManager(config, userId)) {
        throw apiValidationException("pos_manager_not_assigned", null, null, languageCode);
    }
}

function assertCanWritePauseOrActive(
    writeFields: Record<string, unknown>,
    languageCode: string,
    field: "pausedAt" | "isActive",
) {
    if (field === "isActive" && !writeFields.isActive) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
    if (field === "pausedAt" && !(writeFields.pausedAt || writeFields.isActive)) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, languageCode);
    }
}

function sanitizeWriteFields(actionUserCtx: any, languageCode: string) {
    return SchemaGuard.sanitizeFields(
        PosConfigModel,
        getModelCollectedData("posConfigs").writeFields!,
        "write",
        actionUserCtx,
        languageCode,
    );
}

async function runKillPipeline(
    configId: ObjectId | string,
    reason: PosKillReason,
    params: Record<string, any>,
    opts?: {pauseReason?: string | null; companyWide?: boolean; configIds?: (ObjectId | string)[]},
) {
    const ctx = {
        languageCode: params.languageCode,
        company: params.company,
        session: params.session,
        logger: params.logger,
        userId: params.actionUserCtx?.userId,
    };
    const result = opts?.configIds?.length
        ? await forceCloseOpenSessionsForConfigs(opts.configIds, reason, ctx)
        : await forceCloseOpenSessionsForConfig(configId, reason, ctx);

    notifyPosTillsKilled({
        ...result,
        reason,
        pauseReason: opts?.pauseReason ?? null,
        companyWide: !!opts?.companyWide,
    });
    return result;
}

async function setActiveState(params: Record<string, any>, isActive: boolean): Promise<ActionMessage> {
    const {logger, languageCode, session, company, actionUserCtx, _id} = params;

    const writeFields = sanitizeWriteFields(actionUserCtx, languageCode);
    assertCanWritePauseOrActive(writeFields, languageCode, "isActive");

    const existing = await posConfigService.findOneOrThrow(
        {_id: new ObjectId(_id), company: company._id},
        {session, logger, languageCode},
    );

    if (existing.isActive === isActive) {
        return {message: isActive ? "POS config already active" : "POS config already inactive"};
    }

    await posConfigService.updateByIdOrThrow(
        existing._id,
        {isActive},
        {session, logger, languageCode, auditUserId: actionUserCtx.userId},
    );

    if (!isActive) {
        await runKillPipeline(existing._id, "deactivate", params);
    }

    return {message: isActive ? "POS config activated" : "POS config deactivated"};
}

export class PosConfigActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async activate(params: Record<string, any>): Promise<ActionMessage> {
        return setActiveState(params, true);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async deactivate(params: Record<string, any>): Promise<ActionMessage> {
        return setActiveState(params, false);
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: pausePosConfigFormSchema,
        transaction: true,
    })
    async pause(params: Record<string, any>): Promise<ActionMessage & {isPaused: true}> {
        const {logger, languageCode, session, company, actionUserCtx, _id, pauseReason} = params;
        const writeFields = sanitizeWriteFields(actionUserCtx, languageCode);
        assertCanWritePauseOrActive(writeFields, languageCode, "pausedAt");

        const existing = await posConfigService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        const now = new Date();
        const reason = typeof pauseReason === "string" ? pauseReason.trim() || null : null;
        await posConfigService.updateByIdOrThrow(
            existing._id,
            {
                pausedAt: now,
                pausedBy: new ObjectId(actionUserCtx.userId.toString()),
                pauseReason: reason,
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await runKillPipeline(existing._id, "pause", params, {pauseReason: reason});
        return {message: "POS config paused", isPaused: true};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        schema: validateSingleForm,
        transaction: true,
    })
    async resume(params: Record<string, any>): Promise<ActionMessage & {isPaused: boolean}> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;
        const writeFields = sanitizeWriteFields(actionUserCtx, languageCode);
        assertCanWritePauseOrActive(writeFields, languageCode, "pausedAt");

        if (isCompanyPosLockActive(await getCompanyPosLock(company._id, session))) {
            throw apiValidationException("pos_config_paused", "_id", null, languageCode);
        }

        const existing = await posConfigService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        if (!existing.pausedAt) {
            return {message: "POS config already resumed", isPaused: false};
        }

        await posConfigService.updateByIdOrThrow(
            existing._id,
            {pausedAt: null, pausedBy: null, pauseReason: null},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        return {message: "POS config resumed", isPaused: false};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        schema: pauseAllPosConfigsFormSchema,
        transaction: true,
    })
    async pauseAll(params: Record<string, any>): Promise<ActionMessage & {isPaused: true}> {
        const {logger, languageCode, session, company, actionUserCtx, pauseReason} = params;
        const writeFields = sanitizeWriteFields(actionUserCtx, languageCode);
        assertCanWritePauseOrActive(writeFields, languageCode, "pausedAt");

        const now = new Date();
        const userId = new ObjectId(actionUserCtx.userId.toString());
        const reason = typeof pauseReason === "string" ? pauseReason.trim() || null : null;

        await upsertCompanyPosLock(
            company._id,
            {pausedAt: now, pausedBy: userId, pauseReason: reason},
            session,
        );
        const configs = await PosConfigModel.find({company: company._id}).noDeleted()
            .select("_id")
            .session(session ?? null);
        const configIds = configs.map((c) => c._id as ObjectId);

        await runKillPipeline(configIds[0] ?? company._id, "pauseAll", params, {
            pauseReason: reason,
            companyWide: true,
            configIds,
        });

        logger?.info?.(`Company POS pause-all applied (${configIds.length} configs)`);
        return {message: "All POS configs paused", isPaused: true};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        transaction: true,
    })
    async resumeAll(params: Record<string, any>): Promise<ActionMessage & {isPaused: false}> {
        const {logger, languageCode, session, company, actionUserCtx} = params;
        const writeFields = sanitizeWriteFields(actionUserCtx, languageCode);
        assertCanWritePauseOrActive(writeFields, languageCode, "pausedAt");

        await upsertCompanyPosLock(
            company._id,
            {pausedAt: null, pausedBy: null, pauseReason: null},
            session,
        );

        logger?.info?.("Company POS resume-all applied");
        return {message: "All POS configs resumed", isPaused: false};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 60},
        transaction: false,
    })
    async companyLockStatus(params: Record<string, any>): Promise<{
        isLocked: boolean;
        pauseReason: string | null;
        pausedAt: string | null;
    }> {
        const {company, session} = params;
        const lock = await getCompanyPosLock(company._id, session);
        const isLocked = isCompanyPosLockActive(lock);
        return {
            isLocked,
            pauseReason: isLocked ? (lock?.pauseReason ?? null) : null,
            pausedAt: isLocked && lock?.pausedAt ? new Date(lock.pausedAt).toISOString() : null,
        };
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: setManagerPinFormSchema,
    })
    async setManagerPin(params: Record<string, any>): Promise<ActionMessage & {hasManagerPin: true; currentUserHasManagerPin: true}> {
        const {logger, languageCode, session, company, actionUserCtx, _id, pin} = params;
        const userId = String(actionUserCtx.userId);

        logger.start(`Setting manager PIN for user ${userId} on PosConfig ${_id}...`);

        const config = await posConfigService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        assertCurrentUserIsManager(config, userId, languageCode);
        if (findManagerPin(config, userId)?.pinHash) {
            throw apiValidationException("pos_manager_pin_already_set", "pin", null, languageCode);
        }

        const hash = await hashManagerPin(pin);
        const managerPins = upsertManagerPin(config, userId, {pinHash: hash}, {unsetPinReset: true});
        await posConfigService.updateByIdOrThrow(
            config._id,
            {$set: {managerPins}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        logger.finish(`Manager PIN set for user ${userId} on PosConfig ${_id}`);
        return {message: "Manager PIN set", hasManagerPin: true, currentUserHasManagerPin: true};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: changeManagerPinFormSchema,
    })
    async changeManagerPin(params: Record<string, any>): Promise<ActionMessage & {hasManagerPin: true; currentUserHasManagerPin: true}> {
        const {logger, languageCode, session, company, actionUserCtx, _id, currentPin, pin} = params;
        const userId = String(actionUserCtx.userId);

        logger.start(`Changing manager PIN for user ${userId} on PosConfig ${_id}...`);

        const config = await posConfigService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        assertCurrentUserIsManager(config, userId, languageCode);
        const existing = findManagerPin(config, userId);
        if (!existing?.pinHash) {
            throw apiValidationException("pos_manager_pin_not_set", "currentPin", null, languageCode);
        }

        const ok = await bcrypt.compare(String(currentPin).trim(), existing.pinHash);
        if (!ok) {
            throw apiValidationException("pos_manager_pin_invalid", "currentPin", null, languageCode);
        }

        const hash = await hashManagerPin(pin);
        const managerPins = upsertManagerPin(config, userId, {pinHash: hash}, {unsetPinReset: true});
        await posConfigService.updateByIdOrThrow(
            config._id,
            {$set: {managerPins}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        logger.finish(`Manager PIN changed for user ${userId} on PosConfig ${_id}`);
        return {message: "Manager PIN changed", hasManagerPin: true, currentUserHasManagerPin: true};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: clearManagerPinFormSchema,
    })
    async clearManagerPin(params: Record<string, any>): Promise<ActionMessage & {hasManagerPin: boolean; currentUserHasManagerPin: false}> {
        const {logger, languageCode, session, company, actionUserCtx, _id, pin} = params;
        const userId = String(actionUserCtx.userId);

        logger.start(`Clearing manager PIN for user ${userId} on PosConfig ${_id}...`);

        const config = await posConfigService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        assertCurrentUserIsManager(config, userId, languageCode);
        const existing = findManagerPin(config, userId);
        if (!existing?.pinHash) {
            throw apiValidationException("pos_manager_pin_not_set", "pin", null, languageCode);
        }

        const ok = await bcrypt.compare(pin.trim(), existing.pinHash);
        if (!ok) {
            throw apiValidationException("pos_manager_pin_invalid", "pin", null, languageCode);
        }

        const managerPins = removeManagerPin(config, userId);
        const stillHasPin = managerPins.some((p) => !!p.pinHash);
        const update: Record<string, unknown> = {managerPins};
        if (!stillHasPin) {
            update.pinForDiscount = false;
            update.pinForCashOut = false;
            update.pinForRefund = false;
        }

        await posConfigService.updateByIdOrThrow(
            config._id,
            {$set: update},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        logger.finish(`Manager PIN cleared for user ${userId} on PosConfig ${_id}`);
        return {
            message: "Manager PIN cleared",
            hasManagerPin: stillHasPin,
            currentUserHasManagerPin: false,
            ...(stillHasPin
                ? {}
                : {pinForDiscount: false, pinForCashOut: false, pinForRefund: false}),
        } as any;
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 5},
        transaction: true,
        schema: validateSingleForm,
    })
    async requestManagerPinReset(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, actionUserInfo, _id} = params;
        const userId = String(actionUserCtx.userId);

        logger.start(`Requesting manager PIN reset for user ${userId} on PosConfig ${_id}...`);

        const config = await posConfigService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        assertCurrentUserIsManager(config, userId, languageCode);
        if (!findManagerPin(config, userId)?.pinHash) {
            throw apiValidationException("pos_manager_pin_not_set", null, null, languageCode);
        }

        const email = actionUserInfo?.username;
        if (!email) {
            throw apiValidationException("pos_manager_pin_reset_no_email", null, null, languageCode);
        }

        const resetCode = generateRandomString(64);
        const managerPins = upsertManagerPin(config, userId, {
            pinReset: {code: resetCode, date: new Date(), opened: false},
        });
        await posConfigService.updateByIdOrThrow(
            config._id,
            {$set: {managerPins}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await dispatchManagerPinResetEmail({
            companyId: company._id.toString(),
            email,
            userId,
            fullName: actionUserInfo?.name || email,
            configId: config._id.toString(),
            configName: config.name,
            resetCode,
            languageCode,
        });

        logger.finish(
            `Manager PIN reset email dispatched for user ${userId} on PosConfig ${_id} (host=${clientHostFor("core") || "n/a"})`,
        );
        return {message: "Manager PIN reset email sent"};
    }

    @action({
        auth: "public",
        rateLimit: {windowMs: 60000, max: 10},
        transaction: true,
        schema: openManagerPinResetLinkFormSchema,
    })
    async openManagerPinResetLink(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, resetCode} = params;

        logger.start(`Opening manager PIN reset link...`);

        const config = await posConfigService.findOne(
            {"managerPins.pinReset.code": resetCode},
            {session, logger, languageCode},
        );
        if (!config) {
            throw apiValidationException("pos_manager_pin_reset_invalid", "resetCode", null, languageCode);
        }

        const entry = getManagerPins(config).find((p) => p.pinReset?.code === resetCode);
        if (!entry) {
            throw apiValidationException("pos_manager_pin_reset_invalid", "resetCode", null, languageCode);
        }

        assertResetNotExpired(entry.pinReset, languageCode);

        const userId = userRefId(entry.user);
        if (entry.pinReset?.opened && AUTHENTICATION.PASSWORD_RESET_EXPIRE_AFTER_OPEN) {
            const managerPins = upsertManagerPin(config, userId, {}, {unsetPinReset: true});
            await posConfigService.updateByIdOrThrow(
                config._id,
                {$set: {managerPins}},
                {session, logger, languageCode},
            );
            throw apiValidationException("pos_manager_pin_reset_already_used", "resetCode", null, languageCode);
        }

        const managerPins = upsertManagerPin(config, userId, {
            pinReset: {
                ...entry.pinReset,
                opened: !!AUTHENTICATION.PASSWORD_RESET_EXPIRE_AFTER_OPEN,
            },
        });
        await posConfigService.updateByIdOrThrow(
            config._id,
            {$set: {managerPins}},
            {session, logger, languageCode},
        );

        logger.finish(`Manager PIN reset link opened for user ${userId} on PosConfig ${config._id}`);
        return {message: "Reset link is valid"};
    }

    @action({
        auth: "public",
        rateLimit: {windowMs: 60000, max: 5},
        transaction: true,
        schema: resetManagerPinFormSchema,
    })
    async resetManagerPin(params: Record<string, any>): Promise<ActionMessage & {hasManagerPin: true; currentUserHasManagerPin: true}> {
        const {logger, languageCode, session, resetCode, pin} = params;

        logger.start(`Resetting manager PIN via email code...`);

        const config = await posConfigService.findOne(
            {"managerPins.pinReset.code": resetCode},
            {session, logger, languageCode},
        );
        if (!config) {
            throw apiValidationException("pos_manager_pin_reset_invalid", "resetCode", null, languageCode);
        }

        const entry = getManagerPins(config).find((p) => p.pinReset?.code === resetCode);
        if (!entry) {
            throw apiValidationException("pos_manager_pin_reset_invalid", "resetCode", null, languageCode);
        }

        assertResetNotExpired(entry.pinReset, languageCode);

        const userId = userRefId(entry.user);
        if (!isAssignedManager(config, userId)) {
            throw apiValidationException("pos_manager_not_assigned", "resetCode", null, languageCode);
        }

        const hash = await hashManagerPin(pin);
        const managerPins = upsertManagerPin(config, userId, {pinHash: hash}, {unsetPinReset: true});
        await posConfigService.updateByIdOrThrow(
            config._id,
            {$set: {managerPins}},
            {session, logger, languageCode},
        );

        logger.finish(`Manager PIN reset for user ${userId} on PosConfig ${config._id}`);
        return {message: "Manager PIN reset", hasManagerPin: true, currentUserHasManagerPin: true};
    }
}
