import type {IGiftCard} from "@eCommerceModule/database/schemas/giftCard/giftCard";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export type GiftCardDTO = {
    _id: string;
    code: string;
    initialBalance: number;
    balance: number;
    status: string;
    currency?: {_id: string; symbol?: string; abbreviation?: string};
    purchasedBy?: {_id: string; name?: string; surname?: string};
    order?: string;
    expiresAt?: string;
    createdAt?: string;
};

export function giftCardToDTO(card: IGiftCard): GiftCardDTO {
    const currency: any = card.currency;
    const purchasedBy: any = card.purchasedBy;
    return {
        _id: card._id.toString(),
        code: card.code,
        initialBalance: card.initialBalance,
        balance: card.balance,
        status: card.status,
        currency: currency && typeof currency === "object" && currency._id
            ? {_id: currency._id.toString(), symbol: currency.symbol, abbreviation: currency.abbreviation}
            : undefined,
        purchasedBy: purchasedBy && typeof purchasedBy === "object" && purchasedBy._id
            ? {_id: purchasedBy._id.toString(), name: purchasedBy.name, surname: purchasedBy.surname}
            : undefined,
        order: card.order ? ((card.order as any)?._id ?? card.order).toString() : undefined,
        expiresAt: card.expiresAt?.toISOString(),
        createdAt: (card as any).createdAt?.toISOString?.(),
        ...mapSoftDeleteToDTO(card),
        ...mapOwnershipToDTO(card),
    } as GiftCardDTO;
}

export function giftCardsToDTO(cards: IGiftCard[]): GiftCardDTO[] {
    return cards.map(giftCardToDTO);
}

export function giftCardsToSelect(cards: IGiftCard[]): ApiSelectDatum[] {
    return cards.map(card => ({value: card._id.toString(), label: card.code}));
}
