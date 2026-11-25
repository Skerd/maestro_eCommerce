import {afterEach, describe, expect, it, vi} from "vitest";
import {PUBLIC_ADDRESS, resolveTo} from "@coreModule/_tests/dnsStub";
import {testPosTerminalConnection} from "@eCommerceModule/utilities/services/posTerminalConnection";

// EC-10: the card terminal bridge is company-set, so the server probes it only when it is public.
const bridge = (terminalHost: string) => ({
    type: "card",
    terminalEnabled: true,
    terminalProvider: "local_http",
    terminalHost,
    terminalPort: 8080,
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("probing a card terminal bridge (EC-10)", () => {
    it.each(["127.0.0.1", "localhost", "192.168.1.50", "[fd00::1]"])("refuses %s without sending anything", async (host) => {
        const fetchSpy = vi.spyOn(globalThis, "fetch");
        await expect(testPosTerminalConnection(bridge(host), {languageCode: "en-US"}))
            .rejects.toMatchObject({error_code: "url_not_public"});
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("probes a public bridge without following its redirects", async () => {
        resolveTo([PUBLIC_ADDRESS]);
        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, {status: 204}));
        const result = await testPosTerminalConnection(bridge("bridge.example.al"), {languageCode: "en-US"});
        expect(result.ok).toBe(true);
        expect(fetchSpy).toHaveBeenCalledWith("http://bridge.example.al:8080/payment", expect.objectContaining({redirect: "manual"}));
    });
});
