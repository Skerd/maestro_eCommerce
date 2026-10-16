import type {CronHandlerContext} from "@coreModule/cronjobs/registry/types";
import {companyService} from "@coreModule/database/schemas/company/company.service";
import type {ICompany} from "@coreModule/database/schemas/company/company";
import type {ShopProvisionStatus} from "armonia/src/modules/core/api/company/private/company/shopSlug";

export type ShopHostProbeResult = {
    status: ShopProvisionStatus;
    lastError: string;
    reachable: boolean;
};

export function interpretShopHostProbe(input: {
    httpStatus: number | null;
    responseVat?: string;
    expectedVat: string;
    networkError?: string;
}): ShopHostProbeResult {
    if (input.networkError) {
        return {status: "failed", lastError: input.networkError, reachable: false};
    }
    if (input.httpStatus !== 200) {
        return {status: "failed", lastError: `HTTP ${input.httpStatus ?? "000"}`, reachable: false};
    }
    const servedVat = (input.responseVat ?? "").trim();
    const expectedVat = input.expectedVat.trim();
    if (!servedVat || servedVat !== expectedVat) {
        return {status: "failed", lastError: "shop served a different company", reachable: false};
    }
    return {status: "online", lastError: "", reachable: true};
}

function applyProbeResult(company: ICompany, result: ShopHostProbeResult): void {
    company.shopProvision = {
        status: result.status,
        checkedAt: new Date(),
        lastError: result.lastError,
        steps: {
            slug: true,
            domain: Boolean(company.shopHost),
            reachable: result.reachable,
        },
    };
    company.markModified("shopProvision");
}

async function probeShopConfig(shopHost: string, expectedVat: string): Promise<ShopHostProbeResult> {
    const origin = `https://${shopHost}`;
    try {
        const response = await fetch(`${origin}/api/eCommerce/shopConfig`, {
            headers: {
                Origin: origin,
                "x-device-id": "shop-host-probe",
                language: "en-US",
            },
            signal: AbortSignal.timeout(12000),
        });
        let responseVat: string | undefined;
        if (response.status === 200) {
            const body = await response.json() as {data?: {company?: {vat?: string}}};
            responseVat = body.data?.company?.vat;
        }
        return interpretShopHostProbe({
            httpStatus: response.status,
            responseVat,
            expectedVat,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return interpretShopHostProbe({
            httpStatus: null,
            expectedVat,
            networkError: message,
        });
    }
}

export async function runShopHostProbe(ctx: CronHandlerContext): Promise<void> {
    if (!ctx.company) {
        return;
    }

    const company = await companyService.findById(ctx.company, {logger: ctx.logger});
    if (!company?.shopSlug) {
        return;
    }
    if (company.shopProvision?.status === "online" && company.shopHost) {
        ctx.appendLog(`Shop host ${company.shopHost} already online`);
        return;
    }
    if (!company.shopHost) {
        applyProbeResult(company, {
            status: "failed",
            lastError: "SHOP_ROOT_DOMAIN is not set",
            reachable: false,
        });
        await company.save();
        ctx.appendLog("Shop host missing; SHOP_ROOT_DOMAIN is not set");
        return;
    }

    const result = await probeShopConfig(company.shopHost, company.vat);
    applyProbeResult(company, result);
    await company.save();
    ctx.appendLog(
        result.status === "online"
            ? `Shop host ${company.shopHost} online`
            : `Shop host ${company.shopHost} ${result.lastError}`,
    );
}
