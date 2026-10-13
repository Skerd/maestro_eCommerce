/**
 * One custom purchase review per catalog product (`seedKey`).
 * Consumed by `productReview.defaults.ts` (requires a delivered order).
 */

export type CatalogProductReviewSeed = {
    rating: number;
    title: string;
    comment: string;
};

export const catalogProductReviews: Readonly<Record<string, CatalogProductReviewSeed>> = {
    "prod-phone-01-nova-x": {
        rating: 5,
        title: "Daily use: Nova X Smartphone",
        comment: "The PDP for Nova X Smartphone was accurate. Flagship dual-SIM phone with OLED display. Color/size matched; no support tickets, no returns.",
    },
    "prod-phone-02-pulse-lite": {
        rating: 5,
        title: "Daily use: Pulse Lite Phone",
        comment: "Solid buy on Pulse Lite Phone. Everyday midrange phone with long battery life. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-phone-03-aura-pro": {
        rating: 5,
        title: "Keeping the Aura Pro Max",
        comment: "Ordered the Aura Pro Max after comparing a few options. Listing said “Pro camera system and titanium frame” — that checks out after a week of real use.",
    },
    "prod-phone-04-folio-tab": {
        rating: 5,
        title: "Honest take — Folio 11 Tablet",
        comment: "Second-week update on Folio 11 Tablet: still pleased. 11-inch tablet for reading and sketching. Quietly excellent for everyday use at this price.",
    },
    "prod-phone-05-orbit-flip": {
        rating: 3,
        title: "Orbit Flip surprised me",
        comment: "The PDP for Orbit Flip was accurate. Folding display phone for multitasking. Color/size matched; no support tickets, no returns.",
    },
    "prod-phone-06-signal-se": {
        rating: 4,
        title: "Signal SE matched the photos",
        comment: "Ordered the Signal SE after comparing a few options. Listing said “Compact entry phone with dual cameras” — that checks out after a week of real use.",
    },
    "prod-phone-07-canvas-pad": {
        rating: 4,
        title: "Canvas Pad Mini earned a spot",
        comment: "Ordered the Canvas Pad Mini after comparing a few options. Listing said “Pocketable tablet for travel media” — that checks out after a week of real use.",
    },
    "prod-phone-08-ridge-rugged": {
        rating: 4,
        title: "Glad I bought Ridge Rugged Phone",
        comment: "Second-week update on Ridge Rugged Phone: still pleased. IP68 rugged handset for fieldwork. Quietly excellent for everyday use at this price.",
    },
    "prod-phone-09-halo-watch-bundle": {
        rating: 5,
        title: "Keeping the Halo Watch Bundle",
        comment: "Bought Halo Watch Bundle for myself, not as a checkbox. Smartwatch paired with charging dock. Feels intentional — stays in rotation.",
    },
    "prod-phone-10-prism-case-kit": {
        rating: 5,
        title: "Daily use: Prism Case Kit",
        comment: "Solid buy on Prism Case Kit. Clear case, tempered glass, and cable set. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-03-logo-pack": {
        rating: 4,
        title: "Logo Source Pack download was instant",
        comment: "Instant access to Logo Source Pack. Downloadable SVG/PNG logo starter kit. Licensing notes were clear enough that I didn't need to ping support.",
    },
    "prod-comp-01-slatebook": {
        rating: 5,
        title: "Keeping the SlateBook 14",
        comment: "Bought SlateBook 14 for myself, not as a checkbox. Lightweight 14-inch ultrabook for studio work. Feels intentional — stays in rotation.",
    },
    "prod-comp-02-forge-tower": {
        rating: 5,
        title: "Would reorder Forge Desktop Tower",
        comment: "Swapped to the Forge Desktop Tower and haven't looked back. Exactly as described: Creator desktop with discrete graphics. Would gift it without hesitating.",
    },
    "prod-comp-03-pixel-display": {
        rating: 4,
        title: "PixelView 27 Display matched the photos",
        comment: "Second-week update on PixelView 27 Display: still pleased. 27-inch 4K IPS monitor for color work. Quietly excellent for everyday use at this price.",
    },
    "prod-comp-04-keyline-mech": {
        rating: 4,
        title: "Would reorder Keyline Mechanical Keyboard",
        comment: "Ordered the Keyline Mechanical Keyboard after comparing a few options. Listing said “Hot-swap mechanical keyboard with RGB” — that checks out after a week of real use.",
    },
    "prod-comp-05-glide-mouse": {
        rating: 3,
        title: "Glide Pro Mouse surprised me",
        comment: "Swapped to the Glide Pro Mouse and haven't looked back. Exactly as described: Ergonomic wireless mouse with USB-C. Would gift it without hesitating.",
    },
    "prod-comp-06-dock-hub": {
        rating: 5,
        title: "Keeping the DockHub USB-C",
        comment: "DockHub USB-C replaced what I used before. 12-in-1 USB-C docking station. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-comp-07-cloud-ssd": {
        rating: 5,
        title: "Daily use: CloudDrive 2TB SSD",
        comment: "The PDP for CloudDrive 2TB SSD was accurate. Portable NVMe SSD with USB4. Color/size matched; no support tickets, no returns.",
    },
    "prod-comp-08-frame-webcam": {
        rating: 5,
        title: "Glad I bought Frame HD Webcam",
        comment: "Swapped to the Frame HD Webcam and haven't looked back. Exactly as described: 1080p webcam with privacy shutter. Would gift it without hesitating.",
    },
    "prod-comp-09-ui-kit-digital": {
        rating: 5,
        title: "Clean digital buy: UI Kit Digital Bundle",
        comment: "UI Kit Digital Bundle is exactly the digital SKU you want in a catalog. Figma UI kit for storefront demos. No DRM drama; I reused the assets twice this week.",
    },
    "prod-audio-01-wave-buds": {
        rating: 4,
        title: "Wave Buds Pro matched the photos",
        comment: "Ordered the Wave Buds Pro after comparing a few options. Listing said “ANC earbuds with wireless charging case” — that checks out after a week of real use.",
    },
    "prod-audio-02-sonic-overear": {
        rating: 3,
        title: "Honest take — Sonic Over-Ear",
        comment: "Sonic Over-Ear replaced what I used before. Studio over-ear headphones with deep bass. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-audio-03-boom-speaker": {
        rating: 5,
        title: "Daily use: Boom Portable Speaker",
        comment: "Ordered the Boom Portable Speaker after comparing a few options. Listing said “IPX7 Bluetooth speaker for outdoor days” — that checks out after a week of real use.",
    },
    "prod-audio-04-stage-mic": {
        rating: 5,
        title: "Would reorder Stage Condenser Mic",
        comment: "Stage Condenser Mic replaced what I used before. USB/XLR condenser mic for podcasts. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-audio-05-ribbon-dac": {
        rating: 5,
        title: "Keeping the Ribbon DAC Amp",
        comment: "Second-week update on Ribbon DAC Amp: still pleased. Desktop DAC and headphone amplifier. Quietly excellent for everyday use at this price.",
    },
    "prod-audio-06-pulse-neckband": {
        rating: 5,
        title: "Would reorder Pulse Neckband",
        comment: "Second-week update on Pulse Neckband: still pleased. Lightweight neckband earphones. Quietly excellent for everyday use at this price.",
    },
    "prod-audio-07-vinyl-turntable": {
        rating: 3,
        title: "Vinyl Compact Turntable surprised me",
        comment: "Ordered the Vinyl Compact Turntable after comparing a few options. Listing said “Belt-drive turntable with USB output” — that checks out after a week of real use.",
    },
    "prod-audio-08-mix-controller": {
        rating: 4,
        title: "MixPad Controller earned a spot",
        comment: "MixPad Controller arrived on time and looked like the photography. 2-channel DJ controller with pads. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-audio-09-quiet-foam": {
        rating: 4,
        title: "Honest take — Quiet Foam Tips Pack",
        comment: "Quiet Foam Tips Pack arrived on time and looked like the photography. Memory-foam tips in three sizes. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-audio-10-cable-pro": {
        rating: 5,
        title: "Keeping the Cable Pro Aux Kit",
        comment: "Swapped to the Cable Pro Aux Kit and haven't looked back. Exactly as described: Braided aux and extension cable kit. Would gift it without hesitating.",
    },
    "prod-01-brand-tee": {
        rating: 5,
        title: "Would reorder Brand T-Shirt",
        comment: "Solid buy on Brand T-Shirt. Soft cotton tee with embossed demo mark. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-02-hoodie": {
        rating: 5,
        title: "Studio Hoodie matched the photos",
        comment: "Bought Studio Hoodie for myself, not as a checkbox. Heavyweight fleece hoodie for studio days. Feels intentional — stays in rotation.",
    },
    "prod-men-03-chino": {
        rating: 5,
        title: "Daily use: City Chino Pants",
        comment: "City Chino Pants arrived on time and looked like the photography. Tapered chino pants in stretch cotton. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-men-04-oxford": {
        rating: 5,
        title: "Keeping the Oxford Button-Down",
        comment: "Ordered the Oxford Button-Down after comparing a few options. Listing said “Classic oxford shirt for office and weekend” — that checks out after a week of real use.",
    },
    "prod-men-05-denim-jacket": {
        rating: 5,
        title: "River Denim Jacket matched the photos",
        comment: "Bought River Denim Jacket for myself, not as a checkbox. Mid-wash denim jacket with metal hardware. Feels intentional — stays in rotation.",
    },
    "prod-men-06-crew-sweat": {
        rating: 5,
        title: "Daily use: Crewneck Sweatshirt",
        comment: "Ordered the Crewneck Sweatshirt after comparing a few options. Listing said “Soft loopback crewneck sweatshirt” — that checks out after a week of real use.",
    },
    "prod-men-07-linen-short": {
        rating: 5,
        title: "Glad I bought Harbor Linen Shorts",
        comment: "The PDP for Harbor Linen Shorts was accurate. Breathable linen-blend summer shorts. Color/size matched; no support tickets, no returns.",
    },
    "prod-men-08-wool-beanie": {
        rating: 5,
        title: "Daily use: Merino Beanie",
        comment: "Merino Beanie replaced what I used before. Fine-gauge merino wool beanie. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-men-09-leather-belt": {
        rating: 4,
        title: "Glad I bought Full-Grain Belt",
        comment: "Full-Grain Belt arrived on time and looked like the photography. Vegetable-tanned leather belt. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-men-10-canvas-tote": {
        rating: 5,
        title: "Keeping the Studio Canvas Tote",
        comment: "Solid buy on Studio Canvas Tote. Heavy canvas tote with interior pocket. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-wom-01-silk-blouse": {
        rating: 5,
        title: "Would reorder Silk Soft Blouse",
        comment: "The PDP for Silk Soft Blouse was accurate. Fluid blouse with mother-of-pearl buttons. Color/size matched; no support tickets, no returns.",
    },
    "prod-wom-02-midi-dress": {
        rating: 4,
        title: "Would reorder Atelier Midi Dress",
        comment: "The PDP for Atelier Midi Dress was accurate. Wrap midi dress with soft drape. Color/size matched; no support tickets, no returns.",
    },
    "prod-wom-03-knit-cardigan": {
        rating: 5,
        title: "Keeping the Cloud Knit Cardigan",
        comment: "The PDP for Cloud Knit Cardigan was accurate. Open-front cardigan in airy knit. Color/size matched; no support tickets, no returns.",
    },
    "prod-wom-04-wide-trouser": {
        rating: 5,
        title: "Wide Leg Trouser earned a spot",
        comment: "The PDP for Wide Leg Trouser was accurate. High-rise wide-leg trousers. Color/size matched; no support tickets, no returns.",
    },
    "prod-wom-05-trench": {
        rating: 5,
        title: "Keeping the Mist Trench Coat",
        comment: "Bought Mist Trench Coat for myself, not as a checkbox. Water-resistant classic trench. Feels intentional — stays in rotation.",
    },
    "prod-wom-06-crossbody": {
        rating: 4,
        title: "Eclipse Crossbody matched the photos",
        comment: "Solid buy on Eclipse Crossbody. Structured leather crossbody bag. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-wom-07-ballet-flat": {
        rating: 4,
        title: "Glad I bought Studio Ballet Flat",
        comment: "Second-week update on Studio Ballet Flat: still pleased. Cushioned ballet flat for all-day wear. Quietly excellent for everyday use at this price.",
    },
    "prod-wom-08-scarf": {
        rating: 5,
        title: "Glad I bought Horizon Silk Scarf",
        comment: "The PDP for Horizon Silk Scarf was accurate. Printed silk scarf with rolled edges. Color/size matched; no support tickets, no returns.",
    },
    "prod-wom-09-legging": {
        rating: 5,
        title: "Flex Studio Legging surprised me",
        comment: "Solid buy on Flex Studio Legging. Compression legging with side pocket. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-wom-10-earring": {
        rating: 5,
        title: "Daily use: Arc Hoop Earrings",
        comment: "Arc Hoop Earrings replaced what I used before. Gold-tone lightweight hoop earrings. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-kid-01-soft-tee": {
        rating: 5,
        title: "Keeping the Little Soft Tee",
        comment: "The PDP for Little Soft Tee was accurate. Organic cotton kids tee. Color/size matched; no support tickets, no returns.",
    },
    "prod-kid-02-rain-jacket": {
        rating: 4,
        title: "Puddle Rain Jacket matched the photos",
        comment: "Puddle Rain Jacket replaced what I used before. Packable kids rain jacket. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-kid-03-denim-overall": {
        rating: 5,
        title: "Daily use: Play Denim Overalls",
        comment: "Swapped to the Play Denim Overalls and haven't looked back. Exactly as described: Adjustable denim overalls. Would gift it without hesitating.",
    },
    "prod-kid-04-sneakers": {
        rating: 5,
        title: "Glad I bought Bounce Kids Sneakers",
        comment: "Bounce Kids Sneakers arrived on time and looked like the photography. Lightweight sneakers with easy straps. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-kid-05-pajama": {
        rating: 4,
        title: "Honest take — Moonlight Pajama Set",
        comment: "Moonlight Pajama Set arrived on time and looked like the photography. Two-piece soft jersey pajamas. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-kid-06-beanie": {
        rating: 5,
        title: "Daily use: Tiny Knit Beanie",
        comment: "Swapped to the Tiny Knit Beanie and haven't looked back. Exactly as described: Soft knit beanie with pom. Would gift it without hesitating.",
    },
    "prod-kid-07-backpack": {
        rating: 5,
        title: "Explorer Mini Backpack surprised me",
        comment: "Second-week update on Explorer Mini Backpack: still pleased. Lightweight backpack for school days. Quietly excellent for everyday use at this price.",
    },
    "prod-kid-08-socks": {
        rating: 5,
        title: "Rainbow Sock Pack matched the photos",
        comment: "Solid buy on Rainbow Sock Pack. Pack of five colorful crew socks. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-kid-09-hoodie": {
        rating: 4,
        title: "Honest take — Adventure Kids Hoodie",
        comment: "Solid buy on Adventure Kids Hoodie. Cozy fleece hoodie with kangaroo pocket. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-kid-10-cap": {
        rating: 5,
        title: "Sun Day Cap matched the photos",
        comment: "Second-week update on Sun Day Cap: still pleased. Adjustable cotton baseball cap. Quietly excellent for everyday use at this price.",
    },
    "prod-furn-01-sofa": {
        rating: 4,
        title: "Honest take — Lounge Modular Sofa",
        comment: "Ordered the Lounge Modular Sofa after comparing a few options. Listing said “Modular sofa with washable covers” — that checks out after a week of real use.",
    },
    "prod-furn-02-dining": {
        rating: 4,
        title: "Would reorder Oak Dining Table",
        comment: "Ordered the Oak Dining Table after comparing a few options. Listing said “Solid oak dining table for six” — that checks out after a week of real use.",
    },
    "prod-furn-03-chair": {
        rating: 5,
        title: "Curve Accent Chair earned a spot",
        comment: "Second-week update on Curve Accent Chair: still pleased. Upholstered accent chair with wood legs. Quietly excellent for everyday use at this price.",
    },
    "prod-furn-04-desk": {
        rating: 5,
        title: "Keeping the Focus Work Desk",
        comment: "Solid buy on Focus Work Desk. Cable-managed desk with oak top. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-furn-05-shelf": {
        rating: 5,
        title: "Would reorder Stack Wall Shelf",
        comment: "The PDP for Stack Wall Shelf was accurate. Set of three floating wall shelves. Color/size matched; no support tickets, no returns.",
    },
    "prod-furn-06-bed": {
        rating: 5,
        title: "Daily use: Rest Platform Bed",
        comment: "Swapped to the Rest Platform Bed and haven't looked back. Exactly as described: Queen platform bed with storage drawers. Would gift it without hesitating.",
    },
    "prod-furn-07-nightstand": {
        rating: 5,
        title: "Daily use: Side Nightstand",
        comment: "Side Nightstand replaced what I used before. Two-drawer nightstand with soft close. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-furn-08-ottoman": {
        rating: 5,
        title: "Cloud Storage Ottoman surprised me",
        comment: "Cloud Storage Ottoman replaced what I used before. Upholstered ottoman with hidden storage. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-furn-09-bench": {
        rating: 5,
        title: "Daily use: Entryway Bench",
        comment: "Swapped to the Entryway Bench and haven't looked back. Exactly as described: Solid wood bench with shoe shelf. Would gift it without hesitating.",
    },
    "prod-furn-10-lamp-floor": {
        rating: 5,
        title: "Arc Floor Lamp surprised me",
        comment: "Ordered the Arc Floor Lamp after comparing a few options. Listing said “Overarching floor lamp with linen shade” — that checks out after a week of real use.",
    },
    "prod-kit-01-ceramic-set": {
        rating: 5,
        title: "Glad I bought Ceramic Dinner Set",
        comment: "The PDP for Ceramic Dinner Set was accurate. 16-piece matte ceramic dinnerware set. Color/size matched; no support tickets, no returns.",
    },
    "prod-kit-02-knife": {
        rating: 4,
        title: "Chef Knife Set surprised me",
        comment: "Second-week update on Chef Knife Set: still pleased. 5-piece stainless knife block set. Quietly excellent for everyday use at this price.",
    },
    "prod-kit-03-blender": {
        rating: 4,
        title: "Pulse Countertop Blender matched the photos",
        comment: "The PDP for Pulse Countertop Blender was accurate. High-speed blender with glass jar. Color/size matched; no support tickets, no returns.",
    },
    "prod-kit-04-pour-kettle": {
        rating: 4,
        title: "Glad I bought Pour-Over Kettle",
        comment: "Bought Pour-Over Kettle for myself, not as a checkbox. Gooseneck kettle with temperature control. Feels intentional — stays in rotation.",
    },
    "prod-kit-05-dutch-oven": {
        rating: 5,
        title: "Daily use: Cast Dutch Oven",
        comment: "Swapped to the Cast Dutch Oven and haven't looked back. Exactly as described: Enameled cast-iron dutch oven, 5.5 qt. Would gift it without hesitating.",
    },
    "prod-kit-06-cutting-board": {
        rating: 3,
        title: "Honest take — End-Grain Board",
        comment: "End-Grain Board replaced what I used before. Thick end-grain hardwood cutting board. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-kit-07-espresso": {
        rating: 4,
        title: "Corner Espresso Maker matched the photos",
        comment: "Bought Corner Espresso Maker for myself, not as a checkbox. Compact espresso machine with milk wand. Feels intentional — stays in rotation.",
    },
    "prod-kit-08-utensil": {
        rating: 5,
        title: "Glad I bought Silicone Utensil Set",
        comment: "The PDP for Silicone Utensil Set was accurate. Heat-safe utensil set with crock. Color/size matched; no support tickets, no returns.",
    },
    "prod-kit-09-storage": {
        rating: 4,
        title: "Glad I bought Glass Storage Set",
        comment: "Solid buy on Glass Storage Set. 10-piece glass food storage set. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-kit-10-apron": {
        rating: 4,
        title: "Canvas Chef Apron earned a spot",
        comment: "Ordered the Canvas Chef Apron after comparing a few options. Listing said “Waxed canvas apron with tool pockets” — that checks out after a week of real use.",
    },
    "prod-dec-01-vase": {
        rating: 5,
        title: "Glad I bought Stoneware Vase",
        comment: "Swapped to the Stoneware Vase and haven't looked back. Exactly as described: Hand-glazed stoneware vase. Would gift it without hesitating.",
    },
    "prod-dec-02-candle": {
        rating: 4,
        title: "Amber Soy Candle earned a spot",
        comment: "Ordered the Amber Soy Candle after comparing a few options. Listing said “Long-burn soy candle in amber glass” — that checks out after a week of real use.",
    },
    "prod-dec-03-throw": {
        rating: 4,
        title: "Woven Throw Blanket earned a spot",
        comment: "Swapped to the Woven Throw Blanket and haven't looked back. Exactly as described: Chunky woven throw for sofas. Would gift it without hesitating.",
    },
    "prod-dec-04-frame": {
        rating: 5,
        title: "Gallery Frame Set matched the photos",
        comment: "Gallery Frame Set arrived on time and looked like the photography. Set of five mixed-size picture frames. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-dec-05-mirror": {
        rating: 5,
        title: "Daily use: Round Wall Mirror",
        comment: "Round Wall Mirror arrived on time and looked like the photography. 80cm round mirror with thin metal rim. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-dec-06-plant": {
        rating: 4,
        title: "Ceramic Planter Pot surprised me",
        comment: "Ceramic Planter Pot replaced what I used before. Drainage planter with matching saucer. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-dec-07-clock": {
        rating: 3,
        title: "Honest take — Silent Wall Clock",
        comment: "Silent Wall Clock arrived on time and looked like the photography. Minimal wall clock with silent sweep. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-dec-08-cushion": {
        rating: 4,
        title: "Honest take — Linen Cushion Cover",
        comment: "Bought Linen Cushion Cover for myself, not as a checkbox. Stonewashed linen cushion cover 50×50. Feels intentional — stays in rotation.",
    },
    "prod-dec-09-rug": {
        rating: 4,
        title: "Wool Accent Rug matched the photos",
        comment: "Ordered the Wool Accent Rug after comparing a few options. Listing said “Hand-tufted wool accent rug 120×180” — that checks out after a week of real use.",
    },
    "prod-dec-10-diffuser": {
        rating: 5,
        title: "Reed Diffuser Set matched the photos",
        comment: "Ordered the Reed Diffuser Set after comparing a few options. Listing said “Scented reed diffuser with refill” — that checks out after a week of real use.",
    },
    "prod-beau-01-serum": {
        rating: 5,
        title: "Daily use: Glow Vitamin Serum",
        comment: "Second-week update on Glow Vitamin Serum: still pleased. Vitamin C brightening serum, 30ml. Quietly excellent for everyday use at this price.",
    },
    "prod-beau-02-moisturizer": {
        rating: 5,
        title: "Glad I bought Daily Soft Moisturizer",
        comment: "The PDP for Daily Soft Moisturizer was accurate. Lightweight daily face moisturizer. Color/size matched; no support tickets, no returns.",
    },
    "prod-beau-03-cleanser": {
        rating: 5,
        title: "Gentle Foam Cleanser earned a spot",
        comment: "Second-week update on Gentle Foam Cleanser: still pleased. pH-balanced foaming cleanser. Quietly excellent for everyday use at this price.",
    },
    "prod-beau-04-lipstick": {
        rating: 5,
        title: "Keeping the Velvet Matte Lipstick",
        comment: "Velvet Matte Lipstick arrived on time and looked like the photography. Long-wear matte lipstick. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-beau-05-perfume": {
        rating: 5,
        title: "Daily use: Cedar Eau de Parfum",
        comment: "Ordered the Cedar Eau de Parfum after comparing a few options. Listing said “Woody citrus eau de parfum, 50ml” — that checks out after a week of real use.",
    },
    "prod-beau-06-sunscreen": {
        rating: 5,
        title: "Honest take — Shield SPF 50",
        comment: "Swapped to the Shield SPF 50 and haven't looked back. Exactly as described: Lightweight mineral SPF 50 cream. Would gift it without hesitating.",
    },
    "prod-beau-07-hair-oil": {
        rating: 4,
        title: "Nourish Hair Oil matched the photos",
        comment: "Second-week update on Nourish Hair Oil: still pleased. Lightweight leave-in hair oil. Quietly excellent for everyday use at this price.",
    },
    "prod-beau-08-brush-set": {
        rating: 4,
        title: "Would reorder Pro Brush Set",
        comment: "Ordered the Pro Brush Set after comparing a few options. Listing said “12-piece makeup brush set with pouch” — that checks out after a week of real use.",
    },
    "prod-beau-09-body-wash": {
        rating: 5,
        title: "Daily use: Rain Body Wash",
        comment: "Solid buy on Rain Body Wash. Fresh citrus body wash, 400ml. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-beau-10-mask": {
        rating: 5,
        title: "Keeping the Clay Reset Mask",
        comment: "Solid buy on Clay Reset Mask. Purifying clay face mask, 75ml. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-spo-01-yoga": {
        rating: 3,
        title: "Honest take — Balance Yoga Mat",
        comment: "The PDP for Balance Yoga Mat was accurate. Non-slip TPE yoga mat with carry strap. Color/size matched; no support tickets, no returns.",
    },
    "prod-spo-02-dumbbell": {
        rating: 5,
        title: "Hex Dumbbell Pair matched the photos",
        comment: "Hex Dumbbell Pair replaced what I used before. Rubber hex dumbbells, 2×5 kg. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-spo-03-bottle": {
        rating: 4,
        title: "Trail Steel Bottle matched the photos",
        comment: "Bought Trail Steel Bottle for myself, not as a checkbox. Insulated 750ml steel bottle. Feels intentional — stays in rotation.",
    },
    "prod-spo-04-running": {
        rating: 4,
        title: "Honest take — Stride Running Shoes",
        comment: "Solid buy on Stride Running Shoes. Cushioned road running shoes. Arrived intact and does the job without fuss — that's rare enough to mention.",
    },
    "prod-spo-05-backpack": {
        rating: 5,
        title: "Summit Daypack 28L earned a spot",
        comment: "Summit Daypack 28L replaced what I used before. Hydration-ready daypack for trails. Better than the price suggests; shipping was uneventful (in a good way).",
    },
    "prod-spo-06-resistance": {
        rating: 5,
        title: "Band Resistance Kit earned a spot",
        comment: "Swapped to the Band Resistance Kit and haven't looked back. Exactly as described: Five-level resistance band kit. Would gift it without hesitating.",
    },
    "prod-spo-07-bike-light": {
        rating: 5,
        title: "Night Ride Light Set matched the photos",
        comment: "Night Ride Light Set arrived on time and looked like the photography. USB-C front and rear bike lights. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-spo-08-jump-rope": {
        rating: 4,
        title: "Speed Jump Rope surprised me",
        comment: "Speed Jump Rope arrived on time and looked like the photography. Adjustable steel-cable jump rope. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-spo-09-tent": {
        rating: 4,
        title: "Glad I bought Ridge 2-Person Tent",
        comment: "Ridge 2-Person Tent arrived on time and looked like the photography. Lightweight backpacking tent. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-spo-10-gloves": {
        rating: 3,
        title: "Honest take — Grip Training Gloves",
        comment: "The PDP for Grip Training Gloves was accurate. Breathable training gloves with wrist wrap. Color/size matched; no support tickets, no returns.",
    },
    "prod-food-01-olive": {
        rating: 5,
        title: "Glad I bought Grove Extra Virgin Olive Oil",
        comment: "Swapped to the Grove Extra Virgin Olive Oil and haven't looked back. Exactly as described: Cold-pressed EVOO, 500ml bottle. Would gift it without hesitating.",
    },
    "prod-food-02-pasta": {
        rating: 3,
        title: "Honest take — Artisan Pasta Trio",
        comment: "Artisan Pasta Trio arrived on time and looked like the photography. Three shapes of bronze-cut pasta. Packaging was overbuilt, but the product is the part that matters.",
    },
    "prod-food-03-coffee": {
        rating: 3,
        title: "Honest take — Morning Roast Beans",
        comment: "Bought Morning Roast Beans for myself, not as a checkbox. Medium roast whole beans, 250g. Feels intentional — stays in rotation.",
    },
    "prod-food-04-honey": {
        rating: 4,
        title: "Wildflower Honey Jar earned a spot",
        comment: "Swapped to the Wildflower Honey Jar and haven't looked back. Exactly as described: Raw wildflower honey, 350g. Would gift it without hesitating.",
    },
    "prod-food-05-granola": {
        rating: 5,
        title: "Crunch Granola Mix earned a spot",
        comment: "The PDP for Crunch Granola Mix was accurate. Nut and seed granola, 400g pouch. Color/size matched; no support tickets, no returns.",
    },
    "prod-food-06-tea": {
        rating: 4,
        title: "Glad I bought Herbal Tea Sampler",
        comment: "Swapped to the Herbal Tea Sampler and haven't looked back. Exactly as described: 12-blend herbal tea sampler box. Would gift it without hesitating.",
    },
    "prod-food-07-chocolate": {
        rating: 5,
        title: "Dark Chocolate Bars earned a spot",
        comment: "The PDP for Dark Chocolate Bars was accurate. Pack of three 70% cacao bars. Color/size matched; no support tickets, no returns.",
    },
    "prod-food-08-spice": {
        rating: 5,
        title: "Daily use: Spice Pantry Kit",
        comment: "The PDP for Spice Pantry Kit was accurate. Eight essential cooking spices. Color/size matched; no support tickets, no returns.",
    },
    "prod-food-09-sauce": {
        rating: 5,
        title: "Would reorder Tomato Basil Sauce",
        comment: "Bought Tomato Basil Sauce for myself, not as a checkbox. Slow-cooked tomato basil pasta sauce. Feels intentional — stays in rotation.",
    },
    "prod-food-10-snack": {
        rating: 4,
        title: "Trail Mix Pouch earned a spot",
        comment: "Swapped to the Trail Mix Pouch and haven't looked back. Exactly as described: Nuts, seeds, and dried fruit, 250g. Would gift it without hesitating.",
    },
    "prod-gc-01-25": {
        rating: 4,
        title: "Gift Card €25 redeemed cleanly",
        comment: "Gift Card €25 sat in my account until I needed it. Digital store credit — €25 face value. Redemption UI was clear and the remaining balance tracked correctly.",
    },
    "prod-gc-02-50": {
        rating: 4,
        title: "Gift Card €50 redeemed cleanly",
        comment: "Bought Gift Card €50 when I was short on time. Digital store credit — €50 face value. Code emailed immediately and applied at checkout with no leftover-cent weirdness.",
    },
    "prod-gc-03-100": {
        rating: 4,
        title: "Easy gift: Gift Card €100",
        comment: "Chose Gift Card €100 instead of guessing sizes. Digital store credit — €100 face value. Smooth purchase-to-spend path for store credit.",
    },
    "prod-gc-04-150": {
        rating: 5,
        title: "Gift Card €150 — instant send",
        comment: "Gift Card €150 sat in my account until I needed it. Digital store credit — €150 face value. Redemption UI was clear and the remaining balance tracked correctly.",
    },
    "prod-gc-05-250": {
        rating: 5,
        title: "Easy gift: Gift Card €250",
        comment: "Gift Card €250 sat in my account until I needed it. Digital store credit — €250 face value. Redemption UI was clear and the remaining balance tracked correctly.",
    },
    "prod-bundle-01-studio-apparel": {
        rating: 4,
        title: "Studio Apparel Kit arrived complete",
        comment: "Studio Apparel Kit saved a few euros versus singles. Brand tee + studio hoodie as one shippable kit. No missing components; labels matched what the PDP promised.",
    },
    "prod-bundle-02-desk-setup": {
        rating: 4,
        title: "Desk Setup Bundle arrived complete",
        comment: "Desk Setup Bundle saved a few euros versus singles. Keyboard, mouse, and webcam for a clean desk. No missing components; labels matched what the PDP promised.",
    },
    "prod-bundle-03-audio-essentials": {
        rating: 5,
        title: "Audio Essentials Pack arrived complete",
        comment: "Bought Audio Essentials Pack as a housewarming gift. ANC buds plus portable speaker. Felt curated, and shipping as one parcel was half the hassle.",
    },
    "prod-bundle-04-skincare-starter": {
        rating: 4,
        title: "Gift-ready Skincare Starter Trio",
        comment: "Skincare Starter Trio saved a few euros versus singles. Cleanser, serum, and moisturizer set. No missing components; labels matched what the PDP promised.",
    },
    "prod-bundle-05-kitchen-prep": {
        rating: 5,
        title: "Kitchen Prep Bundle beats buying pieces",
        comment: "Bought Kitchen Prep Bundle as a housewarming gift. Knife set, cutting board, and utensil crock. Felt curated, and shipping as one parcel was half the hassle.",
    },
};
