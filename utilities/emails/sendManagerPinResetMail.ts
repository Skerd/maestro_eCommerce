import * as fs from "fs";
import * as path from "path";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {CLIENT_SIDE, CONSTANTS, EMAIL, clientHostFor} from "@coreModule/environment";
import {applyPlaceholders, loadEmailStrings} from "@coreModule/utilities/emails/emailLocale";
import {currentYear, escapeHtml} from "@coreModule/utilities/emails/emailLayout";
import {sendMail} from "@coreModule/utilities/emails/mailDeliveryService";
import type {ManagerPinResetEmailEvent} from "@eCommerceModule/kafka/types";

const fallbackLanguageCode = "en-US";
const LOCALES_ROOT = path.join(__dirname, "static", "locales");
const TEMPLATE_DIR = path.join(__dirname, "templates", "managerPinReset");

function canSendEmails(): boolean {
    return EMAIL.ENABLED;
}

function readTemplateHtml(filename: string): string {
    return fs.readFileSync(path.join(TEMPLATE_DIR, filename), "utf8");
}

async function deliverOrThrow(
    companyId: string | undefined,
    mailOptions: Parameters<typeof sendMail>[1],
    languageCode: string,
): Promise<void> {
    try {
        await sendMail(companyId, mailOptions);
    } catch {
        throw apiValidationException("could_not_send_email", "manager_pin_reset_email", null, languageCode);
    }
}

/**
 * Renders and sends the manager-PIN reset email in the same shell as the
 * password-reset mail.
 */
export async function sendManagerPinResetMail(
    event: ManagerPinResetEmailEvent,
): Promise<void> {
    if (!canSendEmails()) {
        return;
    }

    const languageCode = event.languageCode || CONSTANTS.DEFAULT_LANGUAGE || fallbackLanguageCode;
    const pageName = CLIENT_SIDE.NAME ?? "";
    const strings = loadEmailStrings(["managerPinReset"], languageCode, LOCALES_ROOT);
    let emailTemplate = readTemplateHtml("managerPinReset.html");

    emailTemplate = applyPlaceholders(emailTemplate, {
        htmlLang: strings.htmlLang ?? "en",
        preheader: strings.preheader ?? "",
        heading: strings.heading ?? "",
        greeting: strings.greeting ?? "",
        body: strings.body ?? "",
        ctaLabel: strings.ctaLabel ?? "",
        fallbackLabel: strings.fallbackLabel ?? "",
        note: strings.note ?? "",
        ignore: strings.ignore ?? "",
        footerNote: strings.footerNote ?? "",
        copyright: strings.copyright ?? "",
    });

    const resetUrl = `${clientHostFor("core")}/authenticate/resetPosManagerPin/${event.resetCode}`;
    emailTemplate = emailTemplate.replace(/http:\/\/1234\.html/g, resetUrl);
    emailTemplate = applyPlaceholders(emailTemplate, {
        username: escapeHtml(event.fullName),
        configName: escapeHtml(event.configName),
        pageName,
        year: currentYear(),
    });

    const subject = applyPlaceholders(strings.subject ?? "", {configName: event.configName});

    await deliverOrThrow(
        event.companyId,
        {
            to: event.email,
            subject,
            html: emailTemplate,
        },
        languageCode,
    );
}
