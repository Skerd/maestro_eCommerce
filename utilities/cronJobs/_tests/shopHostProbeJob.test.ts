import {describe, expect, it} from "vitest";
import {interpretShopHostProbe} from "../shopHostProbeJob";

describe("interpretShopHostProbe", () => {
    it("marks the shop online when VAT matches", () => {
        expect(interpretShopHostProbe({
            httpStatus: 200,
            responseVat: "Z123",
            expectedVat: "Z123",
        })).toEqual({status: "online", lastError: "", reachable: true});
    });

    it("fails on a Cloudflare origin error", () => {
        expect(interpretShopHostProbe({
            httpStatus: 521,
            expectedVat: "Z123",
        })).toEqual({status: "failed", lastError: "HTTP 521", reachable: false});
    });

    it("fails when the wildcard fell through to another tenant", () => {
        expect(interpretShopHostProbe({
            httpStatus: 200,
            responseVat: "OTHER",
            expectedVat: "Z123",
        })).toEqual({status: "failed", lastError: "shop served a different company", reachable: false});
    });

    it("fails on a network error", () => {
        expect(interpretShopHostProbe({
            httpStatus: null,
            expectedVat: "Z123",
            networkError: "Could not resolve host",
        })).toEqual({status: "failed", lastError: "Could not resolve host", reachable: false});
    });
});
