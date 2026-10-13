import {createHash} from "crypto";
import type {CatalogProductSeed} from "@eCommerceModule/database/schemas/product/product.catalog.seeds";

/**
 * Semantic image kits — each kit is one product *type* (smartphone, hoodie, …).
 * Gallery shots are taken only from the same kit as the product, never from a
 * sibling category pool, so a kettle never shows a dinner plate.
 */
export const IMAGE_KITS = {
    smartphone: [
        "1511707171634-5f897ff02aa9",
        "1580910051074-3eb694886505",
        "1601784551446-20c9e07cdbdb",
        "1556656793-08538906a9f8",
        "1598327105666-5b89351aff97",
        "1610945415295-d9bbf067e59c",
    ],
    tablet: ["1544244015-0df4b3ffc6b0", "1556656793-08538906a9f8", "1601784551446-20c9e07cdbdb", "1511707171634-5f897ff02aa9"],
    smartwatch: ["1579584425555-c3ce17fd4351", "1579584425555-c3ce17fd4351", "1579584425555-c3ce17fd4351", "1579584425555-c3ce17fd4351"],
    phone_accessory: ["1556656793-08538906a9f8", "1601784551446-20c9e07cdbdb", "1511707171634-5f897ff02aa9", "1580910051074-3eb694886505"],
    laptop: ["1496181133206-80ce9b88a853", "1517336714731-489689fd1ca8", "1498050108023-c5249f4df085", "1525547719571-a2d4ac8945e2"],
    desktop: ["1517336714731-489689fd1ca8", "1496181133206-80ce9b88a853", "1498050108023-c5249f4df085", "1593640408182-31c70c8268f5"],
    monitor: ["1498050108023-c5249f4df085", "1593640408182-31c70c8268f5", "1496181133206-80ce9b88a853", "1517336714731-489689fd1ca8"],
    keyboard: ["1593640408182-31c70c8268f5", "1525547719571-a2d4ac8945e2", "1484788984921-03950022c9ef", "1498050108023-c5249f4df085"],
    mouse: ["1525547719571-a2d4ac8945e2", "1593640408182-31c70c8268f5", "1484788984921-03950022c9ef", "1496181133206-80ce9b88a853"],
    dock: ["1484788984921-03950022c9ef", "1593640408182-31c70c8268f5", "1525547719571-a2d4ac8945e2", "1498050108023-c5249f4df085"],
    ssd: ["1593640408182-31c70c8268f5", "1484788984921-03950022c9ef", "1525547719571-a2d4ac8945e2", "1496181133206-80ce9b88a853"],
    webcam: ["1525547719571-a2d4ac8945e2", "1484788984921-03950022c9ef", "1593640408182-31c70c8268f5", "1498050108023-c5249f4df085"],
    digital: ["1526170375885-4d8ecf77b99f", "1496181133206-80ce9b88a853", "1498050108023-c5249f4df085", "1525547719571-a2d4ac8945e2"],
    earbuds: ["1505740420928-5e560c06d30e", "1484704849700-f032a568e944", "1608043152269-423dbba4e7e1", "1493225457124-a3eb161ffa5f"],
    headphones: ["1484704849700-f032a568e944", "1505740420928-5e560c06d30e", "1608043152269-423dbba4e7e1", "1511379938547-c1f69419868d"],
    speaker: ["1608043152269-423dbba4e7e1", "1505740420928-5e560c06d30e", "1484704849700-f032a568e944", "1493225457124-a3eb161ffa5f"],
    microphone: ["1511379938547-c1f69419868d", "1493225457124-a3eb161ffa5f", "1484704849700-f032a568e944", "1505740420928-5e560c06d30e"],
    dac: ["1493225457124-a3eb161ffa5f", "1511379938547-c1f69419868d", "1484704849700-f032a568e944", "1608043152269-423dbba4e7e1"],
    turntable: ["1484704849700-f032a568e944", "1493225457124-a3eb161ffa5f", "1511379938547-c1f69419868d", "1505740420928-5e560c06d30e"],
    dj_controller: ["1493225457124-a3eb161ffa5f", "1511379938547-c1f69419868d", "1608043152269-423dbba4e7e1", "1484704849700-f032a568e944"],
    ear_tips: ["1505740420928-5e560c06d30e", "1608043152269-423dbba4e7e1", "1484704849700-f032a568e944", "1493225457124-a3eb161ffa5f"],
    audio_cable: ["1511379938547-c1f69419868d", "1608043152269-423dbba4e7e1", "1505740420928-5e560c06d30e", "1493225457124-a3eb161ffa5f"],
    tshirt: ["1521572163474-6864f9cf17ab", "1576566588028-4147f3842f27", "1489980557514-251d61e3eeb6", "1503342217505-b0a15ec3261c"],
    hoodie: ["1556821840-3a63f95609a7", "1620799140408-edc6dcb6d633", "1556821840-3a63f95609a7", "1620799140408-edc6dcb6d633"],
    chino: ["1489980557514-251d61e3eeb6", "1503342217505-b0a15ec3261c", "1576566588028-4147f3842f27", "1521572163474-6864f9cf17ab"],
    oxford_shirt: ["1576566588028-4147f3842f27", "1521572163474-6864f9cf17ab", "1489980557514-251d61e3eeb6", "1503342217505-b0a15ec3261c"],
    denim_jacket: ["1618354691373-d851c5c3a990", "1556821840-3a63f95609a7", "1576566588028-4147f3842f27", "1521572163474-6864f9cf17ab"],
    sweatshirt: ["1620799140408-edc6dcb6d633", "1556821840-3a63f95609a7", "1521572163474-6864f9cf17ab", "1576566588028-4147f3842f27"],
    shorts: ["1503342217505-b0a15ec3261c", "1489980557514-251d61e3eeb6", "1521572163474-6864f9cf17ab", "1576566588028-4147f3842f27"],
    beanie: ["1434389677669-e08b4cac3105", "1620799140408-edc6dcb6d633", "1556821840-3a63f95609a7", "1521572163474-6864f9cf17ab"],
    belt: ["1489980557514-251d61e3eeb6", "1618354691373-d851c5c3a990", "1576566588028-4147f3842f27", "1503342217505-b0a15ec3261c"],
    tote: ["1576566588028-4147f3842f27", "1489980557514-251d61e3eeb6", "1521572163474-6864f9cf17ab", "1618354691373-d851c5c3a990"],
    blouse: ["1515372039744-b8f02a3ae446", "1469334031218-e382a71b716b", "1483985988355-763728e1935b", "1542291026-7eec264c27ff"],
    dress: ["1469334031218-e382a71b716b", "1515372039744-b8f02a3ae446", "1483985988355-763728e1935b", "1542291026-7eec264c27ff"],
    cardigan: ["1483985988355-763728e1935b", "1515372039744-b8f02a3ae446", "1469334031218-e382a71b716b", "1542291026-7eec264c27ff"],
    trouser: ["1515372039744-b8f02a3ae446", "1483985988355-763728e1935b", "1469334031218-e382a71b716b", "1542291026-7eec264c27ff"],
    trench: ["1469334031218-e382a71b716b", "1483985988355-763728e1935b", "1515372039744-b8f02a3ae446", "1542291026-7eec264c27ff"],
    crossbody: ["1483985988355-763728e1935b", "1542291026-7eec264c27ff", "1515372039744-b8f02a3ae446", "1469334031218-e382a71b716b"],
    ballet_flat: ["1542291026-7eec264c27ff", "1469334031218-e382a71b716b", "1515372039744-b8f02a3ae446", "1483985988355-763728e1935b"],
    scarf: ["1483985988355-763728e1935b", "1469334031218-e382a71b716b", "1515372039744-b8f02a3ae446", "1542291026-7eec264c27ff"],
    legging: ["1515372039744-b8f02a3ae446", "1542291026-7eec264c27ff", "1469334031218-e382a71b716b", "1483985988355-763728e1935b"],
    earrings: ["1469334031218-e382a71b716b", "1483985988355-763728e1935b", "1515372039744-b8f02a3ae446", "1542291026-7eec264c27ff"],
    kids_tee: ["1441986300917-64674bd600d8", "1521572163474-6864f9cf17ab", "1556821840-3a63f95609a7", "1434389677669-e08b4cac3105"],
    kids_jacket: ["1441986300917-64674bd600d8", "1556821840-3a63f95609a7", "1618354691373-d851c5c3a990", "1521572163474-6864f9cf17ab"],
    kids_overall: ["1441986300917-64674bd600d8", "1618354691373-d851c5c3a990", "1489980557514-251d61e3eeb6", "1521572163474-6864f9cf17ab"],
    kids_sneakers: ["1542291026-7eec264c27ff", "1441986300917-64674bd600d8", "1571019613454-1cb2f99b2d8b", "1476480862126-209bfaa8edc8"],
    kids_pajama: ["1441986300917-64674bd600d8", "1521572163474-6864f9cf17ab", "1620799140408-edc6dcb6d633", "1556821840-3a63f95609a7"],
    kids_beanie: ["1434389677669-e08b4cac3105", "1441986300917-64674bd600d8", "1620799140408-edc6dcb6d633", "1556821840-3a63f95609a7"],
    kids_backpack: ["1441986300917-64674bd600d8", "1476480862126-209bfaa8edc8", "1542291026-7eec264c27ff", "1571019613454-1cb2f99b2d8b"],
    kids_socks: ["1521572163474-6864f9cf17ab", "1441986300917-64674bd600d8", "1434389677669-e08b4cac3105", "1503342217505-b0a15ec3261c"],
    kids_hoodie: ["1556821840-3a63f95609a7", "1441986300917-64674bd600d8", "1620799140408-edc6dcb6d633", "1521572163474-6864f9cf17ab"],
    kids_cap: ["1434389677669-e08b4cac3105", "1441986300917-64674bd600d8", "1542291026-7eec264c27ff", "1521572163474-6864f9cf17ab"],
    sofa: ["1555041469-a586c61ea9bc", "1567538096630-e0c55bd6374c", "1586023492125-27b2c045efd7", "1618220179428-22790b461013"],
    dining_table: ["1586023492125-27b2c045efd7", "1618220179428-22790b461013", "1567538096630-e0c55bd6374c", "1583847268964-b28dc8f51f92"],
    accent_chair: ["1567538096630-e0c55bd6374c", "1555041469-a586c61ea9bc", "1586023492125-27b2c045efd7", "1618220179428-22790b461013"],
    desk: ["1618220179428-22790b461013", "1586023492125-27b2c045efd7", "1583847268964-b28dc8f51f92", "1567538096630-e0c55bd6374c"],
    shelf: ["1583847268964-b28dc8f51f92", "1618220179428-22790b461013", "1586023492125-27b2c045efd7", "1567538096630-e0c55bd6374c"],
    bed: ["1555041469-a586c61ea9bc", "1586023492125-27b2c045efd7", "1567538096630-e0c55bd6374c", "1618220179428-22790b461013"],
    nightstand: ["1586023492125-27b2c045efd7", "1583847268964-b28dc8f51f92", "1618220179428-22790b461013", "1567538096630-e0c55bd6374c"],
    ottoman: ["1567538096630-e0c55bd6374c", "1555041469-a586c61ea9bc", "1583847268964-b28dc8f51f92", "1618220179428-22790b461013"],
    bench: ["1618220179428-22790b461013", "1586023492125-27b2c045efd7", "1567538096630-e0c55bd6374c", "1583847268964-b28dc8f51f92"],
    floor_lamp: ["1583847268964-b28dc8f51f92", "1618220179428-22790b461013", "1586023492125-27b2c045efd7", "1555041469-a586c61ea9bc"],
    dinnerware: ["1556911220-bff31c812dba", "1556909114-f6e7ad7d3136", "1610701596007-11502861dcfa", "1504674900247-0877df9cc836"],
    knives: ["1556909114-f6e7ad7d3136", "1556911220-bff31c812dba", "1556910103-1c02745aae4d", "1610701596007-11502861dcfa"],
    blender: ["1556910103-1c02745aae4d", "1610701596007-11502861dcfa", "1556909114-f6e7ad7d3136", "1556911220-bff31c812dba"],
    kettle: ["1610701596007-11502861dcfa", "1556910103-1c02745aae4d", "1556911220-bff31c812dba", "1556909114-f6e7ad7d3136"],
    dutch_oven: ["1556911220-bff31c812dba", "1556909114-f6e7ad7d3136", "1556910103-1c02745aae4d", "1610701596007-11502861dcfa"],
    cutting_board: ["1556909114-f6e7ad7d3136", "1556911220-bff31c812dba", "1504674900247-0877df9cc836", "1610701596007-11502861dcfa"],
    espresso: ["1556910103-1c02745aae4d", "1610701596007-11502861dcfa", "1556911220-bff31c812dba", "1482049016688-2d3e1b311543"],
    utensils: ["1610701596007-11502861dcfa", "1556909114-f6e7ad7d3136", "1556911220-bff31c812dba", "1556910103-1c02745aae4d"],
    food_storage: ["1504674900247-0877df9cc836", "1556911220-bff31c812dba", "1610701596007-11502861dcfa", "1556909114-f6e7ad7d3136"],
    apron: ["1556911220-bff31c812dba", "1556909114-f6e7ad7d3136", "1610701596007-11502861dcfa", "1556910103-1c02745aae4d"],
    vase: ["1583847268964-b28dc8f51f92", "1586023492125-27b2c045efd7", "1567538096630-e0c55bd6374c", "1618220179428-22790b461013"],
    candle: ["1586023492125-27b2c045efd7", "1583847268964-b28dc8f51f92", "1618220179428-22790b461013", "1567538096630-e0c55bd6374c"],
    throw_blanket: ["1555041469-a586c61ea9bc", "1567538096630-e0c55bd6374c", "1586023492125-27b2c045efd7", "1583847268964-b28dc8f51f92"],
    picture_frame: ["1567538096630-e0c55bd6374c", "1583847268964-b28dc8f51f92", "1618220179428-22790b461013", "1586023492125-27b2c045efd7"],
    mirror: ["1618220179428-22790b461013", "1583847268964-b28dc8f51f92", "1567538096630-e0c55bd6374c", "1586023492125-27b2c045efd7"],
    planter: ["1583847268964-b28dc8f51f92", "1618220179428-22790b461013", "1586023492125-27b2c045efd7", "1567538096630-e0c55bd6374c"],
    wall_clock: ["1586023492125-27b2c045efd7", "1583847268964-b28dc8f51f92", "1618220179428-22790b461013", "1555041469-a586c61ea9bc"],
    cushion: ["1555041469-a586c61ea9bc", "1567538096630-e0c55bd6374c", "1583847268964-b28dc8f51f92", "1618220179428-22790b461013"],
    rug: ["1567538096630-e0c55bd6374c", "1555041469-a586c61ea9bc", "1586023492125-27b2c045efd7", "1618220179428-22790b461013"],
    diffuser: ["1618220179428-22790b461013", "1586023492125-27b2c045efd7", "1583847268964-b28dc8f51f92", "1567538096630-e0c55bd6374c"],
    serum: ["1612817288484-6f916006741a", "1571781926291-c477ebfd024b", "1596462502278-27bfdc403348", "1518611012118-696072aa579a"],
    moisturizer: ["1596462502278-27bfdc403348", "1612817288484-6f916006741a", "1571781926291-c477ebfd024b", "1518611012118-696072aa579a"],
    cleanser: ["1571781926291-c477ebfd024b", "1612817288484-6f916006741a", "1596462502278-27bfdc403348", "1518611012118-696072aa579a"],
    lipstick: ["1596462502278-27bfdc403348", "1518611012118-696072aa579a", "1612817288484-6f916006741a", "1571781926291-c477ebfd024b"],
    perfume: ["1518611012118-696072aa579a", "1596462502278-27bfdc403348", "1612817288484-6f916006741a", "1571781926291-c477ebfd024b"],
    sunscreen: ["1612817288484-6f916006741a", "1571781926291-c477ebfd024b", "1596462502278-27bfdc403348", "1518611012118-696072aa579a"],
    hair_oil: ["1571781926291-c477ebfd024b", "1518611012118-696072aa579a", "1612817288484-6f916006741a", "1596462502278-27bfdc403348"],
    makeup_brushes: ["1596462502278-27bfdc403348", "1518611012118-696072aa579a", "1571781926291-c477ebfd024b", "1612817288484-6f916006741a"],
    body_wash: ["1518611012118-696072aa579a", "1571781926291-c477ebfd024b", "1612817288484-6f916006741a", "1596462502278-27bfdc403348"],
    face_mask: ["1612817288484-6f916006741a", "1596462502278-27bfdc403348", "1571781926291-c477ebfd024b", "1518611012118-696072aa579a"],
    yoga_mat: ["1571019613454-1cb2f99b2d8b", "1574680096145-d05b474e2155", "1546519638-68e109498ffc", "1476480862126-209bfaa8edc8"],
    dumbbell: ["1574680096145-d05b474e2155", "1571019613454-1cb2f99b2d8b", "1546519638-68e109498ffc", "1476480862126-209bfaa8edc8"],
    water_bottle: ["1546519638-68e109498ffc", "1571019613454-1cb2f99b2d8b", "1476480862126-209bfaa8edc8", "1574680096145-d05b474e2155"],
    running_shoes: ["1542291026-7eec264c27ff", "1571019613454-1cb2f99b2d8b", "1476480862126-209bfaa8edc8", "1574680096145-d05b474e2155"],
    daypack: ["1476480862126-209bfaa8edc8", "1546519638-68e109498ffc", "1571019613454-1cb2f99b2d8b", "1542291026-7eec264c27ff"],
    resistance_bands: ["1571019613454-1cb2f99b2d8b", "1574680096145-d05b474e2155", "1546519638-68e109498ffc", "1476480862126-209bfaa8edc8"],
    bike_light: ["1546519638-68e109498ffc", "1476480862126-209bfaa8edc8", "1571019613454-1cb2f99b2d8b", "1574680096145-d05b474e2155"],
    jump_rope: ["1574680096145-d05b474e2155", "1571019613454-1cb2f99b2d8b", "1546519638-68e109498ffc", "1476480862126-209bfaa8edc8"],
    tent: ["1476480862126-209bfaa8edc8", "1546519638-68e109498ffc", "1571019613454-1cb2f99b2d8b", "1542291026-7eec264c27ff"],
    training_gloves: ["1571019613454-1cb2f99b2d8b", "1574680096145-d05b474e2155", "1542291026-7eec264c27ff", "1476480862126-209bfaa8edc8"],
    olive_oil: ["1546069901-ba9599a7e63c", "1504674900247-0877df9cc836", "1567620905732-2d1ec7ab7445", "1565958011703-44f9829ba187"],
    pasta: ["1567620905732-2d1ec7ab7445", "1546069901-ba9599a7e63c", "1504674900247-0877df9cc836", "1482049016688-2d3e1b311543"],
    coffee: ["1482049016688-2d3e1b311543", "1565958011703-44f9829ba187", "1546069901-ba9599a7e63c", "1504674900247-0877df9cc836"],
    honey: ["1565958011703-44f9829ba187", "1482049016688-2d3e1b311543", "1546069901-ba9599a7e63c", "1567620905732-2d1ec7ab7445"],
    granola: ["1504674900247-0877df9cc836", "1546069901-ba9599a7e63c", "1567620905732-2d1ec7ab7445", "1482049016688-2d3e1b311543"],
    tea: ["1482049016688-2d3e1b311543", "1565958011703-44f9829ba187", "1504674900247-0877df9cc836", "1546069901-ba9599a7e63c"],
    chocolate: ["1565958011703-44f9829ba187", "1482049016688-2d3e1b311543", "1567620905732-2d1ec7ab7445", "1504674900247-0877df9cc836"],
    spices: ["1546069901-ba9599a7e63c", "1567620905732-2d1ec7ab7445", "1504674900247-0877df9cc836", "1565958011703-44f9829ba187"],
    pasta_sauce: ["1567620905732-2d1ec7ab7445", "1546069901-ba9599a7e63c", "1504674900247-0877df9cc836", "1482049016688-2d3e1b311543"],
    trail_mix: ["1504674900247-0877df9cc836", "1546069901-ba9599a7e63c", "1565958011703-44f9829ba187", "1567620905732-2d1ec7ab7445"],
    gift_card: ["1526170375885-4d8ecf77b99f", "1526170375885-4d8ecf77b99f", "1496181133206-80ce9b88a853", "1498050108023-c5249f4df085"],
    bundle_apparel: ["1556821840-3a63f95609a7", "1521572163474-6864f9cf17ab", "1620799140408-edc6dcb6d633", "1576566588028-4147f3842f27"],
    bundle_desk: ["1593640408182-31c70c8268f5", "1525547719571-a2d4ac8945e2", "1484788984921-03950022c9ef", "1498050108023-c5249f4df085"],
    bundle_audio: ["1505740420928-5e560c06d30e", "1608043152269-423dbba4e7e1", "1484704849700-f032a568e944", "1493225457124-a3eb161ffa5f"],
    bundle_skincare: ["1612817288484-6f916006741a", "1596462502278-27bfdc403348", "1571781926291-c477ebfd024b", "1518611012118-696072aa579a"],
    bundle_kitchen: ["1556909114-f6e7ad7d3136", "1556911220-bff31c812dba", "1610701596007-11502861dcfa", "1556910103-1c02745aae4d"],
} as const;

export type ImageKitId = keyof typeof IMAGE_KITS;

/** Every catalog product → the kit that matches its name / SKU intent. */
export const PRODUCT_IMAGE_KIT: Readonly<Record<string, ImageKitId>> = {
    "prod-phone-01-nova-x": "smartphone",
    "prod-phone-02-pulse-lite": "smartphone",
    "prod-phone-03-aura-pro": "smartphone",
    "prod-phone-04-folio-tab": "tablet",
    "prod-phone-05-orbit-flip": "smartphone",
    "prod-phone-06-signal-se": "smartphone",
    "prod-phone-07-canvas-pad": "tablet",
    "prod-phone-08-ridge-rugged": "smartphone",
    "prod-phone-09-halo-watch-bundle": "smartwatch",
    "prod-phone-10-prism-case-kit": "phone_accessory",
    "prod-03-logo-pack": "digital",
    "prod-comp-01-slatebook": "laptop",
    "prod-comp-02-forge-tower": "desktop",
    "prod-comp-03-pixel-display": "monitor",
    "prod-comp-04-keyline-mech": "keyboard",
    "prod-comp-05-glide-mouse": "mouse",
    "prod-comp-06-dock-hub": "dock",
    "prod-comp-07-cloud-ssd": "ssd",
    "prod-comp-08-frame-webcam": "webcam",
    "prod-comp-09-ui-kit-digital": "digital",
    "prod-audio-01-wave-buds": "earbuds",
    "prod-audio-02-sonic-overear": "headphones",
    "prod-audio-03-boom-speaker": "speaker",
    "prod-audio-04-stage-mic": "microphone",
    "prod-audio-05-ribbon-dac": "dac",
    "prod-audio-06-pulse-neckband": "earbuds",
    "prod-audio-07-vinyl-turntable": "turntable",
    "prod-audio-08-mix-controller": "dj_controller",
    "prod-audio-09-quiet-foam": "ear_tips",
    "prod-audio-10-cable-pro": "audio_cable",
    "prod-01-brand-tee": "tshirt",
    "prod-02-hoodie": "hoodie",
    "prod-men-03-chino": "chino",
    "prod-men-04-oxford": "oxford_shirt",
    "prod-men-05-denim-jacket": "denim_jacket",
    "prod-men-06-crew-sweat": "sweatshirt",
    "prod-men-07-linen-short": "shorts",
    "prod-men-08-wool-beanie": "beanie",
    "prod-men-09-leather-belt": "belt",
    "prod-men-10-canvas-tote": "tote",
    "prod-wom-01-silk-blouse": "blouse",
    "prod-wom-02-midi-dress": "dress",
    "prod-wom-03-knit-cardigan": "cardigan",
    "prod-wom-04-wide-trouser": "trouser",
    "prod-wom-05-trench": "trench",
    "prod-wom-06-crossbody": "crossbody",
    "prod-wom-07-ballet-flat": "ballet_flat",
    "prod-wom-08-scarf": "scarf",
    "prod-wom-09-legging": "legging",
    "prod-wom-10-earring": "earrings",
    "prod-kid-01-soft-tee": "kids_tee",
    "prod-kid-02-rain-jacket": "kids_jacket",
    "prod-kid-03-denim-overall": "kids_overall",
    "prod-kid-04-sneakers": "kids_sneakers",
    "prod-kid-05-pajama": "kids_pajama",
    "prod-kid-06-beanie": "kids_beanie",
    "prod-kid-07-backpack": "kids_backpack",
    "prod-kid-08-socks": "kids_socks",
    "prod-kid-09-hoodie": "kids_hoodie",
    "prod-kid-10-cap": "kids_cap",
    "prod-furn-01-sofa": "sofa",
    "prod-furn-02-dining": "dining_table",
    "prod-furn-03-chair": "accent_chair",
    "prod-furn-04-desk": "desk",
    "prod-furn-05-shelf": "shelf",
    "prod-furn-06-bed": "bed",
    "prod-furn-07-nightstand": "nightstand",
    "prod-furn-08-ottoman": "ottoman",
    "prod-furn-09-bench": "bench",
    "prod-furn-10-lamp-floor": "floor_lamp",
    "prod-kit-01-ceramic-set": "dinnerware",
    "prod-kit-02-knife": "knives",
    "prod-kit-03-blender": "blender",
    "prod-kit-04-pour-kettle": "kettle",
    "prod-kit-05-dutch-oven": "dutch_oven",
    "prod-kit-06-cutting-board": "cutting_board",
    "prod-kit-07-espresso": "espresso",
    "prod-kit-08-utensil": "utensils",
    "prod-kit-09-storage": "food_storage",
    "prod-kit-10-apron": "apron",
    "prod-dec-01-vase": "vase",
    "prod-dec-02-candle": "candle",
    "prod-dec-03-throw": "throw_blanket",
    "prod-dec-04-frame": "picture_frame",
    "prod-dec-05-mirror": "mirror",
    "prod-dec-06-plant": "planter",
    "prod-dec-07-clock": "wall_clock",
    "prod-dec-08-cushion": "cushion",
    "prod-dec-09-rug": "rug",
    "prod-dec-10-diffuser": "diffuser",
    "prod-beau-01-serum": "serum",
    "prod-beau-02-moisturizer": "moisturizer",
    "prod-beau-03-cleanser": "cleanser",
    "prod-beau-04-lipstick": "lipstick",
    "prod-beau-05-perfume": "perfume",
    "prod-beau-06-sunscreen": "sunscreen",
    "prod-beau-07-hair-oil": "hair_oil",
    "prod-beau-08-brush-set": "makeup_brushes",
    "prod-beau-09-body-wash": "body_wash",
    "prod-beau-10-mask": "face_mask",
    "prod-spo-01-yoga": "yoga_mat",
    "prod-spo-02-dumbbell": "dumbbell",
    "prod-spo-03-bottle": "water_bottle",
    "prod-spo-04-running": "running_shoes",
    "prod-spo-05-backpack": "daypack",
    "prod-spo-06-resistance": "resistance_bands",
    "prod-spo-07-bike-light": "bike_light",
    "prod-spo-08-jump-rope": "jump_rope",
    "prod-spo-09-tent": "tent",
    "prod-spo-10-gloves": "training_gloves",
    "prod-food-01-olive": "olive_oil",
    "prod-food-02-pasta": "pasta",
    "prod-food-03-coffee": "coffee",
    "prod-food-04-honey": "honey",
    "prod-food-05-granola": "granola",
    "prod-food-06-tea": "tea",
    "prod-food-07-chocolate": "chocolate",
    "prod-food-08-spice": "spices",
    "prod-food-09-sauce": "pasta_sauce",
    "prod-food-10-snack": "trail_mix",
    "prod-gc-01-25": "gift_card",
    "prod-gc-02-50": "gift_card",
    "prod-gc-03-100": "gift_card",
    "prod-gc-04-150": "gift_card",
    "prod-gc-05-250": "gift_card",
    "prod-bundle-01-studio-apparel": "bundle_apparel",
    "prod-bundle-02-desk-setup": "bundle_desk",
    "prod-bundle-03-audio-essentials": "bundle_audio",
    "prod-bundle-04-skincare-starter": "bundle_skincare",
    "prod-bundle-05-kitchen-prep": "bundle_kitchen",
};

const DEMO_VIDEO_URLS = [
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://www.w3schools.com/html/mov_bbb.mp4",
    "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
] as const;

const GALLERY_SIZE = 4;

function seedOffset(seedKey: string): number {
    const digest = createHash("sha256").update(seedKey).digest();
    return digest[0]! + digest[1]! * 256;
}

/**
 * Main + gallery photos for a product — all from the product's semantic kit only.
 * Kit[0] is always the hero (best name match). Gallery slots rotate extra kit
 * shots so siblings don't share an identical gallery strip.
 */
export function resolveProductPhotoIds(seed: CatalogProductSeed): string[] {
    const kitId = PRODUCT_IMAGE_KIT[seed.seedKey];
    const kit = kitId ? [...IMAGE_KITS[kitId]] : [];
    if (kit.length === 0) {
        return [seed.imagePhotoId];
    }

    // Dedupe while preserving kit priority (best match first).
    const unique: string[] = [];
    for (const id of kit) {
        if (!unique.includes(id)) unique.push(id);
    }

    const main = unique[0]!;
    const extras = unique.slice(1);
    if (extras.length === 0) {
        return Array.from({length: GALLERY_SIZE}, () => main);
    }

    const offset = seedOffset(seed.seedKey) % extras.length;
    const rotatedExtras = [...extras.slice(offset), ...extras.slice(0, offset)];
    while (rotatedExtras.length < GALLERY_SIZE - 1) {
        rotatedExtras.push(extras[rotatedExtras.length % extras.length]!);
    }
    return [main, ...rotatedExtras.slice(0, GALLERY_SIZE - 1)];
}

/** Canonical main photo for a seed (first of resolveProductPhotoIds). */
export function resolveProductMainPhotoId(seed: CatalogProductSeed): string {
    return resolveProductPhotoIds(seed)[0] ?? seed.imagePhotoId;
}

export function resolveProductVideoUrls(seed: CatalogProductSeed): string[] {
    if (seed.type === "digital" || seed.type === "gift_card") return [];
    const idx = seedOffset(seed.seedKey) % DEMO_VIDEO_URLS.length;
    return [DEMO_VIDEO_URLS[idx]!];
}
