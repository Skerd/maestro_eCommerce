import * as fs from "fs";
import * as path from "path";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {CLIENT_SIDE, CONSTANTS, EMAIL, clientHostFor} from "@coreModule/environment";
import {applyPlaceholders, loadEmailStrings} from "@coreModule/utilities/emails/emailLocale";
import {sendMail} from "@coreModule/utilities/emails/mailDeliveryService";
import type {ManagerPinResetEmailEvent} from "@eCommerceModule/kafka/types";

const imagePath = path.join(__dirname, "./static/images/image-1.png");
const imageCID = "imageCID@example.com";
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
 * Renders and sends the manager-PIN reset email (same template/locale pattern as forgot-password).
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
        heading: strings.heading ?? "",
        introBefore: strings.introBefore ?? "",
        introLink: strings.introLink ?? "",
        introAfter: applyPlaceholders(strings.introAfter ?? "", {configName: event.configName}),
        imageAlt: strings.imageAlt ?? "",
        copyright: strings.copyright ?? "",
        securityReasons: strings.securityReasons ?? "",
    });

    const resetUrl = `${clientHostFor("core")}/authenticate/resetPosManagerPin/${event.resetCode}`;
    emailTemplate = emailTemplate.replace(/http:\/\/1234\.html/g, resetUrl);
    emailTemplate = applyPlaceholders(emailTemplate, {
        username: event.fullName,
        pageName,
    });

    const subject = applyPlaceholders(strings.subject ?? "", {configName: event.configName});

    await deliverOrThrow(
        event.companyId,
        {
            to: event.email,
            subject,
            html: emailTemplate,
            attachments: [
                {
                    filename: "companyTick.png",
                    path: imagePath,
                    cid: imageCID,
                },
            ],
        },
        languageCode,
    );
}
