import bcrypt from "bcrypt";
import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {AUTHENTICATION, CLIENT_SIDE} from "@coreModule/environment";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {generateRandomString} from "@coreModule/utilities/helpers";
import {setManagerPinFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/setManagerPin.form.validator";
import {changeManagerPinFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/changeManagerPin.form.validator";
import {clearManagerPinFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/clearManagerPin.form.validator";
import {requestManagerPinResetFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/requestManagerPinReset.form.validator";
import {openManagerPinResetLinkFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/openManagerPinResetLink.form.validator";
import {resetManagerPinFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/resetManagerPin.form.validator";
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
import {posConfigService} from "./posConfig.service";

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

export class PosConfigActions {
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
        schema: requestManagerPinResetFormSchema,
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
            `Manager PIN reset email dispatched for user ${userId} on PosConfig ${_id} (host=${CLIENT_SIDE.HOST ?? "n/a"})`,
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
